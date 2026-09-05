# Organisation tree — copy-paste version

A minimal Angular demo with five reusable tree files. The packaged implementation is preserved on `feature/packaged-tree`; this version is on `feature/copy-paste-tree`.

## Run

```sh
nvm install
nvm use
npm ci
npm start
```

Open http://127.0.0.1:4200. `npm run build` creates the production application in `dist/demo`. The demo uses Angular 15.2 and Node 18.20.8. The copied component uses APIs compatible with Angular 15–22.

## Copy into another project

Copy **all five files** from `src/app/tree` into your application:

| File                  | Purpose                                                          |
| --------------------- | ---------------------------------------------------------------- |
| `tree.component.ts`   | Inputs, rendering state, keyboard/focus handling, lifecycle      |
| `tree.component.html` | Search, rows, checkboxes, loading/error messages                 |
| `tree.component.scss` | Self-contained component styles                                  |
| `tree.helper.ts`      | Tree traversal, lazy loading, membership, search, reconciliation |
| `tree.model.ts`       | Node models, backend interface, and options                      |

Import the standalone `TreeComponent` in your host component's `imports`, or in an NgModule's `imports`. Implement `OrganisationDataSource` from `tree.model.ts` using your HTTP service, then render:

```html
<app-tree [dataSource]="memberApi" [projectId]="projectId"></app-tree>
```

Optional configuration:

```ts
readonly treeOptions = { maxResults: 300, timeoutMs: 10_000 };
```

```html
<app-tree [dataSource]="memberApi" [projectId]="projectId" [options]="treeOptions"></app-tree>
```

Keep the data-source and options references stable; replacing either, or changing `projectId`, disposes the old helper and starts a new tree. No application services, path aliases, package exports, global CSS, or extra tree components are required. The host owns dialog presentation and supplies its normal Angular change-detection providers; both zone-based and zoneless hosts are supported.

`src/app/demo` is only an example. Its component contains a small in-memory data source; **do not copy the demo into your production integration**.

## Backend and behavior

The interface defines six promise-returning operations: get chains, get branches, get branch persons, search persons, toggle a person, and update a branch. Map existing HTTP responses in your adapter. IDs are strings; a person is identified by branch ID plus employee ID. Branch IDs are unique across the organisation.

Browsing endpoints return full membership counts for ancestors and membership booleans for people. Search returns ordered `{ chain, branch, person }` rows without requiring ancestor counts. Mutation responses contain only `{ chain: { members, total }, branch: { members, total } }`. The mock demonstrates the contract.

- Chain checkboxes are disabled. Branch checkboxes add all, add remaining, or remove all; empty branches are disabled.
- Membership changes only after API success. Distinct person/branch operations can run concurrently, with conflicting actions locked while pending.
- The helper reconciles affected counts and people after writes settle and preserves matching row IDs.
- Expanding loads once; search is debounced by 300 ms and capped at 300 by default. Clearing it restores the browsing tree.
- Tab enters the tree; arrows navigate/expand/collapse, Space toggles membership, and Home/End jump between endpoints.

A timeout may occur after the server commits. The helper does not retry toggles automatically; it refreshes and offers error recovery. A commit arriving after reconciliation requires a later refresh. The existing backend contract cannot guarantee immediate resolution of that ambiguity.

Styles use optional `--tree-accent`, `--tree-text`, `--tree-border`, `--tree-background`, and `--tree-hover` CSS custom properties.

## Validation

Regression and browser checks run from a temporary workspace to keep this branch minimal. They cover lazy loading, checkbox states, concurrency, search races, timeouts, stable 500-result rendering, focus, and copied-source consumption in Angular 15–22 (standalone and NgModule, plus zoneless in 18–22). The fuller test tooling remains on `feature/packaged-tree`.

The legacy Angular 15 development toolchain uses Node 18; consuming applications retain their own Angular dependencies and supported Node toolchains. No npm publication is involved.
