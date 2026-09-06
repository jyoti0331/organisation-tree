import { Injectable } from '@angular/core';
import { Observable, timer, map } from 'rxjs';
import { OrganisationDataSource } from './organisation-data-source';
import {
  BranchRecord, EmployeeRecord, FakeDataShape, FakeSearchResult, ChainRecord,
  BranchMembershipRecord, EmployeeMembershipRecord, EmployeeSearchResponse, MembershipResponse,
} from './organisation.model';

@Injectable()
export class WeekViewFakeDataService extends OrganisationDataSource {
  private readonly members = new Set<string>();

  /** Work happens when the response completes, and cancellation prevents the fake write. */
  private respond<T>(operation: () => T): Observable<T> {
    return timer(150).pipe(map(() => structuredClone(operation())));
  }

  getChains(): Observable<ChainRecord[]> {
    return this.respond(() => this.chainData.map(chain => ({ ...chain, ...this.chainCounts(chain.id) })));
  }

  getBranches(chainId: string): Observable<BranchMembershipRecord[]> {
    return this.respond(() => this.branchData.filter(branch => branch.chainId === chainId)
      .map(branch => ({ ...branch, ...this.counts(this.employeeData.filter(person => person.branchId === branch.id)) })));
  }

  getEmployees(branchId: string): Observable<EmployeeMembershipRecord[]> {
    return this.respond(() => this.employeeData.filter(person => person.branchId === branchId)
      .map(person => ({ ...person, isProjectMember: this.members.has(this.personKey(person.branchId, person.id)) })));
  }

  searchEmployees(searchTerm: string, maxCount: number): Observable<EmployeeSearchResponse> {
    return this.respond(() => {
      const term = searchTerm.trim().toLowerCase();
      const limit = Math.max(0, Math.floor(maxCount));
      const results: FakeSearchResult[] = [];
      if (!term) return { results, hasTooManyResults: false };
      const branches = new Map<string, BranchRecord[]>();
      const employees = new Map<string, EmployeeRecord[]>();
      for (const branch of this.branchData) {
        const group = branches.get(branch.chainId) ?? [];
        group.push(branch); branches.set(branch.chainId, group);
      }
      for (const employee of this.employeeData) {
        const group = employees.get(employee.branchId) ?? [];
        group.push(employee); employees.set(employee.branchId, group);
      }
      // Same chain, branch and employee order as the listing endpoints.
      for (const chain of this.chainData) {
        for (const branch of branches.get(chain.id) ?? []) {
          for (const person of employees.get(branch.id) ?? []) {
            if (!person.name.toLowerCase().includes(term)) continue;
            if (results.length === limit) return { results, hasTooManyResults: true };
            results.push({
              person: { id: person.id, name: person.name },
              branch: { id: branch.id, name: branch.name }, chain: { ...chain },
              isProjectMember: this.members.has(this.personKey(branch.id, person.id)),
            });
          }
        }
      }
      return { results, hasTooManyResults: false };
    });
  }

  setPersonMembership(branchId: string, employeeId: string, isProjectMember: boolean): Observable<MembershipResponse> {
    return this.respond(() => {
      if (!this.employeeData.some(person => person.branchId === branchId && person.id === employeeId)) {
        throw new Error('This person is no longer in the branch.');
      }
      this.setMember(branchId, employeeId, isProjectMember);
      return { ...this.membershipResponse(branchId, isProjectMember), employeeId };
    });
  }

  setBranchMembership(branchId: string, isProjectMember: boolean): Observable<MembershipResponse> {
    return this.respond(() => {
      if (!this.branchData.some(branch => branch.id === branchId)) throw new Error('Branch not found.');
      for (const person of this.employeeData) {
        if (person.branchId === branchId) this.setMember(branchId, person.id, isProjectMember);
      }
      return this.membershipResponse(branchId, isProjectMember);
    });
  }

  private membershipResponse(branchId: string, isProjectMember: boolean): MembershipResponse {
    const branch = this.branchData.find(item => item.id === branchId)!;
    return {
      branchId, isProjectMember,
      branch: { id: branchId, ...this.counts(this.employeeData.filter(person => person.branchId === branchId)) },
      chain: { id: branch.chainId, ...this.chainCounts(branch.chainId) },
    };
  }

  private chainCounts(chainId: string): { members: number; total: number } {
    const branchIds = new Set(this.branchData.filter(branch => branch.chainId === chainId).map(branch => branch.id));
    return this.counts(this.employeeData.filter(person => branchIds.has(person.branchId)));
  }

  private counts(people: EmployeeRecord[]): { members: number; total: number } {
    return {
      members: people.reduce((count, person) => count + Number(this.members.has(this.personKey(person.branchId, person.id))), 0),
      total: people.length,
    };
  }

