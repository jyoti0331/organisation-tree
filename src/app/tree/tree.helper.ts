import { TreeNode, NodeInput, SearchRequestToken, SearchApplyResult } from './tree.model';
let nextTree = 0;
/** Rendering-independent ordered tree. Loaders return data; the tree owns insertion. */
export class Tree<T> {
  private serial = 0;
  private readonly prefix = `tree-${++nextTree}`;
  readonly root = new TreeNode<T>(`${this.prefix}-root`, undefined as T, null, 0);
  private nodes = new Map<string, TreeNode<T>>();
  private listeners = new Set<() => void>();
  private pending = new Map<
    string,
    {
      controller: AbortController;
      promise: Promise<void>;
    }
  >();
  private disposed = false;
  constructor() {
    console.log('[tree-debug] Tree.constructor | enter');
    debugger;
    console.log('[tree-debug] Tree.constructor | this.root.expanded = true;');
    debugger;
    this.root.expanded = true;
    console.log('[tree-debug] Tree.constructor | this.root.isLoaded = true;');
    debugger;
    this.root.isLoaded = true;
    console.log('[tree-debug] Tree.constructor | this.nodes.set(this.root.id, this.root);');
    debugger;
    this.nodes.set(this.root.id, this.root);
  }
  get roots(): readonly TreeNode<T>[] {
    console.log('[tree-debug] Tree.roots | enter');
    debugger;
    console.log('[tree-debug] Tree.roots | return this.root.children;');
    debugger;
    return this.root.children;
  }
  get(id: string): TreeNode<T> | undefined {
    console.log('[tree-debug] Tree.get | enter', { id });
    debugger;
    console.log('[tree-debug] Tree.get | return this.nodes.get(id);');
    debugger;
    return this.nodes.get(id);
  }
  subscribe(listener: () => void): () => void {
    console.log('[tree-debug] Tree.subscribe | enter', { listener });
    debugger;
    console.log('[tree-debug] Tree.subscribe | this.listeners.add(listener);');
    debugger;
    this.listeners.add(listener);
    console.log('[tree-debug] Tree.subscribe | return () => this.listeners.delete(listener);');
    debugger;
    return () => {
      console.log(
        '[tree-debug] Tree.subscribe callback | evaluate this.listeners.delete(listener)',
      );
      debugger;
      return this.listeners.delete(listener);
    };
  }
  notify(): void {
    console.log('[tree-debug] Tree.notify | enter');
    debugger;
    console.log(
      '[tree-debug] Tree.notify | if (!this.disposed) for (const listener of this.listeners) listener();',
    );
    debugger;
    if (!this.disposed) {
      console.log('[tree-debug] Tree.notify | for (const listener of this.listeners) listener();');
      debugger;
      for (const listener of this.listeners) {
        console.log('[tree-debug] Tree.notify | listener();');
        debugger;
        listener();
      }
    }
  }
  private assertNode(node: TreeNode<T>): void {
    console.log('[tree-debug] Tree.assertNode | enter', { node });
    debugger;
    console.log(
      "[tree-debug] Tree.assertNode | if (this.disposed || this.nodes.get(node.id) !== node) throw new Error('Node does not belong to this active tree');",
    );
    debugger;
    if (this.disposed || this.nodes.get(node.id) !== node) {
      console.log(
        "[tree-debug] Tree.assertNode | throw new Error('Node does not belong to this active tree');",
      );
      debugger;
      throw new Error('Node does not belong to this active tree');
    }
  }
  insertNodesAtRoot(
    inputs: readonly NodeInput<T>[],
    index = this.root.children.length,
  ): TreeNode<T>[] {
    console.log('[tree-debug] Tree.insertNodesAtRoot | enter', { inputs, index });
    debugger;
    console.log(
      '[tree-debug] Tree.insertNodesAtRoot | return this.insertChildrenForNode(this.root, inputs, index);',
    );
    debugger;
    return this.insertChildrenForNode(this.root, inputs, index);
  }
  insertChildrenForNode(
    parent: TreeNode<T>,
    inputs: readonly NodeInput<T>[],
    index = parent.children.length,
  ): TreeNode<T>[] {
    console.log('[tree-debug] Tree.insertChildrenForNode | enter', { parent, inputs, index });
    debugger;
    console.log('[tree-debug] Tree.insertChildrenForNode | this.assertNode(parent);');
    debugger;
    this.assertNode(parent);
    console.log(
      "[tree-debug] Tree.insertChildrenForNode | if (!Number.isInteger(index) || index < 0 || index > parent.children.length) throw new RangeError('Invalid insertion index');",
    );
    debugger;
    if (!Number.isInteger(index) || index < 0 || index > parent.children.length) {
      console.log(
        "[tree-debug] Tree.insertChildrenForNode | throw new RangeError('Invalid insertion index');",
      );
      debugger;
      throw new RangeError('Invalid insertion index');
    }
    console.log(
      '[tree-debug] Tree.insertChildrenForNode | const inserted = inputs.map((input) => this.create(input, parent));',
    );
    debugger;
    const inserted = inputs.map((input) => {
      console.log(
        '[tree-debug] Tree.insertChildrenForNode callback | evaluate this.create(input, parent)',
        { input },
      );
      debugger;
      return this.create(input, parent);
    });
    console.log(
      '[tree-debug] Tree.insertChildrenForNode | parent.children.splice(index, 0, ...inserted);',
    );
    debugger;
    parent.children.splice(index, 0, ...inserted);
    console.log(
      '[tree-debug] Tree.insertChildrenForNode | parent.children.forEach((child, i) => (child.index = i));',
    );
    debugger;
    parent.children.forEach((child, i) => {
      console.log('[tree-debug] Tree.insertChildrenForNode callback | evaluate (child.index = i)', {
        child,
        i,
      });
      debugger;
      return (child.index = i);
    });
    console.log(
      '[tree-debug] Tree.insertChildrenForNode | parent.hasChildren = parent.children.length > 0;',
    );
    debugger;
    parent.hasChildren = parent.children.length > 0;
    console.log('[tree-debug] Tree.insertChildrenForNode | parent.isLoaded = true;');
    debugger;
    parent.isLoaded = true;
    console.log('[tree-debug] Tree.insertChildrenForNode | this.notify();');
    debugger;
    this.notify();
    console.log('[tree-debug] Tree.insertChildrenForNode | return inserted;');
    debugger;
    return inserted;
  }
  private create(input: NodeInput<T>, parent: TreeNode<T>): TreeNode<T> {
    console.log('[tree-debug] Tree.create | enter', { input, parent });
    debugger;
    console.log(
      '[tree-debug] Tree.create | const node = new TreeNode(`${this.prefix}-${++this.serial}`, input.data, parent, 0);',
    );
    debugger;
    const node = new TreeNode(`${this.prefix}-${++this.serial}`, input.data, parent, 0);
    console.log('[tree-debug] Tree.create | node.expanded = input.expanded ?? false;');
    debugger;
    node.expanded = input.expanded ?? false;
    console.log('[tree-debug] Tree.create | node.loader = input.loader ?? null;');
    debugger;
    node.loader = input.loader ?? null;
    console.log(
      '[tree-debug] Tree.create | node.isLoaded = input.children !== undefined || !node.loader;',
    );
    debugger;
    node.isLoaded = input.children !== undefined || !node.loader;
    console.log(
      '[tree-debug] Tree.create | node.hasChildren = input.hasChildren ?? (!!input.loader || !!input.children?.length);',
    );
    debugger;
    node.hasChildren = input.hasChildren ?? (!!input.loader || !!input.children?.length);
    console.log('[tree-debug] Tree.create | this.nodes.set(node.id, node);');
    debugger;
    this.nodes.set(node.id, node);
    console.log(
      '[tree-debug] Tree.create | if (input.children) { node.children.push(...input.children.map((child) => this.create(child, node))); node.children.forEach((child, i) => (child.index',
    );
    debugger;
    if (input.children) {
      console.log(
        '[tree-debug] Tree.create | node.children.push(...input.children.map((child) => this.create(child, node)));',
      );
      debugger;
      node.children.push(
        ...input.children.map((child) => {
          console.log('[tree-debug] Tree.create callback | evaluate this.create(child, node)', {
            child,
          });
          debugger;
          return this.create(child, node);
        }),
      );
      console.log(
        '[tree-debug] Tree.create | node.children.forEach((child, i) => (child.index = i));',
      );
      debugger;
      node.children.forEach((child, i) => {
        console.log('[tree-debug] Tree.create callback | evaluate (child.index = i)', { child, i });
        debugger;
        return (child.index = i);
      });
      console.log('[tree-debug] Tree.create | node.hasChildren = node.children.length > 0;');
      debugger;
      node.hasChildren = node.children.length > 0;
    }
    console.log('[tree-debug] Tree.create | return node;');
    debugger;
    return node;
  }
  replaceChildren(parent: TreeNode<T>, inputs: readonly NodeInput<T>[]): TreeNode<T>[] {
    console.log('[tree-debug] Tree.replaceChildren | enter', { parent, inputs });
    debugger;
    console.log('[tree-debug] Tree.replaceChildren | this.assertNode(parent);');
    debugger;
    this.assertNode(parent);
    console.log(
      '[tree-debug] Tree.replaceChildren | this.pending.get(parent.id)?.controller.abort();',
    );
    debugger;
    this.pending.get(parent.id)?.controller.abort();
    console.log('[tree-debug] Tree.replaceChildren | this.pending.delete(parent.id);');
    debugger;
    this.pending.delete(parent.id);
    console.log('[tree-debug] Tree.replaceChildren | parent.loading = false;');
    debugger;
    parent.loading = false;
    console.log(
      '[tree-debug] Tree.replaceChildren | for (const child of parent.children) this.remove(child);',
    );
    debugger;
    for (const child of parent.children) {
      console.log('[tree-debug] Tree.replaceChildren | this.remove(child);');
      debugger;
      this.remove(child);
    }
    console.log('[tree-debug] Tree.replaceChildren | parent.children.length = 0;');
    debugger;
    parent.children.length = 0;
    console.log(
      '[tree-debug] Tree.replaceChildren | return this.insertChildrenForNode(parent, inputs);',
    );
    debugger;
    return this.insertChildrenForNode(parent, inputs);
  }
  /** Update an authoritative sibling listing while preserving matching nodes and expansion. */
  reconcileChildren(
    parent: TreeNode<T>,
    inputs: readonly NodeInput<T>[],
    key: (data: T) => string,
  ): TreeNode<T>[] {
    console.log('[tree-debug] Tree.reconcileChildren | enter', { parent, inputs, key });
    debugger;
    console.log('[tree-debug] Tree.reconcileChildren | this.assertNode(parent);');
    debugger;
    this.assertNode(parent);
    console.log(
      '[tree-debug] Tree.reconcileChildren | const keys = inputs.map((input) => key(input.data));',
    );
    debugger;
    const keys = inputs.map((input) => {
      console.log('[tree-debug] Tree.reconcileChildren callback | evaluate key(input.data)', {
        input,
      });
      debugger;
      return key(input.data);
    });
    console.log(
      "[tree-debug] Tree.reconcileChildren | if (new Set(keys).size !== keys.length) throw new Error('Duplicate sibling keys');",
    );
    debugger;
    if (new Set(keys).size !== keys.length) {
      console.log(
        "[tree-debug] Tree.reconcileChildren | throw new Error('Duplicate sibling keys');",
      );
      debugger;
      throw new Error('Duplicate sibling keys');
    }
    console.log(
      '[tree-debug] Tree.reconcileChildren | const existing = new Map(parent.children.map((node) => [key(node.data), node]));',
    );
    debugger;
    const existing = new Map(
      parent.children.map((node) => {
        console.log(
          '[tree-debug] Tree.reconcileChildren callback | evaluate [key(node.data), node]',
          { node },
        );
        debugger;
        return [key(node.data), node];
      }),
    );
    console.log(
      '[tree-debug] Tree.reconcileChildren | this.pending.get(parent.id)?.controller.abort();',
    );
    debugger;
    this.pending.get(parent.id)?.controller.abort();
    console.log('[tree-debug] Tree.reconcileChildren | this.pending.delete(parent.id);');
    debugger;
    this.pending.delete(parent.id);
    console.log('[tree-debug] Tree.reconcileChildren | parent.loading = false;');
    debugger;
    parent.loading = false;
    console.log(
      '[tree-debug] Tree.reconcileChildren | const children = inputs.map((input, index) => { const node = existing.get(keys[index]); if (!node) return this.create(input, parent); existing.delete(',
    );
    debugger;
    const children = inputs.map((input, index) => {
      console.log('[tree-debug] Tree.reconcileChildren callback | enter', { input, index });
      debugger;
      console.log(
        '[tree-debug] Tree.reconcileChildren callback | const node = existing.get(keys[index]);',
      );
      debugger;
      const node = existing.get(keys[index]);
      console.log(
        '[tree-debug] Tree.reconcileChildren callback | if (!node) return this.create(input, parent);',
      );
      debugger;
      if (!node) {
        console.log(
          '[tree-debug] Tree.reconcileChildren callback | return this.create(input, parent);',
        );
        debugger;
        return this.create(input, parent);
      }
      console.log('[tree-debug] Tree.reconcileChildren callback | existing.delete(keys[index]);');
      debugger;
      existing.delete(keys[index]);
      console.log('[tree-debug] Tree.reconcileChildren callback | node.data = input.data;');
      debugger;
      node.data = input.data;
      console.log(
        '[tree-debug] Tree.reconcileChildren callback | if (input.hasChildren !== undefined) node.hasChildren = input.hasChildren;',
      );
      debugger;
      if (input.hasChildren !== undefined) {
        console.log(
          '[tree-debug] Tree.reconcileChildren callback | node.hasChildren = input.hasChildren;',
        );
        debugger;
        node.hasChildren = input.hasChildren;
      }
      console.log(
        '[tree-debug] Tree.reconcileChildren callback | if (input.loader !== undefined) node.loader = input.loader;',
      );
      debugger;
      if (input.loader !== undefined) {
        console.log('[tree-debug] Tree.reconcileChildren callback | node.loader = input.loader;');
        debugger;
        node.loader = input.loader;
      }
      console.log('[tree-debug] Tree.reconcileChildren callback | return node;');
      debugger;
      return node;
    });
    console.log(
      '[tree-debug] Tree.reconcileChildren | for (const node of existing.values()) this.remove(node);',
    );
    debugger;
    for (const node of existing.values()) {
      console.log('[tree-debug] Tree.reconcileChildren | this.remove(node);');
      debugger;
      this.remove(node);
    }
    console.log(
      '[tree-debug] Tree.reconcileChildren | parent.children.splice(0, parent.children.length, ...children);',
    );
    debugger;
    parent.children.splice(0, parent.children.length, ...children);
    console.log(
      '[tree-debug] Tree.reconcileChildren | children.forEach((node, index) => (node.index = index));',
    );
    debugger;
    children.forEach((node, index) => {
      console.log('[tree-debug] Tree.reconcileChildren callback | evaluate (node.index = index)', {
        node,
        index,
      });
      debugger;
      return (node.index = index);
    });
    console.log('[tree-debug] Tree.reconcileChildren | parent.hasChildren = children.length > 0;');
    debugger;
    parent.hasChildren = children.length > 0;
    console.log('[tree-debug] Tree.reconcileChildren | parent.isLoaded = true;');
    debugger;
    parent.isLoaded = true;
    console.log('[tree-debug] Tree.reconcileChildren | this.notify();');
    debugger;
    this.notify();
    console.log('[tree-debug] Tree.reconcileChildren | return children;');
    debugger;
    return children;
  }
  private remove(node: TreeNode<T>): void {
    console.log('[tree-debug] Tree.remove | enter', { node });
    debugger;
    console.log('[tree-debug] Tree.remove | this.pending.get(node.id)?.controller.abort();');
    debugger;
    this.pending.get(node.id)?.controller.abort();
    console.log('[tree-debug] Tree.remove | this.pending.delete(node.id);');
    debugger;
    this.pending.delete(node.id);
    console.log(
      '[tree-debug] Tree.remove | for (const child of node.children) this.remove(child);',
    );
    debugger;
    for (const child of node.children) {
      console.log('[tree-debug] Tree.remove | this.remove(child);');
      debugger;
      this.remove(child);
    }
    console.log('[tree-debug] Tree.remove | this.nodes.delete(node.id);');
    debugger;
    this.nodes.delete(node.id);
  }
  expand(node: TreeNode<T>): Promise<void> {
    console.log('[tree-debug] Tree.expand | enter', { node });
    debugger;
    console.log('[tree-debug] Tree.expand | this.assertNode(node);');
    debugger;
    this.assertNode(node);
    console.log('[tree-debug] Tree.expand | node.expanded = true;');
    debugger;
    node.expanded = true;
    console.log('[tree-debug] Tree.expand | this.notify();');
    debugger;
    this.notify();
    console.log('[tree-debug] Tree.expand | return this.load(node);');
    debugger;
    return this.load(node);
  }
  collapse(node: TreeNode<T>): void {
    console.log('[tree-debug] Tree.collapse | enter', { node });
    debugger;
    console.log('[tree-debug] Tree.collapse | this.assertNode(node);');
    debugger;
    this.assertNode(node);
    console.log('[tree-debug] Tree.collapse | node.expanded = false;');
    debugger;
    node.expanded = false;
    console.log('[tree-debug] Tree.collapse | this.notify();');
    debugger;
    this.notify();
  }
  load(node: TreeNode<T>): Promise<void> {
    console.log('[tree-debug] Tree.load | enter', { node });
    debugger;
    console.log('[tree-debug] Tree.load | this.assertNode(node);');
    debugger;
    this.assertNode(node);
    console.log('[tree-debug] Tree.load | const current = this.pending.get(node.id);');
    debugger;
    const current = this.pending.get(node.id);
    console.log('[tree-debug] Tree.load | if (current) return current.promise;');
    debugger;
    if (current) {
      console.log('[tree-debug] Tree.load | return current.promise;');
      debugger;
      return current.promise;
    }
    console.log(
      '[tree-debug] Tree.load | if (node.isLoaded || !node.loader) return Promise.resolve();',
    );
    debugger;
    if (node.isLoaded || !node.loader) {
      console.log('[tree-debug] Tree.load | return Promise.resolve();');
      debugger;
      return Promise.resolve();
    }
    console.log('[tree-debug] Tree.load | const controller = new AbortController();');
    debugger;
    const controller = new AbortController();
    console.log('[tree-debug] Tree.load | node.loading = true;');
    debugger;
    node.loading = true;
    console.log('[tree-debug] Tree.load | node.error = null;');
    debugger;
    node.error = null;
    console.log(
      '[tree-debug] Tree.load | const promise = Promise.resolve() .then(() => node.loader!(node, controller.signal)) .then((inputs) => { if (!controller.signal.aborted && !this.dispo',
    );
    debugger;
    const promise = Promise.resolve()
      .then(() => {
        console.log(
          '[tree-debug] Tree.load callback | evaluate node.loader!(node, controller.signal)',
        );
        debugger;
        return node.loader!(node, controller.signal);
      })
      .then((inputs) => {
        console.log('[tree-debug] Tree.load callback | enter', { inputs });
        debugger;
        console.log(
          '[tree-debug] Tree.load callback | if (!controller.signal.aborted && !this.disposed && this.get(node.id) === node) this.insertChildrenForNode(node, inputs);',
        );
        debugger;
        if (!controller.signal.aborted && !this.disposed && this.get(node.id) === node) {
          console.log(
            '[tree-debug] Tree.load callback | this.insertChildrenForNode(node, inputs);',
          );
          debugger;
          this.insertChildrenForNode(node, inputs);
        }
      })
      .catch((error) => {
        console.log('[tree-debug] Tree.load callback | enter', { error });
        debugger;
        console.log(
          '[tree-debug] Tree.load callback | if (!controller.signal.aborted && !this.disposed) node.error = error instanceof Error ? error.message : String(error);',
        );
        debugger;
        if (!controller.signal.aborted && !this.disposed) {
          console.log(
            '[tree-debug] Tree.load callback | node.error = error instanceof Error ? error.message : String(error);',
          );
          debugger;
          node.error = error instanceof Error ? error.message : String(error);
        }
      })
      .finally(() => {
        console.log('[tree-debug] Tree.load callback | enter');
        debugger;
        console.log(
          '[tree-debug] Tree.load callback | if (this.pending.get(node.id)?.controller === controller) { this.pending.delete(node.id); node.loading = false; this.notify(); }',
        );
        debugger;
        if (this.pending.get(node.id)?.controller === controller) {
          console.log('[tree-debug] Tree.load callback | this.pending.delete(node.id);');
          debugger;
          this.pending.delete(node.id);
          console.log('[tree-debug] Tree.load callback | node.loading = false;');
          debugger;
          node.loading = false;
          console.log('[tree-debug] Tree.load callback | this.notify();');
          debugger;
          this.notify();
        }
      });
    console.log('[tree-debug] Tree.load | this.pending.set(node.id, { controller, promise });');
    debugger;
    this.pending.set(node.id, { controller, promise });
    console.log('[tree-debug] Tree.load | this.notify();');
    debugger;
    this.notify();
    console.log('[tree-debug] Tree.load | return promise;');
    debugger;
    return promise;
  }
  nextVisibleNode(node: TreeNode<T>): TreeNode<T> | null {
    console.log('[tree-debug] Tree.nextVisibleNode | enter', { node });
    debugger;
    console.log(
      '[tree-debug] Tree.nextVisibleNode | if (node.expanded && node.children.length) return node.children[0];',
    );
    debugger;
    if (node.expanded && node.children.length) {
      console.log('[tree-debug] Tree.nextVisibleNode | return node.children[0];');
      debugger;
      return node.children[0];
    }
    console.log('[tree-debug] Tree.nextVisibleNode | let current = node;');
    debugger;
    let current = node;
    console.log(
      '[tree-debug] Tree.nextVisibleNode | while (current.parent) { const sibling = current.parent.children[current.index + 1]; if (sibling) return sibling; current = current.parent; }',
    );
    debugger;
    while (current.parent) {
      console.log(
        '[tree-debug] Tree.nextVisibleNode | const sibling = current.parent.children[current.index + 1];',
      );
      debugger;
      const sibling = current.parent.children[current.index + 1];
      console.log('[tree-debug] Tree.nextVisibleNode | if (sibling) return sibling;');
      debugger;
      if (sibling) {
        console.log('[tree-debug] Tree.nextVisibleNode | return sibling;');
        debugger;
        return sibling;
      }
      console.log('[tree-debug] Tree.nextVisibleNode | current = current.parent;');
      debugger;
      current = current.parent;
    }
    console.log('[tree-debug] Tree.nextVisibleNode | return null;');
    debugger;
    return null;
  }
  previousVisibleNode(node: TreeNode<T>): TreeNode<T> | null {
    console.log('[tree-debug] Tree.previousVisibleNode | enter', { node });
    debugger;
    console.log('[tree-debug] Tree.previousVisibleNode | if (!node.parent) return null;');
    debugger;
    if (!node.parent) {
      console.log('[tree-debug] Tree.previousVisibleNode | return null;');
      debugger;
      return null;
    }
    console.log(
      '[tree-debug] Tree.previousVisibleNode | if (node.index === 0) return node.parent === this.root ? null : node.parent;',
    );
    debugger;
    if (node.index === 0) {
      console.log(
        '[tree-debug] Tree.previousVisibleNode | return node.parent === this.root ? null : node.parent;',
      );
      debugger;
      return node.parent === this.root ? null : node.parent;
    }
    console.log(
      '[tree-debug] Tree.previousVisibleNode | let current = node.parent.children[node.index - 1];',
    );
    debugger;
    let current = node.parent.children[node.index - 1];
    console.log(
      '[tree-debug] Tree.previousVisibleNode | while (current.expanded && current.children.length) current = current.children[current.children.length - 1];',
    );
    debugger;
    while (current.expanded && current.children.length) {
      console.log(
        '[tree-debug] Tree.previousVisibleNode | current = current.children[current.children.length - 1];',
      );
      debugger;
      current = current.children[current.children.length - 1];
    }
    console.log('[tree-debug] Tree.previousVisibleNode | return current;');
    debugger;
    return current;
  }
  visibleNodes(): TreeNode<T>[] {
    console.log('[tree-debug] Tree.visibleNodes | enter');
    debugger;
    console.log('[tree-debug] Tree.visibleNodes | const result: TreeNode<T>[] = [];');
    debugger;
    const result: TreeNode<T>[] = [];
    console.log(
      '[tree-debug] Tree.visibleNodes | let node: TreeNode<T> | null = this.root.children[0] ?? null;',
    );
    debugger;
    let node: TreeNode<T> | null = this.root.children[0] ?? null;
    console.log(
      '[tree-debug] Tree.visibleNodes | while (node) { result.push(node); node = this.nextVisibleNode(node); }',
    );
    debugger;
    while (node) {
      console.log('[tree-debug] Tree.visibleNodes | result.push(node);');
      debugger;
      result.push(node);
      console.log('[tree-debug] Tree.visibleNodes | node = this.nextVisibleNode(node);');
      debugger;
      node = this.nextVisibleNode(node);
    }
    console.log('[tree-debug] Tree.visibleNodes | return result;');
    debugger;
    return result;
  }
  dispose(): void {
    console.log('[tree-debug] Tree.dispose | enter');
    debugger;
    console.log('[tree-debug] Tree.dispose | this.disposed = true;');
    debugger;
    this.disposed = true;
    console.log(
      '[tree-debug] Tree.dispose | for (const item of this.pending.values()) item.controller.abort();',
    );
    debugger;
    for (const item of this.pending.values()) {
      console.log('[tree-debug] Tree.dispose | item.controller.abort();');
      debugger;
      item.controller.abort();
    }
    console.log('[tree-debug] Tree.dispose | this.pending.clear();');
    debugger;
    this.pending.clear();
    console.log('[tree-debug] Tree.dispose | this.nodes.clear();');
    debugger;
    this.nodes.clear();
    console.log('[tree-debug] Tree.dispose | this.listeners.clear();');
    debugger;
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
    console.log('[tree-debug] TreeHelper.constructor | enter');
    debugger;
    console.log(
      '[tree-debug] TreeHelper.constructor | this.browsing.subscribe(() => this.notify());',
    );
    debugger;
    this.browsing.subscribe(() => {
      console.log('[tree-debug] TreeHelper.constructor callback | evaluate this.notify()');
      debugger;
      return this.notify();
    });
  }
  get isSearchMode(): boolean {
    console.log('[tree-debug] TreeHelper.isSearchMode | enter');
    debugger;
    console.log('[tree-debug] TreeHelper.isSearchMode | return this.searchTree !== null;');
    debugger;
    return this.searchTree !== null;
  }
  get tree(): Tree<T> {
    console.log('[tree-debug] TreeHelper.tree | enter');
    debugger;
    console.log('[tree-debug] TreeHelper.tree | return this.searchTree ?? this.browsing;');
    debugger;
    return this.searchTree ?? this.browsing;
  }
  subscribe(listener: () => void): () => void {
    console.log('[tree-debug] TreeHelper.subscribe | enter', { listener });
    debugger;
    console.log('[tree-debug] TreeHelper.subscribe | this.listeners.add(listener);');
    debugger;
    this.listeners.add(listener);
    console.log(
      '[tree-debug] TreeHelper.subscribe | return () => this.listeners.delete(listener);',
    );
    debugger;
    return () => {
      console.log(
        '[tree-debug] TreeHelper.subscribe callback | evaluate this.listeners.delete(listener)',
      );
      debugger;
      return this.listeners.delete(listener);
    };
  }
  notify(): void {
    console.log('[tree-debug] TreeHelper.notify | enter');
    debugger;
    console.log(
      '[tree-debug] TreeHelper.notify | if (!this.disposed) for (const listener of this.listeners) listener();',
    );
    debugger;
    if (!this.disposed) {
      console.log(
        '[tree-debug] TreeHelper.notify | for (const listener of this.listeners) listener();',
      );
      debugger;
      for (const listener of this.listeners) {
        console.log('[tree-debug] TreeHelper.notify | listener();');
        debugger;
        listener();
      }
    }
  }
  expand(node: TreeNode<T>): Promise<void> {
    console.log('[tree-debug] TreeHelper.expand | enter', { node });
    debugger;
    console.log('[tree-debug] TreeHelper.expand | return this.tree.expand(node);');
    debugger;
    return this.tree.expand(node);
  }
  /** Call when host data changes during an outstanding search request. */
  invalidateSearchResults(): void {
    console.log('[tree-debug] TreeHelper.invalidateSearchResults | enter');
    debugger;
    console.log('[tree-debug] TreeHelper.invalidateSearchResults | ++this.revision;');
    debugger;
    ++this.revision;
  }
  beginSearch(): SearchRequestToken {
    console.log('[tree-debug] TreeHelper.beginSearch | enter');
    debugger;
    console.log(
      "[tree-debug] TreeHelper.beginSearch | if (this.disposed) throw new Error('Cannot search a disposed tree helper');",
    );
    debugger;
    if (this.disposed) {
      console.log(
        "[tree-debug] TreeHelper.beginSearch | throw new Error('Cannot search a disposed tree helper');",
      );
      debugger;
      throw new Error('Cannot search a disposed tree helper');
    }
    console.log('[tree-debug] TreeHelper.beginSearch | this.searchTree?.dispose();');
    debugger;
    this.searchTree?.dispose();
    console.log('[tree-debug] TreeHelper.beginSearch | this.searchTree = new Tree<T>();');
    debugger;
    this.searchTree = new Tree<T>();
    console.log(
      '[tree-debug] TreeHelper.beginSearch | this.searchTree.subscribe(() => this.notify());',
    );
    debugger;
    this.searchTree.subscribe(() => {
      console.log('[tree-debug] TreeHelper.beginSearch callback | evaluate this.notify()');
      debugger;
      return this.notify();
    });
    console.log(
      '[tree-debug] TreeHelper.beginSearch | this.activeSearch = Object.freeze({ revision: this.revision });',
    );
    debugger;
    this.activeSearch = Object.freeze({ revision: this.revision });
    console.log('[tree-debug] TreeHelper.beginSearch | this.notify();');
    debugger;
    this.notify();
    console.log('[tree-debug] TreeHelper.beginSearch | return this.activeSearch;');
    debugger;
    return this.activeSearch;
  }
  applySearchResults(
    inputs: readonly NodeInput<T>[],
    token: SearchRequestToken,
  ): SearchApplyResult {
    console.log('[tree-debug] TreeHelper.applySearchResults | enter', { inputs, token });
    debugger;
    console.log(
      "[tree-debug] TreeHelper.applySearchResults | if (this.disposed || !this.searchTree || token !== this.activeSearch) return 'superseded';",
    );
    debugger;
    if (this.disposed || !this.searchTree || token !== this.activeSearch) {
      console.log("[tree-debug] TreeHelper.applySearchResults | return 'superseded';");
      debugger;
      return 'superseded';
    }
    console.log(
      "[tree-debug] TreeHelper.applySearchResults | if (token.revision !== this.revision) return 'data-changed';",
    );
    debugger;
    if (token.revision !== this.revision) {
      console.log("[tree-debug] TreeHelper.applySearchResults | return 'data-changed';");
      debugger;
      return 'data-changed';
    }
    console.log(
      '[tree-debug] TreeHelper.applySearchResults | const complete = (input: NodeInput<T>): NodeInput<T> => ({ data: input.data, expanded: true, loader: null, children: (input.children ?? []).map(comple',
    );
    debugger;
    const complete = (input: NodeInput<T>): NodeInput<T> => {
      console.log(
        '[tree-debug] TreeHelper.applySearchResults callback | evaluate ({ data: input.data, expanded: true, loader: null, children: (input.children ?? []).map(complete), })',
        { input },
      );
      debugger;
      return {
        data: input.data,
        expanded: true,
        loader: null,
        children: (input.children ?? []).map(complete),
      };
    };
    console.log('[tree-debug] TreeHelper.applySearchResults | this.activeSearch = null;');
    debugger;
    this.activeSearch = null;
    console.log(
      '[tree-debug] TreeHelper.applySearchResults | this.searchTree.replaceChildren(this.searchTree.root, inputs.map(complete));',
    );
    debugger;
    this.searchTree.replaceChildren(this.searchTree.root, inputs.map(complete));
    console.log("[tree-debug] TreeHelper.applySearchResults | return 'applied';");
    debugger;
    return 'applied';
  }
  restoreBrowsing(): void {
    console.log('[tree-debug] TreeHelper.restoreBrowsing | enter');
    debugger;
    console.log('[tree-debug] TreeHelper.restoreBrowsing | if (this.disposed) return;');
    debugger;
    if (this.disposed) {
      console.log('[tree-debug] TreeHelper.restoreBrowsing | return;');
      debugger;
      return;
    }
    console.log('[tree-debug] TreeHelper.restoreBrowsing | this.activeSearch = null;');
    debugger;
    this.activeSearch = null;
    console.log('[tree-debug] TreeHelper.restoreBrowsing | this.searchTree?.dispose();');
    debugger;
    this.searchTree?.dispose();
    console.log('[tree-debug] TreeHelper.restoreBrowsing | this.searchTree = null;');
    debugger;
    this.searchTree = null;
    console.log('[tree-debug] TreeHelper.restoreBrowsing | this.notify();');
    debugger;
    this.notify();
  }
  dispose(): void {
    console.log('[tree-debug] TreeHelper.dispose | enter');
    debugger;
    console.log('[tree-debug] TreeHelper.dispose | this.disposed = true;');
    debugger;
    this.disposed = true;
    console.log('[tree-debug] TreeHelper.dispose | this.activeSearch = null;');
    debugger;
    this.activeSearch = null;
    console.log('[tree-debug] TreeHelper.dispose | this.browsing.dispose();');
    debugger;
    this.browsing.dispose();
    console.log('[tree-debug] TreeHelper.dispose | this.searchTree?.dispose();');
    debugger;
    this.searchTree?.dispose();
    console.log('[tree-debug] TreeHelper.dispose | this.listeners.clear();');
    debugger;
    this.listeners.clear();
  }
}
