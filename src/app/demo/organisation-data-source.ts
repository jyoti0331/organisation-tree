import { Observable } from 'rxjs';
import {
  BranchMembershipRecord, ChainRecord, EmployeeMembershipRecord,
  EmployeeSearchResponse, MembershipResponse,
} from './organisation.model';

/** Counts and membership are authoritative; an adapter is scoped to one project. */
export abstract class OrganisationDataSource {
  abstract getChains(): Observable<ChainRecord[]>;
  abstract getBranches(chainId: string): Observable<BranchMembershipRecord[]>;
  abstract getEmployees(branchId: string): Observable<EmployeeMembershipRecord[]>;
  abstract searchEmployees(term: string, maxCount: number): Observable<EmployeeSearchResponse>;
  abstract setPersonMembership(branchId: string, employeeId: string, isProjectMember: boolean): Observable<MembershipResponse>;
  abstract setBranchMembership(branchId: string, isProjectMember: boolean): Observable<MembershipResponse>;
}
