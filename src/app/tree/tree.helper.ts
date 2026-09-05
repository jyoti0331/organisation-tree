import {
  TreeNode,
  NodeInput,
  Id,
  Counts,
  Chain,
  Branch,
  OrganisationDataSource,
  OrganisationNode,
  CheckState,
  PickerOptions,
  MutationResult,
} from './tree.model';

let nextTree = 0;
/** Rendering-independent ordered tree. Loaders return data; the tree owns insertion. */
export class Tree<T> {
  private serial = 0;
  private readonly prefix = `tree-${++nextTree}`;
  readonly root = new TreeNode<T>(`${this.prefix}-root`, undefined as T, null, 0);
  private nodes = new Map<string, TreeNode<T>>();
  private listeners = new Set<() => void>();
  private pending = new Map<string, { controller: AbortController; promise: Promise<void> }>();
  private disposed = false;
  constructor() {
    this.root.expanded = true;
    this.root.isLoaded = true;
    this.nodes.set(this.root.id, this.root);
  }
  get roots(): readonly TreeNode<T>[] {
    return this.root.children;
  }
  get(id: string): TreeNode<T> | undefined {
    return this.nodes.get(id);
  }
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  notify(): void {
    if (!this.disposed) for (const listener of this.listeners) listener();
  }
  private assertNode(node: TreeNode<T>): void {
    if (this.disposed || this.nodes.get(node.id) !== node)
      throw new Error('Node does not belong to this active tree');
  }
  insertNodesAtRoot(
    inputs: readonly NodeInput<T>[],
    index = this.root.children.length,
  ): TreeNode<T>[] {
    return this.insertChildrenForNode(this.root, inputs, index);
  }
  insertChildrenForNode(
    parent: TreeNode<T>,
    inputs: readonly NodeInput<T>[],
    index = parent.children.length,
  ): TreeNode<T>[] {
    this.assertNode(parent);
    if (!Number.isInteger(index) || index < 0 || index > parent.children.length)
      throw new RangeError('Invalid insertion index');
    const inserted = inputs.map((input) => this.create(input, parent));
    parent.children.splice(index, 0, ...inserted);
    parent.children.forEach((child, i) => (child.index = i));
    parent.hasChildren = parent.children.length > 0;
    parent.isLoaded = true;
    this.notify();
    return inserted;
  }
  private create(input: NodeInput<T>, parent: TreeNode<T>): TreeNode<T> {
    const node = new TreeNode(`${this.prefix}-${++this.serial}`, input.data, parent, 0);
    node.expanded = input.expanded ?? false;
    node.loader = input.loader ?? null;
    node.isLoaded = input.children !== undefined || !node.loader;
    node.hasChildren = input.hasChildren ?? (!!input.loader || !!input.children?.length);
    this.nodes.set(node.id, node);
    if (input.children) {
      node.children.push(...input.children.map((child) => this.create(child, node)));
      node.children.forEach((child, i) => (child.index = i));
      node.hasChildren = node.children.length > 0;
    }
    return node;
  }
  replaceChildren(parent: TreeNode<T>, inputs: readonly NodeInput<T>[]): TreeNode<T>[] {
    this.assertNode(parent);
    this.pending.get(parent.id)?.controller.abort();
    this.pending.delete(parent.id);
    parent.loading = false;
    for (const child of parent.children) this.remove(child);
    parent.children.length = 0;
    return this.insertChildrenForNode(parent, inputs);
  }
  /** Update an authoritative sibling listing while preserving matching nodes and expansion. */
  reconcileChildren(
    parent: TreeNode<T>,
    inputs: readonly NodeInput<T>[],
    key: (data: T) => string,
  ): TreeNode<T>[] {
    this.assertNode(parent);
    const keys = inputs.map((input) => key(input.data));
    if (new Set(keys).size !== keys.length) throw new Error('Duplicate sibling keys');
    const existing = new Map(parent.children.map((node) => [key(node.data), node]));
    this.pending.get(parent.id)?.controller.abort();
    this.pending.delete(parent.id);
    parent.loading = false;
    const children = inputs.map((input, index) => {
      const node = existing.get(keys[index]);
      if (!node) return this.create(input, parent);
      existing.delete(keys[index]);
      node.data = input.data;
      if (input.hasChildren !== undefined) node.hasChildren = input.hasChildren;
      if (input.loader !== undefined) node.loader = input.loader;
      return node;
    });
    for (const node of existing.values()) this.remove(node);
    parent.children.splice(0, parent.children.length, ...children);
    children.forEach((node, index) => (node.index = index));
    parent.hasChildren = children.length > 0;
    parent.isLoaded = true;
    this.notify();
    return children;
  }
  private remove(node: TreeNode<T>): void {
    this.pending.get(node.id)?.controller.abort();
    this.pending.delete(node.id);
    for (const child of node.children) this.remove(child);
    this.nodes.delete(node.id);
  }
  expand(node: TreeNode<T>): Promise<void> {
    this.assertNode(node);
    node.expanded = true;
    this.notify();
    return this.load(node);
  }
  collapse(node: TreeNode<T>): void {
    this.assertNode(node);
    node.expanded = false;
    this.notify();
  }
  load(node: TreeNode<T>): Promise<void> {
    this.assertNode(node);
    const current = this.pending.get(node.id);
    if (current) return current.promise;
    if (node.isLoaded || !node.loader) return Promise.resolve();
    const controller = new AbortController();
    node.loading = true;
    node.error = null;
    const promise = Promise.resolve()
      .then(() => node.loader!(node, controller.signal))
      .then((inputs) => {
        if (!controller.signal.aborted && !this.disposed && this.get(node.id) === node)
          this.insertChildrenForNode(node, inputs);
      })
      .catch((error) => {
        if (!controller.signal.aborted && !this.disposed)
          node.error = error instanceof Error ? error.message : String(error);
      })
      .finally(() => {
        if (this.pending.get(node.id)?.controller === controller) {
          this.pending.delete(node.id);
          node.loading = false;
          this.notify();
        }
      });
    this.pending.set(node.id, { controller, promise });
    this.notify();
    return promise;
  }
  nextVisibleNode(node: TreeNode<T>): TreeNode<T> | null {
    if (node.expanded && node.children.length) return node.children[0];
    let current = node;
    while (current.parent) {
      const sibling = current.parent.children[current.index + 1];
      if (sibling) return sibling;
      current = current.parent;
    }
    return null;
  }
  previousVisibleNode(node: TreeNode<T>): TreeNode<T> | null {
    if (!node.parent) return null;
    if (node.index === 0) return node.parent === this.root ? null : node.parent;
    let current = node.parent.children[node.index - 1];
    while (current.expanded && current.children.length)
      current = current.children[current.children.length - 1];
    return current;
  }
  visibleNodes(): TreeNode<T>[] {
    const result: TreeNode<T>[] = [];
    let node: TreeNode<T> | null = this.root.children[0] ?? null;
    while (node) {
      result.push(node);
      node = this.nextVisibleNode(node);
    }
    return result;
  }
  dispose(): void {
    this.disposed = true;
    for (const item of this.pending.values()) item.controller.abort();
    this.pending.clear();
    this.nodes.clear();
    this.listeners.clear();
  }
}

export function checkState(counts: Counts): CheckState {
  return counts.total === 0 || counts.members === 0
    ? 'unchecked'
    : counts.members === counts.total
      ? 'checked'
      : 'mixed';
}
export const personKey = (branchId: Id, employeeId: Id): string =>
  JSON.stringify([branchId, employeeId]);

export class TreeHelper {
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
