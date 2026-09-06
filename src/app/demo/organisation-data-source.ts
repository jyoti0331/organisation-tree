import { Id, Chain, Branch, Person, MutationResult, BranchAction } from './organisation.model';

/** Host supplies transport/authentication. Counts describe the full organisation, never search subsets. */
export interface OrganisationDataSource {
  getChains(projectId: Id): Promise<Chain[]>;
  getBranches(projectId: Id, chainId: Id): Promise<Branch[]>;
  getBranchPersons(projectId: Id, branchId: Id): Promise<Person[]>;
  togglePersonMembership(projectId: Id, branchId: Id, employeeId: Id): Promise<MutationResult>;
  updateBranchMembership(
    projectId: Id,
    branchId: Id,
    action: BranchAction,
  ): Promise<MutationResult>;
}
