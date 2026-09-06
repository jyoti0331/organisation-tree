import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  NgZone,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { TreeComponent } from '../tree/tree.component';
import { OrganisationController } from './organisation.controller';
import { DemoDataSource } from './demo-data-source';
import { SearchRow } from './organisation.model';

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
  readonly helper = new OrganisationController(this.dataSource, this.projectId, {
    timeoutMs: this.timeoutMs,
  });
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
        if (result === 'data-changed') continue;
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
