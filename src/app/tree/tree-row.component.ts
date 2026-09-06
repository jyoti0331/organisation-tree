import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
import { TreeHelper } from './tree.helper';
import { TreeNode, TreeRowHandle } from './tree.model';

@Component({
  selector: 'ws-tree-row',
  templateUrl: './tree-row.component.html',
  styleUrls: ['./tree-row.component.scss'],
})
export class TreeRowComponent implements OnChanges, OnDestroy, TreeRowHandle {
  @Input() node!: TreeNode;
  @Input() depth = 0;
  @Output() expand = new EventEmitter<TreeNode>();
  @Output() selectionChange = new EventEmitter<TreeNode>();
  @ViewChild('row', { static: true }) private rowElement!: ElementRef<HTMLElement>;

  ngOnChanges(changes: SimpleChanges): void {
    const previous = changes['node']?.previousValue as TreeNode | undefined;
    if (previous) TreeHelper.unregisterRow(previous, this);
    TreeHelper.registerRow(this.node, this);
  }

  focus(): void { this.rowElement.nativeElement.focus(); }

  protected onSelection(): void {
    if (this.node.selectionProps.showCheckbox && this.node.selectionProps.selectionAllowed && !this.node.pending) {
      // Disabling a focused native checkbox would otherwise send focus to the page body.
      this.focus();
      this.selectionChange.emit(this.node);
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      const next = event.key === 'ArrowDown'
        ? TreeHelper.nextVisibleNode(this.node) : TreeHelper.previousVisibleNode(this.node);
      next?.row?.focus();
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      event.stopPropagation();
      const shouldExpand = event.key === 'ArrowRight';
      if (this.node.hasChildren && this.node.expanded !== shouldExpand) {
        this.expand.emit(this.node);
      }
    } else if (event.target === event.currentTarget && (event.key === ' ' || event.key === 'Enter')) {
      event.preventDefault();
      if (!event.repeat) this.onSelection();
    }
  }

  ngOnDestroy(): void { TreeHelper.unregisterRow(this.node, this); }
}
