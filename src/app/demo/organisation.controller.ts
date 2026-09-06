import { Tree, TreeHelper } from '../tree/tree.helper';
import {
  TreeNode,
  NodeInput,
  CheckState,
  TreePresentation,
  SearchRequestToken,
  SearchApplyResult,
} from '../tree/tree.model';
import {
  Id,
  Chain,
  Branch,
  OrganisationNode,
  PickerOptions,
  MutationResult,
  SearchRow,
} from './organisation.model';
import { OrganisationDataSource } from './organisation-data-source';
import { checkState, personKey } from './membership.utils';

export class OrganisationController {
  readonly helper = new TreeHelper<OrganisationNode>();
  get browsing(): Tree<OrganisationNode> {
    return this.helper.browsing;
  }
  get searchTree(): Tree<OrganisationNode> | null {
    return this.helper.searchTree;
  }
  readonly presentation: TreePresentation<OrganisationNode> = {
    label: (node) => node.data.value.label,
    checkbox: (node) =>
      this.isSearchMode && node.data.kind !== 'person'
        ? null
        : {
            state: this.state(node),
            disabled: this.disabled(node),
            label: 'Project membership for ' + node.data.value.label,
          },
    description: (node) =>
      !this.isSearchMode && node.data.kind !== 'person'
        ? `${node.data.value.members} / ${node.data.value.total}`
        : null,
  };
  refreshing = false;
  initialLoading = false;
  error: string | null = null;
  readonly timeoutMs: number;
  private listeners = new Set<() => void>();
  private chains = new Map<Id, TreeNode<OrganisationNode>>();
  private branches = new Map<Id, TreeNode<OrganisationNode>>();
  private persons = new Map<string, Set<TreeNode<OrganisationNode>>>();
  private branchWrites = new Set<Id>();
  private personWrites = new Map<string, Id>();
  private dirty = new Map<Id, Id>();
  private generation = 0;
  private reconcileGeneration = 0;
  private disposed = false;
  constructor(
    readonly source: OrganisationDataSource,
    readonly projectId: Id,
    options: PickerOptions = {},
  ) {
    this.timeoutMs = options.timeoutMs ?? 10000;
    this.helper.subscribe(() => {
      if (!this.disposed) for (const listener of this.listeners) listener();
    });
  }
  get isSearchMode(): boolean {
    return this.helper.isSearchMode;
  }
  get tree(): Tree<OrganisationNode> {
    return this.helper.tree;
  }
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  private emit(): void {
    this.helper.notify();
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
      (this.isSearchMode && node.data.kind !== 'person')
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
    this.helper.invalidateSearchResults();
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
      this.helper.invalidateSearchResults();
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
  beginSearch(): SearchRequestToken {
    return this.helper.beginSearch();
  }
  /** Domain grouping belongs to this application, not the reusable tree. */
  applySearchResults(rows: readonly SearchRow[], token: SearchRequestToken): SearchApplyResult {
    const chains = new Map<Id, NodeInput<OrganisationNode>>();
    const branches = new Map<Id, NodeInput<OrganisationNode>>();
    const people = new Set<string>();
    for (const row of rows) {
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
    const result = this.helper.applySearchResults([...chains.values()], token);
    if (result !== 'applied') return result;
    this.index();
    this.emit();
    if (this.dirty.size && !this.pending) void this.refresh(false);
    return 'applied';
  }

  /** Return immediately to cached browsing; reconcile outstanding membership if needed. */
  async restoreBrowsing(): Promise<void> {
    if (this.disposed) return;
    this.helper.restoreBrowsing();
    this.index();
    this.emit();
    if (this.dirty.size) await this.refresh(false);
  }
  dispose(): void {
    this.disposed = true;
    this.helper.dispose();
    this.listeners.clear();
  }
}
