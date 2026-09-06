import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TreeComponent } from './tree.component';
import { TreeRowComponent } from './tree-row.component';
import { TriStateCheckboxComponent } from './tri-state-checkbox.component';

@NgModule({
  imports: [CommonModule],
  declarations: [TreeComponent, TreeRowComponent, TriStateCheckboxComponent],
  exports: [TreeComponent, TriStateCheckboxComponent],
})
export class TreeModule {}
