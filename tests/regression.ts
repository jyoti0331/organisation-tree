import '@angular/compiler';
import { strict as assert } from 'node:assert';
import { EMPTY, NEVER, Observable, Subject, firstValueFrom, of, throwError } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';
import { TreeHelper } from '../src/app/tree/tree.helper';
import { TreeNode, TreeSelectionStatus as Status } from '../src/app/tree/tree.model';
import { TreeComponent } from '../src/app/tree/tree.component';
import { TreeRowComponent } from '../src/app/tree/tree-row.component';
import { TriStateCheckboxComponent } from '../src/app/tree/tri-state-checkbox.component';
import { AddProjectMemberControllerService } from '../src/app/demo/add-project-member-controller.service';
import { WeekViewFakeDataService } from '../src/app/demo/demo-data-source';
import { OrganisationDataSource } from '../src/app/demo/organisation-data-source';
import { BranchMembershipRecord, ChainRecord, EmployeeMembershipRecord, EmployeeSearchResponse, FakeSearchResult, MembershipResponse } from '../src/app/demo/organisation.model';

let passed = 0;
async function test(name: string, run: () => void | Promise<void>): Promise<void> {
  await run(); passed++; console.log(`✓ ${name}`);
}
function virtual(run: (scheduler: TestScheduler) => void): void {
  const scheduler = new TestScheduler((actual, expected) => assert.deepEqual(actual, expected));
  scheduler.run(() => run(scheduler));
}
function status(node: TreeNode): Status { return node.selectionProps.selectionStatus; }
function walk(nodes: TreeNode[]): TreeNode[] { return nodes.flatMap(node => [node, ...walk(node.children ?? [])]); }

class ControlledSource extends OrganisationDataSource {
  chains: ChainRecord[] = [
    { id: 'c', name: 'Chain', members: 1, total: 2 }, { id: 'd', name: 'Other chain', members: 0, total: 1 },
  ];
  branches: BranchMembershipRecord[] = [
    { id: 'b', chainId: 'c', name: 'Branch', members: 1, total: 2 },
    { id: 'empty', chainId: 'c', name: 'Empty', members: 0, total: 0 },
  ];
  employees: EmployeeMembershipRecord[] = [
    { id: 'same', branchId: 'b', name: 'Person', isProjectMember: true },
    { id: 'p2', branchId: 'b', name: 'Person 2', isProjectMember: false },
  ];
  employeeRead?: () => Observable<EmployeeMembershipRecord[]>;
  branchRead?: () => Observable<BranchMembershipRecord[]>;
  searchRead?: () => Observable<EmployeeSearchResponse>;
  mutation: Observable<MembershipResponse> = new Subject<MembershipResponse>();
  writes: { branchId: string; employeeId?: string; selected: boolean }[] = [];
  chainReads = 0; branchReads = 0; employeeReads = 0; searchReads = 0; maxCount = 0;
  getChains(): Observable<ChainRecord[]> { this.chainReads++; return of(this.chains); }
  getBranches(): Observable<BranchMembershipRecord[]> { this.branchReads++; return this.branchRead?.() ?? of(this.branches); }
  getEmployees(): Observable<EmployeeMembershipRecord[]> { this.employeeReads++; return this.employeeRead?.() ?? of(this.employees); }
  searchEmployees(_term: string, maxCount: number): Observable<EmployeeSearchResponse> {
    this.searchReads++; this.maxCount = maxCount;
    return this.searchRead?.() ?? of({ results: this.employees.map(person => searchRow(person.id, person.isProjectMember)), hasTooManyResults: false });
  }
  setPersonMembership(branchId: string, employeeId: string, selected: boolean): Observable<MembershipResponse> {
    this.writes.push({ branchId, employeeId, selected }); return this.mutation;
  }
  setBranchMembership(branchId: string, selected: boolean): Observable<MembershipResponse> {
    this.writes.push({ branchId, selected }); return this.mutation;
  }
}
function searchRow(id: string, member: boolean): FakeSearchResult {
  return { person: { id, name: id }, branch: { id: 'b', name: 'Branch' }, chain: { id: 'c', name: 'Chain' }, isProjectMember: member };
}
function response(selected: boolean, employeeId?: string): MembershipResponse {
  return {
    branchId: 'b', employeeId, isProjectMember: selected,
    branch: { id: 'b', members: selected ? 2 : 0, total: 2 },
    chain: { id: 'c', members: selected ? 2 : 0, total: 2 },
  };
}
function setup(source = new ControlledSource()): { source: ControlledSource; controller: AddProjectMemberControllerService; root: TreeNode; chain: TreeNode; branch: TreeNode } {
  const controller = new AddProjectMemberControllerService(source);
  const root = controller.initializeTree(); controller.loadChildren(root, root);
  const chain = root.children![0]; controller.expandNode(root, chain);
  const branch = chain.children![0];
  return { source, controller, root, chain, branch };
}

