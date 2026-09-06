import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  Output,
  EventEmitter,
  NgZone,
  OnChanges,
  OnDestroy,
  QueryList,
  ViewChildren,
} from '@angular/core';
import { TreeHelper } from './tree.helper';
import { TreeNode, TreePresentation, CheckboxToggle } from './tree.model';
@Component({
  selector: 'app-tree',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tree.component.html',
  styleUrls: ['./tree.component.scss'],
})
export class TreeComponent<T> implements OnChanges, OnDestroy, AfterViewChecked {
  @Input()
  helper: TreeHelper<T> | null = null;
  @Input()
  label = 'Tree';
  @Input()
  presentation: TreePresentation<T> = {
    label: (node) => {
      console.log('[tree-debug] TreeComponent callback | evaluate String(node.data)', { node });
      debugger;
      return String(node.data);
    },
  };
  @Output()
  checkboxToggle = new EventEmitter<CheckboxToggle<T>>();
  @ViewChildren('row')
  private rowElements!: QueryList<ElementRef<HTMLElement>>;
  rows: TreeNode<T>[] = [];
  activeId = '';
  private unsubscribe?: () => void;
  private pendingFocus = false;
  constructor(
    private changeDetector: ChangeDetectorRef,
    private zone: NgZone,
  ) {
    console.log('[tree-debug] TreeComponent.constructor | enter', { changeDetector, zone });
    debugger;
  }
  ngOnChanges(): void {
    console.log('[tree-debug] TreeComponent.ngOnChanges | enter');
    debugger;
    console.log('[tree-debug] TreeComponent.ngOnChanges | this.unsubscribe?.();');
    debugger;
    this.unsubscribe?.();
    console.log(
      "[tree-debug] TreeComponent.ngOnChanges | if (!this.helper) { this.rows = []; this.activeId = ''; return; }",
    );
    debugger;
    if (!this.helper) {
      console.log('[tree-debug] TreeComponent.ngOnChanges | this.rows = [];');
      debugger;
      this.rows = [];
      console.log("[tree-debug] TreeComponent.ngOnChanges | this.activeId = '';");
      debugger;
      this.activeId = '';
      console.log('[tree-debug] TreeComponent.ngOnChanges | return;');
      debugger;
      return;
    }
    console.log(
      '[tree-debug] TreeComponent.ngOnChanges | this.unsubscribe = this.helper.subscribe(() => this.zone.run(() => this.updateRows()));',
    );
    debugger;
    this.unsubscribe = this.helper.subscribe(() => {
      console.log(
        '[tree-debug] TreeComponent.ngOnChanges callback | evaluate this.zone.run(() => this.updateRows())',
      );
      debugger;
      return this.zone.run(() => {
        console.log(
          '[tree-debug] TreeComponent.ngOnChanges callback callback | evaluate this.updateRows()',
        );
        debugger;
        return this.updateRows();
      });
    });
    console.log('[tree-debug] TreeComponent.ngOnChanges | this.updateRows();');
    debugger;
    this.updateRows();
  }
  private updateRows(): void {
    console.log('[tree-debug] TreeComponent.updateRows | enter');
    debugger;
    console.log('[tree-debug] TreeComponent.updateRows | if (!this.helper) return;');
    debugger;
    if (!this.helper) {
      console.log('[tree-debug] TreeComponent.updateRows | return;');
      debugger;
      return;
    }
    console.log(
      '[tree-debug] TreeComponent.updateRows | const hadFocus = this.rowElements?.some( (element) => element.nativeElement === element.nativeElement.ownerDocument.activeElement, );',
    );
    debugger;
    const hadFocus = this.rowElements?.some((element) => {
      console.log(
        '[tree-debug] TreeComponent.updateRows callback | evaluate element.nativeElement === element.nativeElement.ownerDocument.activeElement',
        { element },
      );
      debugger;
      return element.nativeElement === element.nativeElement.ownerDocument.activeElement;
    });
    console.log(
      '[tree-debug] TreeComponent.updateRows | const oldNode = this.rows.find((node) => node.id === this.activeId);',
    );
    debugger;
    const oldNode = this.rows.find((node) => {
      console.log(
        '[tree-debug] TreeComponent.updateRows callback | evaluate node.id === this.activeId',
        { node },
      );
      debugger;
      return node.id === this.activeId;
    });
    console.log(
      '[tree-debug] TreeComponent.updateRows | this.rows = this.helper.tree.visibleNodes();',
    );
    debugger;
    this.rows = this.helper.tree.visibleNodes();
    console.log(
      '[tree-debug] TreeComponent.updateRows | if (!this.rows.some((node) => node.id === this.activeId)) { let parent = oldNode?.parent; while (parent && !this.rows.includes(parent)) parent = paren',
    );
    debugger;
    if (
      !this.rows.some((node) => {
        console.log(
          '[tree-debug] TreeComponent.updateRows callback | evaluate node.id === this.activeId',
          { node },
        );
        debugger;
        return node.id === this.activeId;
      })
    ) {
      console.log('[tree-debug] TreeComponent.updateRows | let parent = oldNode?.parent;');
      debugger;
      let parent = oldNode?.parent;
      console.log(
        '[tree-debug] TreeComponent.updateRows | while (parent && !this.rows.includes(parent)) parent = parent.parent;',
      );
      debugger;
      while (parent && !this.rows.includes(parent)) {
        console.log('[tree-debug] TreeComponent.updateRows | parent = parent.parent;');
        debugger;
        parent = parent.parent;
      }
      console.log(
        "[tree-debug] TreeComponent.updateRows | this.activeId = parent?.id ?? this.rows[0]?.id ?? '';",
      );
      debugger;
      this.activeId = parent?.id ?? this.rows[0]?.id ?? '';
      console.log(
        '[tree-debug] TreeComponent.updateRows | if (hadFocus) this.pendingFocus = true;',
      );
      debugger;
      if (hadFocus) {
        console.log('[tree-debug] TreeComponent.updateRows | this.pendingFocus = true;');
        debugger;
        this.pendingFocus = true;
      }
    }
    console.log('[tree-debug] TreeComponent.updateRows | this.changeDetector.markForCheck();');
    debugger;
    this.changeDetector.markForCheck();
  }
  trackNode(_index: number, node: TreeNode<T>): string {
    console.log('[tree-debug] TreeComponent.trackNode | enter', { _index, node });
    debugger;
    console.log('[tree-debug] TreeComponent.trackNode | return node.id;');
    debugger;
    return node.id;
  }
  level(node: TreeNode<T>): number {
    console.log('[tree-debug] TreeComponent.level | enter', { node });
    debugger;
    console.log('[tree-debug] TreeComponent.level | let level = 0;');
    debugger;
    let level = 0;
    console.log('[tree-debug] TreeComponent.level | let parent = node.parent;');
    debugger;
    let parent = node.parent;
    console.log(
      '[tree-debug] TreeComponent.level | while (parent) { ++level; parent = parent.parent; }',
    );
    debugger;
    while (parent) {
      console.log('[tree-debug] TreeComponent.level | ++level;');
      debugger;
      ++level;
      console.log('[tree-debug] TreeComponent.level | parent = parent.parent;');
      debugger;
      parent = parent.parent;
    }
    console.log('[tree-debug] TreeComponent.level | return level;');
    debugger;
    return level;
  }
  focus(node: TreeNode<T>): void {
    console.log('[tree-debug] TreeComponent.focus | enter', { node });
    debugger;
    console.log('[tree-debug] TreeComponent.focus | this.activeId = node.id;');
    debugger;
    this.activeId = node.id;
    console.log(
      "[tree-debug] TreeComponent.focus | const element = this.rowElements?.find( (row) => row.nativeElement.dataset['nodeId'] === node.id, );",
    );
    debugger;
    const element = this.rowElements?.find((row) => {
      console.log(
        "[tree-debug] TreeComponent.focus callback | evaluate row.nativeElement.dataset['nodeId'] === node.id",
        { row },
      );
      debugger;
      return row.nativeElement.dataset['nodeId'] === node.id;
    });
    console.log('[tree-debug] TreeComponent.focus | this.pendingFocus = !element;');
    debugger;
    this.pendingFocus = !element;
    console.log('[tree-debug] TreeComponent.focus | element?.nativeElement.focus();');
    debugger;
    element?.nativeElement.focus();
    console.log('[tree-debug] TreeComponent.focus | this.changeDetector.markForCheck();');
    debugger;
    this.changeDetector.markForCheck();
  }
  ngAfterViewChecked(): void {
    console.log('[tree-debug] TreeComponent.ngAfterViewChecked | enter');
    debugger;
    console.log('[tree-debug] TreeComponent.ngAfterViewChecked | if (!this.pendingFocus) return;');
    debugger;
    if (!this.pendingFocus) {
      console.log('[tree-debug] TreeComponent.ngAfterViewChecked | return;');
      debugger;
      return;
    }
    console.log(
      "[tree-debug] TreeComponent.ngAfterViewChecked | const element = this.rowElements?.find( (row) => row.nativeElement.dataset['nodeId'] === this.activeId, );",
    );
    debugger;
    const element = this.rowElements?.find((row) => {
      console.log(
        "[tree-debug] TreeComponent.ngAfterViewChecked callback | evaluate row.nativeElement.dataset['nodeId'] === this.activeId",
        { row },
      );
      debugger;
      return row.nativeElement.dataset['nodeId'] === this.activeId;
    });
    console.log(
      '[tree-debug] TreeComponent.ngAfterViewChecked | if (element) { this.pendingFocus = false; element.nativeElement.focus(); }',
    );
    debugger;
    if (element) {
      console.log('[tree-debug] TreeComponent.ngAfterViewChecked | this.pendingFocus = false;');
      debugger;
      this.pendingFocus = false;
      console.log('[tree-debug] TreeComponent.ngAfterViewChecked | element.nativeElement.focus();');
      debugger;
      element.nativeElement.focus();
    }
  }
  toggleCheckbox(event: MouseEvent, node: TreeNode<T>): void {
    console.log('[tree-debug] TreeComponent.toggleCheckbox | enter', { event, node });
    debugger;
    console.log('[tree-debug] TreeComponent.toggleCheckbox | event.preventDefault();');
    debugger;
    // The host owns checkbox state; emit intent without changing the payload.
    event.preventDefault();
    console.log('[tree-debug] TreeComponent.toggleCheckbox | event.stopPropagation();');
    debugger;
    event.stopPropagation();
    console.log('[tree-debug] TreeComponent.toggleCheckbox | this.focus(node);');
    debugger;
    this.focus(node);
    console.log('[tree-debug] TreeComponent.toggleCheckbox | this.requestToggle(node);');
    debugger;
    this.requestToggle(node);
  }
  private requestToggle(node: TreeNode<T>): void {
    console.log('[tree-debug] TreeComponent.requestToggle | enter', { node });
    debugger;
    console.log(
      '[tree-debug] TreeComponent.requestToggle | const checkbox = this.presentation.checkbox?.(node);',
    );
    debugger;
    const checkbox = this.presentation.checkbox?.(node);
    console.log(
      "[tree-debug] TreeComponent.requestToggle | if (checkbox && !checkbox.disabled) this.checkboxToggle.emit({ node, checked: checkbox.state !== 'checked' });",
    );
    debugger;
    if (checkbox && !checkbox.disabled) {
      console.log(
        "[tree-debug] TreeComponent.requestToggle | this.checkboxToggle.emit({ node, checked: checkbox.state !== 'checked' });",
      );
      debugger;
      this.checkboxToggle.emit({ node, checked: checkbox.state !== 'checked' });
    }
  }
  toggleExpansion(event: Event, node: TreeNode<T>): void {
    console.log('[tree-debug] TreeComponent.toggleExpansion | enter', { event, node });
    debugger;
    console.log('[tree-debug] TreeComponent.toggleExpansion | event.stopPropagation();');
    debugger;
    event.stopPropagation();
    console.log('[tree-debug] TreeComponent.toggleExpansion | this.focus(node);');
    debugger;
    this.focus(node);
    console.log(
      '[tree-debug] TreeComponent.toggleExpansion | if (node.expanded) this.helper?.tree.collapse(node); else void this.helper?.expand(node);',
    );
    debugger;
    if (node.expanded) {
      console.log('[tree-debug] TreeComponent.toggleExpansion | this.helper?.tree.collapse(node);');
      debugger;
      this.helper?.tree.collapse(node);
    } else {
      console.log('[tree-debug] TreeComponent.toggleExpansion | void this.helper?.expand(node);');
      debugger;
      void this.helper?.expand(node);
    }
  }
  retryLoad(event: Event, node: TreeNode<T>): void {
    console.log('[tree-debug] TreeComponent.retryLoad | enter', { event, node });
    debugger;
    console.log('[tree-debug] TreeComponent.retryLoad | event.stopPropagation();');
    debugger;
    event.stopPropagation();
    console.log('[tree-debug] TreeComponent.retryLoad | this.focus(node);');
    debugger;
    this.focus(node);
    console.log('[tree-debug] TreeComponent.retryLoad | void this.helper?.expand(node);');
    debugger;
    void this.helper?.expand(node);
  }
  onKeydown(event: KeyboardEvent, node: TreeNode<T>): void {
    console.log('[tree-debug] TreeComponent.onKeydown | enter', { event, node });
    debugger;
    console.log('[tree-debug] TreeComponent.onKeydown | if (!this.helper) return;');
    debugger;
    if (!this.helper) {
      console.log('[tree-debug] TreeComponent.onKeydown | return;');
      debugger;
      return;
    }
    console.log('[tree-debug] TreeComponent.onKeydown | const tree = this.helper.tree;');
    debugger;
    const tree = this.helper.tree;
    console.log('[tree-debug] TreeComponent.onKeydown | let target: TreeNode<T> | null = null;');
    debugger;
    let target: TreeNode<T> | null = null;
    console.log('[tree-debug] TreeComponent.onKeydown | dispatch key', { key: event.key });
    debugger;
    switch (event.key) {
      case 'ArrowDown':
        console.log('[tree-debug] TreeComponent.onKeydown | handle ArrowDown', { nodeId: node.id });
        debugger;
        target = tree.nextVisibleNode(node);
        break;
      case 'ArrowUp':
        console.log('[tree-debug] TreeComponent.onKeydown | handle ArrowUp', { nodeId: node.id });
        debugger;
        target = tree.previousVisibleNode(node);
        break;
      case 'Home':
        console.log('[tree-debug] TreeComponent.onKeydown | handle Home', { nodeId: node.id });
        debugger;
        target = this.rows[0] ?? null;
        break;
      case 'End':
        console.log('[tree-debug] TreeComponent.onKeydown | handle End', { nodeId: node.id });
        debugger;
        target = this.rows[this.rows.length - 1] ?? null;
        break;
      case 'ArrowRight':
        console.log('[tree-debug] TreeComponent.onKeydown | handle ArrowRight', {
          nodeId: node.id,
        });
        debugger;
        if (node.hasChildren && !node.expanded) {
          console.log('[tree-debug] TreeComponent.onKeydown | void this.helper.expand(node);');
          debugger;
          void this.helper.expand(node);
        } else {
          console.log('[tree-debug] TreeComponent.onKeydown | target = node.children[0] ?? null;');
          debugger;
          target = node.children[0] ?? null;
        }
        break;
      case 'ArrowLeft':
        console.log('[tree-debug] TreeComponent.onKeydown | handle ArrowLeft', { nodeId: node.id });
        debugger;
        if (node.expanded && node.hasChildren) {
          console.log('[tree-debug] TreeComponent.onKeydown | tree.collapse(node);');
          debugger;
          tree.collapse(node);
        } else {
          console.log(
            '[tree-debug] TreeComponent.onKeydown | target = node.parent === tree.root ? null : node.parent;',
          );
          debugger;
          target = node.parent === tree.root ? null : node.parent;
        }
        break;
      case ' ':
        console.log('[tree-debug] TreeComponent.onKeydown | handle Space', { nodeId: node.id });
        debugger;
        this.requestToggle(node);
        break;
      default:
        return;
    }
    console.log('[tree-debug] TreeComponent.onKeydown | event.preventDefault();');
    debugger;
    event.preventDefault();
    console.log('[tree-debug] TreeComponent.onKeydown | if (target) this.focus(target);');
    debugger;
    if (target) {
      console.log('[tree-debug] TreeComponent.onKeydown | this.focus(target);');
      debugger;
      this.focus(target);
    }
  }
  onRowFocus(node: TreeNode<T>): void {
    console.log('[tree-debug] TreeComponent.onRowFocus | update active row', {
      nodeId: node.id,
      previousActiveId: this.activeId,
    });
    debugger;
    this.activeId = node.id;
  }
  ngOnDestroy(): void {
    console.log('[tree-debug] TreeComponent.ngOnDestroy | enter');
    debugger;
    console.log('[tree-debug] TreeComponent.ngOnDestroy | this.unsubscribe?.();');
    debugger;
    this.unsubscribe?.();
  }
}
