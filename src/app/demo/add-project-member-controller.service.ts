import { Injectable, OnDestroy } from '@angular/core';
import {
  Observable, Subject, Subscription, defer, filter, finalize, map, of,
  startWith, switchMap, take, takeUntil, tap, throwIfEmpty, timeout,
} from 'rxjs';
import { TreeHelper } from '../tree/tree.helper';
import { TreeCounts, TreeNode, TreeSelectionStatus } from '../tree/tree.model';
import { OrganisationDataSource } from './organisation-data-source';
import { FakeDataShape, FakeSearchResult, MembershipResponse } from './organisation.model';

export interface ProjectMemberSearchResult { nodes: TreeNode[]; hasTooManyResults: boolean; }

type NodeContext = (
  | { level: 'Chain'; chainId: string }
  | { level: 'Branch'; chainId: string; branchId: string }
  | { level: 'Employee'; chainId: string; branchId: string; employeeId: string }
) & { search: boolean };

@Injectable()
export class AddProjectMemberControllerService implements OnDestroy {
  private readonly SEARCH_RESULT_LIMIT = 300;
  private readonly REQUEST_TIMEOUT_MS = 10000;
  private treeHelper = new TreeHelper();
  private root?: TreeNode;
  private searchRoot?: TreeNode;
  private readonly contexts = new WeakMap<TreeNode, NodeContext>();
  private readonly entityNodes = new Map<string, Set<TreeNode>>();
  private readonly chainViews = new Map<string, Set<TreeNode>>();
  private readonly pendingMutations = new Map<string, Subscription>();
  private readonly chainRevisions = new Map<string, number>();
  private revision = 0;
  private readonly mutationSettled = new Subject<void>();
  private readonly destroyed = new Subject<void>();
  private disposed = false;
  selectionReady = false;

  constructor(private readonly source: OrganisationDataSource) {}

  initializeTree(): TreeNode {
    this.treeHelper.destroy();
    this.treeHelper = new TreeHelper();
    this.entityNodes.clear();
    this.chainViews.clear();
    this.searchRoot = undefined;
    this.selectionReady = false;
    this.root = this.treeHelper.initializeTree();
    this.treeHelper.configureLazyLoad(this.root, () => this.readConsistently(() => this.source.getChains()).pipe(
      map(chains => chains.map(chain => this.createNode(chain, {
        level: 'Chain', chainId: chain.id, search: false,
      }, chain))),
      tap(() => { this.selectionReady = true; }),
    ));
    return this.root;
  }

  loadChildren(treeRoot: TreeNode, node: TreeNode): void {
    if (!this.disposed && treeRoot === this.root) this.treeHelper.loadChildren(node);
  }

  expandNode(treeRoot: TreeNode, node: TreeNode): void {
    if (!this.disposed && treeRoot === this.root) this.treeHelper.toggleExpansion(node);
  }

  toggleSearchNodeExpansion(node: TreeNode): void {
    if (!this.disposed) this.treeHelper.toggleExpansion(node);
  }

  updateSelection(treeRoot: TreeNode, node: TreeNode): void {
    if (treeRoot === this.root) this.toggleMembership(node);
  }

  toggleSearchSelection(node: TreeNode): void {
    if (this.contexts.get(node)?.level === 'Employee') this.toggleMembership(node);
  }

  private toggleMembership(node: TreeNode): void {
    const context = this.contexts.get(node);
    if (this.disposed || !this.selectionReady || !context || context.level === 'Chain'
      || !node.selectionProps.showCheckbox || !node.selectionProps.selectionAllowed
      || this.pendingMutations.has(context.chainId)) return;
    const desired = node.selectionProps.selectionStatus !== TreeSelectionStatus.FullySelected;
    const subscription = new Subscription();
    this.pendingMutations.set(context.chainId, subscription);
    this.bumpRevision(context.chainId);
    for (const view of this.chainViews.get(context.chainId) ?? []) view.pending = true;
    for (const view of this.entityNodes.get(this.entityKey(context)) ?? []) view.mutationError = undefined;
    subscription.add(defer(() => context.level === 'Employee'
      ? this.source.setPersonMembership(context.branchId, context.employeeId, desired)
      : this.source.setBranchMembership(context.branchId, desired)).pipe(
      take(1), throwIfEmpty(() => new Error('No confirmation received. Please retry.')),
      timeout(this.REQUEST_TIMEOUT_MS),
      finalize(() => {
        this.pendingMutations.delete(context.chainId);
        this.bumpRevision(context.chainId);
        for (const view of this.chainViews.get(context.chainId) ?? []) view.pending = false;
        this.mutationSettled.next();
      }),
    ).subscribe({
      next: response => this.applyMembershipResponse(response),
      error: error => {
        const message = error instanceof Error ? error.message : String(error);
        for (const view of this.entityNodes.get(this.entityKey(context)) ?? []) view.mutationError = message;
      },
    }));
  }

  private applyMembershipResponse(response: MembershipResponse): void {
    for (const node of this.chainViews.get(response.chain.id) ?? []) {
      const context = this.contexts.get(node)!;
      if (context.level === 'Chain') this.treeHelper.applyCounts(node, response.chain, !context.search);
      else if (context.branchId === response.branchId) {
        if (context.level === 'Branch') {
          this.treeHelper.applyCounts(node, response.branch, !context.search);
          node.mutationError = undefined;
          node.selectionProps.selectionAllowed = !context.search && response.branch.total > 0;
        } else if (response.employeeId === undefined || context.employeeId === response.employeeId) {
          this.treeHelper.markMember(node, response.isProjectMember);
          node.mutationError = undefined;
        }
      }
    }
  }

