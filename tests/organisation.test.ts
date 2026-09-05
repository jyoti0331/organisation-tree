import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  OrganisationController,
  checkState,
  personKey,
  SearchRow,
} from '../packages/organisation/src/index';
import { MockSource } from '../demo/src/mock-source';
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
};
async function setup(size = 4) {
  const source = new MockSource(size);
  source.latency = 0;
  const controller = new OrganisationController(source, 'p');
  await controller.initialize();
  await controller.expand(controller.browsing.roots[0]);
  return { source, controller, branches: controller.browsing.roots[0].children };
}
test('tri-state values and compound employee identities', () => {
  assert.equal(checkState({ members: 0, total: 0 }), 'unchecked');
  assert.equal(checkState({ members: 0, total: 2 }), 'unchecked');
  assert.equal(checkState({ members: 1, total: 2 }), 'mixed');
  assert.equal(checkState({ members: 2, total: 2 }), 'checked');
  assert.notEqual(personKey('a:b', 'c'), personKey('a', 'b:c'));
});
test('chain disabled, partial unloaded branch adds remaining, full branch removes all', async () => {
  const { controller, branches, source } = await setup();
  const branch = branches[0];
  assert.equal(controller.disabled(controller.browsing.roots[0]), true);
  assert.equal(controller.state(branch), 'mixed');
  assert.equal(branch.isLoaded, false);
  await controller.toggle(branch);
  assert.equal(controller.state(branch), 'checked');
  assert.equal(
    source.people.filter((p) => p.branchId === 'branch-0' && p.isProjectMember).length,
    4,
  );
  await controller.expand(branch);
  assert.ok(branch.children.every((p) => controller.state(p) === 'checked'));
  await controller.toggle(branch);
  assert.equal(controller.state(branch), 'unchecked');
  assert.ok(branch.children.every((p) => controller.state(p) === 'unchecked'));
  await controller.toggle(branch);
  assert.equal(controller.state(branch), 'checked');
  controller.dispose();
});
test('person changes only on success; pending person blocks branch and duplicate writes', async () => {
  const { controller, branches, source } = await setup();
  await controller.expand(branches[0]);
  const person = branches[0].children[1];
  source.latency = 20;
  const pending = controller.toggle(person);
  assert.equal(controller.state(person), 'unchecked');
  assert.equal(controller.disabled(person), true);
  assert.equal(controller.disabled(branches[0]), true);
  assert.equal(controller.disabled(branches[0].children[2]), false);
  await controller.toggle(person);
  await pending;
  assert.equal(controller.state(person), 'checked');
  assert.equal(controller.disabled(person), false);
  controller.dispose();
});
test('branch operation locks its people but permits a different branch', async () => {
  const { controller, branches, source } = await setup();
  await controller.expand(branches[0]);
  source.latency = 20;
  const pending = controller.toggle(branches[0]);
  assert.equal(controller.disabled(branches[0].children[0]), true);
  assert.equal(controller.disabled(branches[1]), false);
  await pending;
  controller.dispose();
});
test('failure releases lock without changing membership', async () => {
  const { controller, branches, source } = await setup();
  await controller.expand(branches[0]);
  const person = branches[0].children[1];
  source.failNext = true;
  await controller.toggle(person);
  assert.equal(controller.state(person), 'unchecked');
  assert.equal(controller.disabled(person), false);
  assert.match(controller.error!, /failure/);
  controller.dispose();
});
test('concurrent reversed responses reconcile chain and branch counts', async () => {
  const { controller, branches, source } = await setup();
  source.latency = 5;
  source.reverseResponses = true;
  await Promise.all([controller.toggle(branches[0]), controller.toggle(branches[1])]);
  assert.equal(controller.state(branches[0]), 'checked');
  assert.equal(controller.state(branches[1]), 'checked');
  const chain = controller.browsing.roots[0].data;
  assert.equal(chain.kind === 'chain' && chain.value.members, 10);
  controller.dispose();
});
test('concurrent people in one branch reconcile without toggling twice', async () => {
  const { controller, branches, source } = await setup();
  await controller.expand(branches[0]);
  source.latency = 5;
  source.reverseResponses = true;
  await Promise.all([
    controller.toggle(branches[0].children[1]),
    controller.toggle(branches[0].children[2]),
  ]);
  const data = branches[0].data;
  assert.equal(data.kind === 'branch' && data.value.members, 3);
  controller.dispose();
});
test('search groups ordered rows, caps results, and restores cached browsing tree', async () => {
  const { controller, branches } = await setup();
  const id = branches[0].id;
  await controller.search('Alex');
  assert.equal(controller.tree.roots.length, 3);
  assert.ok(controller.tree.visibleNodes().every((n) => n.isLoaded && !n.loader));
  const persons = controller.tree.visibleNodes().filter((n) => n.data.kind === 'person');
  assert.equal(persons.length, 12);
  await controller.toggle(persons[0]);
  await controller.search('');
  assert.equal(controller.tree, controller.browsing);
  assert.equal(branches[0].id, id);
  assert.equal(controller.browsing.roots[0].expanded, true);
  controller.dispose();
  const source = new MockSource();
  source.latency = 0;
  const capped = new OrganisationController(source, 'p', { maxResults: 2 });
  await capped.search('Alex');
  assert.equal(capped.limitReached, true);
  assert.equal(capped.tree.visibleNodes().filter((n) => n.data.kind === 'person').length, 2);
  capped.dispose();
});
test('older search responses cannot replace current query', async () => {
  const { controller, source } = await setup();
  const old = deferred<SearchRow[]>();
  const base = source.searchPersons.bind(source);
  source.searchPersons = (p, q, max) => (q === 'old' ? old.promise : base(p, q, max));
  const first = controller.search('old');
  await controller.search('Jamie');
  old.resolve([]);
  await first;
  assert.equal(controller.query, 'Jamie');
  assert.ok(controller.tree.roots.length);
  controller.dispose();
});
test('search response captured before a write is refreshed after that write', async () => {
  const { controller, source, branches } = await setup();
  await controller.expand(branches[0]);
  const person = branches[0].children[1];
  const snapshot = await source.searchPersons('p', 'Jamie', 300);
  const gate = deferred<SearchRow[]>();
  const base = source.searchPersons.bind(source);
  let calls = 0;
  source.searchPersons = (p, q, max) => (++calls === 1 ? gate.promise : base(p, q, max));
  const search = controller.search('Jamie');
  await controller.toggle(person);
  gate.resolve(snapshot);
  await search;
  const node = controller.tree
    .visibleNodes()
    .find((n) => n.data.kind === 'person' && n.data.value.branchId === 'branch-0')!;
  assert.equal(controller.state(node), 'checked');
  assert.equal(calls, 2);
  controller.dispose();
});
test('timeout does not retry toggle and reconciles committed membership', async () => {
  const source = new MockSource(4);
  source.latency = 0;
  const controller = new OrganisationController(source, 'p', { timeoutMs: 15 });
  await controller.initialize();
  await controller.expand(controller.browsing.roots[0]);
  const branch = controller.browsing.roots[0].children[0];
  await controller.expand(branch);
  const base = source.togglePersonMembership.bind(source);
  let calls = 0;
  source.togglePersonMembership = async (...args) => {
    calls++;
    const value = await base(...args);
    await new Promise((r) => setTimeout(r, 35));
    return value;
  };
  await controller.toggle(branch.children[1]);
  assert.equal(calls, 1);
  assert.equal(controller.disabled(branch.children[1]), false);
  assert.equal(controller.state(branch.children[1]), 'checked');
  assert.match(controller.error!, /timed out/);
  controller.dispose();
});
test('empty branches are disabled', async () => {
  const { controller, branches } = await setup(0);
  assert.equal(controller.disabled(branches[0]), true);
  controller.dispose();
});
test('refresh adds arriving employees without replacing existing rows', async () => {
  const { controller, source, branches } = await setup();
  const branch = branches[0];
  await controller.expand(branch);
  await controller.toggle(branch);
  const oldPerson = branch.children[0];
  source.people.push({
    branchId: 'branch-0',
    employeeId: 'new',
    label: 'New colleague',
    isProjectMember: false,
  });
  await controller.refresh();
  assert.equal(branch.children.length, 5);
  assert.equal(branch.children[0], oldPerson);
  assert.equal(controller.state(branch), 'mixed');
  await controller.toggle(branch);
  assert.equal(controller.state(branch), 'checked');
  assert.equal(controller.state(branch.children[4]), 'checked');
  controller.dispose();
});
test('search requires no ancestor counts and mutations require only returned counts', async () => {
  const { controller, source } = await setup();
  const search = source.searchPersons.bind(source);
  source.searchPersons = async (...args) =>
    (await search(...args)).map((row) => ({
      chain: { chainId: row.chain.chainId, label: row.chain.label },
      branch: {
        branchId: row.branch.branchId,
        chainId: row.branch.chainId,
        label: row.branch.label,
      },
      person: row.person,
    }));
  const toggle = source.togglePersonMembership.bind(source);
  source.togglePersonMembership = async (...args) => {
    const result = await toggle(...args);
    return {
      chain: { members: result.chain.members, total: result.chain.total },
      branch: { members: result.branch.members, total: result.branch.total },
    };
  };
  await controller.search('Jamie');
  const person = controller.tree.visibleNodes().find((node) => node.data.kind === 'person')!;
  await controller.toggle(person);
  assert.equal(controller.state(person), 'checked');
  controller.dispose();
});
test('zero person totals do not hide empty branches inside a chain', async () => {
  const source = new MockSource(0);
  source.latency = 0;
  const controller = new OrganisationController(source, 'p');
  await controller.initialize();
  const chain = controller.browsing.roots[0];
  assert.equal(chain.hasChildren, true);
  await controller.expand(chain);
  assert.equal(chain.children.length, 4);
  assert.ok(chain.children.every((branch) => controller.disabled(branch)));
  controller.dispose();
});
