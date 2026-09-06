import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { EMPTY, Subject, Subscription, catchError, switchMap, tap, timer } from 'rxjs';
import { TreeModule } from '../tree/tree.module';
import { TreeNode } from '../tree/tree.model';
import { AddProjectMemberControllerService } from './add-project-member-controller.service';
import { WeekViewFakeDataService } from './demo-data-source';
import { OrganisationDataSource } from './organisation-data-source';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, TreeModule],
  providers: [
    AddProjectMemberControllerService,
    { provide: OrganisationDataSource, useClass: WeekViewFakeDataService },
  ],
  templateUrl: './demo.component.html',
  styleUrls: ['./demo.component.scss'],
})
export class DemoComponent implements OnInit, OnDestroy {
  protected treeRoot: TreeNode;
  protected searchNodes: TreeNode[] = [];
  protected searchMode = false;
  protected searchTerm = '';
  protected searchTooManyResults = false;
  protected searching = false;
  protected searchError = '';
  private readonly searchTerms = new Subject<string>();
  private readonly searchSubscription: Subscription;

  protected get treeNodes(): TreeNode[] {
    return this.searchMode ? this.searchNodes : this.treeRoot.children ?? [];
  }

  constructor(protected readonly addProjectMemberService: AddProjectMemberControllerService) {
    this.treeRoot = this.addProjectMemberService.initializeTree();
    // The outer switchMap cancels the previous request immediately, before debounce.
    this.searchSubscription = this.searchTerms.pipe(
      switchMap(term => term ? timer(300).pipe(
        switchMap(() => this.addProjectMemberService.searchEmployees(term)),
        tap(result => {
          this.searchNodes = result.nodes;
          this.searchTooManyResults = result.hasTooManyResults;
          this.searching = false;
        }),
        catchError(error => {
          this.searchNodes = [];
          this.searchTooManyResults = false;
          this.searching = false;
          this.searchError = error instanceof Error ? error.message : String(error);
          this.addProjectMemberService.clearSearch();
          return EMPTY;
        }),
      ) : EMPTY),
    ).subscribe();
  }

  ngOnInit(): void {
    this.addProjectMemberService.loadChildren(this.treeRoot, this.treeRoot);
  }

  protected onNodeExpand(node: TreeNode): void {
    console.log('[tree-debug] DemoComponent.onNodeExpand | route by mode', { node, searchMode: this.searchMode });
    debugger;
    if (this.searchMode) this.addProjectMemberService.toggleSearchNodeExpansion(node);
    else this.addProjectMemberService.expandNode(this.treeRoot, node);
  }

  protected onSelectionChange(node: TreeNode): void {
    console.log('[tree-debug] DemoComponent.onSelectionChange | route by mode', { node, searchMode: this.searchMode });
    debugger;
    if (this.searchMode) {
      this.addProjectMemberService.toggleSearchSelection(node);
      return;
    }
    this.addProjectMemberService.updateSelection(this.treeRoot, node);
  }

  protected onSearchInput(event: Event): void {
    this.searchTerm = (event.target as HTMLInputElement).value;
    this.search(this.searchTerm.trim());
  }

  private search(term: string): void {
    this.searchMode = !!term;
    this.searchNodes = [];
    this.searchTooManyResults = false;
    this.searchError = '';
    this.searching = !!term;
    this.addProjectMemberService.clearSearch();
    this.searchTerms.next(term);
  }

  protected clearSearch(): void {
    this.searchTerm = '';
    this.search('');
  }

  protected retrySearch(): void {
    this.search(this.searchTerm.trim());
  }

  protected retryInitialization(): void {
    this.addProjectMemberService.loadChildren(this.treeRoot, this.treeRoot);
  }

  ngOnDestroy(): void {
    this.searchSubscription.unsubscribe();
    this.searchTerms.complete();
    // Angular destroys the component-scoped controller and cancels its child reads.
  }
}
