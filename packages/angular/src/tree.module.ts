import { NgModule } from '@angular/core';
import { TreeComponent } from './tree.component';
import { TriStateComponent } from './tri-state.component';
import { OrganisationPickerComponent } from './picker.component';
@NgModule({
  imports: [TreeComponent, TriStateComponent, OrganisationPickerComponent],
  exports: [TreeComponent, TriStateComponent, OrganisationPickerComponent],
})
export class OrganisationTreeModule {}
