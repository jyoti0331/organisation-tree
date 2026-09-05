# Backend integration contract

`OrganisationDataSource` is a TypeScript adapter boundary, not a required HTTP wire format. Map your existing endpoint responses to these methods; URL paths, authentication, request serialization, and HTTP error handling belong to the consuming application. No revisions, extra mutation endpoints, or save endpoint are required.

All IDs at this boundary are strings. Chain IDs and branch IDs are unique in the organisation. Employee IDs are unique only within a branch. Each call includes a project ID. Named-list storage uses branch ID plus employee ID; chains are directory context only.

| Method                   | Inputs beyond project ID | Response                                                                                          |
| ------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------- |
| `getChains`              | —                        | Ordered chains: `chainId`, `label`, `members`, `total`                                            |
| `getBranches`            | `chainId`                | Ordered branches: `branchId`, `chainId`, `label`, `members`, `total`                              |
| `getBranchPersons`       | `branchId`               | Ordered people: `branchId`, `employeeId`, `label`, `isProjectMember`                              |
| `searchPersons`          | `query`, `maxCount`      | Flat rows with `chain`, `branch`, and `person` identities/membership; no ancestor counts required |
| `togglePersonMembership` | `branchId`, `employeeId` | `{ chain: { members, total }, branch: { members, total } }`                                       |
| `updateBranchMembership` | `branchId`, `action`     | The same updated counts                                                                           |

Branch actions are `addAll`, `addRemaining`, and `removeAll`. The first two result in all current branch persons being members. Return success only when the requested mutation is applied. Counts must cover the full chain/branch, including unloaded people. They should be nonnegative integers with `members <= total`.

Search response example:

```json
[
  {
    "chain": { "chainId": "north", "label": "Northern group" },
    "branch": { "chainId": "north", "branchId": "1030", "label": "1030 IT" },
    "person": {
      "branchId": "1030",
      "employeeId": "42",
      "label": "Example Person",
      "isProjectMember": true
    }
  }
]
```

Search results must follow the same chain/branch order as browsing, with each group contiguous. The client preserves first occurrence and never sorts. It deduplicates repeated `(branchId, employeeId)` rows. Search ancestors have no membership counts in the adapter unless the server supplies them; their checkboxes and counts are hidden. Nodes are loaded and expanded without loaders.

Cap the response at `maxCount`. Since the existing endpoint does not distinguish an exact-sized result set from truncation, the UI reports “Result limit reached; refine your search” at the cap. No total-hit count or `hasMore` flag is required.

## Concurrency and errors

The UI prevents a branch operation overlapping a person operation in the same branch, while permitting distinct person operations and different branches. The backend should still enforce its own consistency for other clients.

Membership snapshots from concurrent responses can arrive out of order. After the local writes settle, the adapter re-reads chains, affected branch listings, and affected branch people. It discards reconciliation if another local write started or finished while those reads were outstanding. Matching visible nodes retain their IDs.

Reject failed requests. The default request deadline is ten seconds and is configurable. Deadlines release UI locks but do not cancel server execution. The adapter never automatically retries a toggle. After an ambiguous timeout it refreshes once and retains an error so the user can request another refresh. A commit that occurs after those reads needs a later refresh; authoritative immediate resolution would require backend capabilities deliberately outside this contract.

Lazy generic tree loaders receive `AbortSignal`; the organisation adapter's existing promise-based endpoint interface is not required to implement cancellation. Disposed trees and obsolete search/read results cannot update rendered state.
