import {
  Id,
  Counts,
  Chain,
  Branch,
  Person,
  SearchRow,
  MutationResult,
  BranchAction,
} from './organisation.model';
import { OrganisationDataSource } from './organisation-data-source';

/** Replace this mock with your application's HTTP adapter. */
export class DemoDataSource implements OrganisationDataSource {
  private readonly chains = [
    { chainId: 'north', label: 'Northern group' },
    { chainId: 'south', label: 'Southern group' },
  ];
  private readonly branches = [
    { branchId: 'it', chainId: 'north', label: '1030 IT' },
    { branchId: 'operations', chainId: 'north', label: 'Operations' },
    { branchId: 'support', chainId: 'south', label: 'Customer support' },
  ];
  private readonly persons: Person[] = this.branches.flatMap((branch) =>
    ['Alex Andersen', 'Jamie Berg', 'Morgan Hansen', 'Sam Olsen'].map((label, index) => ({
      branchId: branch.branchId,
      employeeId: String(index),
      label,
      isProjectMember: index === 0,
    })),
  );

  private counts(persons: Person[]): Counts {
    return {
      total: persons.length,
      members: persons.filter((person) => person.isProjectMember).length,
    };
  }
  private chainRows(): Chain[] {
    return this.chains.map((chain) => {
      const branchIds = new Set(
        this.branches
          .filter((branch) => branch.chainId === chain.chainId)
          .map((branch) => branch.branchId),
      );
      return {
        ...chain,
        ...this.counts(this.persons.filter((person) => branchIds.has(person.branchId))),
      };
    });
  }
  private branchRows(chainId: Id): Branch[] {
    return this.branches
      .filter((branch) => branch.chainId === chainId)
      .map((branch) => ({
        ...branch,
        ...this.counts(this.persons.filter((person) => person.branchId === branch.branchId)),
      }));
  }
  private async respond<T>(value: T): Promise<T> {
    const snapshot: T = JSON.parse(JSON.stringify(value));
    await new Promise((resolve) => setTimeout(resolve, 150));
    return snapshot;
  }
  getChains(_projectId: Id): Promise<Chain[]> {
    return this.respond(this.chainRows());
  }
  getBranches(_projectId: Id, chainId: Id): Promise<Branch[]> {
    return this.respond(this.branchRows(chainId));
  }
  getBranchPersons(_projectId: Id, branchId: Id): Promise<Person[]> {
    return this.respond(this.persons.filter((person) => person.branchId === branchId));
  }
  searchPersons(_projectId: Id, query: string, maxCount: number): Promise<SearchRow[]> {
    const rows: SearchRow[] = [];
    for (const chain of this.chains)
      for (const branch of this.branches) {
        if (branch.chainId !== chain.chainId) continue;
        for (const person of this.persons) {
          if (
            person.branchId === branch.branchId &&
            person.label.toLowerCase().includes(query.toLowerCase())
          )
            rows.push({ chain, branch, person });
        }
      }
    return this.respond(rows.slice(0, maxCount));
  }
  private mutationResult(branchId: Id): MutationResult {
    const branch = this.branches.find((branch) => branch.branchId === branchId)!;
    return {
      chain: this.chainRows().find((chain) => chain.chainId === branch.chainId)!,
      branch: this.branchRows(branch.chainId).find((row) => row.branchId === branchId)!,
    };
  }
  togglePersonMembership(_projectId: Id, branchId: Id, employeeId: Id): Promise<MutationResult> {
    const person = this.persons.find(
      (person) => person.branchId === branchId && person.employeeId === employeeId,
    )!;
    person.isProjectMember = !person.isProjectMember;
    return this.respond(this.mutationResult(branchId));
  }
  updateBranchMembership(
    _projectId: Id,
    branchId: Id,
    action: BranchAction,
  ): Promise<MutationResult> {
    for (const person of this.persons)
      if (person.branchId === branchId) person.isProjectMember = action !== 'removeAll';
    return this.respond(this.mutationResult(branchId));
  }
}