await test('helper IDs, root/child insertion and server counts do not inherit loaded-child selection', () => {
  const helper = new TreeHelper(); const root = helper.initializeTree();
  const a = helper.createNode('A', true); const b = helper.createNode('B', true);
  helper.insertNodesAtRoot(root, [a, b]);
  const person = helper.createNode('A'); helper.markMember(person, false);
  helper.applyCounts(a, { members: 8, total: 10 }); helper.insertChildrenForNode(a, [person]);
  assert.equal(person.parent, a); assert.equal(person.index, 0); assert.equal(b.index, 1);
  assert.equal(status(a), Status.PartiallySelected); assert.equal(status(person), Status.NotSelected);
  assert.equal(new Set([root.id, a.id, b.id, person.id, new TreeHelper().initializeTree().id]).size, 5);
  helper.applyCounts(b, { members: 0, total: 0 }); assert.equal(status(b), Status.NotSelected);
  helper.destroy();
});

await test('visible traversal spans root chains, skips collapsed/unloaded descendants and stops at boundaries', () => {
  const h = new TreeHelper(); const root = h.initializeTree();
  const a = h.createNode('A', true), b = h.createNode('B', true);
  const x = h.createNode('X', true), y = h.createNode('Y'), p = h.createNode('P');
  h.insertNodesAtRoot(root, [a, b]); h.insertChildrenForNode(a, [x, y]); h.insertChildrenForNode(x, [p]);
  a.expanded = x.expanded = true;
  assert.equal(TreeHelper.previousVisibleNode(a), null);
  assert.equal(TreeHelper.nextVisibleNode(a), x); assert.equal(TreeHelper.nextVisibleNode(x), p);
  assert.equal(TreeHelper.nextVisibleNode(p), y); assert.equal(TreeHelper.previousVisibleNode(y), p);
  assert.equal(TreeHelper.nextVisibleNode(y), b); assert.equal(TreeHelper.previousVisibleNode(b), y);
  assert.equal(TreeHelper.nextVisibleNode(b), null);
  x.expanded = false; assert.equal(TreeHelper.nextVisibleNode(x), y); assert.equal(TreeHelper.previousVisibleNode(y), x);
  a.expanded = false; assert.equal(TreeHelper.previousVisibleNode(b), a);
  a.expanded = true; a.isLoaded = false; assert.equal(TreeHelper.nextVisibleNode(a), b);
  h.destroy();
});

await test('lazy loads cache empty successes, support retries, suppress duplicates and cancel on destroy', () => {
  const h = new TreeHelper(), node = h.createNode('lazy', true); let calls = 0;
  const pending = new Subject<TreeNode[]>(); h.configureLazyLoad(node, () => { calls++; return pending; }, ['business-id']);
  h.toggleExpansion(node); h.toggleExpansion(node); h.toggleExpansion(node);
  assert.equal(calls, 1); assert.equal(node.loading, true);
  pending.next([]); assert.equal(node.loading, false); assert.equal(node.isLoaded, true);
  h.toggleExpansion(node); h.toggleExpansion(node); assert.equal(calls, 1);
  const failed = h.createNode('retry', true); let attempt = 0;
  h.configureLazyLoad(failed, () => ++attempt === 1 ? throwError(() => new Error('offline')) : of([]));
  h.toggleExpansion(failed); assert.equal(failed.error, 'offline'); assert.equal(failed.loading, false);
  h.toggleExpansion(failed); assert.equal(failed.error, undefined); assert.equal(failed.isLoaded, true);
  const canceled = h.createNode('cancel', true); h.configureLazyLoad(canceled, () => NEVER); h.toggleExpansion(canceled);
  h.destroy(); assert.equal(canceled.loading, false);
});

