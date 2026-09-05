import {
  Branch,
  BranchAction,
  Chain,
  Id,
  MutationResult,
  OrganisationDataSource,
  Person,
  SearchRow,
} from '@organisation-tree/organisation';
/** In-memory backend. Captures each response at commit time to simulate network reordering. */
export class MockSource implements OrganisationDataSource {
  latency = 150;
  failNext = false;
  timeoutNext = false;
  reverseResponses = false;
  private sequence = 0;
  readonly people: Person[] = [];
  readonly branchDefinitions = Array.from({ length: 12 }, (_, i) => ({
    branchId: `branch-${i}`,
    chainId: `chain-${Math.floor(i / 4)}`,
    label: ['1030 IT', 'Customer success', 'Engineering', 'Operations'][i % 4],
  }));
  readonly chainDefinitions = ['Nordic group', 'Central group', 'Atlantic group'].map(
    (label, i) => ({ chainId: `chain-${i}`, label }),
  );
  constructor(size = 30) {
    for (const branch of this.branchDefinitions)
      for (let i = 0; i < size; i++)
        this.people.push({
          branchId: branch.branchId,
          employeeId: `employee-${i}`,
          label: `${['Alex', 'Jamie', 'Morgan', 'Sam', 'Robin', 'Taylor'][i % 6]} ${['Andersen', 'Berg', 'Hansen', 'Larsen', 'Olsen'][Math.floor(i / 6) % 5]} ${i + 1}`,
          isProjectMember: i % 4 === 0,
        });
  }
  private counts(people: Person[]) {
    return {
      total: people.length,
      members: people.filter((person) => person.isProjectMember).length,
    };
  }
  private chains(): Chain[] {
    return this.chainDefinitions.map((chain) => {
      const ids = new Set(
        this.branchDefinitions
          .filter((branch) => branch.chainId === chain.chainId)
          .map((branch) => branch.branchId),
      );
      return { ...chain, ...this.counts(this.people.filter((person) => ids.has(person.branchId))) };
    });
  }
  private branches(chainId: Id): Branch[] {
    return this.branchDefinitions
      .filter((branch) => branch.chainId === chainId)
      .map((branch) => ({
        ...branch,
        ...this.counts(this.people.filter((person) => person.branchId === branch.branchId)),
      }));
  }
  private async response<T>(create: () => T): Promise<T> {
    const fail = this.failNext;
    this.failNext = false;
    const timeout = this.timeoutNext;
    this.timeoutNext = false;
    const delay = timeout
      ? 3500
      : this.reverseResponses && ++this.sequence % 2
        ? this.latency * 4
        : this.latency;
    if (fail) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      throw new Error('Simulated backend failure. Try again.');
    }
    // A timeout may still commit: intentionally commit now and delay its acknowledgement.
    const value = JSON.parse(JSON.stringify(create())) as T;
    await new Promise((resolve) => setTimeout(resolve, delay));
    return value;
  }
  getChains(_project: Id): Promise<Chain[]> {
    return this.response(() => this.chains());
  }
  getBranches(_project: Id, chainId: Id): Promise<Branch[]> {
    return this.response(() => this.branches(chainId));
  }
  getBranchPersons(_project: Id, branchId: Id): Promise<Person[]> {
    return this.response(() => this.people.filter((person) => person.branchId === branchId));
  }
  searchPersons(_project: Id, query: string, maxCount: number): Promise<SearchRow[]> {
    return this.response(() => {
      const rows: SearchRow[] = [];
      for (const chain of this.chains())
        for (const branch of this.branches(chain.chainId))
          for (const person of this.people) {
            if (
              person.branchId === branch.branchId &&
              person.label.toLowerCase().includes(query.toLowerCase())
            ) {
              rows.push({ chain, branch, person });
              if (rows.length >= maxCount) return rows;
            }
          }
      return rows;
    });
  }
  private result(branchId: Id): MutationResult {
    const branch = this.branchDefinitions.find((branch) => branch.branchId === branchId);
    if (!branch) throw new Error('Unknown branch');
    return {
      chain: this.chains().find((chain) => chain.chainId === branch.chainId)!,
      branch: this.branches(branch.chainId).find((branch) => branch.branchId === branchId)!,
    };
  }
  togglePersonMembership(_project: Id, branchId: Id, employeeId: Id): Promise<MutationResult> {
    return this.response(() => {
      const person = this.people.find(
        (person) => person.branchId === branchId && person.employeeId === employeeId,
      );
      if (!person) throw new Error('Unknown person');
      person.isProjectMember = !person.isProjectMember;
      return this.result(branchId);
    });
  }
  updateBranchMembership(
    _project: Id,
    branchId: Id,
    action: BranchAction,
  ): Promise<MutationResult> {
    return this.response(() => {
      for (const person of this.people)
        if (person.branchId === branchId) person.isProjectMember = action !== 'removeAll';
      return this.result(branchId);
    });
  }
}
