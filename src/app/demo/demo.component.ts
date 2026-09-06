import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  NgZone,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { TreeHelper } from '../tree/tree.helper';
import { TreeComponent } from '../tree/tree.component';
import {
  Branch,
  BranchAction,
  Chain,
  Counts,
  Id,
  MutationResult,
  OrganisationDataSource,
  Person,
  SearchRow,
} from '../tree/tree.model';

/** Replace this mock with your application's HTTP adapter. */
class DemoDataSource implements OrganisationDataSource {
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

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, TreeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './demo.component.html',
  styleUrls: ['./demo.component.scss'],
})
export class DemoComponent implements OnInit, OnDestroy {
  readonly dataSource = new DemoDataSource();
  readonly projectId = 'demo-project';
  readonly maxResults = 300;
  readonly timeoutMs = 10_000;
  readonly helper = new TreeHelper(this.dataSource, this.projectId, { timeoutMs: this.timeoutMs });
  searchText = '';
  searching = false;
  searchError: string | null = null;
  limitReached = false;
  private searchGeneration = 0;
  private searchTimer?: ReturnType<typeof setTimeout>;
  private unsubscribe?: () => void;
  private disposed = false;

  constructor(
    private changeDetector: ChangeDetectorRef,
    private zone: NgZone,
  ) {}

  ngOnInit(): void {
    this.unsubscribe = this.helper.subscribe(() => this.markForCheck());
    void this.helper.initialize();
  }

  private markForCheck(): void {
    if (!this.disposed) this.zone.run(() => this.changeDetector.markForCheck());
  }

  onSearch(event: Event): void {
    this.searchText = (event.target as HTMLInputElement).value;
    const query = this.searchText.trim();
    const generation = ++this.searchGeneration;
    clearTimeout(this.searchTimer);
    this.searchError = null;
    this.limitReached = false;
    this.searching = !!query;
    if (!query) void this.helper.restoreBrowsing();
    else this.searchTimer = setTimeout(() => void this.loadSearchResults(query, generation), 300);
    this.markForCheck();
  }

  private async fetchSearchRows(query: string): Promise<SearchRow[]> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        this.dataSource.searchPersons(this.projectId, query, this.maxResults),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error('Search timed out. Try again.')),
            this.timeoutMs,
          );
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }

  private async loadSearchResults(query: string, generation: number): Promise<void> {
    try {
      while (!this.disposed && generation === this.searchGeneration) {
        const token = this.helper.beginSearch();
        const rows = await this.fetchSearchRows(query);
        if (this.disposed || generation !== this.searchGeneration) return;
        const result = this.helper.applySearchResults(rows.slice(0, this.maxResults), token);
        if (result === 'membership-changed') continue;
        if (result === 'applied') this.limitReached = rows.length >= this.maxResults;
        return;
      }
    } catch (error) {
      if (!this.disposed && generation === this.searchGeneration)
        this.searchError = error instanceof Error ? error.message : String(error);
    } finally {
      if (!this.disposed && generation === this.searchGeneration) {
        this.searching = false;
        this.markForCheck();
      }
    }
  }

  async refresh(): Promise<void> {
    const query = this.searchText.trim();
    if (query) {
      clearTimeout(this.searchTimer);
      this.searchError = null;
      this.limitReached = false;
      this.searching = true;
      this.markForCheck();
      const generation = ++this.searchGeneration;
      await this.helper.refresh();
      await this.loadSearchResults(query, generation);
    } else if (!this.helper.browsing.roots.length) await this.helper.initialize();
    else await this.helper.refresh();
  }

  ngOnDestroy(): void {
    this.disposed = true;
    ++this.searchGeneration;
    clearTimeout(this.searchTimer);
    this.unsubscribe?.();
    this.helper.dispose();
  }
}