  private setMember(branchId: string, employeeId: string, selected: boolean): void {
    const key = this.personKey(branchId, employeeId);
    if (selected) this.members.add(key);
    else this.members.delete(key);
  }

  private personKey(branchId: string, employeeId: string): string { return JSON.stringify([branchId, employeeId]); }

  private readonly chainData: FakeDataShape[] = [
    {
      id: '10',
      name: '10 Hovedkontor',
    },
    {
      id: '20',
      name: '20 Kjede ABC',
    },
    {
      id: '30',
      name: '30 Kjede XYZ',
    },
    {
      id: '40',
      name: '40 Lager',
    },
    {
      id: '50',
      name: '50 Transport',
    },
  ];

  private readonly branchData: BranchRecord[] = [
    // Chain 10
    {
      id: '1020',
      chainId: '10',
      name: '1020 Administrasjon',
    },
    {
      id: '1030',
      chainId: '10',
      name: '1030 IT',
    },
    {
      id: '1040',
      chainId: '10',
      name: '1040 HR',
    },

    // Chain 20
    {
      id: '2010',
      chainId: '20',
      name: '2010 Oslo',
    },
    {
      id: '2020',
      chainId: '20',
      name: '2020 Bergen',
    },

    // Chain 30
    {
      id: '3010',
      chainId: '30',
      name: '3010 Trondheim',
    },
    {
      id: '3020',
      chainId: '30',
      name: '3020 Stavanger',
    },

    // Chain 40
    {
      id: '4010',
      chainId: '40',
      name: '4010 Lager Øst',
    },
    {
      id: '4020',
      chainId: '40',
      name: '4020 Lager Vest',
    },

    // Chain 50
    {
      id: '5010',
      chainId: '50',
      name: '5010 Transport Oslo',
    },

  ];

  private readonly employeeData: EmployeeRecord[] = [
    // 1020 Administrasjon
    {
      id: 'e1001',
      branchId: '1020',
      name: 'Olivia Rhye',
    },
    {
      id: 'e1002',
      branchId: '1020',
      name: 'Emma Johnson',
    },
    {
      id: 'e1003',
      branchId: '1020',
      name: 'Liam Anderson',
    },

    // 1030 IT
    {
      id: 'e2001',
      branchId: '1030',
      name: 'Olivia Rhye',
    },
    {
      id: 'e2002',
      branchId: '1030',
      name: 'Noah Williams',
    },
    {
      id: 'e2003',
      branchId: '1030',
      name: 'William Brown',
    },
    {
      id: 'e2004',
      branchId: '1030',
      name: 'Sophia Davis',
    },
    {
      id: 'e2005',
      branchId: '1030',
      name: 'James Miller',
    },
    {
      id: 'e2006',
      branchId: '1030',
      name: 'Amelia Wilson',
    },
    {
      id: 'e2007',
      branchId: '1030',
      name: 'Lucas Moore',
    },
    {
      id: 'e2008',
      branchId: '1030',
      name: 'Mia Taylor',
    },
    {
      id: 'e2009',
      branchId: '1030',
      name: 'Henry Thomas',
    },
    {
      id: 'e2010',
      branchId: '1030',
      name: 'Ella Martin',
    },

    // 1040 HR
    {
      id: 'e3001',
      branchId: '1040',
      name: 'Ava Thompson',
    },
    {
      id: 'e3002',
      branchId: '1040',
      name: 'Ethan Garcia',
    },

    // 2010 Oslo
    {
      id: 'e4001',
      branchId: '2010',
      name: 'Isabella Martinez',
    },
    {
      id: 'e4002',
      branchId: '2010',
      name: 'Oliver Robinson',
    },

    // 2020 Bergen
    {
      id: 'e5001',
      branchId: '2020',
      name: 'Charlotte Clark',
    },
    {
      id: 'e5002',
      branchId: '2020',
      name: 'Benjamin Lewis',
    },

    // 3010 Trondheim
    {
      id: 'e6001',
      branchId: '3010',
      name: 'Evelyn Lee',
    },
    {
      id: 'e6002',
      branchId: '3010',
      name: 'Daniel Walker',
    },

    // 3020 Stavanger
    {
      id: 'e7001',
      branchId: '3020',
      name: 'Harper Hall',
    },

    // 4010 Lager Øst
    {
      id: 'e8001',
      branchId: '4010',
      name: 'Alexander Allen',
    },
    {
      id: 'e8002',
      branchId: '4010',
      name: 'Sofia Young',
    },

    // 4020 Lager Vest
    {
      id: 'e9001',
      branchId: '4020',
      name: 'Michael King',
    },
    {
      id: 'e9002',
      branchId: '4020',
      name: 'Emily Wright',
    },

    // 5010 Transport
    {
      id: 'e10001',
      branchId: '5010',
      name: 'Daniel Scott',
    },
    {
      id: 'e10002',
      branchId: '5010',
      name: 'Grace Green',
    },

  ];
}
