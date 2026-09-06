# Worksoft tree implementation guide

## Ownership and event flow

```text
Tree row → TreeComponent emits the original TreeNode → DemoComponent
  → AddProjectMemberControllerService
    → TreeHelper for expansion, loading, traversal and confirmed view updates
    → OrganisationDataSource for project membership requests
```

The host owns the browsing root, displayed search nodes, search mode, and query state. The controller owns a plain `new TreeHelper()`, domain context, active node indexes, and pending mutation subscriptions. The helper has no Angular or DOM imports; RxJS is used for asynchronous loaders. The renderer never interprets organisation records or calls the data source.

`ws-tree` retains `nodes: TreeNode[]`, `label: string`, and `expand`/`selectionChange: EventEmitter<TreeNode>`. `TreeSelectionChange` remains an optional model interface, not an output envelope. `TreeModule` exports the tree and reusable `ws-tri-state-checkbox`; its row component is internal.

## Node and helper contracts

| Field | Meaning |
| --- | --- |
| `id` | Helper-issued identity, unique across helper instances within the running app. Never an employee/branch/chain ID. |
| `parent`, `index` | Direct parent and position in its child array. Top-level nodes have an invisible helper root as parent. |
| `isRoot` | Marks an invisible root; traversal never focuses it. |
| `children`, `hasChildren` | Optional children and explicit expandability. An empty loaded group stays expandable. |
| `expanded`, `isLoaded` | Browsing nodes begin collapsed; successful child loads are cached. Search nodes begin expanded and loaded. |
| `lazyLoading`, `lazyLoad`, `lazyLoadParams` | Whether expansion may load, its callback, and business parameters. Search nodes use false/null/empty parameters. |
| `loading`, `error` | Child-loading state and retryable read error. |
| `pending`, `mutationError` | Membership request state and separate membership error. |
| `counts` | Confirmed `{ members, total }` for a group. |
| `selectionProps` | `selectionStatus`, `selectionAllowed`, and `showCheckbox`. |
| `row` | Optional rendering-independent `{ focus(): void }` handle. Present only while the row component exists. |
| `additionalInfo`, `description` | Opaque domain record and optional display text. |

`TreeHelper.createNode(label, hasChildren?, selectionAllowed?, additionalInfo?, showCheckbox?)` issues a node ID. `initializeTree()` creates an invisible expanded root. Ordinary nodes begin collapsed. Use `insertNodesAtRoot` or `insertChildrenForNode` for completed child responses; both attach parent/index metadata and mark the parent loaded. `appendChild` maintains metadata in O(1). `buildExpandedTree` accepts flat rows and domain-keyed path factories, then builds the complete search hierarchy in one pass with a map. It creates each group/person once and sets expanded/loaded/non-lazy state. Do not directly push into child arrays.

`configureLazyLoad(node, callback, params)` stores a callback with signature `(nodeId, ...params) => Observable<TreeNode[]>`. The domain controller supplies closures that fetch and map records. `toggleExpansion` opens/closes a node, and `loadChildren` subscribes to its callback when needed. The helper attaches successful results itself. Empty successes are cached; errors and empty observable completions are retryable. Reads take one result and time out after 10 seconds. A subscription is registered before subscribing so synchronous adapters work correctly. Collapsing retains children and pending loads but closes descendant expansion. `destroy()` cancels pending loads and releases loading flags.

`markMember` applies confirmed leaf membership. `applyCounts` derives group tri-state and optionally its description from authoritative counts: zero is unchecked, all is checked, otherwise partial. Child insertion does not overwrite membership or recompute counts from an incomplete child array. The controller passes each mutation's branch/chain counts into these helper operations.

Static `nextVisibleNode` and `previousVisibleNode` use parent links and sibling indexes. Next visits the first expanded, loaded child, otherwise the next sibling while climbing ancestors. Previous returns the parent or the deepest visible descendant of the previous sibling. The invisible root connects top-level chains and is never returned. Expanded-but-unloaded nodes have no visible children.

## Rendering and interaction

The existing recursive `ng-template` and nested lists remain. `TreeRowComponent` renders the row, loading status, and separate read/mutation retry actions. Its lifecycle registers/unregisters its focus handle via the helper. Every row has `tabindex="0"`; Arrow Up/Down prevent scrolling and focus the helper's next/previous row. Right Arrow emits expansion only for a collapsed group; Left Arrow emits collapse only for an expanded group. Repeating either key does not toggle the group back, and leaves are unaffected. Native interactive controls remain tab stops. Selection moves focus to the row before disabling its checkbox, so keyboard navigation remains available during the request. Space/Enter on the row emits selection intent when allowed; repeated keydown does not toggle repeatedly.

`TriStateCheckboxComponent` accepts `status`, `disabled`, and `label` and emits `activate` without changing state. It cancels native checkbox click toggling, then emits in a microtask after the browser has rolled the checkbox back. This also avoids a rollback overwriting a synchronous successful response. Native label forwarding and Space activation use the same handler; Enter emits once and ignores key repeats. Hidden or disabled controls and pending rows cannot emit selection actions.

