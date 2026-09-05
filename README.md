# Organisation tree

A reusable organisation member picker with a plain TypeScript tree engine, a domain adapter, and Angular rendering. The demo uses an in-memory backend; it makes no production API calls.

## Run locally

```sh
cd /Users/piyushranjan/Developer/Practice/organisation-tree
nvm install
nvm use
npm ci
npm run build
npm start
```

Open http://127.0.0.1:4200. The base workspace uses Node 18.20.8, Angular 15.2, and TypeScript 4.9 to compile the library for older consumers. It is separate from `PersonalTracker`.

The demo supports configurable latency, failed requests, timeouts after server commits, reordered responses, and a 600-person dataset. The demo search cap is 500; the controller default is 300.

## Packages

| Local import                      | Responsibility                                                                                |
| --------------------------------- | --------------------------------------------------------------------------------------------- |
| `@organisation-tree/core`         | Generic ordered trees, loading, insertion, reconciliation, visible navigation, subscriptions  |
| `@organisation-tree/organisation` | Membership rules, backend interface, search, concurrency, reconciliation                      |
| `@organisation-tree/angular`      | `TreeComponent`, `TriStateComponent`, `OrganisationPickerComponent`, `OrganisationTreeModule` |

The core and organisation packages have no Angular dependency. The Angular library uses public Angular APIs, partial compilation, Angular peer dependencies, and RxJS 7.5 or later. There is no dependency on Material or an application's services.

Build output is in `dist/core`, `dist/organisation`, and `dist/angular`. The demo imports built entry points, not library source files. Packages remain private; publication, public package names, licensing, and a GitHub remote are deferred.

## Embed the picker

Implement `OrganisationDataSource` using your application's existing HTTP and authentication layer. All methods return promises; an Angular HTTP adapter can use RxJS `firstValueFrom`. See [the backend contract](docs/backend-contract.md).

```ts
import { Component, Input, OnChanges, OnDestroy } from '@angular/core';
import { OrganisationPickerComponent } from '@organisation-tree/angular';
import { OrganisationController, OrganisationDataSource } from '@organisation-tree/organisation';

@Component({
  selector: 'project-members',
  standalone: true,
  imports: [OrganisationPickerComponent],
  template: ` <ot-organisation-picker [controller]="controller"></ot-organisation-picker> `,
})
export class ProjectMembers implements OnChanges, OnDestroy {
  @Input() projectId!: string;
  @Input() source!: OrganisationDataSource;
  controller!: OrganisationController;

  ngOnChanges(): void {
    this.controller?.dispose();
    this.controller = new OrganisationController(this.source, this.projectId, {
      maxResults: 300,
      timeoutMs: 10_000,
    });
  }

  ngOnDestroy(): void {
    this.controller.dispose();
  }
}
```

For NgModule applications, import `OrganisationTreeModule` into the module declaring your host component. The host owns the controller lifecycle and dialog presentation. The picker initializes the controller automatically. Create a separate controller per picker/project; changing projects should dispose the old controller.

The Angular adapter explicitly marks change detection inside `NgZone.run`; this works both with zone-based applications and the noop zone used by zoneless applications. It does not install global providers or enable zoneless mode for the host.

Theme the component with inherited CSS custom properties:

```css
ot-organisation-picker {
  --ot-accent: #365cdb;
  --ot-text: #24324a;
  --ot-border: #dce3ef;
  --ot-background: #fff;
  --ot-hover: #f3f6fc;
}
```

## Use the generic core

```ts
import { Tree } from '@organisation-tree/core';

const tree = new Tree<{ key: string; label: string }>();
const [folder] = tree.insertNodesAtRoot([
  {
    data: { key: 'folder', label: 'Documents' },
    hasChildren: true,
    loader: async (_node, signal) => {
      const response = await fetch('/documents', { signal });
      if (!response.ok) throw new Error('Could not load documents');
      const rows: { id: string; name: string }[] = await response.json();
      return rows.map((row) => ({ data: { key: row.id, label: row.name } }));
    },
  },
]);

const unsubscribe = tree.subscribe(() => render(tree.visibleNodes()));
await tree.expand(folder);
const next = tree.nextVisibleNode(folder);
tree.collapse(folder);
unsubscribe();
tree.dispose();
```