await test('initialization is chains only; unopened partial branch completes and then removes members after confirmation', () => {
  const { source, controller, root, chain, branch } = setup();
  assert.equal(source.chainReads, 1); assert.equal(source.employeeReads, 0);
  assert.equal(status(branch), Status.PartiallySelected); assert.equal(chain.selectionProps.selectionAllowed, false);
  controller.updateSelection(root, chain); assert.equal(source.writes.length, 0);
  controller.updateSelection(root, chain.children![1]); assert.equal(source.writes.length, 0);
  controller.updateSelection(root, branch);
  assert.deepEqual(source.writes, [{ branchId: 'b', selected: true }]);
  assert.equal(branch.pending, true); assert.equal(status(branch), Status.PartiallySelected);
  assert.equal(root.children![1].pending, false);
  controller.updateSelection(root, branch); assert.equal(source.writes.length, 1);
  (source.mutation as Subject<MembershipResponse>).next(response(true));
  assert.equal(status(branch), Status.FullySelected); assert.equal(status(chain), Status.FullySelected);
  assert.equal(branch.pending, false); assert.equal(source.employeeReads, 0);
  source.mutation = new Subject(); controller.updateSelection(root, branch);
  assert.equal(source.writes[1].selected, false);
  (source.mutation as Subject<MembershipResponse>).next(response(false));
  assert.equal(status(branch), Status.NotSelected); assert.equal(status(chain), Status.NotSelected);
  controller.ngOnDestroy();
});

await test('confirmed person membership updates existing search/browse nodes and preserves count-free search', async () => {
  const { source, controller, root, chain, branch } = setup(); controller.expandNode(root, branch);
  const person = branch.children![1]; const originalId = person.id;
  const search = await firstValueFrom(controller.searchEmployees('person'));
  const searchPerson = search.nodes[0].children![0].children![1];
  assert.equal(source.maxCount, 300);
  assert.ok(walk(search.nodes).every(node => node.description === undefined && node.isLoaded && node.expanded && !node.lazyLoading && node.lazyLoad === null));
  assert.equal(search.nodes[0].selectionProps.showCheckbox, false);
  assert.equal(search.nodes[0].children![0].selectionProps.showCheckbox, false);
  controller.toggleSearchSelection(searchPerson);
  assert.equal(person.pending, true); assert.equal(status(person), Status.NotSelected);
  (source.mutation as Subject<MembershipResponse>).next(response(true, 'p2'));
  assert.equal(status(person), Status.FullySelected); assert.equal(status(searchPerson), Status.FullySelected);
  assert.equal(status(branch), Status.FullySelected); assert.equal(status(chain), Status.FullySelected);
  assert.equal(search.nodes[0].description, undefined); assert.equal(search.nodes[0].children![0].description, undefined);
  controller.clearSearch(); assert.equal(root.children![0], chain); assert.equal(branch.children![1], person); assert.equal(person.id, originalId);
  assert.equal(chain.expanded, true); assert.equal(branch.expanded, true); controller.ngOnDestroy();
});

await test('mutation failure, empty completion and timeout retain confirmed state, unlock controls and allow retry', () => {
  virtual(scheduler => {
    for (const mutation of [throwError(() => new Error('offline')), EMPTY, NEVER]) {
      const { source, controller, root, branch } = setup(); source.mutation = mutation;
      controller.updateSelection(root, branch);
      scheduler.schedule(() => {
        assert.equal(branch.pending, false); assert.equal(status(branch), Status.PartiallySelected);
        assert.ok(branch.mutationError); assert.equal(branch.error, undefined);
        source.mutation = of(response(true)); controller.updateSelection(root, branch);
        assert.equal(status(branch), Status.FullySelected); assert.equal(branch.mutationError, undefined);
        controller.ngOnDestroy();
      }, 10001);
    }
  });
});

