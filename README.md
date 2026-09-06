# Organisation tree — copy-paste version

A minimal Angular application with five reusable tree files. The packaged version remains on `feature/packaged-tree`; this version is on `feature/copy-paste-tree`.

## Run

```sh
nvm install
nvm use
npm ci
npm start
```

Open http://127.0.0.1:4200. `npm run build` writes the production app to `dist/demo`. The demo uses Angular 15.2 and Node 18.20.8; copied source supports Angular 15–22.

## Copy into your application

Copy all five files from `src/app/tree`:

| File                  | Responsibility                                                                       |
| --------------------- | ------------------------------------------------------------------------------------ |
| `tree.component.ts`   | Render subscriptions, expansion, checkbox events, keyboard navigation and focus      |
| `tree.component.html` | Tree rows and node-level loading/retry feedback                                      |
| `tree.component.scss` | Local tree styles, green checkboxes and carets                                       |
| `tree.helper.ts`      | Tree state, lazy loading, membership coordination and external-result reconstruction |
| `tree.model.ts`       | Node types, backend interface, options and search tokens                             |

Import the standalone `TreeComponent` into your host component or NgModule. The host creates and owns the helper:

```ts
import { TreeHelper } from './tree/tree.helper';

// memberApi implements OrganisationDataSource from tree.model.ts.
readonly helper = new TreeHelper(this.memberApi, this.projectId, { timeoutMs: 10_000 });

ngOnInit(): void { void this.helper.initialize(); }
ngOnDestroy(): void { this.helper.dispose(); }
```

```html
<app-tree [helper]="helper"></app-tree>
```

The renderer subscribes to helper changes but never initializes or disposes a supplied helper. To change projects, the host disposes the old helper and passes a new one. It owns all search controls, page-level status/error/empty messages, and refresh buttons. `src/app/demo` demonstrates this integration; do not copy the demo's mock backend into production.

The five files use relative imports and Angular APIs only—no path aliases, package exports, application-specific services, global CSS or additional tree components. Zone-based and zoneless hosts retain their normal Angular providers.

## External search

The helper never calls a search API and does not store query text, debounce timers or result limits. Search is optional for hosts that only need browsing.

```ts
const token = helper.beginSearch();
const rows = await memberApi.searchPersons(projectId, query, limit);
const outcome = helper.applySearchResults(rows, token);
```

`beginSearch()` enters search mode and clears previous results. `applySearchResults()` creates a complete, expanded tree from externally fetched rows using maps, preserving backend order. It returns:

- `applied`: the rows were installed. The token is consumed once.
- `superseded`: the token is outdated, belongs to another helper, was already used, or the helper was disposed.
- `membership-changed`: a membership write started or finished after the request began; the host should fetch fresh rows with a new token.

The host must also ignore callbacks from superseded queries. The demo implements the complete sequence with a 300 ms debounce, a ten-second search timeout, a default cap of 300, and retries for membership invalidation. It slices results to the cap and displays “Result limit reached; refine your search” when the response reaches it. These are host choices, not renderer requirements.

To clear search, invalidate the host's pending requests and call:

```ts
await helper.restoreBrowsing();
```

Browsing becomes visible immediately, with matching node IDs and expansion preserved. The returned promise covers any needed membership reconciliation. Search ancestors have no checkboxes or counts; people remain selectable.

## Backend and interaction contract

`OrganisationDataSource` requires five promise-returning operations: get chains, get branches, get branch persons, toggle a person, and update a branch. The helper retains these calls for lazy loading and membership updates. A host can separately supply its own `searchPersons` method without making it part of the required interface.

IDs are strings. Branch IDs are unique across the organisation; a person is identified by `(branchId, employeeId)`. Browsing ancestor rows include full `members` and `total` counts. Search rows contain `{ chain, branch, person }` identities and person membership, with no ancestor counts required. Mutation results contain `{ chain: { members, total }, branch: { members, total } }`.

Chain checkboxes are disabled information displays. Branch actions add all, add remaining, or remove all. Membership changes only after API success; conflicting controls are disabled while saving. Distinct operations may run concurrently, followed by authoritative reconciliation without rebuilding matching browsing nodes.

Checkboxes use `rgb(50, 150, 70)`; disabled states retain that base color with reduced opacity. Collapsed nodes display `>` and expanded nodes display `v`, including during loading. Native checkbox semantics and forced-colors support are preserved. Tab enters the tree, arrows navigate, Space toggles membership, and Home/End jump between endpoints.

A timed-out toggle may still commit on the server. It is never automatically retried. Reconciliation and explicit refresh recover known state, but a commit arriving after those reads needs a later refresh. Immediate certainty requires backend capabilities beyond this contract.

## Validation

Tests run in a temporary workspace to keep this branch minimal. Coverage includes external-search races and timeout recovery, helper ownership/disposal, checkbox states, concurrent writes, keyboard focus, 500-result rendering, and copied-source consumption in Angular 15–22 (standalone/NgModule, plus zoneless in 18–22). The fuller original test tooling remains on `feature/packaged-tree`.

The Angular 15 development toolchain uses Node 18; consuming applications retain their own Angular dependencies and compatible Node toolchains. No npm publication is involved.
