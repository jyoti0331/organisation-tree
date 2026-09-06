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
    console.log('[tree-debug] OrganisationController.browsing | enter');
    debugger;
    console.log('[tree-debug] OrganisationController.browsing | return this.helper.browsing;');
    debugger;
    return this.helper.browsing;
  }
  get searchTree(): Tree<OrganisationNode> | null {
    console.log('[tree-debug] OrganisationController.searchTree | enter');
    debugger;
    console.log('[tree-debug] OrganisationController.searchTree | return this.helper.searchTree;');
    debugger;
    return this.helper.searchTree;
  }
  readonly presentation: TreePresentation<OrganisationNode> = {
    label: (node) => {
      console.log('[tree-debug] OrganisationController callback | evaluate node.data.value.label', {
        node,
      });
      debugger;
      return node.data.value.label;
    },
    checkbox: (node) => {
      console.log(
        "[tree-debug] OrganisationController callback | evaluate this.isSearchMode && node.data.kind !== 'person' ? null : { state: this.state(node), disabled: this.disabled(node), label: 'Project membership for ' +",
        { node },
      );
      debugger;
      return this.isSearchMode && node.data.kind !== 'person'
        ? null
        : {
            state: this.state(node),
            disabled: this.disabled(node),
            label: 'Project membership for ' + node.data.value.label,
          };
    },
    description: (node) => {
      console.log(
        "[tree-debug] OrganisationController callback | evaluate !this.isSearchMode && node.data.kind !== 'person' ? `${node.data.value.members} / ${node.data.value.total}` : null",
        { node },
      );
      debugger;
      return !this.isSearchMode && node.data.kind !== 'person'
        ? `${node.data.value.members} / ${node.data.value.total}`
        : null;
    },
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
    console.log('[tree-debug] OrganisationController.constructor | enter', {
      source,
      projectId,
      options,
    });
    debugger;
    console.log(
      '[tree-debug] OrganisationController.constructor | this.timeoutMs = options.timeoutMs ?? 10000;',
    );
    debugger;
    this.timeoutMs = options.timeoutMs ?? 10000;
    console.log(
      '[tree-debug] OrganisationController.constructor | this.helper.subscribe(() => { if (!this.disposed) for (const listener of this.listeners) listener(); });',
    );
    debugger;
    this.helper.subscribe(() => {
      console.log('[tree-debug] OrganisationController.constructor callback | enter');
      debugger;
      console.log(
        '[tree-debug] OrganisationController.constructor callback | if (!this.disposed) for (const listener of this.listeners) listener();',
      );
      debugger;
      if (!this.disposed) {
        console.log(
          '[tree-debug] OrganisationController.constructor callback | for (const listener of this.listeners) listener();',
        );
        debugger;
        for (const listener of this.listeners) {
          console.log('[tree-debug] OrganisationController.constructor callback | listener();');
          debugger;
          listener();
        }
      }
    });
  }
  get isSearchMode(): boolean {
    console.log('[tree-debug] OrganisationController.isSearchMode | enter');
    debugger;
    console.log(
      '[tree-debug] OrganisationController.isSearchMode | return this.helper.isSearchMode;',
    );
    debugger;
    return this.helper.isSearchMode;
  }
  get tree(): Tree<OrganisationNode> {
    console.log('[tree-debug] OrganisationController.tree | enter');
    debugger;
    console.log('[tree-debug] OrganisationController.tree | return this.helper.tree;');
    debugger;
    return this.helper.tree;
  }
  subscribe(listener: () => void): () => void {
    console.log('[tree-debug] OrganisationController.subscribe | enter', { listener });
    debugger;
    console.log('[tree-debug] OrganisationController.subscribe | this.listeners.add(listener);');
    debugger;
    this.listeners.add(listener);
    console.log(
      '[tree-debug] OrganisationController.subscribe | return () => this.listeners.delete(listener);',
    );
    debugger;
    return () => {
      console.log(
        '[tree-debug] OrganisationController.subscribe callback | evaluate this.listeners.delete(listener)',
      );
      debugger;
      return this.listeners.delete(listener);
    };
  }
  private emit(): void {
    console.log('[tree-debug] OrganisationController.emit | enter');
    debugger;
    console.log('[tree-debug] OrganisationController.emit | this.helper.notify();');
    debugger;
    this.helper.notify();
  }
  private async request<T>(promise: Promise<T>): Promise<T> {
    console.log('[tree-debug] OrganisationController.request | enter', { promise });
    debugger;
    console.log(
      '[tree-debug] OrganisationController.request | let timer: ReturnType<typeof setTimeout> | undefined;',
    );
    debugger;
    let timer: ReturnType<typeof setTimeout> | undefined;
    console.log(
      "[tree-debug] OrganisationController.request | try { return await Promise.race([ promise, new Promise<never>((_, reject) => { timer = setTimeout( () => reject(new Error('Request timed out. Refresh ",
    );
    debugger;
    try {
      console.log(
        "[tree-debug] OrganisationController.request | return await Promise.race([ promise, new Promise<never>((_, reject) => { timer = setTimeout( () => reject(new Error('Request timed out. Refresh to con",
      );
      debugger;
      return await Promise.race([
        promise,
        new Promise<never>((_, reject) => {
          console.log('[tree-debug] OrganisationController.request callback | enter', {
            _,
            reject,
          });
          debugger;
          console.log(
            "[tree-debug] OrganisationController.request callback | timer = setTimeout( () => reject(new Error('Request timed out. Refresh to confirm membership.')), this.timeoutMs, );",
          );
          debugger;
          timer = setTimeout(() => {
            console.log(
              "[tree-debug] OrganisationController.request callback callback | evaluate reject(new Error('Request timed out. Refresh to confirm membership.'))",
            );
            debugger;
            return reject(new Error('Request timed out. Refresh to confirm membership.'));
          }, this.timeoutMs);
        }),
      ]);
    } finally {
      console.log('[tree-debug] OrganisationController.request | clearTimeout(timer);');
      debugger;
      clearTimeout(timer);
    }
  }
  private async stableRead<T>(read: () => Promise<T>): Promise<T> {
    console.log('[tree-debug] OrganisationController.stableRead | enter', { read });
    debugger;
    console.log(
      '[tree-debug] OrganisationController.stableRead | for (;;) { const generation = this.generation; const result = await this.request(read()); if (this.disposed || generation === this.generation) return ',
    );
    debugger;
    for (;;) {
      console.log(
        '[tree-debug] OrganisationController.stableRead | const generation = this.generation;',
      );
      debugger;
      const generation = this.generation;
      console.log(
        '[tree-debug] OrganisationController.stableRead | const result = await this.request(read());',
      );
      debugger;
      const result = await this.request(read());
      console.log(
        '[tree-debug] OrganisationController.stableRead | if (this.disposed || generation === this.generation) return result;',
      );
      debugger;
      if (this.disposed || generation === this.generation) {
        console.log('[tree-debug] OrganisationController.stableRead | return result;');
        debugger;
        return result;
      }
    }
  }
  private failure(error: unknown): void {
    console.log('[tree-debug] OrganisationController.failure | enter', { error });
    debugger;
    console.log(
      '[tree-debug] OrganisationController.failure | this.error = error instanceof Error ? error.message : String(error);',
    );
    debugger;
    this.error = error instanceof Error ? error.message : String(error);
  }
  async initialize(): Promise<void> {
    console.log('[tree-debug] OrganisationController.initialize | enter');
    debugger;
    console.log(
      '[tree-debug] OrganisationController.initialize | if (this.initialLoading || this.browsing.roots.length || this.disposed) return;',
    );
    debugger;
    if (this.initialLoading || this.browsing.roots.length || this.disposed) {
      console.log('[tree-debug] OrganisationController.initialize | return;');
      debugger;
      return;
    }
    console.log('[tree-debug] OrganisationController.initialize | this.initialLoading = true;');
    debugger;
    this.initialLoading = true;
    console.log('[tree-debug] OrganisationController.initialize | this.error = null;');
    debugger;
    this.error = null;
    console.log('[tree-debug] OrganisationController.initialize | this.emit();');
    debugger;
    this.emit();
    console.log(
      '[tree-debug] OrganisationController.initialize | try { const values = await this.stableRead(() => this.source.getChains(this.projectId)); if (this.disposed) return; const nodes = this.browsing.insert',
    );
    debugger;
    try {
      console.log(
        '[tree-debug] OrganisationController.initialize | const values = await this.stableRead(() => this.source.getChains(this.projectId));',
      );
      debugger;
      const values = await this.stableRead(() => {
        console.log(
          '[tree-debug] OrganisationController.initialize callback | evaluate this.source.getChains(this.projectId)',
        );
        debugger;
        return this.source.getChains(this.projectId);
      });
      console.log('[tree-debug] OrganisationController.initialize | if (this.disposed) return;');
      debugger;
      if (this.disposed) {
        console.log('[tree-debug] OrganisationController.initialize | return;');
        debugger;
        return;
      }
      console.log(
        '[tree-debug] OrganisationController.initialize | const nodes = this.browsing.insertNodesAtRoot(values.map((value) => this.chainInput(value)));',
      );
      debugger;
      const nodes = this.browsing.insertNodesAtRoot(
        values.map((value) => {
          console.log(
            '[tree-debug] OrganisationController.initialize callback | evaluate this.chainInput(value)',
            { value },
          );
          debugger;
          return this.chainInput(value);
        }),
      );
      console.log(
        "[tree-debug] OrganisationController.initialize | nodes.forEach((node) => { if (node.data.kind === 'chain') this.chains.set(node.data.value.chainId, node); });",
      );
      debugger;
      nodes.forEach((node) => {
        console.log('[tree-debug] OrganisationController.initialize callback | enter', { node });
        debugger;
        console.log(
          "[tree-debug] OrganisationController.initialize callback | if (node.data.kind === 'chain') this.chains.set(node.data.value.chainId, node);",
        );
        debugger;
        if (node.data.kind === 'chain') {
          console.log(
            '[tree-debug] OrganisationController.initialize callback | this.chains.set(node.data.value.chainId, node);',
          );
          debugger;
          this.chains.set(node.data.value.chainId, node);
        }
      });
    } catch (error) {
      console.log('[tree-debug] OrganisationController.initialize | this.failure(error);');
      debugger;
      this.failure(error);
    } finally {
      console.log('[tree-debug] OrganisationController.initialize | this.initialLoading = false;');
      debugger;
      this.initialLoading = false;
      console.log('[tree-debug] OrganisationController.initialize | this.emit();');
      debugger;
      this.emit();
    }
  }
  private chainInput(value: Chain): NodeInput<OrganisationNode> {
    console.log('[tree-debug] OrganisationController.chainInput | enter', { value });
    debugger;
    console.log(
      "[tree-debug] OrganisationController.chainInput | return { data: { kind: 'chain', value }, // Person totals do not tell us whether a chain contains empty branches. hasChildren: true, loader: async (_n",
    );
    debugger;
    return {
      data: { kind: 'chain', value },
      // Person totals do not tell us whether a chain contains empty branches.
      hasChildren: true,
      loader: async (_node, signal) => {
        console.log('[tree-debug] OrganisationController.chainInput callback | enter', {
          _node,
          signal,
        });
        debugger;
        console.log(
          '[tree-debug] OrganisationController.chainInput callback | const rows = await this.stableRead(() => this.source.getBranches(this.projectId, value.chainId), );',
        );
        debugger;
        const rows = await this.stableRead(() => {
          console.log(
            '[tree-debug] OrganisationController.chainInput callback callback | evaluate this.source.getBranches(this.projectId, value.chainId)',
          );
          debugger;
          return this.source.getBranches(this.projectId, value.chainId);
        });
        console.log(
          '[tree-debug] OrganisationController.chainInput callback | if (signal.aborted) return [];',
        );
        debugger;
        if (signal.aborted) {
          console.log('[tree-debug] OrganisationController.chainInput callback | return [];');
          debugger;
          return [];
        }
        console.log(
          '[tree-debug] OrganisationController.chainInput callback | return rows.map((branch) => this.branchInput(branch));',
        );
        debugger;
        return rows.map((branch) => {
          console.log(
            '[tree-debug] OrganisationController.chainInput callback callback | evaluate this.branchInput(branch)',
            { branch },
          );
          debugger;
          return this.branchInput(branch);
        });
      },
    };
  }
  private branchInput(value: Branch): NodeInput<OrganisationNode> {
    console.log('[tree-debug] OrganisationController.branchInput | enter', { value });
    debugger;
    console.log(
      "[tree-debug] OrganisationController.branchInput | return { data: { kind: 'branch', value }, hasChildren: value.total > 0, loader: async (_node, signal) => { const rows = await this.stableRead(() => th",
    );
    debugger;
    return {
      data: { kind: 'branch', value },
      hasChildren: value.total > 0,
      loader: async (_node, signal) => {
        console.log('[tree-debug] OrganisationController.branchInput callback | enter', {
          _node,
          signal,
        });
        debugger;
        console.log(
          '[tree-debug] OrganisationController.branchInput callback | const rows = await this.stableRead(() => this.source.getBranchPersons(this.projectId, value.branchId), );',
        );
        debugger;
        const rows = await this.stableRead(() => {
          console.log(
            '[tree-debug] OrganisationController.branchInput callback callback | evaluate this.source.getBranchPersons(this.projectId, value.branchId)',
          );
          debugger;
          return this.source.getBranchPersons(this.projectId, value.branchId);
        });
        console.log(
          '[tree-debug] OrganisationController.branchInput callback | if (signal.aborted) return [];',
        );
        debugger;
        if (signal.aborted) {
          console.log('[tree-debug] OrganisationController.branchInput callback | return [];');
          debugger;
          return [];
        }
        console.log(
          "[tree-debug] OrganisationController.branchInput callback | return rows.map((person) => ({ data: { kind: 'person' as const, value: person } }));",
        );
        debugger;
        return rows.map((person) => {
          console.log(
            "[tree-debug] OrganisationController.branchInput callback callback | evaluate ({ data: { kind: 'person' as const, value: person } })",
            { person },
          );
          debugger;
          return { data: { kind: 'person' as const, value: person } };
        });
      },
    };
  }
  private index(): void {
    console.log('[tree-debug] OrganisationController.index | enter');
    debugger;
    console.log('[tree-debug] OrganisationController.index | this.branches.clear();');
    debugger;
    this.branches.clear();
    console.log('[tree-debug] OrganisationController.index | this.persons.clear();');
    debugger;
    this.persons.clear();
    console.log(
      '[tree-debug] OrganisationController.index | const walk = (nodes: readonly TreeNode<OrganisationNode>[], browse: boolean): void => { for (const node of nodes) { const data = node.data; if (data.k',
    );
    debugger;
    const walk = (nodes: readonly TreeNode<OrganisationNode>[], browse: boolean): void => {
      console.log('[tree-debug] OrganisationController.index callback | enter', { nodes, browse });
      debugger;
      console.log(
        "[tree-debug] OrganisationController.index callback | for (const node of nodes) { const data = node.data; if (data.kind === 'branch' && browse) this.branches.set(data.value.branchId, node); if (data.kind ",
      );
      debugger;
      for (const node of nodes) {
        console.log('[tree-debug] OrganisationController.index callback | const data = node.data;');
        debugger;
        const data = node.data;
        console.log(
          "[tree-debug] OrganisationController.index callback | if (data.kind === 'branch' && browse) this.branches.set(data.value.branchId, node);",
        );
        debugger;
        if (data.kind === 'branch' && browse) {
          console.log(
            '[tree-debug] OrganisationController.index callback | this.branches.set(data.value.branchId, node);',
          );
          debugger;
          this.branches.set(data.value.branchId, node);
        }
        console.log(
          "[tree-debug] OrganisationController.index callback | if (data.kind === 'person') { const key = personKey(data.value.branchId, data.value.employeeId); const nodes = this.persons.get(key) ?? new Set(); nod",
        );
        debugger;
        if (data.kind === 'person') {
          console.log(
            '[tree-debug] OrganisationController.index callback | const key = personKey(data.value.branchId, data.value.employeeId);',
          );
          debugger;
          const key = personKey(data.value.branchId, data.value.employeeId);
          console.log(
            '[tree-debug] OrganisationController.index callback | const nodes = this.persons.get(key) ?? new Set();',
          );
          debugger;
          const nodes = this.persons.get(key) ?? new Set();
          console.log('[tree-debug] OrganisationController.index callback | nodes.add(node);');
          debugger;
          nodes.add(node);
          console.log(
            '[tree-debug] OrganisationController.index callback | this.persons.set(key, nodes);',
          );
          debugger;
          this.persons.set(key, nodes);
        }
        console.log(
          '[tree-debug] OrganisationController.index callback | walk(node.children, browse);',
        );
        debugger;
        walk(node.children, browse);
      }
    };
    console.log('[tree-debug] OrganisationController.index | walk(this.browsing.roots, true);');
    debugger;
    walk(this.browsing.roots, true);
    console.log(
      '[tree-debug] OrganisationController.index | if (this.searchTree) walk(this.searchTree.roots, false);',
    );
    debugger;
    if (this.searchTree) {
      console.log(
        '[tree-debug] OrganisationController.index | walk(this.searchTree.roots, false);',
      );
      debugger;
      walk(this.searchTree.roots, false);
    }
  }
  async expand(node: TreeNode<OrganisationNode>): Promise<void> {
    console.log('[tree-debug] OrganisationController.expand | enter', { node });
    debugger;
    console.log('[tree-debug] OrganisationController.expand | await this.tree.expand(node);');
    debugger;
    await this.tree.expand(node);
    console.log('[tree-debug] OrganisationController.expand | this.index();');
    debugger;
    this.index();
    console.log(
      '[tree-debug] OrganisationController.expand | if (this.dirty.size && !this.pending) await this.refresh(false);',
    );
    debugger;
    if (this.dirty.size && !this.pending) {
      console.log('[tree-debug] OrganisationController.expand | await this.refresh(false);');
      debugger;
      await this.refresh(false);
    }
  }
  private get pending(): number {
    console.log('[tree-debug] OrganisationController.pending | enter');
    debugger;
    console.log(
      '[tree-debug] OrganisationController.pending | return this.branchWrites.size + this.personWrites.size;',
    );
    debugger;
    return this.branchWrites.size + this.personWrites.size;
  }
  disabled(node: TreeNode<OrganisationNode>): boolean {
    console.log('[tree-debug] OrganisationController.disabled | enter', { node });
    debugger;
    console.log('[tree-debug] OrganisationController.disabled | const data = node.data;');
    debugger;
    const data = node.data;
    console.log(
      "[tree-debug] OrganisationController.disabled | if (data.kind === 'chain') return true;",
    );
    debugger;
    if (data.kind === 'chain') {
      console.log('[tree-debug] OrganisationController.disabled | return true;');
      debugger;
      return true;
    }
    console.log(
      '[tree-debug] OrganisationController.disabled | const branchId = data.value.branchId;',
    );
    debugger;
    const branchId = data.value.branchId;
    console.log(
      '[tree-debug] OrganisationController.disabled | if (this.branchWrites.has(branchId)) return true;',
    );
    debugger;
    if (this.branchWrites.has(branchId)) {
      console.log('[tree-debug] OrganisationController.disabled | return true;');
      debugger;
      return true;
    }
    console.log(
      "[tree-debug] OrganisationController.disabled | if (data.kind === 'person') return this.personWrites.has(personKey(branchId, data.value.employeeId));",
    );
    debugger;
    if (data.kind === 'person') {
      console.log(
        '[tree-debug] OrganisationController.disabled | return this.personWrites.has(personKey(branchId, data.value.employeeId));',
      );
      debugger;
      return this.personWrites.has(personKey(branchId, data.value.employeeId));
    }
    console.log(
      '[tree-debug] OrganisationController.disabled | return !data.value.total || [...this.personWrites.values()].includes(branchId);',
    );
    debugger;
    return !data.value.total || [...this.personWrites.values()].includes(branchId);
  }
  state(node: TreeNode<OrganisationNode>): CheckState {
    console.log('[tree-debug] OrganisationController.state | enter', { node });
    debugger;
    console.log(
      "[tree-debug] OrganisationController.state | return node.data.kind === 'person' ? node.data.value.isProjectMember ? 'checked' : 'unchecked' : checkState({ members: node.data.value.members ?? 0, t",
    );
    debugger;
    return node.data.kind === 'person'
      ? node.data.value.isProjectMember
        ? 'checked'
        : 'unchecked'
      : checkState({ members: node.data.value.members ?? 0, total: node.data.value.total ?? 0 });
  }
  async toggle(node: TreeNode<OrganisationNode>): Promise<void> {
    console.log('[tree-debug] OrganisationController.toggle | enter', { node });
    debugger;
    console.log(
      "[tree-debug] OrganisationController.toggle | if ( this.disposed || this.disabled(node) || node.data.kind === 'chain' || (this.isSearchMode && node.data.kind !== 'person') ) return;",
    );
    debugger;
    if (
      this.disposed ||
      this.disabled(node) ||
      node.data.kind === 'chain' ||
      (this.isSearchMode && node.data.kind !== 'person')
    ) {
      console.log('[tree-debug] OrganisationController.toggle | return;');
      debugger;
      return;
    }
    console.log('[tree-debug] OrganisationController.toggle | this.index();');
    debugger;
    this.index();
    console.log('[tree-debug] OrganisationController.toggle | const data = node.data;');
    debugger;
    const data = node.data;
    console.log(
      '[tree-debug] OrganisationController.toggle | const branchId = data.value.branchId;',
    );
    debugger;
    const branchId = data.value.branchId;
    console.log(
      '[tree-debug] OrganisationController.toggle | const branch = this.branches.get(branchId)?.data;',
    );
    debugger;
    const branch = this.branches.get(branchId)?.data;
    console.log(
      "[tree-debug] OrganisationController.toggle | const chainId = data.kind === 'branch' ? data.value.chainId : branch?.kind === 'branch' ? branch.value.chainId : node.parent?.data.kind === 'branch' ?",
    );
    debugger;
    const chainId =
      data.kind === 'branch'
        ? data.value.chainId
        : branch?.kind === 'branch'
          ? branch.value.chainId
          : node.parent?.data.kind === 'branch'
            ? node.parent.data.value.chainId
            : null;
    console.log('[tree-debug] OrganisationController.toggle | if (!chainId) return;');
    debugger;
    if (!chainId) {
      console.log('[tree-debug] OrganisationController.toggle | return;');
      debugger;
      return;
    }
    console.log(
      "[tree-debug] OrganisationController.toggle | const key = data.kind === 'person' ? personKey(branchId, data.value.employeeId) : null;",
    );
    debugger;
    const key = data.kind === 'person' ? personKey(branchId, data.value.employeeId) : null;
    console.log(
      '[tree-debug] OrganisationController.toggle | if (key) this.personWrites.set(key, branchId); else this.branchWrites.add(branchId);',
    );
    debugger;
    if (key) {
      console.log(
        '[tree-debug] OrganisationController.toggle | this.personWrites.set(key, branchId);',
      );
      debugger;
      this.personWrites.set(key, branchId);
    } else {
      console.log('[tree-debug] OrganisationController.toggle | this.branchWrites.add(branchId);');
      debugger;
      this.branchWrites.add(branchId);
    }
    console.log('[tree-debug] OrganisationController.toggle | this.dirty.set(branchId, chainId);');
    debugger;
    this.dirty.set(branchId, chainId);
    console.log('[tree-debug] OrganisationController.toggle | ++this.generation;');
    debugger;
    ++this.generation;
    console.log(
      '[tree-debug] OrganisationController.toggle | this.helper.invalidateSearchResults();',
    );
    debugger;
    this.helper.invalidateSearchResults();
    console.log('[tree-debug] OrganisationController.toggle | this.error = null;');
    debugger;
    this.error = null;
    console.log('[tree-debug] OrganisationController.toggle | this.emit();');
    debugger;
    this.emit();
    console.log(
      "[tree-debug] OrganisationController.toggle | const selected = this.state(node) === 'checked';",
    );
    debugger;
    const selected = this.state(node) === 'checked';
    console.log(
      "[tree-debug] OrganisationController.toggle | try { const result = await this.request( data.kind === 'person' ? this.source.togglePersonMembership(this.projectId, branchId, data.value.employeeId) ",
    );
    debugger;
    try {
      console.log(
        "[tree-debug] OrganisationController.toggle | const result = await this.request( data.kind === 'person' ? this.source.togglePersonMembership(this.projectId, branchId, data.value.employeeId) : this",
      );
      debugger;
      const result = await this.request(
        data.kind === 'person'
          ? this.source.togglePersonMembership(this.projectId, branchId, data.value.employeeId)
          : this.source.updateBranchMembership(
              this.projectId,
              branchId,
              selected ? 'removeAll' : this.state(node) === 'mixed' ? 'addRemaining' : 'addAll',
            ),
      );
      console.log('[tree-debug] OrganisationController.toggle | if (this.disposed) return;');
      debugger;
      if (this.disposed) {
        console.log('[tree-debug] OrganisationController.toggle | return;');
        debugger;
        return;
      }
      console.log('[tree-debug] OrganisationController.toggle | this.index();');
      debugger;
      this.index();
      console.log(
        '[tree-debug] OrganisationController.toggle | this.updateCounts(chainId, branchId, result);',
      );
      debugger;
      this.updateCounts(chainId, branchId, result);
      console.log(
        "[tree-debug] OrganisationController.toggle | for (const [personId, nodes] of this.persons) for (const personNode of nodes) if ( personNode.data.kind === 'person' && (key ? personId === key : pers",
      );
      debugger;
      for (const [personId, nodes] of this.persons) {
        console.log(
          "[tree-debug] OrganisationController.toggle | for (const personNode of nodes) if ( personNode.data.kind === 'person' && (key ? personId === key : personNode.data.value.branchId === branchId) ) per",
        );
        debugger;
        for (const personNode of nodes) {
          console.log(
            "[tree-debug] OrganisationController.toggle | if ( personNode.data.kind === 'person' && (key ? personId === key : personNode.data.value.branchId === branchId) ) personNode.data = { kind: 'person',",
          );
          debugger;
          if (
            personNode.data.kind === 'person' &&
            (key ? personId === key : personNode.data.value.branchId === branchId)
          ) {
            console.log(
              "[tree-debug] OrganisationController.toggle | personNode.data = { kind: 'person', value: { ...personNode.data.value, isProjectMember: !selected }, };",
            );
            debugger;
            personNode.data = {
              kind: 'person',
              value: { ...personNode.data.value, isProjectMember: !selected },
            };
          }
        }
      }
    } catch (error) {
      console.log('[tree-debug] OrganisationController.toggle | this.failure(error);');
      debugger;
      this.failure(error);
    } finally {
      console.log('[tree-debug] OrganisationController.toggle | ++this.generation;');
      debugger;
      ++this.generation;
      console.log(
        '[tree-debug] OrganisationController.toggle | this.helper.invalidateSearchResults();',
      );
      debugger;
      this.helper.invalidateSearchResults();
      console.log(
        '[tree-debug] OrganisationController.toggle | if (key) this.personWrites.delete(key); else this.branchWrites.delete(branchId);',
      );
      debugger;
      if (key) {
        console.log('[tree-debug] OrganisationController.toggle | this.personWrites.delete(key);');
        debugger;
        this.personWrites.delete(key);
      } else {
        console.log(
          '[tree-debug] OrganisationController.toggle | this.branchWrites.delete(branchId);',
        );
        debugger;
        this.branchWrites.delete(branchId);
      }
      console.log('[tree-debug] OrganisationController.toggle | this.emit();');
      debugger;
      this.emit();
      console.log(
        '[tree-debug] OrganisationController.toggle | if (!this.pending && !this.disposed) await this.refresh(false);',
      );
      debugger;
      if (!this.pending && !this.disposed) {
        console.log('[tree-debug] OrganisationController.toggle | await this.refresh(false);');
        debugger;
        await this.refresh(false);
      }
    }
  }
  private updateCounts(chainId: Id, branchId: Id, result: MutationResult): void {
    console.log('[tree-debug] OrganisationController.updateCounts | enter', {
      chainId,
      branchId,
      result,
    });
    debugger;
    console.log(
      '[tree-debug] OrganisationController.updateCounts | const chainNode = this.chains.get(chainId);',
    );
    debugger;
    const chainNode = this.chains.get(chainId);
    console.log(
      "[tree-debug] OrganisationController.updateCounts | if (chainNode?.data.kind === 'chain') chainNode.data = { kind: 'chain', value: { ...chainNode.data.value, ...result.chain } };",
    );
    debugger;
    if (chainNode?.data.kind === 'chain') {
      console.log(
        "[tree-debug] OrganisationController.updateCounts | chainNode.data = { kind: 'chain', value: { ...chainNode.data.value, ...result.chain } };",
      );
      debugger;
      chainNode.data = { kind: 'chain', value: { ...chainNode.data.value, ...result.chain } };
    }
    console.log(
      '[tree-debug] OrganisationController.updateCounts | const branchNode = this.branches.get(branchId);',
    );
    debugger;
    const branchNode = this.branches.get(branchId);
    console.log(
      "[tree-debug] OrganisationController.updateCounts | if (branchNode?.data.kind === 'branch') branchNode.data = { kind: 'branch', value: { ...branchNode.data.value, ...result.branch } };",
    );
    debugger;
    if (branchNode?.data.kind === 'branch') {
      console.log(
        "[tree-debug] OrganisationController.updateCounts | branchNode.data = { kind: 'branch', value: { ...branchNode.data.value, ...result.branch } };",
      );
      debugger;
      branchNode.data = { kind: 'branch', value: { ...branchNode.data.value, ...result.branch } };
    }
  }
  /** Reconcile snapshots only across a write-free interval. No automatic toggle retries. */
  async refresh(clearError = true): Promise<void> {
    console.log('[tree-debug] OrganisationController.refresh | enter', { clearError });
    debugger;
    console.log('[tree-debug] OrganisationController.refresh | if (clearError) this.error = null;');
    debugger;
    if (clearError) {
      console.log('[tree-debug] OrganisationController.refresh | this.error = null;');
      debugger;
      this.error = null;
    }
    console.log(
      '[tree-debug] OrganisationController.refresh | if (this.disposed || this.pending) return;',
    );
    debugger;
    if (this.disposed || this.pending) {
      console.log('[tree-debug] OrganisationController.refresh | return;');
      debugger;
      return;
    }
    console.log(
      '[tree-debug] OrganisationController.refresh | const generation = this.generation;',
    );
    debugger;
    const generation = this.generation;
    console.log(
      '[tree-debug] OrganisationController.refresh | const token = ++this.reconcileGeneration;',
    );
    debugger;
    const token = ++this.reconcileGeneration;
    console.log('[tree-debug] OrganisationController.refresh | this.refreshing = true;');
    debugger;
    this.refreshing = true;
    console.log('[tree-debug] OrganisationController.refresh | this.emit();');
    debugger;
    this.emit();
    console.log('[tree-debug] OrganisationController.refresh | this.index();');
    debugger;
    this.index();
    console.log('[tree-debug] OrganisationController.refresh | const dirty = new Map(this.dirty);');
    debugger;
    const dirty = new Map(this.dirty);
    console.log(
      "[tree-debug] OrganisationController.refresh | if (!dirty.size) { for (const node of this.branches.values()) if (node.data.kind === 'branch') dirty.set(node.data.value.branchId, node.data.value.cha",
    );
    debugger;
    if (!dirty.size) {
      console.log(
        "[tree-debug] OrganisationController.refresh | for (const node of this.branches.values()) if (node.data.kind === 'branch') dirty.set(node.data.value.branchId, node.data.value.chainId);",
      );
      debugger;
      for (const node of this.branches.values()) {
        console.log(
          "[tree-debug] OrganisationController.refresh | if (node.data.kind === 'branch') dirty.set(node.data.value.branchId, node.data.value.chainId);",
        );
        debugger;
        if (node.data.kind === 'branch') {
          console.log(
            '[tree-debug] OrganisationController.refresh | dirty.set(node.data.value.branchId, node.data.value.chainId);',
          );
          debugger;
          dirty.set(node.data.value.branchId, node.data.value.chainId);
        }
      }
      console.log(
        "[tree-debug] OrganisationController.refresh | for (const chain of this.searchTree?.roots ?? []) for (const node of chain.children) if (node.data.kind === 'branch') dirty.set(node.data.value.branch",
      );
      debugger;
      for (const chain of this.searchTree?.roots ?? []) {
        console.log(
          "[tree-debug] OrganisationController.refresh | for (const node of chain.children) if (node.data.kind === 'branch') dirty.set(node.data.value.branchId, node.data.value.chainId);",
        );
        debugger;
        for (const node of chain.children) {
          console.log(
            "[tree-debug] OrganisationController.refresh | if (node.data.kind === 'branch') dirty.set(node.data.value.branchId, node.data.value.chainId);",
          );
          debugger;
          if (node.data.kind === 'branch') {
            console.log(
              '[tree-debug] OrganisationController.refresh | dirty.set(node.data.value.branchId, node.data.value.chainId);',
            );
            debugger;
            dirty.set(node.data.value.branchId, node.data.value.chainId);
          }
        }
      }
    }
    console.log(
      '[tree-debug] OrganisationController.refresh | try { const chains = await this.request(this.source.getChains(this.projectId)); const chainIds = new Set(dirty.values()); if (clearError) for (const n',
    );
    debugger;
    try {
      console.log(
        '[tree-debug] OrganisationController.refresh | const chains = await this.request(this.source.getChains(this.projectId));',
      );
      debugger;
      const chains = await this.request(this.source.getChains(this.projectId));
      console.log(
        '[tree-debug] OrganisationController.refresh | const chainIds = new Set(dirty.values());',
      );
      debugger;
      const chainIds = new Set(dirty.values());
      console.log(
        "[tree-debug] OrganisationController.refresh | if (clearError) for (const node of this.chains.values()) if (node.isLoaded && node.data.kind === 'chain') chainIds.add(node.data.value.chainId);",
      );
      debugger;
      if (clearError) {
        console.log(
          "[tree-debug] OrganisationController.refresh | for (const node of this.chains.values()) if (node.isLoaded && node.data.kind === 'chain') chainIds.add(node.data.value.chainId);",
        );
        debugger;
        for (const node of this.chains.values()) {
          console.log(
            "[tree-debug] OrganisationController.refresh | if (node.isLoaded && node.data.kind === 'chain') chainIds.add(node.data.value.chainId);",
          );
          debugger;
          if (node.isLoaded && node.data.kind === 'chain') {
            console.log(
              '[tree-debug] OrganisationController.refresh | chainIds.add(node.data.value.chainId);',
            );
            debugger;
            chainIds.add(node.data.value.chainId);
          }
        }
      }
      console.log(
        '[tree-debug] OrganisationController.refresh | const branchGroups = await Promise.all( [...chainIds].map(async (chainId) => ({ chainId, rows: await this.request(this.source.getBranches(this.project',
      );
      debugger;
      const branchGroups = await Promise.all(
        [...chainIds].map(async (chainId) => {
          console.log(
            '[tree-debug] OrganisationController.refresh callback | evaluate ({ chainId, rows: await this.request(this.source.getBranches(this.projectId, chainId)), })',
            { chainId },
          );
          debugger;
          return {
            chainId,
            rows: await this.request(this.source.getBranches(this.projectId, chainId)),
          };
        }),
      );
      console.log(
        '[tree-debug] OrganisationController.refresh | const persons = await Promise.all( [...dirty.keys()].map(async (branchId) => ({ branchId, rows: await this.request(this.source.getBranchPersons(this.p',
      );
      debugger;
      const persons = await Promise.all(
        [...dirty.keys()].map(async (branchId) => {
          console.log(
            '[tree-debug] OrganisationController.refresh callback | evaluate ({ branchId, rows: await this.request(this.source.getBranchPersons(this.projectId, branchId)), })',
            { branchId },
          );
          debugger;
          return {
            branchId,
            rows: await this.request(this.source.getBranchPersons(this.projectId, branchId)),
          };
        }),
      );
      console.log(
        '[tree-debug] OrganisationController.refresh | if ( this.disposed || generation !== this.generation || token !== this.reconcileGeneration || this.pending ) return;',
      );
      debugger;
      if (
        this.disposed ||
        generation !== this.generation ||
        token !== this.reconcileGeneration ||
        this.pending
      ) {
        console.log('[tree-debug] OrganisationController.refresh | return;');
        debugger;
        return;
      }
      console.log(
        "[tree-debug] OrganisationController.refresh | this.browsing.reconcileChildren( this.browsing.root, chains.map((chain) => this.chainInput(chain)), (data) => (data.kind === 'chain' ? data.value.chai",
      );
      debugger;
      this.browsing.reconcileChildren(
        this.browsing.root,
        chains.map((chain) => {
          console.log(
            '[tree-debug] OrganisationController.refresh callback | evaluate this.chainInput(chain)',
            { chain },
          );
          debugger;
          return this.chainInput(chain);
        }),
        (data) => {
          console.log(
            "[tree-debug] OrganisationController.refresh callback | evaluate (data.kind === 'chain' ? data.value.chainId : '')",
            { data },
          );
          debugger;
          return data.kind === 'chain' ? data.value.chainId : '';
        },
      );
      console.log('[tree-debug] OrganisationController.refresh | this.chains.clear();');
      debugger;
      this.chains.clear();
      console.log(
        "[tree-debug] OrganisationController.refresh | for (const node of this.browsing.roots) if (node.data.kind === 'chain') this.chains.set(node.data.value.chainId, node);",
      );
      debugger;
      for (const node of this.browsing.roots) {
        console.log(
          "[tree-debug] OrganisationController.refresh | if (node.data.kind === 'chain') this.chains.set(node.data.value.chainId, node);",
        );
        debugger;
        if (node.data.kind === 'chain') {
          console.log(
            '[tree-debug] OrganisationController.refresh | this.chains.set(node.data.value.chainId, node);',
          );
          debugger;
          this.chains.set(node.data.value.chainId, node);
        }
      }
      console.log(
        '[tree-debug] OrganisationController.refresh | for (const group of branchGroups) { const node = this.chains.get(group.chainId); if (node?.isLoaded) this.browsing.reconcileChildren( node, group.rows',
      );
      debugger;
      for (const group of branchGroups) {
        console.log(
          '[tree-debug] OrganisationController.refresh | const node = this.chains.get(group.chainId);',
        );
        debugger;
        const node = this.chains.get(group.chainId);
        console.log(
          "[tree-debug] OrganisationController.refresh | if (node?.isLoaded) this.browsing.reconcileChildren( node, group.rows.map((branch) => this.branchInput(branch)), (data) => (data.kind === 'branch' ? d",
        );
        debugger;
        if (node?.isLoaded) {
          console.log(
            "[tree-debug] OrganisationController.refresh | this.browsing.reconcileChildren( node, group.rows.map((branch) => this.branchInput(branch)), (data) => (data.kind === 'branch' ? data.value.branchId :",
          );
          debugger;
          this.browsing.reconcileChildren(
            node,
            group.rows.map((branch) => {
              console.log(
                '[tree-debug] OrganisationController.refresh callback | evaluate this.branchInput(branch)',
                { branch },
              );
              debugger;
              return this.branchInput(branch);
            }),
            (data) => {
              console.log(
                "[tree-debug] OrganisationController.refresh callback | evaluate (data.kind === 'branch' ? data.value.branchId : '')",
                { data },
              );
              debugger;
              return data.kind === 'branch' ? data.value.branchId : '';
            },
          );
        }
      }
      console.log('[tree-debug] OrganisationController.refresh | this.index();');
      debugger;
      this.index();
      console.log(
        '[tree-debug] OrganisationController.refresh | for (const group of persons) { const branch = this.branches.get(group.branchId); if (branch?.isLoaded) this.browsing.reconcileChildren( branch, group.',
      );
      debugger;
      for (const group of persons) {
        console.log(
          '[tree-debug] OrganisationController.refresh | const branch = this.branches.get(group.branchId);',
        );
        debugger;
        const branch = this.branches.get(group.branchId);
        console.log(
          "[tree-debug] OrganisationController.refresh | if (branch?.isLoaded) this.browsing.reconcileChildren( branch, group.rows.map((value) => ({ data: { kind: 'person' as const, value } })), (data) => da",
        );
        debugger;
        if (branch?.isLoaded) {
          console.log(
            "[tree-debug] OrganisationController.refresh | this.browsing.reconcileChildren( branch, group.rows.map((value) => ({ data: { kind: 'person' as const, value } })), (data) => data.kind === 'person' ?",
          );
          debugger;
          this.browsing.reconcileChildren(
            branch,
            group.rows.map((value) => {
              console.log(
                "[tree-debug] OrganisationController.refresh callback | evaluate ({ data: { kind: 'person' as const, value } })",
                { value },
              );
              debugger;
              return { data: { kind: 'person' as const, value } };
            }),
            (data) => {
              console.log(
                "[tree-debug] OrganisationController.refresh callback | evaluate data.kind === 'person' ? personKey(data.value.branchId, data.value.employeeId) : ''",
                { data },
              );
              debugger;
              return data.kind === 'person'
                ? personKey(data.value.branchId, data.value.employeeId)
                : '';
            },
          );
        }
        console.log(
          '[tree-debug] OrganisationController.refresh | const existing = new Map( group.rows.map((person) => [personKey(person.branchId, person.employeeId), person]), );',
        );
        debugger;
        const existing = new Map(
          group.rows.map((person) => {
            console.log(
              '[tree-debug] OrganisationController.refresh callback | evaluate [personKey(person.branchId, person.employeeId), person]',
              { person },
            );
            debugger;
            return [personKey(person.branchId, person.employeeId), person];
          }),
        );
        console.log(
          "[tree-debug] OrganisationController.refresh | for (const [key, nodes] of this.persons) { const value = existing.get(key); if (value) for (const node of nodes) node.data = { kind: 'person', value: ",
        );
        debugger;
        for (const [key, nodes] of this.persons) {
          console.log(
            '[tree-debug] OrganisationController.refresh | const value = existing.get(key);',
          );
          debugger;
          const value = existing.get(key);
          console.log(
            "[tree-debug] OrganisationController.refresh | if (value) for (const node of nodes) node.data = { kind: 'person', value: { ...value } };",
          );
          debugger;
          if (value) {
            console.log(
              "[tree-debug] OrganisationController.refresh | for (const node of nodes) node.data = { kind: 'person', value: { ...value } };",
            );
            debugger;
            for (const node of nodes) {
              console.log(
                "[tree-debug] OrganisationController.refresh | node.data = { kind: 'person', value: { ...value } };",
              );
              debugger;
              node.data = { kind: 'person', value: { ...value } };
            }
          }
        }
      }
      console.log('[tree-debug] OrganisationController.refresh | this.index();');
      debugger;
      this.index();
      console.log(
        '[tree-debug] OrganisationController.refresh | for (const branchId of dirty.keys()) this.dirty.delete(branchId);',
      );
      debugger;
      for (const branchId of dirty.keys()) {
        console.log('[tree-debug] OrganisationController.refresh | this.dirty.delete(branchId);');
        debugger;
        this.dirty.delete(branchId);
      }
    } catch (error) {
      console.log('[tree-debug] OrganisationController.refresh | this.failure(error);');
      debugger;
      this.failure(error);
    } finally {
      console.log(
        '[tree-debug] OrganisationController.refresh | if (token === this.reconcileGeneration) { this.refreshing = false; this.emit(); }',
      );
      debugger;
      if (token === this.reconcileGeneration) {
        console.log('[tree-debug] OrganisationController.refresh | this.refreshing = false;');
        debugger;
        this.refreshing = false;
        console.log('[tree-debug] OrganisationController.refresh | this.emit();');
        debugger;
        this.emit();
      }
    }
  }
  beginSearch(): SearchRequestToken {
    console.log('[tree-debug] OrganisationController.beginSearch | enter');
    debugger;
    console.log(
      '[tree-debug] OrganisationController.beginSearch | return this.helper.beginSearch();',
    );
    debugger;
    return this.helper.beginSearch();
  }
  /** Domain grouping belongs to this application, not the reusable tree. */
  applySearchResults(rows: readonly SearchRow[], token: SearchRequestToken): SearchApplyResult {
    console.log('[tree-debug] OrganisationController.applySearchResults | enter', { rows, token });
    debugger;
    console.log(
      '[tree-debug] OrganisationController.applySearchResults | const chains = new Map<Id, NodeInput<OrganisationNode>>();',
    );
    debugger;
    const chains = new Map<Id, NodeInput<OrganisationNode>>();
    console.log(
      '[tree-debug] OrganisationController.applySearchResults | const branches = new Map<Id, NodeInput<OrganisationNode>>();',
    );
    debugger;
    const branches = new Map<Id, NodeInput<OrganisationNode>>();
    console.log(
      '[tree-debug] OrganisationController.applySearchResults | const people = new Set<string>();',
    );
    debugger;
    const people = new Set<string>();
    console.log(
      "[tree-debug] OrganisationController.applySearchResults | for (const row of rows) { let chain = chains.get(row.chain.chainId); if (!chain) { chain = { data: { kind: 'chain', value: row.chain }, expanded: true",
    );
    debugger;
    for (const row of rows) {
      console.log(
        '[tree-debug] OrganisationController.applySearchResults | let chain = chains.get(row.chain.chainId);',
      );
      debugger;
      let chain = chains.get(row.chain.chainId);
      console.log(
        "[tree-debug] OrganisationController.applySearchResults | if (!chain) { chain = { data: { kind: 'chain', value: row.chain }, expanded: true, children: [] }; chains.set(row.chain.chainId, chain); }",
      );
      debugger;
      if (!chain) {
        console.log(
          "[tree-debug] OrganisationController.applySearchResults | chain = { data: { kind: 'chain', value: row.chain }, expanded: true, children: [] };",
        );
        debugger;
        chain = { data: { kind: 'chain', value: row.chain }, expanded: true, children: [] };
        console.log(
          '[tree-debug] OrganisationController.applySearchResults | chains.set(row.chain.chainId, chain);',
        );
        debugger;
        chains.set(row.chain.chainId, chain);
      }
      console.log(
        '[tree-debug] OrganisationController.applySearchResults | let branch = branches.get(row.branch.branchId);',
      );
      debugger;
      let branch = branches.get(row.branch.branchId);
      console.log(
        "[tree-debug] OrganisationController.applySearchResults | if (!branch) { branch = { data: { kind: 'branch', value: row.branch }, expanded: true, children: [] }; branches.set(row.branch.branchId, branch); (cha",
      );
      debugger;
      if (!branch) {
        console.log(
          "[tree-debug] OrganisationController.applySearchResults | branch = { data: { kind: 'branch', value: row.branch }, expanded: true, children: [] };",
        );
        debugger;
        branch = { data: { kind: 'branch', value: row.branch }, expanded: true, children: [] };
        console.log(
          '[tree-debug] OrganisationController.applySearchResults | branches.set(row.branch.branchId, branch);',
        );
        debugger;
        branches.set(row.branch.branchId, branch);
        console.log(
          '[tree-debug] OrganisationController.applySearchResults | (chain.children as NodeInput<OrganisationNode>[]).push(branch);',
        );
        debugger;
        (chain.children as NodeInput<OrganisationNode>[]).push(branch);
      }
      console.log(
        '[tree-debug] OrganisationController.applySearchResults | const key = personKey(row.person.branchId, row.person.employeeId);',
      );
      debugger;
      const key = personKey(row.person.branchId, row.person.employeeId);
      console.log(
        "[tree-debug] OrganisationController.applySearchResults | if (!people.has(key)) { people.add(key); (branch.children as NodeInput<OrganisationNode>[]).push({ data: { kind: 'person', value: row.person }, }); }",
      );
      debugger;
      if (!people.has(key)) {
        console.log('[tree-debug] OrganisationController.applySearchResults | people.add(key);');
        debugger;
        people.add(key);
        console.log(
          "[tree-debug] OrganisationController.applySearchResults | (branch.children as NodeInput<OrganisationNode>[]).push({ data: { kind: 'person', value: row.person }, });",
        );
        debugger;
        (branch.children as NodeInput<OrganisationNode>[]).push({
          data: { kind: 'person', value: row.person },
        });
      }
    }
    console.log(
      '[tree-debug] OrganisationController.applySearchResults | const result = this.helper.applySearchResults([...chains.values()], token);',
    );
    debugger;
    const result = this.helper.applySearchResults([...chains.values()], token);
    console.log(
      "[tree-debug] OrganisationController.applySearchResults | if (result !== 'applied') return result;",
    );
    debugger;
    if (result !== 'applied') {
      console.log('[tree-debug] OrganisationController.applySearchResults | return result;');
      debugger;
      return result;
    }
    console.log('[tree-debug] OrganisationController.applySearchResults | this.index();');
    debugger;
    this.index();
    console.log('[tree-debug] OrganisationController.applySearchResults | this.emit();');
    debugger;
    this.emit();
    console.log(
      '[tree-debug] OrganisationController.applySearchResults | if (this.dirty.size && !this.pending) void this.refresh(false);',
    );
    debugger;
    if (this.dirty.size && !this.pending) {
      console.log(
        '[tree-debug] OrganisationController.applySearchResults | void this.refresh(false);',
      );
      debugger;
      void this.refresh(false);
    }
    console.log("[tree-debug] OrganisationController.applySearchResults | return 'applied';");
    debugger;
    return 'applied';
  }
  /** Return immediately to cached browsing; reconcile outstanding membership if needed. */
  async restoreBrowsing(): Promise<void> {
    console.log('[tree-debug] OrganisationController.restoreBrowsing | enter');
    debugger;
    console.log('[tree-debug] OrganisationController.restoreBrowsing | if (this.disposed) return;');
    debugger;
    if (this.disposed) {
      console.log('[tree-debug] OrganisationController.restoreBrowsing | return;');
      debugger;
      return;
    }
    console.log(
      '[tree-debug] OrganisationController.restoreBrowsing | this.helper.restoreBrowsing();',
    );
    debugger;
    this.helper.restoreBrowsing();
    console.log('[tree-debug] OrganisationController.restoreBrowsing | this.index();');
    debugger;
    this.index();
    console.log('[tree-debug] OrganisationController.restoreBrowsing | this.emit();');
    debugger;
    this.emit();
    console.log(
      '[tree-debug] OrganisationController.restoreBrowsing | if (this.dirty.size) await this.refresh(false);',
    );
    debugger;
    if (this.dirty.size) {
      console.log(
        '[tree-debug] OrganisationController.restoreBrowsing | await this.refresh(false);',
      );
      debugger;
      await this.refresh(false);
    }
  }
  dispose(): void {
    console.log('[tree-debug] OrganisationController.dispose | enter');
    debugger;
    console.log('[tree-debug] OrganisationController.dispose | this.disposed = true;');
    debugger;
    this.disposed = true;
    console.log('[tree-debug] OrganisationController.dispose | this.helper.dispose();');
    debugger;
    this.helper.dispose();
    console.log('[tree-debug] OrganisationController.dispose | this.listeners.clear();');
    debugger;
    this.listeners.clear();
  }
}
