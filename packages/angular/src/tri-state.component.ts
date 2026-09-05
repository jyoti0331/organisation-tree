import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CheckState } from '@organisation-tree/organisation';
@Component({
  selector: 'ot-tri-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<input
    type="checkbox"
    tabindex="-1"
    [checked]="state === 'checked'"
    [indeterminate]="state === 'mixed'"
    [disabled]="disabled"
    [attr.aria-label]="label"
    (click)="activate($event)"
  />`,
  styles: [
    `
      :host {
        display: inline-flex;
      }
      input {
        width: 16px;
        height: 16px;
        margin: 0;
        accent-color: var(--ot-accent, #365cdb);
        cursor: pointer;
      }
      input:disabled {
        cursor: default;
      }
    `,
  ],
})
export class TriStateComponent {
  @Input() state: CheckState = 'unchecked';
  @Input() disabled = false;
  @Input() label = 'Membership';
  @Output() toggled = new EventEmitter<void>();
  activate(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.disabled) this.toggled.emit();
  }
}