await test('a stale employee load is discarded and refreshed after a branch mutation, without rebuilding ancestors', () => {
  const { source, controller, root, chain, branch } = setup();
  const stale = new Subject<EmployeeMembershipRecord[]>(); source.employeeRead = () => stale;
  controller.expandNode(root, branch); controller.updateSelection(root, branch);
  (source.mutation as Subject<MembershipResponse>).next(response(true));
  source.employeeRead = () => of(source.employees.map(person => ({ ...person, isProjectMember: true })));
  stale.next(source.employees);
  assert.equal(source.employeeReads, 2); assert.ok(branch.children!.every(person => status(person) === Status.FullySelected));
  assert.equal(root.children![0], chain); assert.equal(chain.children![0], branch); controller.ngOnDestroy();
});

await test('search reads crossing writes refresh; reads during writes wait; canceled searches never install results', () => {
  const { source, controller, root, branch } = setup();
  const stale = new Subject<EmployeeSearchResponse>(); source.searchRead = () => stale;
  let result: TreeNode[] = [];
  controller.searchEmployees('old').subscribe(value => { result = value.nodes; });
  controller.updateSelection(root, branch); stale.next({ results: [searchRow('p2', false)], hasTooManyResults: false });
  assert.equal(result.length, 0); assert.equal(source.searchReads, 1);
  source.searchRead = () => of({ results: [searchRow('p2', true)], hasTooManyResults: false });
  (source.mutation as Subject<MembershipResponse>).next(response(true));
  assert.equal(source.searchReads, 2); assert.equal(status(result[0].children![0].children![0]), Status.FullySelected);
  source.mutation = new Subject(); controller.updateSelection(root, branch);
  const canceled = controller.searchEmployees('canceled').subscribe(() => assert.fail('canceled request emitted'));
  canceled.unsubscribe(); controller.clearSearch();
  (source.mutation as Subject<MembershipResponse>).next(response(false));
  assert.equal(source.searchReads, 2); controller.ngOnDestroy();
});

await test('destroy cancels both mutation and helper reads and releases pending state', () => {
  const { source, controller, root, branch } = setup(); source.employeeRead = () => NEVER;
  controller.expandNode(root, branch); controller.updateSelection(root, branch); controller.ngOnDestroy();
  assert.equal(branch.pending, false); assert.equal(branch.loading, false); assert.equal(branch.error, undefined);
  (source.mutation as Subject<MembershipResponse>).next(response(true)); assert.equal(status(branch), Status.PartiallySelected);
});

await test('search grouping preserves input order and composite person identity', async () => {
  const { source, controller } = setup();
  const row = searchRow('same', true), another = { ...searchRow('same', false), branch: { id: 'b2', name: 'Other' } };
  source.searchRead = () => of({ results: [another, row, row], hasTooManyResults: true });
  const result = await firstValueFrom(controller.searchEmployees('same'));
  assert.equal(result.hasTooManyResults, true); assert.equal(result.nodes[0].children![0].label, 'Other');
  assert.equal(result.nodes[0].children!.length, 2); assert.equal(result.nodes[0].children![1].children!.length, 1);
  assert.notEqual(result.nodes[0].children![0].children![0].id, result.nodes[0].children![1].children![0].id);
  controller.ngOnDestroy();
});

await test('fake service persists mutations, returns authoritative counts, and distinguishes the same employee ID in two branches', () => {
  virtual(() => {
    const source = new WeekViewFakeDataService();
    const data = source as unknown as { employeeData: { id: string; branchId: string; name: string }[] };
    data.employeeData.push({ id: 'e1001', branchId: '1030', name: 'Same identity elsewhere' });
    source.setPersonMembership('1020', 'e1001', true).subscribe(result => {
      assert.equal(result.branch.members, 1); assert.equal(result.chain.members, 1);
      source.getEmployees('1020').subscribe(people => assert.equal(people[0].isProjectMember, true));
      source.getEmployees('1030').subscribe(people => assert.equal(people[people.length - 1].isProjectMember, false));
      source.setBranchMembership('1030', true).subscribe(result => {
        assert.equal(result.branch.members, result.branch.total); assert.equal(result.chain.members, result.branch.total + 1);
        source.setBranchMembership('1030', false).subscribe(result => assert.equal(result.chain.members, 1));
      });
    });
  });
});