  /** Wait for relevant writes, and retry a read if a write crossed its lifetime. */
  private readConsistently<T>(request: () => Observable<T>, chainId?: string): Observable<T> {
    const pending = (): boolean => chainId === undefined ? this.pendingMutations.size > 0 : this.pendingMutations.has(chainId);
    const revision = (): number => chainId === undefined ? this.revision : this.chainRevisions.get(chainId) ?? 0;
    return defer(() => this.mutationSettled.pipe(
      startWith(undefined), filter(() => !pending()), take(1),
      switchMap(() => {
        const startedAt = revision();
        return defer(request).pipe(
          take(1), throwIfEmpty(() => new Error('No data received. Please retry.')),
          switchMap(value => !pending() && startedAt === revision()
            ? of(value) : this.readConsistently(request, chainId)),
        );
      }),
      takeUntil(this.destroyed),
    ));
  }

  private bumpRevision(chainId: string): void {
    this.revision++;
    this.chainRevisions.set(chainId, (this.chainRevisions.get(chainId) ?? 0) + 1);
  }

  searchEmployees(term: string): Observable<ProjectMemberSearchResult> {
    return this.readConsistently(() => this.source.searchEmployees(term, this.SEARCH_RESULT_LIMIT)).pipe(
      timeout(this.REQUEST_TIMEOUT_MS),
      map(response => {
        this.clearSearch();
        const nodes = this.buildSearchTree(response.results);
        return { nodes, hasTooManyResults: response.hasTooManyResults };
      }),
    );
  }

  clearSearch(): void {
    const unregister = (node: TreeNode): void => {
      const context = this.contexts.get(node);
      if (context) {
        const key = this.entityKey(context);
        const entities = this.entityNodes.get(key);
        entities?.delete(node);
        if (!entities?.size) this.entityNodes.delete(key);
        const chain = this.chainViews.get(context.chainId);
        chain?.delete(node);
        if (!chain?.size) this.chainViews.delete(context.chainId);
        this.contexts.delete(node);
      }
      node.children?.forEach(unregister);
    };
    this.searchRoot?.children?.forEach(unregister);
    this.searchRoot = undefined;
  }

  private buildSearchTree(results: FakeSearchResult[]): TreeNode[] {
    this.searchRoot = this.treeHelper.buildExpandedTree(results, result => {
      const chainContext: NodeContext = { level: 'Chain', chainId: result.chain.id, search: true };
      const branchContext: NodeContext = { ...chainContext, level: 'Branch', branchId: result.branch.id };
      const personContext: NodeContext = { ...branchContext, level: 'Employee', employeeId: result.person.id };
      return [
        { key: this.entityKey(chainContext), create: () => this.createNode(result.chain, chainContext) },
        { key: this.entityKey(branchContext), create: () => this.createNode(result.branch, branchContext) },
        { key: this.entityKey(personContext), create: () => this.createNode(result.person, personContext, undefined, result.isProjectMember) },
      ];
    });
    return this.searchRoot.children!;
  }

  private createNode(record: FakeDataShape, context: NodeContext, counts?: TreeCounts, member = false): TreeNode {
    const leaf = context.level === 'Employee';
    const node = this.treeHelper.createNode(
      record.name, !leaf, leaf || (!context.search && context.level === 'Branch' && !!counts?.total),
      record, !context.search || leaf,
    );
    this.contexts.set(node, context);
    const key = this.entityKey(context);
    const entities = this.entityNodes.get(key) ?? new Set<TreeNode>();
    entities.add(node); this.entityNodes.set(key, entities);
    const views = this.chainViews.get(context.chainId) ?? new Set<TreeNode>();
    views.add(node); this.chainViews.set(context.chainId, views);
    node.pending = this.pendingMutations.has(context.chainId);
    if (counts) this.treeHelper.applyCounts(node, counts, !context.search);
    if (leaf) this.treeHelper.markMember(node, member);
    if (!context.search && context.level === 'Chain') {
      this.treeHelper.configureLazyLoad(node, (_nodeId, chainId) =>
        this.readConsistently(() => this.source.getBranches(chainId), chainId).pipe(
          map(branches => branches.map(branch => this.createNode(branch, {
            level: 'Branch', chainId, branchId: branch.id, search: false,
          }, branch))),
        ), [context.chainId]);
    } else if (!context.search && context.level === 'Branch') {
      this.treeHelper.configureLazyLoad(node, (_nodeId, branchId) =>
        this.readConsistently(() => this.source.getEmployees(branchId), context.chainId).pipe(
          map(employees => employees.map(employee => this.createNode(employee, {
            ...context, level: 'Employee', employeeId: employee.id,
          }, undefined, employee.isProjectMember))),
        ), [context.branchId]);
    }
    return node;
  }

  private entityKey(context: NodeContext): string {
    if (context.level === 'Chain') return JSON.stringify(['Chain', context.chainId]);
    if (context.level === 'Branch') return JSON.stringify(['Branch', context.branchId]);
    return JSON.stringify(['Employee', context.branchId, context.employeeId]);
  }

  ngOnDestroy(): void {
    this.disposed = true;
    this.treeHelper.destroy();
    this.destroyed.next();
    this.destroyed.complete();
    for (const subscription of this.pendingMutations.values()) subscription.unsubscribe();
    this.pendingMutations.clear();
    this.mutationSettled.complete();
    this.clearSearch();
    this.entityNodes.clear();
    this.chainViews.clear();
  }
}