`render` above represents your renderer. For generic Angular rendering, pass a `Tree<T>` and a row `TemplateRef` to `ot-tree`; handle its `activated` output for Space actions. The optional `expanded` output delegates loading to your adapter; when unobserved the renderer calls `tree.expand` itself.

Nodes have helper-generated IDs distinct from domain IDs, a parent, a sibling index, children, `hasChildren`, `expanded`, `isLoaded`, `loading`, `error`, and an optional loader. An invisible root joins top-level siblings. The loader closure captures backend parameters and receives an abort signal. Nodes without loaders are already loaded; lazy nodes start collapsed unless configured otherwise.

`insertChildrenForNode` inserts at a chosen sibling index. `replaceChildren` deliberately discards the old subtree and aborts its pending loads. `reconcileChildren` matches sibling data keys to preserve existing nodes and expansion while updating a flat listing; nested children of matching nodes are retained. Duplicate sibling keys are rejected. `notify` announces an intentional data update. Do not directly splice the node's children or change its index.

## Membership behavior

- Chain checkboxes are disabled information displays. Branch checkboxes select all, add remaining, or remove all. Empty branches cannot be selected.
- Person identity is the pair `(branchId, employeeId)`, encoded without delimiter collisions.
- Each action calls the backend immediately. Membership remains unchanged until success. There is no Save button or automatic retry of toggles.
- Different branches and distinct people may save concurrently. A branch operation excludes person operations in that branch; duplicate person operations are blocked.
- Returned counts are provisional if requests overlap. After pending writes settle, the controller re-reads affected counts and person membership. A write starting during reconciliation invalidates that snapshot.
- Refresh updates loaded listings while preserving matching IDs and expansion, including new employees. The public `refresh()` method also supports externally triggered updates.
- Search is debounced by 300 ms in the Angular picker. Direct calls to `controller.search()` run immediately. Search uses maps, backend ordering, complete expanded nodes, and no ancestor selection/count display.
- Clearing search restores the cached browsing tree. Confirmed mutations update cached person representations, and reconciliation refreshes affected memberships.

The implementation intentionally corrects the meeting's all-rows-Tab behavior: there is one roving tree tab stop, arrow navigation, Home/End, Space actions, and focus restoration after collapse. Chain expansion stays available even though its membership checkbox is disabled. See the [WAI-ARIA tree pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/).

## Validate

```sh
npm run build
npm test
npm run build:demo
npx playwright install chromium
npm run test:browser
npm run format:check
```

The browser suite checks keyboard input, delayed confirmation, failed/timed-out requests, search restoration, and stable row IDs with 500 search results.

For the compatibility matrix, install Node 18.20.8, 22.23.1, and 24.18.0 through nvm, then run:

```sh
npm run compat
npm run test:compat
```

`NODE_18`, `NODE_22`, and `NODE_24` can point to equivalent Node executables when nvm is unavailable. Each generated consumer under `compat/` has its own dependencies, AOT compilation, and Angular linker. Content-addressed local tarballs prevent npm from reusing an older build of the same package version. `npm run compat -- 15 22` rebuilds just those versions; the full browser suite expects all eight fixtures.

See [recorded compatibility results](docs/compatibility.json) for exact versions and standalone, NgModule, and zoneless outcomes. Tests cover one selected patch per major, not every Angular minor or host dependency combination. Angular 18–19 zoneless providers are experimental; Angular 20–22 use their public zoneless provider. Toolchain choices follow [Angular's version table](https://angular.dev/reference/versions).

## Repository identity

This repository is initialized on `main` with:

```sh
git config --local user.name "Jyoti Shikha"
git config --local user.email "jyoti.shikha@iyetec.com"
```

Verify with `git config --local --get user.name` and `git config --local --get user.email`. These values affect commit authorship only in this repository; they do not change global Git identity or authenticate a GitHub account. No remote or commit has been created automatically.

## Current limits

The backend adapter is an interface plus a mock, not a production server. Without backend revisions or a mutation-status endpoint, a timed-out write may commit after reconciliation. No client-only algorithm can establish its final state immediately; refresh after the backend settles. Reads should reflect completed writes. Continuous writes may postpone reconciliation.

The Angular 15 build toolchain necessarily includes legacy dependencies and uses Node 18. Dependency audit findings remain in that isolated development toolchain; the library does not bundle Angular into consuming applications. Upgrade/release policy and a broader browser/screen-reader certification matrix remain future work.
