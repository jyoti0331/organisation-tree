import { Subscription, defer, finalize, take, throwIfEmpty, timeout } from 'rxjs';
import { TreeCounts, TreeLoader, TreeNode, TreeRowHandle, TreeSelectionStatus } from './tree.model';

let nextNodeId = 0;

/** Plain TypeScript tree state and traversal; no Angular or DOM dependencies. */
export class TreeHelper {
  private readonly pendingLoads = new Map<TreeNode, Subscription>();
  private disposed = false;

  initializeTree(): TreeNode {
    const root = this.createNode('', true, false, undefined, false);
    root.isRoot = true;
    root.expanded = true;
    return root;
  }

  createNode(
    label: string, hasChildren = false, selectionAllowed = true,
    additionalInfo?: unknown, showCheckbox = true,
  ): TreeNode {
    return {
      id: `tree-node-${++nextNodeId}`, label, parent: null, index: 0, isRoot: false,
      children: hasChildren ? [] : undefined, hasChildren, expanded: false,
      isLoaded: !hasChildren, lazyLoading: false, lazyLoad: null, lazyLoadParams: [],
      loading: false, pending: false, additionalInfo,
      selectionProps: { selectionAllowed, showCheckbox, selectionStatus: TreeSelectionStatus.NotSelected },
    };
  }

  configureLazyLoad(node: TreeNode, loader: TreeLoader, params: string[] = []): void {
    node.lazyLoading = true;
    node.lazyLoad = loader;
    node.lazyLoadParams = params;
    node.isLoaded = false;
  }

  insertNodesAtRoot(root: TreeNode, children: TreeNode[]): void {
    this.insertChildrenForNode(root, children);
  }

  /** Attaches a completed child response without inheriting potentially stale selection. */
  insertChildrenForNode(node: TreeNode, children: TreeNode[]): void {
    for (const previous of node.children ?? []) previous.parent = null;
    node.children = children;
    children.forEach((child, index) => { child.parent = node; child.index = index; });
    node.isLoaded = true;
    node.error = undefined;
  }

  /** Search builders append in O(1); indexes and parent links stay correct. */
  appendChild(node: TreeNode, child: TreeNode): void {
    node.children ??= [];
    child.parent = node;
    child.index = node.children.length;
    node.children.push(child);
  }

  /** Build a complete expanded hierarchy in one pass; keys identify domain paths. */
  buildExpandedTree<T>(rows: T[], pathForRow: (row: T) => { key: string; create: () => TreeNode }[]): TreeNode {
    const root = this.initializeTree();
    root.isLoaded = true;
    const nodes = new Map<string, TreeNode>();
    for (const row of rows) {
      let parent = root;
      for (const part of pathForRow(row)) {
        let node = nodes.get(part.key);
        if (!node) {
          node = part.create();
          node.expanded = true;
          node.isLoaded = true;
          node.lazyLoading = false;
          node.lazyLoad = null;
          node.lazyLoadParams = [];
          nodes.set(part.key, node);
          this.appendChild(parent, node);
        }
        parent = node;
      }
    }
    return root;
  }

  toggleExpansion(node: TreeNode): void {
    if (!node.hasChildren) return;
    if (node.error && !node.loading) {
      node.expanded = true;
      this.loadChildren(node);
      return;
    }
    node.expanded = !node.expanded;
    if (node.expanded) this.loadChildren(node);
    else this.collapseDescendants(node);
  }

  loadChildren(node: TreeNode): void {
    if (this.disposed || node.isLoaded || !node.lazyLoading || !node.lazyLoad || this.pendingLoads.has(node)) return;
    node.loading = true;
    node.error = undefined;
    // Register first, including for adapters that emit synchronously.
    const subscription = new Subscription();
    this.pendingLoads.set(node, subscription);
    subscription.add(defer(() => node.lazyLoad!(node.id, ...node.lazyLoadParams)).pipe(
      take(1), throwIfEmpty(() => new Error('No data received. Please retry.')), timeout(10000),
      finalize(() => { node.loading = false; this.pendingLoads.delete(node); }),
    ).subscribe({
      next: children => this.insertChildrenForNode(node, children),
      error: error => { node.error = error instanceof Error ? error.message : String(error); },
    }));
  }

  markMember(node: TreeNode, isMember: boolean): void {
    node.selectionProps.selectionStatus = isMember ? TreeSelectionStatus.FullySelected : TreeSelectionStatus.NotSelected;
  }

  applyCounts(node: TreeNode, counts: TreeCounts, showCounts = true): void {
    node.counts = { ...counts };
    node.selectionProps.selectionStatus = counts.members === 0 || counts.total === 0
      ? TreeSelectionStatus.NotSelected
      : counts.members === counts.total ? TreeSelectionStatus.FullySelected : TreeSelectionStatus.PartiallySelected;
    node.description = showCounts ? `${counts.members} / ${counts.total} employees selected` : undefined;
  }

  static registerRow(node: TreeNode, row: TreeRowHandle): void { node.row = row; }
  static unregisterRow(node: TreeNode, row: TreeRowHandle): void {
    if (node.row === row) node.row = undefined;
  }

  static nextVisibleNode(node: TreeNode): TreeNode | null {
    if (node.expanded && node.isLoaded && node.children?.length) return node.children[0];
    for (let current: TreeNode | null = node; current?.parent; current = current.parent) {
      const sibling = current.parent.children?.[current.index + 1];
      if (sibling) return sibling;
    }
    return null;
  }

  static previousVisibleNode(node: TreeNode): TreeNode | null {
    const parent = node.parent;
    if (!parent) return null;
    if (node.index === 0) return parent.isRoot ? null : parent;
    let previous = parent.children![node.index - 1];
    while (previous.expanded && previous.isLoaded && previous.children?.length) {
      previous = previous.children[previous.children.length - 1];
    }
    return previous;
  }

  private collapseDescendants(node: TreeNode): void {
    for (const child of node.children ?? []) {
      child.expanded = false;
      this.collapseDescendants(child);
    }
  }

  destroy(): void {
    this.disposed = true;
    for (const subscription of this.pendingLoads.values()) subscription.unsubscribe();
    this.pendingLoads.clear();
  }
}
