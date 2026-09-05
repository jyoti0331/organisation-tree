import { Tree, TreeNode, NodeInput } from '@organisation-tree/core';
export type Id = string;
export interface Counts {
  members: number;
  total: number;
}
export interface ChainIdentity {
  chainId: Id;
  label: string;
}
export interface BranchIdentity {
  branchId: Id;
  chainId: Id;
  label: string;
}
export interface Chain extends ChainIdentity, Counts {}
export interface Branch extends BranchIdentity, Counts {}
export interface Person {
  branchId: Id;
  employeeId: Id;
  label: string;
  isProjectMember: boolean;
}
export interface SearchRow {
  chain: ChainIdentity;
  branch: BranchIdentity;
  person: Person;
}
export interface MutationResult {
  chain: Counts;
  branch: Counts;
}
export type BranchAction = 'addAll' | 'addRemaining' | 'removeAll';
/** Host supplies transport/authentication. Counts describe the full organisation, never search subsets. */
export interface OrganisationDataSource {
  getChains(projectId: Id): Promise<Chain[]>;
  getBranches(projectId: Id, chainId: Id): Promise<Branch[]>;
  getBranchPersons(projectId: Id, branchId: Id): Promise<Person[]>;
  searchPersons(projectId: Id, query: string, maxCount: number): Promise<SearchRow[]>;
  togglePersonMembership(projectId: Id, branchId: Id, employeeId: Id): Promise<MutationResult>;
  updateBranchMembership(
    projectId: Id,
    branchId: Id,
    action: BranchAction,
  ): Promise<MutationResult>;
}
export type OrganisationNode =
  | { kind: 'chain'; value: ChainIdentity & Partial<Counts> }
  | { kind: 'branch'; value: BranchIdentity & Partial<Counts> }
  | { kind: 'person'; value: Person };
export type CheckState = 'unchecked' | 'mixed' | 'checked';
export function checkState(counts: Counts): CheckState {
  return counts.total === 0 || counts.members === 0
    ? 'unchecked'
    : counts.members === counts.total
      ? 'checked'
      : 'mixed';
}
export const personKey = (branchId: Id, employeeId: Id): string =>
  JSON.stringify([branchId, employeeId]);
