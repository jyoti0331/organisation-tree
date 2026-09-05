import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrganisationController, OrganisationNode } from '@organisation-tree/organisation';
import { TreeNode } from '@organisation-tree/core';
import { TreeComponent } from './tree.component';
import { TriStateComponent } from './tri-state.component';
@Component({
  selector: 'ot-organisation-picker',
  standalone: true,
  imports: [CommonModule, TreeComponent, TriStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="picker" aria-label="Project members">
    <label class="search-label"
      >Find a person<input
        type="search"
        placeholder="Search people…"
        [value]="searchText"
        (input)="onSearch($event)"
    /></label>
    <div class="status" aria-live="polite">
      <span *ngIf="controller.initialLoading || controller.searching">Loading…</span
      ><span *ngIf="controller.refreshing">Refreshing membership…</span
      ><span *ngIf="controller.limitReached">Result limit reached; refine your search.</span
      ><span *ngIf="controller.error" class="error"
        >{{ controller.error }} <button type="button" (click)="retry()">Refresh</button></span
      >
    </div>
    <ot-tree
      #treeView
      [tree]="controller.tree"
      [rowTemplate]="row"
      label="Organisation members"
      (expanded)="controller.expand($event)"
      (activated)="controller.toggle($event)"
    ></ot-tree>
    <p
      class="empty"
      *ngIf="!controller.initialLoading && !controller.searching && !controller.tree.roots.length"
    >
      {{ controller.query ? 'No people found.' : 'No chains to display.' }}
    </p>
    <ng-template #row let-node
      ><ot-tri-state
        *ngIf="!controller.query || node.data.kind === 'person'"
        [state]="controller.state(node)"
        [disabled]="controller.disabled(node)"
        [label]="'Project membership for ' + node.data.value.label"
        (toggled)="treeView.focus(node); controller.toggle(node)"
      ></ot-tri-state
      ><span class="node-label">{{ node.data.value.label }}</span
      ><span class="kind">{{ node.data.kind }}</span
      ><span class="count" *ngIf="!controller.query && node.data.kind !== 'person'"
        >{{ node.data.value.members }} / {{ node.data.value.total }}</span
      ></ng-template
    >
  </section>`,
  styles: [
    `
      :host {
        display: block;
        font-family: inherit;
      }
      .picker {
        border: 1px solid var(--ot-border, #dce3ef);
        border-radius: 12px;
        background: var(--ot-background, #fff);
        padding: 18px;
      }
      .search-label {
        display: block;
        font-size: 12px;
        font-weight: 600;
        color: var(--ot-text, #24324a);
      }
      input {
        display: block;
        box-sizing: border-box;
        width: 100%;
        margin-top: 8px;
        padding: 11px 12px;
        border: 1px solid var(--ot-border, #dce3ef);
        border-radius: 6px;
        font: inherit;
        font-size: 14px;
      }
      .status {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 12px;
        color: #66748b;
        min-height: 24px;
        padding-top: 10px;
      }
      .error {
        color: #a52b34;
      }
      .node-label {
        flex: 1;
        min-width: 0;
        overflow-wrap: anywhere;
      }
      .kind {
        color: #8290a5;
        font-size: 11px;
      }
      .count {
        font-variant-numeric: tabular-nums;
        font-size: 12px;
        color: #65728a;
        min-width: 54px;
        text-align: right;
      }
      .empty {
        padding: 25px;
        text-align: center;
        color: #65728a;
      }
    `,
  ],
})
export class OrganisationPickerComponent implements OnChanges, OnDestroy {
  @Input() controller!: OrganisationController;
  searchText = '';
  private timer?: ReturnType<typeof setTimeout>;
  private off?: () => void;
  constructor(
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
  ) {}
  ngOnChanges(): void {
    this.off?.();
    clearTimeout(this.timer);
    this.searchText = this.controller.query;
    this.off = this.controller.subscribe(() => this.zone.run(() => this.cdr.markForCheck()));
    void this.controller.initialize();
  }
  onSearch(event: Event): void {
    this.searchText = (event.target as HTMLInputElement).value;
    clearTimeout(this.timer);
    if (!this.searchText.trim()) void this.controller.search('');
    else this.timer = setTimeout(() => void this.controller.search(this.searchText), 300);
  }
  async retry(): Promise<void> {
    if (!this.controller.browsing.roots.length) await this.controller.initialize();
    else if (this.controller.query) await this.controller.search(this.controller.query);
    else await this.controller.refresh();
  }
  ngOnDestroy(): void {
    clearTimeout(this.timer);
    this.off?.();
  }
}
