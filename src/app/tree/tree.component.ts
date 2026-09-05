import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  QueryList,
  ViewChildren,
} from '@angular/core';
import { TreeHelper } from './tree.helper';
import { OrganisationDataSource, OrganisationNode, PickerOptions, TreeNode } from './tree.model';

@Component({
  selector: 'app-tree',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tree.component.html',
  styleUrls: ['./tree.component.scss'],
})
export class TreeComponent implements OnChanges, OnDestroy, AfterViewChecked {
  @Input() dataSource!: OrganisationDataSource;
  @Input() projectId!: string;
  @Input() options: PickerOptions = {};
  @ViewChildren('row') private rowElements!: QueryList<ElementRef<HTMLElement>>;

  helper: TreeHelper | null = null;
  rows: TreeNode<OrganisationNode>[] = [];
  searchText = '';
  activeId = '';
  private unsubscribe?: () => void;
  private searchTimer?: ReturnType<typeof setTimeout>;
  private pendingFocus = false;

  constructor(
    private changeDetector: ChangeDetectorRef,
    private zone: NgZone,
  ) {}

  ngOnChanges(): void {
    clearTimeout(this.searchTimer);
    this.unsubscribe?.();
    this.helper?.dispose();
    this.helper = null;
    this.rows = [];
    this.searchText = '';
    this.activeId = '';
    if (!this.dataSource || this.projectId == null) return;

    this.helper = new TreeHelper(this.dataSource, this.projectId, this.options);
    this.unsubscribe = this.helper.subscribe(() => this.zone.run(() => this.updateRows()));
    this.updateRows();
    void this.helper.initialize();
  }

  private updateRows(): void {
    if (!this.helper) return;
    const hadFocus = this.rowElements?.some(
      (element) => element.nativeElement === element.nativeElement.ownerDocument.activeElement,
    );
    const oldNode = this.rows.find((node) => node.id === this.activeId);
    this.rows = this.helper.tree.visibleNodes();
    if (!this.rows.some((node) => node.id === this.activeId)) {
      let parent = oldNode?.parent;
      while (parent && !this.rows.includes(parent)) parent = parent.parent;
      this.activeId = parent?.id ?? this.rows[0]?.id ?? '';
      if (hadFocus) this.pendingFocus = true;
    }
    this.changeDetector.markForCheck();
  }

  trackNode(_index: number, node: TreeNode<OrganisationNode>): string {
    return node.id;
  }

  level(node: TreeNode<OrganisationNode>): number {
    let level = 0;
    let parent = node.parent;
    while (parent) {
      ++level;
      parent = parent.parent;
    }
    return level;
  }

  focus(node: TreeNode<OrganisationNode>): void {
    this.activeId = node.id;
    const element = this.rowElements?.find(
      (row) => row.nativeElement.dataset['nodeId'] === node.id,
    );
    this.pendingFocus = !element;
    element?.nativeElement.focus();
    this.changeDetector.markForCheck();
  }

  ngAfterViewChecked(): void {
    if (!this.pendingFocus) return;
    const element = this.rowElements?.find(
      (row) => row.nativeElement.dataset['nodeId'] === this.activeId,
    );
    if (element) {
      this.pendingFocus = false;
      element.nativeElement.focus();
    }
  }

  onSearch(event: Event): void {
    this.searchText = (event.target as HTMLInputElement).value;
    clearTimeout(this.searchTimer);
    if (!this.searchText.trim()) void this.helper?.search('');
    else this.searchTimer = setTimeout(() => void this.helper?.search(this.searchText), 300);
  }

  toggleMembership(event: MouseEvent, node: TreeNode<OrganisationNode>): void {
    // Cancel the browser's checkbox toggle: only the confirmed API response changes it.
    event.preventDefault();
    event.stopPropagation();
    this.focus(node);
    void this.helper?.toggle(node);
  }

  toggleExpansion(event: Event, node: TreeNode<OrganisationNode>): void {
    event.stopPropagation();
    this.focus(node);
    if (node.expanded) this.helper?.tree.collapse(node);
    else void this.helper?.expand(node);
  }

  retryLoad(event: Event, node: TreeNode<OrganisationNode>): void {
    event.stopPropagation();
    this.focus(node);
    void this.helper?.expand(node);
  }

  async refresh(): Promise<void> {
    if (!this.helper) return;
    if (!this.helper.browsing.roots.length) await this.helper.initialize();
    else if (this.helper.query) await this.helper.search(this.helper.query);
    else await this.helper.refresh();
  }

  onKeydown(event: KeyboardEvent, node: TreeNode<OrganisationNode>): void {
    if (!this.helper) return;
    const tree = this.helper.tree;
    let target: TreeNode<OrganisationNode> | null = null;
    switch (event.key) {
      case 'ArrowDown':
        target = tree.nextVisibleNode(node);
        break;
      case 'ArrowUp':
        target = tree.previousVisibleNode(node);
        break;
      case 'Home':
        target = this.rows[0] ?? null;
        break;
      case 'End':
        target = this.rows[this.rows.length - 1] ?? null;
        break;
      case 'ArrowRight':
        if (node.hasChildren && !node.expanded) void this.helper.expand(node);
        else target = node.children[0] ?? null;
        break;
      case 'ArrowLeft':
        if (node.expanded && node.hasChildren) tree.collapse(node);
        else target = node.parent === tree.root ? null : node.parent;
        break;
      case ' ':
        void this.helper.toggle(node);
        break;
      default:
        return;
    }
    event.preventDefault();
    if (target) this.focus(target);
  }

  ngOnDestroy(): void {
    clearTimeout(this.searchTimer);
    this.unsubscribe?.();
    this.helper?.dispose();
  }
}
