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
  readonly timeoutMs = 10000;
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
  ) {
    console.log('[tree-debug] DemoComponent.constructor | enter', { changeDetector, zone });
    debugger;
  }
  ngOnInit(): void {
    console.log('[tree-debug] DemoComponent.ngOnInit | enter');
    debugger;
    console.log(
      '[tree-debug] DemoComponent.ngOnInit | this.unsubscribe = this.helper.subscribe(() => this.markForCheck());',
    );
    debugger;
    this.unsubscribe = this.helper.subscribe(() => {
      console.log('[tree-debug] DemoComponent.ngOnInit callback | evaluate this.markForCheck()');
      debugger;
      return this.markForCheck();
    });
    console.log('[tree-debug] DemoComponent.ngOnInit | void this.helper.initialize();');
    debugger;
    void this.helper.initialize();
  }
  private markForCheck(): void {
    console.log('[tree-debug] DemoComponent.markForCheck | enter');
    debugger;
    console.log(
      '[tree-debug] DemoComponent.markForCheck | if (!this.disposed) this.zone.run(() => this.changeDetector.markForCheck());',
    );
    debugger;
    if (!this.disposed) {
      console.log(
        '[tree-debug] DemoComponent.markForCheck | this.zone.run(() => this.changeDetector.markForCheck());',
      );
      debugger;
      this.zone.run(() => {
        console.log(
          '[tree-debug] DemoComponent.markForCheck callback | evaluate this.changeDetector.markForCheck()',
        );
        debugger;
        return this.changeDetector.markForCheck();
      });
    }
  }
  onSearch(event: Event): void {
    console.log('[tree-debug] DemoComponent.onSearch | enter', { event });
    debugger;
    console.log(
      '[tree-debug] DemoComponent.onSearch | this.searchText = (event.target as HTMLInputElement).value;',
    );
    debugger;
    this.searchText = (event.target as HTMLInputElement).value;
    console.log('[tree-debug] DemoComponent.onSearch | const query = this.searchText.trim();');
    debugger;
    const query = this.searchText.trim();
    console.log(
      '[tree-debug] DemoComponent.onSearch | const generation = ++this.searchGeneration;',
    );
    debugger;
    const generation = ++this.searchGeneration;
    console.log('[tree-debug] DemoComponent.onSearch | clearTimeout(this.searchTimer);');
    debugger;
    clearTimeout(this.searchTimer);
    console.log('[tree-debug] DemoComponent.onSearch | this.searchError = null;');
    debugger;
    this.searchError = null;
    console.log('[tree-debug] DemoComponent.onSearch | this.limitReached = false;');
    debugger;
    this.limitReached = false;
    console.log('[tree-debug] DemoComponent.onSearch | this.searching = !!query;');
    debugger;
    this.searching = !!query;
    console.log(
      '[tree-debug] DemoComponent.onSearch | if (!query) void this.helper.restoreBrowsing(); else this.searchTimer = setTimeout(() => void this.loadSearchResults(query, generation), 300);',
    );
    debugger;
    if (!query) {
      console.log('[tree-debug] DemoComponent.onSearch | void this.helper.restoreBrowsing();');
      debugger;
      void this.helper.restoreBrowsing();
    } else {
      console.log(
        '[tree-debug] DemoComponent.onSearch | this.searchTimer = setTimeout(() => void this.loadSearchResults(query, generation), 300);',
      );
      debugger;
      this.searchTimer = setTimeout(() => {
        console.log(
          '[tree-debug] DemoComponent.onSearch callback | evaluate void this.loadSearchResults(query, generation)',
        );
        debugger;
        return void this.loadSearchResults(query, generation);
      }, 300);
    }
    console.log('[tree-debug] DemoComponent.onSearch | this.markForCheck();');
    debugger;
    this.markForCheck();
  }
  private async fetchSearchRows(query: string): Promise<SearchRow[]> {
    console.log('[tree-debug] DemoComponent.fetchSearchRows | enter', { query });
    debugger;
    console.log(
      '[tree-debug] DemoComponent.fetchSearchRows | let timer: ReturnType<typeof setTimeout> | undefined;',
    );
    debugger;
    let timer: ReturnType<typeof setTimeout> | undefined;
    console.log(
      '[tree-debug] DemoComponent.fetchSearchRows | try { return await Promise.race([ this.dataSource.searchPersons(this.projectId, query, this.maxResults), new Promise<never>((_, reject) => { timer = s',
    );
    debugger;
    try {
      console.log(
        '[tree-debug] DemoComponent.fetchSearchRows | return await Promise.race([ this.dataSource.searchPersons(this.projectId, query, this.maxResults), new Promise<never>((_, reject) => { timer = setTime',
      );
      debugger;
      return await Promise.race([
        this.dataSource.searchPersons(this.projectId, query, this.maxResults),
        new Promise<never>((_, reject) => {
          console.log('[tree-debug] DemoComponent.fetchSearchRows callback | enter', { _, reject });
          debugger;
          console.log(
            "[tree-debug] DemoComponent.fetchSearchRows callback | timer = setTimeout( () => reject(new Error('Search timed out. Try again.')), this.timeoutMs, );",
          );
          debugger;
          timer = setTimeout(() => {
            console.log(
              "[tree-debug] DemoComponent.fetchSearchRows callback callback | evaluate reject(new Error('Search timed out. Try again.'))",
            );
            debugger;
            return reject(new Error('Search timed out. Try again.'));
          }, this.timeoutMs);
        }),
      ]);
    } finally {
      console.log('[tree-debug] DemoComponent.fetchSearchRows | clearTimeout(timer);');
      debugger;
      clearTimeout(timer);
    }
  }
  private async loadSearchResults(query: string, generation: number): Promise<void> {
    console.log('[tree-debug] DemoComponent.loadSearchResults | enter', { query, generation });
    debugger;
    console.log(
      '[tree-debug] DemoComponent.loadSearchResults | try { while (!this.disposed && generation === this.searchGeneration) { const token = this.helper.beginSearch(); const rows = await this.fetchSearchRow',
    );
    debugger;
    try {
      console.log(
        '[tree-debug] DemoComponent.loadSearchResults | while (!this.disposed && generation === this.searchGeneration) { const token = this.helper.beginSearch(); const rows = await this.fetchSearchRows(quer',
      );
      debugger;
      while (!this.disposed && generation === this.searchGeneration) {
        console.log(
          '[tree-debug] DemoComponent.loadSearchResults | const token = this.helper.beginSearch();',
        );
        debugger;
        const token = this.helper.beginSearch();
        console.log(
          '[tree-debug] DemoComponent.loadSearchResults | const rows = await this.fetchSearchRows(query);',
        );
        debugger;
        const rows = await this.fetchSearchRows(query);
        console.log(
          '[tree-debug] DemoComponent.loadSearchResults | if (this.disposed || generation !== this.searchGeneration) return;',
        );
        debugger;
        if (this.disposed || generation !== this.searchGeneration) {
          console.log('[tree-debug] DemoComponent.loadSearchResults | return;');
          debugger;
          return;
        }
        console.log(
          '[tree-debug] DemoComponent.loadSearchResults | const result = this.helper.applySearchResults(rows.slice(0, this.maxResults), token);',
        );
        debugger;
        const result = this.helper.applySearchResults(rows.slice(0, this.maxResults), token);
        console.log(
          "[tree-debug] DemoComponent.loadSearchResults | if (result === 'data-changed') continue;",
        );
        debugger;
        if (result === 'data-changed') {
          console.log('[tree-debug] DemoComponent.loadSearchResults | continue;');
          debugger;
          continue;
        }
        console.log(
          "[tree-debug] DemoComponent.loadSearchResults | if (result === 'applied') this.limitReached = rows.length >= this.maxResults;",
        );
        debugger;
        if (result === 'applied') {
          console.log(
            '[tree-debug] DemoComponent.loadSearchResults | this.limitReached = rows.length >= this.maxResults;',
          );
          debugger;
          this.limitReached = rows.length >= this.maxResults;
        }
        console.log('[tree-debug] DemoComponent.loadSearchResults | return;');
        debugger;
        return;
      }
    } catch (error) {
      console.log(
        '[tree-debug] DemoComponent.loadSearchResults | if (!this.disposed && generation === this.searchGeneration) this.searchError = error instanceof Error ? error.message : String(error);',
      );
      debugger;
      if (!this.disposed && generation === this.searchGeneration) {
        console.log(
          '[tree-debug] DemoComponent.loadSearchResults | this.searchError = error instanceof Error ? error.message : String(error);',
        );
        debugger;
        this.searchError = error instanceof Error ? error.message : String(error);
      }
    } finally {
      console.log(
        '[tree-debug] DemoComponent.loadSearchResults | if (!this.disposed && generation === this.searchGeneration) { this.searching = false; this.markForCheck(); }',
      );
      debugger;
      if (!this.disposed && generation === this.searchGeneration) {
        console.log('[tree-debug] DemoComponent.loadSearchResults | this.searching = false;');
        debugger;
        this.searching = false;
        console.log('[tree-debug] DemoComponent.loadSearchResults | this.markForCheck();');
        debugger;
        this.markForCheck();
      }
    }
  }
  async refresh(): Promise<void> {
    console.log('[tree-debug] DemoComponent.refresh | enter');
    debugger;
    console.log('[tree-debug] DemoComponent.refresh | const query = this.searchText.trim();');
    debugger;
    const query = this.searchText.trim();
    console.log(
      '[tree-debug] DemoComponent.refresh | if (query) { clearTimeout(this.searchTimer); this.searchError = null; this.limitReached = false; this.searching = true; this.markForCheck(); const gen',
    );
    debugger;
    if (query) {
      console.log('[tree-debug] DemoComponent.refresh | clearTimeout(this.searchTimer);');
      debugger;
      clearTimeout(this.searchTimer);
      console.log('[tree-debug] DemoComponent.refresh | this.searchError = null;');
      debugger;
      this.searchError = null;
      console.log('[tree-debug] DemoComponent.refresh | this.limitReached = false;');
      debugger;
      this.limitReached = false;
      console.log('[tree-debug] DemoComponent.refresh | this.searching = true;');
      debugger;
      this.searching = true;
      console.log('[tree-debug] DemoComponent.refresh | this.markForCheck();');
      debugger;
      this.markForCheck();
      console.log(
        '[tree-debug] DemoComponent.refresh | const generation = ++this.searchGeneration;',
      );
      debugger;
      const generation = ++this.searchGeneration;
      console.log('[tree-debug] DemoComponent.refresh | await this.helper.refresh();');
      debugger;
      await this.helper.refresh();
      console.log(
        '[tree-debug] DemoComponent.refresh | await this.loadSearchResults(query, generation);',
      );
      debugger;
      await this.loadSearchResults(query, generation);
    } else {
      console.log(
        '[tree-debug] DemoComponent.refresh | if (!this.helper.browsing.roots.length) await this.helper.initialize(); else await this.helper.refresh();',
      );
      debugger;
      if (!this.helper.browsing.roots.length) {
        console.log('[tree-debug] DemoComponent.refresh | await this.helper.initialize();');
        debugger;
        await this.helper.initialize();
      } else {
        console.log('[tree-debug] DemoComponent.refresh | await this.helper.refresh();');
        debugger;
        await this.helper.refresh();
      }
    }
  }
  ngOnDestroy(): void {
    console.log('[tree-debug] DemoComponent.ngOnDestroy | enter');
    debugger;
    console.log('[tree-debug] DemoComponent.ngOnDestroy | this.disposed = true;');
    debugger;
    this.disposed = true;
    console.log('[tree-debug] DemoComponent.ngOnDestroy | ++this.searchGeneration;');
    debugger;
    ++this.searchGeneration;
    console.log('[tree-debug] DemoComponent.ngOnDestroy | clearTimeout(this.searchTimer);');
    debugger;
    clearTimeout(this.searchTimer);
    console.log('[tree-debug] DemoComponent.ngOnDestroy | this.unsubscribe?.();');
    debugger;
    this.unsubscribe?.();
    console.log('[tree-debug] DemoComponent.ngOnDestroy | this.helper.dispose();');
    debugger;
    this.helper.dispose();
  }
}
