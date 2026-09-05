export type Loader<T> = (
  node: TreeNode<T>,
  signal: AbortSignal,
) => Promise<readonly NodeInput<T>[]>;
export interface NodeInput<T> {
  data: T;
  hasChildren?: boolean;
  expanded?: boolean;
  loader?: Loader<T> | null;
  children?: readonly NodeInput<T>[];
}
export class TreeNode<T> {
  readonly children: TreeNode<T>[] = [];
  expanded = false;
  isLoaded = false;
  loading = false;
  error: string | null = null;
  hasChildren = false;
  loader: Loader<T> | null = null;
  constructor(
    readonly id: string,
    public data: T,
    readonly parent: TreeNode<T> | null,
    public index: number,
  ) {}
}

export type Id = string;
export interface Counts {
  members: number;
  total: number;
}
export interface ChainIdentity {
  chainId: Id;
  label: string;
}
export interface BranchIdentity {
  branchId: Id;
  chainId: Id;
  label: string;
}
export interface Chain extends ChainIdentity, Counts {}
export interface Branch extends BranchIdentity, Counts {}
export interface Person {
  branchId: Id;
  employeeId: Id;
  label: string;
  isProjectMember: boolean;
}
export interface SearchRow {
  chain: ChainIdentity;
  branch: BranchIdentity;
  person: Person;
}
export interface MutationResult {
  chain: Counts;
  branch: Counts;
}
export type BranchAction = 'addAll' | 'addRemaining' | 'removeAll';
/** Host supplies transport/authentication. Counts describe the full organisation, never search subsets. */
export interface OrganisationDataSource {
  getChains(projectId: Id): Promise<Chain[]>;
  getBranches(projectId: Id, chainId: Id): Promise<Branch[]>;
  getBranchPersons(projectId: Id, branchId: Id): Promise<Person[]>;
  searchPersons(projectId: Id, query: string, maxCount: number): Promise<SearchRow[]>;
  togglePersonMembership(projectId: Id, branchId: Id, employeeId: Id): Promise<MutationResult>;
  updateBranchMembership(
    projectId: Id,
    branchId: Id,
    action: BranchAction,
  ): Promise<MutationResult>;
}
export type OrganisationNode =
  | { kind: 'chain'; value: ChainIdentity & Partial<Counts> }
  | { kind: 'branch'; value: BranchIdentity & Partial<Counts> }
  | { kind: 'person'; value: Person };
export type CheckState = 'unchecked' | 'mixed' | 'checked';
export interface PickerOptions {
  maxResults?: number;
  timeoutMs?: number;
}