The existing green checkbox CSS, indentation, and count styling are retained in the extracted components. Disabled chain indicators use the same checkbox component. Angular's default change detection observes mutations of existing node objects; `trackBy` uses helper-issued IDs to retain rendered rows. Search omits group checkboxes and descriptions entirely.

## Data-source contracts

The demo binds a component-scoped `WeekViewFakeDataService` to `OrganisationDataSource`. A real adapter must likewise be scoped/configured for the current project.

| Method | Response |
| --- | --- |
| `getChains()` | Chain ID/name and `members`, `total`. |
| `getBranches(chainId)` | Branch ID/name/chain ID and `members`, `total`. |
| `getEmployees(branchId)` | Employee ID/name/branch ID and `isProjectMember`. |
| `searchEmployees(term, maxCount)` | `{ results, hasTooManyResults }`; capped flat person/branch/chain/membership rows. |
| `setPersonMembership(branchId, employeeId, isProjectMember)` | Confirmed membership, person identity, updated branch counts, updated chain counts. |
| `setBranchMembership(branchId, isProjectMember)` | Confirmed whole-branch membership, updated branch counts, updated chain counts. |

`MembershipResponse` contains `branchId`, optional `employeeId` (absent for branch actions), `isProjectMember`, and `branch`/`chain` objects containing `id`, `members`, and `total`. Explicit desired membership makes retries idempotent. Branch true means add all missing people; false means remove everyone. A successful branch response applies that membership to all already loaded representations of its people.

Persons use `(branchId, employeeId)` keys. Branch IDs must identify a branch across the organisation, as required by the branch and person endpoint signatures. Helper IDs impose no uniqueness requirement across business entity types. The chain is returned for directory construction/count updates, not as part of stored person membership.

The fake service retains the existing fixture records. It owns an in-memory set of composite member identities; all mutations and reads run when its simulated 150ms response completes. Unsubscribing before that point cancels the fake operation. Reloading the page starts a fresh membership session. There is no real HTTP persistence, full membership snapshot endpoint, or controller-local selection store.

The fake service guarantees listing order in search by iterating chain/branch groups in listing order. It returns at most `maxCount` rows and stops after detecting one additional match to set `hasTooManyResults`. The frontend defaults to 300. Production adapters must preserve the same ordering and overflow semantics.

## Request ordering, errors and lifecycle

The controller keeps indexes of currently loaded browsing/search nodes by domain identity and chain. These are view references, not a second membership store. Clearing search removes search-only references. Confirmed responses update the existing nodes; they do not recreate the browsing tree.

A membership request acquires a per-chain pending flag immediately. All actionable controls in that chain are disabled until completion; duplicate/conflicting actions are ignored. Different chains can mutate independently. The request takes one response and times out after 10 seconds. `finalize` releases the pending flag on success, error, empty completion, timeout, or cancellation. Only successful responses change membership or counts. Membership errors have a separate retry button that emits selection intent, never expansion.

Each mutation increments a chain revision and global revision at start and finish. `readConsistently` waits for relevant mutations to settle before issuing a read, then compares revisions at response time. If a relevant write overlapped the request, it discards the response and reissues the read before mapping or inserting nodes. Chain-scoped lazy reads are unaffected by writes in other chains; search uses the global revision because it may contain any chain. The outer read/search timeout bounds the wait and any refresh.

The host cancels superseded search requests immediately using its outer `switchMap`, before the next 300ms debounce. Query errors are handled inside the switched request so later queries still work. Clearing search exposes the same browsing root, preserving expansion and confirmed membership. The helper builds a separate fully loaded search tree in one pass using a map keyed by entity type and business identity (including composite person identity); it never sorts or lazily loads results.

The host destroys its search subscription. The controller also terminates reads/searches and cancels mutation subscriptions on destruction; the helper cancels its child subscriptions. As with any real service, a network timeout does not prove the server canceled a write. Real adapters should preserve explicit desired-state semantics so the displayed retry can safely request that state again.

## Verification

`npm test` type-checks the tests and runs focused regression checks using the existing TypeScript/esbuild tooling and RxJS virtual time. Its generated bundle is removed from an ignored `.angular` temporary directory after execution. No browser dependency is added to the project.

Coverage includes helper identity/relationships/traversal, synchronous and failed lazy loads, empty-load caching, unopened branch actions, authoritative counts, browse/search synchronization, duplicate person IDs across branches, pending guards, failure/empty-response/timeout recovery, stale read refresh, canceled search, destruction cleanup, result limits at 299/300/301, row registration, and controlled checkbox intent.

`npm run build` validates strict TypeScript, Angular templates, and production bundling. Browser verification covers old-state retention while pending, native label clicks and Space/Enter, partial-branch completion, Tab/arrows across root chains, search-only person controls, restored browsing state, and runtime errors. Existing debug logging and debugger statements remain at renderer/host event boundaries for development.
