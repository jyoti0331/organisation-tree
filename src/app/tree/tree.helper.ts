import { TreeNode, NodeInput, SearchRequestToken, SearchApplyResult } from './tree.model';

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

/** Owns tree structure and temporary externally constructed search results, never payload policy. */
export class TreeHelper<T> {
  readonly browsing = new Tree<T>();
  searchTree: Tree<T> | null = null;
  private listeners = new Set<() => void>();
  private activeSearch: SearchRequestToken | null = null;
  private revision = 0;
  private disposed = false;
  constructor() {
    this.browsing.subscribe(() => this.notify());
  }
  get isSearchMode(): boolean {
    return this.searchTree !== null;
  }
  get tree(): Tree<T> {
    return this.searchTree ?? this.browsing;
  }
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  notify(): void {
    if (!this.disposed) for (const listener of this.listeners) listener();
  }
  expand(node: TreeNode<T>): Promise<void> {
    return this.tree.expand(node);
  }
  /** Call when host data changes during an outstanding search request. */
  invalidateSearchResults(): void {
    ++this.revision;
  }
  beginSearch(): SearchRequestToken {
    if (this.disposed) throw new Error('Cannot search a disposed tree helper');
    this.searchTree?.dispose();
    this.searchTree = new Tree<T>();
    this.searchTree.subscribe(() => this.notify());
    this.activeSearch = Object.freeze({ revision: this.revision });
    this.notify();
    return this.activeSearch;
  }
  applySearchResults(
    inputs: readonly NodeInput<T>[],
    token: SearchRequestToken,
  ): SearchApplyResult {
    if (this.disposed || !this.searchTree || token !== this.activeSearch) return 'superseded';
    if (token.revision !== this.revision) return 'data-changed';
    const complete = (input: NodeInput<T>): NodeInput<T> => ({
      data: input.data,
      expanded: true,
      loader: null,
      children: (input.children ?? []).map(complete),
    });
    this.activeSearch = null;
    this.searchTree.replaceChildren(this.searchTree.root, inputs.map(complete));
    return 'applied';
  }
  restoreBrowsing(): void {
    if (this.disposed) return;
    this.activeSearch = null;
    this.searchTree?.dispose();
    this.searchTree = null;
    this.notify();
  }
  dispose(): void {
    this.disposed = true;
    this.activeSearch = null;
    this.browsing.dispose();
    this.searchTree?.dispose();
    this.listeners.clear();
  }
}
