import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  QueryList,
  TemplateRef,
  ViewChildren,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Tree, TreeNode } from '@organisation-tree/core';
@Component({
  selector: 'ot-tree',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div role="tree" [attr.aria-label]="label">
    <div
      #row
      *ngFor="let node of rows; trackBy: trackNode"
      role="treeitem"
      [attr.data-node-id]="node.id"
      [attr.tabindex]="activeId === node.id ? 0 : -1"
      [attr.aria-level]="level(node)"
      [attr.aria-posinset]="node.index + 1"
      [attr.aria-setsize]="node.parent?.children?.length"
      [attr.aria-expanded]="node.hasChildren ? node.expanded : null"
      [attr.aria-busy]="node.loading || null"
      [style.padding-left.px]="(level(node) - 1) * 22 + 10"
      (focus)="activeId = node.id"
      (click)="focus(node)"
      (keydown)="keydown($event, node)"
    >
      <button
        class="disclosure"
        type="button"
        tabindex="-1"
        [style.visibility]="node.hasChildren ? 'visible' : 'hidden'"
        [attr.aria-label]="node.expanded ? 'Collapse' : 'Expand'"
        (click)="disclose($event, node)"
      >
        {{ node.loading ? '◌' : node.expanded ? '▾' : '▸' }}</button
      ><ng-container *ngTemplateOutlet="rowTemplate; context: { $implicit: node }"></ng-container
      ><span *ngIf="node.error" class="load-error" role="status"
        >{{ node.error }} <button type="button" (click)="retry($event, node)">Retry</button></span
      >
    </div>
  </div>`,
  styles: [
    `
      [role='treeitem'] {
        min-height: 42px;
        display: flex;
        align-items: center;
        gap: 10px;
        padding-right: 12px;
        border-radius: 5px;
        outline: none;
        color: var(--ot-text, #24324a);
      }
      [role='treeitem']:hover {
        background: var(--ot-hover, #f3f6fc);
      }
      [role='treeitem']:focus {
        box-shadow: inset 0 0 0 2px var(--ot-accent, #365cdb);
      }
      .disclosure {
        border: 0;
        background: transparent;
        color: inherit;
        width: 22px;
        height: 28px;
        cursor: pointer;
      }
      .load-error {
        font-size: 12px;
        color: #a52b34;
      }
    `,
  ],
})
export class TreeComponent<T> implements OnChanges, OnDestroy, AfterViewChecked {
  @Input() tree!: Tree<T>;
  @Input() rowTemplate!: TemplateRef<{ $implicit: TreeNode<T> }>;
  @Input() label = 'Tree';
  @Output() activated = new EventEmitter<TreeNode<T>>();
  @Output() expanded = new EventEmitter<TreeNode<T>>();
  @ViewChildren('row') elements!: QueryList<ElementRef<HTMLElement>>;
  rows: TreeNode<T>[] = [];
  activeId = '';
  private off?: () => void;
  private pendingFocus = false;
  constructor(
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
  ) {}
  ngOnChanges(): void {
    this.off?.();
    this.off = this.tree.subscribe(() => this.zone.run(() => this.update()));
    this.update();
  }
  update(): void {
    const hadFocus = !!this.elements?.some(
      (ref) => ref.nativeElement === ref.nativeElement.ownerDocument.activeElement,
    );
    const old = this.rows.find((node) => node.id === this.activeId);
    this.rows = this.tree.visibleNodes();
    if (!this.rows.some((node) => node.id === this.activeId)) {
      let parent = old?.parent;
      while (parent && !this.rows.includes(parent)) parent = parent.parent;
      this.activeId = parent?.id ?? this.rows[0]?.id ?? '';
      if (hadFocus) this.pendingFocus = true;
    }
    this.cdr.markForCheck();
  }
  trackNode(_index: number, node: TreeNode<T>): string {
    return node.id;
  }
  level(node: TreeNode<T>): number {
    let level = 0;
    let parent = node.parent;
    while (parent) {
      ++level;
      parent = parent.parent;
    }
    return level;
  }
  focus(node: TreeNode<T>): void {
    this.activeId = node.id;
    const element = this.elements?.find((ref) => ref.nativeElement.dataset['nodeId'] === node.id);
    this.pendingFocus = !element;
    element?.nativeElement.focus();
    this.cdr.markForCheck();
  }
  ngAfterViewChecked(): void {
    if (this.pendingFocus) {
      this.pendingFocus = false;
      this.elements
        .find((ref) => ref.nativeElement.dataset['nodeId'] === this.activeId)
        ?.nativeElement.focus();
    }
  }
  private open(node: TreeNode<T>): void {
    if (this.expanded.observed) this.expanded.emit(node);
    else void this.tree.expand(node);
  }
  disclose(event: Event, node: TreeNode<T>): void {
    event.stopPropagation();
    this.focus(node);
    if (node.expanded) this.tree.collapse(node);
    else this.open(node);
  }
  retry(event: Event, node: TreeNode<T>): void {
    event.stopPropagation();
    this.focus(node);
    this.open(node);
  }
  keydown(event: KeyboardEvent, node: TreeNode<T>): void {
    let target: TreeNode<T> | null = null;
    switch (event.key) {
      case 'ArrowDown':
        target = this.tree.nextVisibleNode(node);
        break;
      case 'ArrowUp':
        target = this.tree.previousVisibleNode(node);
        break;
      case 'Home':
        target = this.rows[0] ?? null;
        break;
      case 'End':
        target = this.rows[this.rows.length - 1] ?? null;
        break;
      case 'ArrowRight':
        if (node.hasChildren && !node.expanded) this.open(node);
        else target = node.children[0] ?? null;
        break;
      case 'ArrowLeft':
        if (node.expanded && node.hasChildren) this.tree.collapse(node);
        else target = node.parent === this.tree.root ? null : node.parent;
        break;
      case ' ':
        this.activated.emit(node);
        break;
      default:
        return;
    }
    event.preventDefault();
    if (target) this.focus(target);
  }
  ngOnDestroy(): void {
    this.off?.();
  }
}
