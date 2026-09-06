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
export type OrganisationNode =
  | { kind: 'chain'; value: ChainIdentity & Partial<Counts> }
  | { kind: 'branch'; value: BranchIdentity & Partial<Counts> }
  | { kind: 'person'; value: Person };
export interface PickerOptions {
  timeoutMs?: number;
}