await test('fake search caps at 300 with exact overflow detection for 299/300/301 and stable listing order', () => {
  virtual(() => {
    for (const count of [299, 300, 301]) {
      const source = new WeekViewFakeDataService();
      const data = source as unknown as { employeeData: { id: string; branchId: string; name: string }[] };
      data.employeeData = Array.from({ length: count }, (_, i) => ({ id: `p${i}`, name: 'Match', branchId: i % 2 ? '1020' : '2010' }));
      source.searchEmployees('match', 300).subscribe(result => {
        assert.equal(result.results.length, Math.min(count, 300)); assert.equal(result.hasTooManyResults, count > 300);
        const order = result.results.map(row => row.chain.id); assert.deepEqual(order, [...order].sort());
      });
    }
  });
});

await test('row registration cleanup and arrows use helper handles; component emits original nodes without mutation', () => {
  const helper = new TreeHelper(), root = helper.initializeTree(), first = helper.createNode('First'), second = helper.createNode('Second');
  helper.insertNodesAtRoot(root, [first, second]); const row = new TreeRowComponent(); row.node = first; row.ngOnChanges({});
  assert.equal(first.row, row); let focused = false; TreeHelper.registerRow(second, { focus: () => { focused = true; } });
  const key = { key: 'ArrowDown', preventDefault() {}, stopPropagation() {} } as KeyboardEvent;
  (row as unknown as { onKeydown(event: KeyboardEvent): void }).onKeydown(key); assert.equal(focused, true);
  row.ngOnDestroy(); assert.equal(first.row, undefined);
  const tree = new TreeComponent(); let emitted: TreeNode | undefined; tree.selectionChange.subscribe(node => { emitted = node; });
  (tree as unknown as { onCheckboxChange(node: TreeNode): void }).onCheckboxChange(first);
  assert.equal(emitted, first); assert.equal(status(first), Status.NotSelected);
  first.pending = true; emitted = undefined;
  (tree as unknown as { onCheckboxChange(node: TreeNode): void }).onCheckboxChange(first); assert.equal(emitted, undefined);
});

await test('Right expands and Left collapses without toggling on repeats or acting on leaves', () => {
  const helper = new TreeHelper();
  const node = helper.createNode('Group', true);
  helper.insertChildrenForNode(node, [helper.createNode('Person')]);
  const row = new TreeRowComponent(); row.node = node;
  let emissions = 0;
  row.expand.subscribe(emitted => {
    assert.equal(emitted, node); emissions++; helper.toggleExpansion(emitted);
  });
  const press = (key: string): void => {
    let prevented = false, stopped = false;
    (row as unknown as { onKeydown(event: KeyboardEvent): void }).onKeydown({
      key, preventDefault() { prevented = true; }, stopPropagation() { stopped = true; },
    } as KeyboardEvent);
    assert.equal(prevented, true); assert.equal(stopped, true);
  };
  press('ArrowLeft'); assert.equal(emissions, 0);
  press('ArrowRight'); assert.equal(node.expanded, true); assert.equal(emissions, 1);
  press('ArrowRight'); assert.equal(node.expanded, true); assert.equal(emissions, 1);
  press('ArrowLeft'); assert.equal(node.expanded, false); assert.equal(emissions, 2);
  press('ArrowLeft'); assert.equal(emissions, 2);
  row.node = node.children![0]; press('ArrowRight'); press('ArrowLeft'); assert.equal(emissions, 2);
  helper.destroy();
});

await test('controlled checkbox cancels native toggling, coalesces activation, and ignores disabled/repeated Enter', async () => {
  const checkbox = new TriStateCheckboxComponent(); let activations = 0; let prevented = 0;
  checkbox.activate.subscribe(() => { activations++; });
  const controls = checkbox as unknown as { onActivate(event: Event): void; onEnter(event: Event): void };
  const event = { preventDefault() { prevented++; } } as Event;
  controls.onActivate(event); controls.onActivate(event); assert.equal(activations, 0);
  await Promise.resolve(); assert.equal(activations, 1); assert.equal(prevented, 2);
  checkbox.disabled = true; controls.onActivate(event); await Promise.resolve(); assert.equal(activations, 1);
  checkbox.disabled = false; controls.onEnter({ ...event, repeat: true } as unknown as Event);
  await Promise.resolve(); assert.equal(activations, 1);
});

console.log(`\n${passed} regression checks passed.`);
