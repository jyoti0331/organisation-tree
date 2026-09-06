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
  private readonly persons: Person[] = this.branches.flatMap((branch) => {
    console.log(
      "[tree-debug] DemoDataSource callback | evaluate ['Alex Andersen', 'Jamie Berg', 'Morgan Hansen', 'Sam Olsen'].map((label, index) => ({ branchId: branch.branchId, employeeId: String(index), label, is",
      { branch },
    );
    debugger;
    return ['Alex Andersen', 'Jamie Berg', 'Morgan Hansen', 'Sam Olsen'].map((label, index) => {
      console.log(
        '[tree-debug] DemoDataSource callback callback | evaluate ({ branchId: branch.branchId, employeeId: String(index), label, isProjectMember: index === 0, })',
        { label, index },
      );
      debugger;
      return {
        branchId: branch.branchId,
        employeeId: String(index),
        label,
        isProjectMember: index === 0,
      };
    });
  });
  private counts(persons: Person[]): Counts {
    console.log('[tree-debug] DemoDataSource.counts | enter', { persons });
    debugger;
    console.log(
      '[tree-debug] DemoDataSource.counts | return { total: persons.length, members: persons.filter((person) => person.isProjectMember).length, };',
    );
    debugger;
    return {
      total: persons.length,
      members: persons.filter((person) => {
        console.log(
          '[tree-debug] DemoDataSource.counts callback | evaluate person.isProjectMember',
          { person },
        );
        debugger;
        return person.isProjectMember;
      }).length,
    };
  }
  private chainRows(): Chain[] {
    console.log('[tree-debug] DemoDataSource.chainRows | enter');
    debugger;
    console.log(
      '[tree-debug] DemoDataSource.chainRows | return this.chains.map((chain) => { const branchIds = new Set( this.branches .filter((branch) => branch.chainId === chain.chainId) .map((branch) => br',
    );
    debugger;
    return this.chains.map((chain) => {
      console.log('[tree-debug] DemoDataSource.chainRows callback | enter', { chain });
      debugger;
      console.log(
        '[tree-debug] DemoDataSource.chainRows callback | const branchIds = new Set( this.branches .filter((branch) => branch.chainId === chain.chainId) .map((branch) => branch.branchId), );',
      );
      debugger;
      const branchIds = new Set(
        this.branches
          .filter((branch) => {
            console.log(
              '[tree-debug] DemoDataSource.chainRows callback callback | evaluate branch.chainId === chain.chainId',
              { branch },
            );
            debugger;
            return branch.chainId === chain.chainId;
          })
          .map((branch) => {
            console.log(
              '[tree-debug] DemoDataSource.chainRows callback callback | evaluate branch.branchId',
              { branch },
            );
            debugger;
            return branch.branchId;
          }),
      );
      console.log(
        '[tree-debug] DemoDataSource.chainRows callback | return { ...chain, ...this.counts(this.persons.filter((person) => branchIds.has(person.branchId))), };',
      );
      debugger;
      return {
        ...chain,
        ...this.counts(
          this.persons.filter((person) => {
            console.log(
              '[tree-debug] DemoDataSource.chainRows callback callback | evaluate branchIds.has(person.branchId)',
              { person },
            );
            debugger;
            return branchIds.has(person.branchId);
          }),
        ),
      };
    });
  }
  private branchRows(chainId: Id): Branch[] {
    console.log('[tree-debug] DemoDataSource.branchRows | enter', { chainId });
    debugger;
    console.log(
      '[tree-debug] DemoDataSource.branchRows | return this.branches .filter((branch) => branch.chainId === chainId) .map((branch) => ({ ...branch, ...this.counts(this.persons.filter((person) => per',
    );
    debugger;
    return this.branches
      .filter((branch) => {
        console.log(
          '[tree-debug] DemoDataSource.branchRows callback | evaluate branch.chainId === chainId',
          { branch },
        );
        debugger;
        return branch.chainId === chainId;
      })
      .map((branch) => {
        console.log(
          '[tree-debug] DemoDataSource.branchRows callback | evaluate ({ ...branch, ...this.counts(this.persons.filter((person) => person.branchId === branch.branchId)), })',
          { branch },
        );
        debugger;
        return {
          ...branch,
          ...this.counts(
            this.persons.filter((person) => {
              console.log(
                '[tree-debug] DemoDataSource.branchRows callback callback | evaluate person.branchId === branch.branchId',
                { person },
              );
              debugger;
              return person.branchId === branch.branchId;
            }),
          ),
        };
      });
  }
  private async respond<T>(value: T): Promise<T> {
    console.log('[tree-debug] DemoDataSource.respond | enter', { value });
    debugger;
    console.log(
      '[tree-debug] DemoDataSource.respond | const snapshot: T = JSON.parse(JSON.stringify(value));',
    );
    debugger;
    const snapshot: T = JSON.parse(JSON.stringify(value));
    console.log(
      '[tree-debug] DemoDataSource.respond | await new Promise((resolve) => setTimeout(resolve, 150));',
    );
    debugger;
    await new Promise((resolve) => {
      console.log(
        '[tree-debug] DemoDataSource.respond callback | evaluate setTimeout(resolve, 150)',
        { resolve },
      );
      debugger;
      return setTimeout(resolve, 150);
    });
    console.log('[tree-debug] DemoDataSource.respond | return snapshot;');
    debugger;
    return snapshot;
  }
  getChains(_projectId: Id): Promise<Chain[]> {
    console.log('[tree-debug] DemoDataSource.getChains | enter', { _projectId });
    debugger;
    console.log('[tree-debug] DemoDataSource.getChains | return this.respond(this.chainRows());');
    debugger;
    return this.respond(this.chainRows());
  }
  getBranches(_projectId: Id, chainId: Id): Promise<Branch[]> {
    console.log('[tree-debug] DemoDataSource.getBranches | enter', { _projectId, chainId });
    debugger;
    console.log(
      '[tree-debug] DemoDataSource.getBranches | return this.respond(this.branchRows(chainId));',
    );
    debugger;
    return this.respond(this.branchRows(chainId));
  }
  getBranchPersons(_projectId: Id, branchId: Id): Promise<Person[]> {
    console.log('[tree-debug] DemoDataSource.getBranchPersons | enter', { _projectId, branchId });
    debugger;
    console.log(
      '[tree-debug] DemoDataSource.getBranchPersons | return this.respond(this.persons.filter((person) => person.branchId === branchId));',
    );
    debugger;
    return this.respond(
      this.persons.filter((person) => {
        console.log(
          '[tree-debug] DemoDataSource.getBranchPersons callback | evaluate person.branchId === branchId',
          { person },
        );
        debugger;
        return person.branchId === branchId;
      }),
    );
  }
  searchPersons(_projectId: Id, query: string, maxCount: number): Promise<SearchRow[]> {
    console.log('[tree-debug] DemoDataSource.searchPersons | enter', {
      _projectId,
      query,
      maxCount,
    });
    debugger;
    console.log('[tree-debug] DemoDataSource.searchPersons | const rows: SearchRow[] = [];');
    debugger;
    const rows: SearchRow[] = [];
    console.log(
      '[tree-debug] DemoDataSource.searchPersons | for (const chain of this.chains) for (const branch of this.branches) { if (branch.chainId !== chain.chainId) continue; for (const person of this.perso',
    );
    debugger;
    for (const chain of this.chains) {
      console.log(
        '[tree-debug] DemoDataSource.searchPersons | for (const branch of this.branches) { if (branch.chainId !== chain.chainId) continue; for (const person of this.persons) { if ( person.branchId === br',
      );
      debugger;
      for (const branch of this.branches) {
        console.log(
          '[tree-debug] DemoDataSource.searchPersons | if (branch.chainId !== chain.chainId) continue;',
        );
        debugger;
        if (branch.chainId !== chain.chainId) {
          console.log('[tree-debug] DemoDataSource.searchPersons | continue;');
          debugger;
          continue;
        }
        console.log(
          '[tree-debug] DemoDataSource.searchPersons | for (const person of this.persons) { if ( person.branchId === branch.branchId && person.label.toLowerCase().includes(query.toLowerCase()) ) rows.push(',
        );
        debugger;
        for (const person of this.persons) {
          console.log(
            '[tree-debug] DemoDataSource.searchPersons | if ( person.branchId === branch.branchId && person.label.toLowerCase().includes(query.toLowerCase()) ) rows.push({ chain, branch, person });',
          );
          debugger;
          if (
            person.branchId === branch.branchId &&
            person.label.toLowerCase().includes(query.toLowerCase())
          ) {
            console.log(
              '[tree-debug] DemoDataSource.searchPersons | rows.push({ chain, branch, person });',
            );
            debugger;
            rows.push({ chain, branch, person });
          }
        }
      }
    }
    console.log(
      '[tree-debug] DemoDataSource.searchPersons | return this.respond(rows.slice(0, maxCount));',
    );
    debugger;
    return this.respond(rows.slice(0, maxCount));
  }
  private mutationResult(branchId: Id): MutationResult {
    console.log('[tree-debug] DemoDataSource.mutationResult | enter', { branchId });
    debugger;
    console.log(
      '[tree-debug] DemoDataSource.mutationResult | const branch = this.branches.find((branch) => branch.branchId === branchId)!;',
    );
    debugger;
    const branch = this.branches.find((branch) => {
      console.log(
        '[tree-debug] DemoDataSource.mutationResult callback | evaluate branch.branchId === branchId',
        { branch },
      );
      debugger;
      return branch.branchId === branchId;
    })!;
    console.log(
      '[tree-debug] DemoDataSource.mutationResult | return { chain: this.chainRows().find((chain) => chain.chainId === branch.chainId)!, branch: this.branchRows(branch.chainId).find((row) => row.branchI',
    );
    debugger;
    return {
      chain: this.chainRows().find((chain) => {
        console.log(
          '[tree-debug] DemoDataSource.mutationResult callback | evaluate chain.chainId === branch.chainId',
          { chain },
        );
        debugger;
        return chain.chainId === branch.chainId;
      })!,
      branch: this.branchRows(branch.chainId).find((row) => {
        console.log(
          '[tree-debug] DemoDataSource.mutationResult callback | evaluate row.branchId === branchId',
          { row },
        );
        debugger;
        return row.branchId === branchId;
      })!,
    };
  }
  togglePersonMembership(_projectId: Id, branchId: Id, employeeId: Id): Promise<MutationResult> {
    console.log('[tree-debug] DemoDataSource.togglePersonMembership | enter', {
      _projectId,
      branchId,
      employeeId,
    });
    debugger;
    console.log(
      '[tree-debug] DemoDataSource.togglePersonMembership | const person = this.persons.find( (person) => person.branchId === branchId && person.employeeId === employeeId, )!;',
    );
    debugger;
    const person = this.persons.find((person) => {
      console.log(
        '[tree-debug] DemoDataSource.togglePersonMembership callback | evaluate person.branchId === branchId && person.employeeId === employeeId',
        { person },
      );
      debugger;
      return person.branchId === branchId && person.employeeId === employeeId;
    })!;
    console.log(
      '[tree-debug] DemoDataSource.togglePersonMembership | person.isProjectMember = !person.isProjectMember;',
    );
    debugger;
    person.isProjectMember = !person.isProjectMember;
    console.log(
      '[tree-debug] DemoDataSource.togglePersonMembership | return this.respond(this.mutationResult(branchId));',
    );
    debugger;
    return this.respond(this.mutationResult(branchId));
  }
  updateBranchMembership(
    _projectId: Id,
    branchId: Id,
    action: BranchAction,
  ): Promise<MutationResult> {
    console.log('[tree-debug] DemoDataSource.updateBranchMembership | enter', {
      _projectId,
      branchId,
      action,
    });
    debugger;
    console.log(
      "[tree-debug] DemoDataSource.updateBranchMembership | for (const person of this.persons) if (person.branchId === branchId) person.isProjectMember = action !== 'removeAll';",
    );
    debugger;
    for (const person of this.persons) {
      console.log(
        "[tree-debug] DemoDataSource.updateBranchMembership | if (person.branchId === branchId) person.isProjectMember = action !== 'removeAll';",
      );
      debugger;
      if (person.branchId === branchId) {
        console.log(
          "[tree-debug] DemoDataSource.updateBranchMembership | person.isProjectMember = action !== 'removeAll';",
        );
        debugger;
        person.isProjectMember = action !== 'removeAll';
      }
    }
    console.log(
      '[tree-debug] DemoDataSource.updateBranchMembership | return this.respond(this.mutationResult(branchId));',
    );
    debugger;
    return this.respond(this.mutationResult(branchId));
  }
}
