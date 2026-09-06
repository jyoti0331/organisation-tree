import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TreeNode } from './tree.model';

@Component({
  selector: 'ws-tree',
  standalone: false,
  templateUrl: './tree.component.html',
  styleUrls: ['./tree.component.scss'],
})
export class TreeComponent {
  @Input() nodes: TreeNode[] = [];
  @Input() label = 'Tree';
  @Output() expand = new EventEmitter<TreeNode>();
  @Output() selectionChange = new EventEmitter<TreeNode>();

  protected onExpand(node: TreeNode): void {
    console.log('[tree-debug] TreeComponent.onExpand | emit node', { node });
    debugger;
    this.expand.emit(node);
  }

  protected onCheckboxChange(node: TreeNode): void {
    if (!node.selectionProps.showCheckbox || !node.selectionProps.selectionAllowed || node.pending) return;
    console.log('[tree-debug] TreeComponent.onCheckboxChange | emit node', { node });
    debugger;
    this.selectionChange.emit(node);
  }

  protected trackNode(_index: number, node: TreeNode): string {
    return node.id;
  }
}
