import { TreeCounts } from '../tree/tree.model';

export interface FakeDataShape { id: string; name: string; }
export interface ChainRecord extends FakeDataShape, TreeCounts {}
export interface BranchRecord extends FakeDataShape { chainId: string; }
export interface BranchMembershipRecord extends BranchRecord, TreeCounts {}
export interface EmployeeRecord extends FakeDataShape { branchId: string; }
export interface EmployeeMembershipRecord extends EmployeeRecord { isProjectMember: boolean; }

export interface FakeSearchResult {
  person: FakeDataShape;
  branch: FakeDataShape;
  chain: FakeDataShape;
  isProjectMember: boolean;
}

export interface EmployeeSearchResponse {
  results: FakeSearchResult[];
  hasTooManyResults: boolean;
}

/** employeeId is absent for a whole-branch mutation. */
export interface MembershipResponse {
  branchId: string;
  employeeId?: string;
  isProjectMember: boolean;
  branch: TreeCounts & { id: string };
  chain: TreeCounts & { id: string };
}
