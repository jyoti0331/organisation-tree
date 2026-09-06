import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TreeSelectionStatus } from './tree.model';

/** Controlled checkbox: emits intent after the browser has canceled its native toggle. */
@Component({
  selector: 'ws-tri-state-checkbox',
  template: `
    <label class="tree-checkbox-label">
      <input type="checkbox" [disabled]="disabled"
        [checked]="status === 'FullySelected'" [indeterminate]="status === 'PartiallySelected'"
        (click)="onActivate($event)" (keydown.enter)="onEnter($event)" />
      <span class="node-label">{{ label }}</span>
    </label>
  `,
  styleUrls: ['./tri-state-checkbox.component.scss'],
})
export class TriStateCheckboxComponent {
  @Input() status = TreeSelectionStatus.NotSelected;
  @Input() disabled = false;
  @Input() label = '';
  @Output() activate = new EventEmitter<void>();
  private queued = false;

  protected onActivate(event: Event): void {
    event.preventDefault();
    if (this.disabled || this.queued) return;
    this.queued = true;
    // A synchronous adapter must also render after native click rollback.
    queueMicrotask(() => {
      this.queued = false;
      if (!this.disabled) this.activate.emit();
    });
  }

  protected onEnter(event: Event): void {
    event.preventDefault();
    if (!(event as KeyboardEvent).repeat) this.onActivate(event);
  }
}
