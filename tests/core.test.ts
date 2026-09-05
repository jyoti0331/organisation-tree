import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Tree } from '../packages/core/src/index';
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
};
test('visible traversal crosses roots and skips collapsed descendants', () => {
  const tree = new Tree<string>();
  const [a, b] = tree.insertNodesAtRoot([
    {
      data: 'A',
      expanded: true,
      children: [{ data: 'A1' }, { data: 'A2', expanded: true, children: [{ data: 'P' }] }],
    },
    { data: 'B' },
  ]);
  assert.deepEqual(
    tree.visibleNodes().map((n) => n.data),
    ['A', 'A1', 'A2', 'P', 'B'],
  );
  assert.equal(tree.previousVisibleNode(b)?.data, 'P');
  assert.equal(tree.previousVisibleNode(a), null);
  assert.equal(tree.nextVisibleNode(b), null);
  tree.collapse(a);
  assert.equal(tree.nextVisibleNode(a), b);
  assert.equal(tree.previousVisibleNode(b), a);
});
test('insertion updates indexes and retains existing node IDs', () => {
  const tree = new Tree<string>();
  const [a, b] = tree.insertNodesAtRoot([{ data: 'A' }, { data: 'B' }]);
  const id = b.id;
  tree.insertNodesAtRoot([{ data: 'X' }], 1);
  assert.equal(b.index, 2);
  assert.equal(b.id, id);
  assert.equal(tree.get(id), b);
  assert.equal(a.parent, tree.root);
  assert.throws(() => tree.insertNodesAtRoot([], 9), RangeError);
  assert.throws(() => new Tree<string>().insertChildrenForNode(a, []));
});
test('load requests deduplicate, cache and retain collapsed state', async () => {
  const tree = new Tree<string>();
  const data = deferred<{ data: string }[]>();
  let calls = 0;
  const [node] = tree.insertNodesAtRoot([
    {
      data: 'A',
      hasChildren: true,
      loader: () => {
        calls++;
        return data.promise;
      },
    },
  ]);
  const first = tree.expand(node);
  const second = tree.expand(node);
  tree.collapse(node);
  await Promise.resolve();
  assert.equal(calls, 1);
  assert.equal(node.loading, true);
  data.resolve([{ data: 'B' }]);
  await Promise.all([first, second]);
  assert.equal(node.expanded, false);
  assert.equal(node.isLoaded, true);
  await tree.expand(node);
  assert.equal(calls, 1);
});
test('failed loads retry and empty loads clear disclosure', async () => {
  const tree = new Tree<string>();
  let calls = 0;
  const [node] = tree.insertNodesAtRoot([
    {
      data: 'A',
      hasChildren: true,
      loader: async () => {
        if (++calls === 1) throw new Error('offline');
        return [];
      },
    },
  ]);
  await tree.expand(node);
  assert.equal(node.error, 'offline');
  assert.equal(node.loading, false);
  assert.equal(node.isLoaded, false);
  await tree.expand(node);
  assert.equal(node.error, null);
  assert.equal(node.hasChildren, false);
  assert.equal(node.isLoaded, true);
});
test('replacement invalidates pending responses', async () => {
  const tree = new Tree<string>();
  const data = deferred<{ data: string }[]>();
  const [node] = tree.insertNodesAtRoot([{ data: 'A', loader: () => data.promise }]);
  const pending = tree.expand(node);
  await Promise.resolve();
  tree.replaceChildren(node, [{ data: 'current' }]);
  data.resolve([{ data: 'obsolete' }]);
  await pending;
  assert.deepEqual(
    node.children.map((n) => n.data),
    ['current'],
  );
  assert.equal(node.loading, false);
});
test('disposed trees ignore pending responses and release subscriptions', async () => {
  const tree = new Tree<string>();
  const data = deferred<{ data: string }[]>();
  const [node] = tree.insertNodesAtRoot([{ data: 'A', loader: () => data.promise }]);
  const pending = tree.expand(node);
  await Promise.resolve();
  let calls = 0;
  tree.subscribe(() => calls++);
  tree.dispose();
  data.resolve([{ data: 'obsolete' }]);
  await pending;
  assert.equal(calls, 0);
  assert.equal(node.children.length, 0);
  assert.equal(tree.get(node.id), undefined);
});
test('reconciliation inserts, removes and reorders without replacing matching nodes', () => {
  const tree = new Tree<{ key: string; label: string }>();
  const [a, b] = tree.insertNodesAtRoot([
    { data: { key: 'a', label: 'old' }, expanded: true },
    { data: { key: 'b', label: 'remove' } },
  ]);
  tree.reconcileChildren(
    tree.root,
    [{ data: { key: 'c', label: 'new' } }, { data: { key: 'a', label: 'updated' } }],
    (data) => data.key,
  );
  assert.equal(tree.roots[1], a);
  assert.equal(a.expanded, true);
  assert.equal(a.index, 1);
  assert.equal(a.data.label, 'updated');
  assert.equal(tree.get(b.id), undefined);
  assert.throws(() =>
    tree.reconcileChildren(
      tree.root,
      [{ data: { key: 'a', label: 'a' } }, { data: { key: 'a', label: 'b' } }],
      (data) => data.key,
    ),
  );
});
