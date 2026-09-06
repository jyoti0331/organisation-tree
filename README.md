# Generic tree — copy-paste version

A minimal Angular demo with five reusable, domain-independent files in `src/app/tree`. Copy those files into your application and import the standalone `TreeComponent` (also supported in NgModule imports).

```sh
nvm install
nvm use
npm ci
npm start
# Production build:
npm run build
```

## Host integration

The tree knows only nodes, children, loaders, expansion and navigation. Your payload can be any type; no organisation IDs, backend interfaces, membership rules or fixed hierarchy levels are required.

```ts
import { TreeHelper } from './tree/tree.helper';
import { CheckboxToggle, TreePresentation } from './tree/tree.model';

type Item = { title: string; selected: boolean };
readonly helper = new TreeHelper<Item>();
readonly presentation: TreePresentation<Item> = {
  label: node => node.data.title,
  checkbox: node => ({ state: node.data.selected ? 'checked' : 'unchecked' }),
};

ngOnInit(): void {
  this.helper.browsing.insertNodesAtRoot([
    { data: { title: 'Documents', selected: false }, children: [
      { data: { title: 'Notes', selected: false } },
    ] },
  ]);
}

onToggle({ node, checked }: CheckboxToggle<Item>): void {
  node.data = { ...node.data, selected: checked };
  this.helper.invalidateSearchResults();
  this.helper.notify();
}

ngOnDestroy(): void { this.helper.dispose(); }
```

```html
<app-tree
  [helper]="helper"
  [presentation]="presentation"
  label="Documents"
  (checkboxToggle)="onToggle($event)"
></app-tree>
```

Omit `checkbox` for a tree without checkboxes, or return `null` for individual rows. A checkbox descriptor supports `unchecked`, `mixed`, `checked`, `disabled` and an accessible `label`. An optional `description(node)` supplies secondary text. Without a presentation, labels use `String(node.data)`.

The component emits intended checkbox state; it never modifies your payload or calls your API. For asynchronous saves, the host supplies disabled state while pending, applies confirmed data, and calls `helper.notify()`. Host policy decides whether parent/child checkbox states are related.

The host owns helper creation and disposal, including replacements. The component only subscribes and renders. Lazy nodes accept `loader(node, signal)` returning `NodeInput<T>[]`; the helper caches successful loads, deduplicates requests and ignores obsolete responses. Use `helper.browsing` for insertion/reconciliation and `helper.tree` for the currently displayed tree.

## External search

Search controls, requests, grouping, limits, debounce and errors belong to the host:

```ts
const token = helper.beginSearch();
const inputs = await loadSearchHierarchy(query); // NodeInput<Item>[]
const result = helper.applySearchResults(inputs, token);
```

The helper installs an expanded, fully loaded hierarchy without interpreting payloads or calling a search API. Results return `applied`, `superseded`, or `data-changed`. Call `invalidateSearchResults()` when application data changes so outstanding snapshots return `data-changed`; fetch again with a new token. Tokens belong to one helper and are consumed once.

When clearing search, invalidate host request callbacks and call `helper.restoreBrowsing()`. This immediately restores cached nodes, IDs and expansion. Any authoritative data refresh is the host's responsibility.

## Files and demo

| File                  | Responsibility                                                               |
| --------------------- | ---------------------------------------------------------------------------- |
| `tree.model.ts`       | Generic nodes, loaders, presentation, checkbox events and search tokens      |
| `tree.helper.ts`      | Structure, lazy loading, traversal, notifications and temporary search trees |
| `tree.component.ts`   | Rendering subscriptions, emitted actions, keyboard and focus                 |
| `tree.component.html` | Rows and node-level retry feedback                                           |
| `tree.component.scss` | Local styling, green native checkboxes and caret symbols                     |

The organisation example lives entirely in `src/app/demo`: its own types, data-source contract, membership controller, mock API and search grouping. It retains disabled chain checkboxes, branch actions, concurrent person writes, reconciliation and timeout recovery. Copy that application logic only if your application needs this particular membership behavior. Timed-out mutations are not retried automatically; a late server commit may require a later refresh.

Checkboxes use `rgb(50, 150, 70)` with muted disabled states. Carets remain literal `>` / `v`, including while loading. One roving Tab stop, arrow keys, Home/End and Space support keyboard navigation. Search and page-level messages remain outside the tree.

## Validation and branches

Tests run in a temporary workspace so this branch stays minimal. Checks cover generic payloads, traversal and lazy loading, search tokens, organisation regressions, keyboard/focus, concurrent writes, timeout recovery and 500-result rendering. Copied-source consumers are checked on Angular 15–22 using standalone and NgModule hosts, plus zoneless configurations in 18–22. These checks cover selected patch versions, not every dependency combination.

The demo toolchain uses Angular 15 and Node 18. Consuming applications retain their own compatible dependencies. The packaged implementation remains on `feature/packaged-tree`; this version is on `feature/copy-paste-tree`. No npm publication is involved.