export interface PickerOptions {
  maxResults?: number;
  timeoutMs?: number;
}
export class OrganisationController {
  readonly browsing = new Tree<OrganisationNode>();
  searchTree: Tree<OrganisationNode> | null = null;
  query = '';
  searching = false;
  refreshing = false;
  initialLoading = false;
  limitReached = false;
  error: string | null = null;
  readonly maxResults: number;
  readonly timeoutMs: number;
  private listeners = new Set<() => void>();
  private chains = new Map<Id, TreeNode<OrganisationNode>>();
  private branches = new Map<Id, TreeNode<OrganisationNode>>();
  private persons = new Map<string, Set<TreeNode<OrganisationNode>>>();
  private branchWrites = new Set<Id>();
  private personWrites = new Map<string, Id>();
  private dirty = new Map<Id, Id>();
  private generation = 0;
  private searchGeneration = 0;
  private reconcileGeneration = 0;
  private disposed = false;
  private offSearch?: () => void;
  constructor(
    readonly source: OrganisationDataSource,
    readonly projectId: Id,
    options: PickerOptions = {},
  ) {
    this.maxResults = Math.max(1, Math.floor(options.maxResults ?? 300));
    this.timeoutMs = options.timeoutMs ?? 10000;
    this.browsing.subscribe(() => this.emit());
  }
  get tree(): Tree<OrganisationNode> {
    return this.query ? (this.searchTree ?? this.emptySearch()) : this.browsing;
  }
  private emptySearch(): Tree<OrganisationNode> {
    this.searchTree = new Tree();
    this.offSearch = this.searchTree.subscribe(() => this.emit());
    return this.searchTree;
  }
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  private emit(): void {
    if (!this.disposed) for (const listener of this.listeners) listener();
  }
  private async request<T>(promise: Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error('Request timed out. Refresh to confirm membership.')),
            this.timeoutMs,
          );
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }
  private async stableRead<T>(read: () => Promise<T>): Promise<T> {
    for (;;) {
      const generation = this.generation;
      const result = await this.request(read());
      if (this.disposed || generation === this.generation) return result;
    }
  }
  private failure(error: unknown): void {
    this.error = error instanceof Error ? error.message : String(error);
  }
  async initialize(): Promise<void> {
    if (this.initialLoading || this.browsing.roots.length || this.disposed) return;
    this.initialLoading = true;
    this.error = null;
    this.emit();
    try {
      const values = await this.stableRead(() => this.source.getChains(this.projectId));
      if (this.disposed) return;
      const nodes = this.browsing.insertNodesAtRoot(values.map((value) => this.chainInput(value)));
      nodes.forEach((node) => {
        if (node.data.kind === 'chain') this.chains.set(node.data.value.chainId, node);
      });
    } catch (error) {
      this.failure(error);
    } finally {
      this.initialLoading = false;
      this.emit();
    }
  }
  private chainInput(value: Chain): NodeInput<OrganisationNode> {
    return {
      data: { kind: 'chain', value },
      // Person totals do not tell us whether a chain contains empty branches.
      hasChildren: true,
      loader: async (_node, signal) => {
        const rows = await this.stableRead(() =>
          this.source.getBranches(this.projectId, value.chainId),
        );
        if (signal.aborted) return [];
        return rows.map((branch) => this.branchInput(branch));
      },
    };
  }
  private branchInput(value: Branch): NodeInput<OrganisationNode> {
    return {
      data: { kind: 'branch', value },
      hasChildren: value.total > 0,
      loader: async (_node, signal) => {
        const rows = await this.stableRead(() =>
          this.source.getBranchPersons(this.projectId, value.branchId),
        );
        if (signal.aborted) return [];
        return rows.map((person) => ({ data: { kind: 'person' as const, value: person } }));
      },
    };
  }
  private index(): void {
    this.branches.clear();
    this.persons.clear();
    const walk = (nodes: readonly TreeNode<OrganisationNode>[], browse: boolean): void => {
      for (const node of nodes) {
        const data = node.data;
        if (data.kind === 'branch' && browse) this.branches.set(data.value.branchId, node);
        if (data.kind === 'person') {
          const key = personKey(data.value.branchId, data.value.employeeId);
          const nodes = this.persons.get(key) ?? new Set();
          nodes.add(node);
          this.persons.set(key, nodes);
        }
        walk(node.children, browse);
      }
    };
    walk(this.browsing.roots, true);
    if (this.searchTree) walk(this.searchTree.roots, false);
  }
  async expand(node: TreeNode<OrganisationNode>): Promise<void> {
    await this.tree.expand(node);
    this.index();
    if (this.dirty.size && !this.pending) await this.refresh(false);
  }
  private get pending(): number {
    return this.branchWrites.size + this.personWrites.size;
  }
  disabled(node: TreeNode<OrganisationNode>): boolean {
    const data = node.data;
    if (data.kind === 'chain') return true;
    const branchId = data.value.branchId;
    if (this.branchWrites.has(branchId)) return true;
    if (data.kind === 'person')
      return this.personWrites.has(personKey(branchId, data.value.employeeId));
    return !data.value.total || [...this.personWrites.values()].includes(branchId);
  }
  state(node: TreeNode<OrganisationNode>): CheckState {
    return node.data.kind === 'person'
      ? node.data.value.isProjectMember
        ? 'checked'
        : 'unchecked'
      : checkState({ members: node.data.value.members ?? 0, total: node.data.value.total ?? 0 });
  }
  async toggle(node: TreeNode<OrganisationNode>): Promise<void> {
    if (
      this.disposed ||
      this.disabled(node) ||
      node.data.kind === 'chain' ||
      (this.query && node.data.kind !== 'person')
    )
      return;
    this.index();
    const data = node.data;
    const branchId = data.value.branchId;
    const branch = this.branches.get(branchId)?.data;
    const chainId =
      data.kind === 'branch'
        ? data.value.chainId
        : branch?.kind === 'branch'
          ? branch.value.chainId
          : node.parent?.data.kind === 'branch'
            ? node.parent.data.value.chainId
            : null;
    if (!chainId) return;
    const key = data.kind === 'person' ? personKey(branchId, data.value.employeeId) : null;
    if (key) this.personWrites.set(key, branchId);
    else this.branchWrites.add(branchId);
    this.dirty.set(branchId, chainId);
    ++this.generation;
    this.error = null;
    this.emit();
    const selected = this.state(node) === 'checked';
    try {
      const result = await this.request(
        data.kind === 'person'
          ? this.source.togglePersonMembership(this.projectId, branchId, data.value.employeeId)
          : this.source.updateBranchMembership(
              this.projectId,
              branchId,
              selected ? 'removeAll' : this.state(node) === 'mixed' ? 'addRemaining' : 'addAll',
            ),
      );
      if (this.disposed) return;
      this.index();
      this.updateCounts(chainId, branchId, result);
      for (const [personId, nodes] of this.persons)
        for (const personNode of nodes)
          if (
            personNode.data.kind === 'person' &&
            (key ? personId === key : personNode.data.value.branchId === branchId)
          )
            personNode.data = {
              kind: 'person',
              value: { ...personNode.data.value, isProjectMember: !selected },
            };
    } catch (error) {
      this.failure(error);
    } finally {
      ++this.generation;
      if (key) this.personWrites.delete(key);
      else this.branchWrites.delete(branchId);
      this.emit();
      if (!this.pending && !this.disposed) await this.refresh(false);
    }
  }
  private updateCounts(chainId: Id, branchId: Id, result: MutationResult): void {
    const chainNode = this.chains.get(chainId);
    if (chainNode?.data.kind === 'chain')
      chainNode.data = { kind: 'chain', value: { ...chainNode.data.value, ...result.chain } };
    const branchNode = this.branches.get(branchId);
    if (branchNode?.data.kind === 'branch')
      branchNode.data = { kind: 'branch', value: { ...branchNode.data.value, ...result.branch } };
  }
  /** Reconcile snapshots only across a write-free interval. No automatic toggle retries. */
  async refresh(clearError = true): Promise<void> {
    if (clearError) this.error = null;
    if (this.disposed || this.pending) return;
    const generation = this.generation;
    const token = ++this.reconcileGeneration;
    this.refreshing = true;
    this.emit();
    this.index();
    const dirty = new Map(this.dirty);
    if (!dirty.size) {
      for (const node of this.branches.values())
        if (node.data.kind === 'branch')
          dirty.set(node.data.value.branchId, node.data.value.chainId);
      for (const chain of this.searchTree?.roots ?? [])
        for (const node of chain.children)
          if (node.data.kind === 'branch')
            dirty.set(node.data.value.branchId, node.data.value.chainId);
    }
    try {
      const chains = await this.request(this.source.getChains(this.projectId));
      const chainIds = new Set(dirty.values());
      if (clearError)
        for (const node of this.chains.values())
          if (node.isLoaded && node.data.kind === 'chain') chainIds.add(node.data.value.chainId);
      const branchGroups = await Promise.all(
        [...chainIds].map(async (chainId) => ({
          chainId,
          rows: await this.request(this.source.getBranches(this.projectId, chainId)),
        })),
      );
      const persons = await Promise.all(
        [...dirty.keys()].map(async (branchId) => ({
          branchId,
          rows: await this.request(this.source.getBranchPersons(this.projectId, branchId)),
        })),
      );
      if (
        this.disposed ||
        generation !== this.generation ||
        token !== this.reconcileGeneration ||
        this.pending
      )
        return;
      this.browsing.reconcileChildren(
        this.browsing.root,
        chains.map((chain) => this.chainInput(chain)),
        (data) => (data.kind === 'chain' ? data.value.chainId : ''),
      );
      this.chains.clear();
      for (const node of this.browsing.roots)
        if (node.data.kind === 'chain') this.chains.set(node.data.value.chainId, node);
      for (const group of branchGroups) {
        const node = this.chains.get(group.chainId);
        if (node?.isLoaded)
          this.browsing.reconcileChildren(
            node,
            group.rows.map((branch) => this.branchInput(branch)),
            (data) => (data.kind === 'branch' ? data.value.branchId : ''),
          );
      }
      this.index();
      for (const group of persons) {
        const branch = this.branches.get(group.branchId);
        if (branch?.isLoaded)
          this.browsing.reconcileChildren(
            branch,
            group.rows.map((value) => ({ data: { kind: 'person' as const, value } })),
            (data) =>
              data.kind === 'person' ? personKey(data.value.branchId, data.value.employeeId) : '',
          );
        const existing = new Map(
          group.rows.map((person) => [personKey(person.branchId, person.employeeId), person]),
        );
        for (const [key, nodes] of this.persons) {
          const value = existing.get(key);
          if (value) for (const node of nodes) node.data = { kind: 'person', value: { ...value } };
        }
      }
      this.index();
      for (const branchId of dirty.keys()) this.dirty.delete(branchId);
    } catch (error) {
      this.failure(error);
    } finally {
      if (token === this.reconcileGeneration) {
        this.refreshing = false;
        this.emit();
      }
    }
  }
  async search(query: string): Promise<void> {
    if (this.disposed) return;
    this.query = query.trim();
    const token = ++this.searchGeneration;
    this.limitReached = false;
    this.error = null;
    this.offSearch?.();
    this.searchTree?.dispose();
    this.searchTree = null;
    if (!this.query) {
      this.searching = false;
      this.emit();
      if (this.dirty.size) await this.refresh(false);
      return;
    }
    this.emptySearch();
    this.searching = true;
    this.emit();
    try {
      const writeGeneration = this.generation;
      const rows = await this.request(
        this.source.searchPersons(this.projectId, this.query, this.maxResults),
      );
      if (this.disposed || token !== this.searchGeneration) return;
      if (writeGeneration !== this.generation) {
        await this.search(this.query);
        return;
      }
      this.limitReached = rows.length >= this.maxResults;
      const chains = new Map<Id, NodeInput<OrganisationNode>>();
      const branches = new Map<Id, NodeInput<OrganisationNode>>();
      const people = new Set<string>();
      for (const row of rows.slice(0, this.maxResults)) {
        let chain = chains.get(row.chain.chainId);
        if (!chain) {
          chain = { data: { kind: 'chain', value: row.chain }, expanded: true, children: [] };
          chains.set(row.chain.chainId, chain);
        }
        let branch = branches.get(row.branch.branchId);
        if (!branch) {
          branch = { data: { kind: 'branch', value: row.branch }, expanded: true, children: [] };
          branches.set(row.branch.branchId, branch);
          (chain.children as NodeInput<OrganisationNode>[]).push(branch);
        }
        const key = personKey(row.person.branchId, row.person.employeeId);
        if (!people.has(key)) {
          people.add(key);
          (branch.children as NodeInput<OrganisationNode>[]).push({
            data: { kind: 'person', value: row.person },
          });
        }
      }
      this.searchTree!.insertNodesAtRoot([...chains.values()]);
      this.index();
      if (this.dirty.size && !this.pending) await this.refresh(false);
    } catch (error) {
      if (token === this.searchGeneration) this.failure(error);
    } finally {
      if (token === this.searchGeneration) {
        this.searching = false;
        this.emit();
      }
    }
  }
  dispose(): void {
    this.disposed = true;
    ++this.searchGeneration;
    this.browsing.dispose();
    this.searchTree?.dispose();
    this.listeners.clear();
  }
}
