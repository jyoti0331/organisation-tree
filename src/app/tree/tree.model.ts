import { Observable } from 'rxjs';

export enum TreeSelectionStatus {
  FullySelected = 'FullySelected',
  PartiallySelected = 'PartiallySelected',
  NotSelected = 'NotSelected',
}

export interface NodeSelection {
  selectionStatus: TreeSelectionStatus;
  selectionAllowed: boolean;
  showCheckbox: boolean;
}

/** Rendering-independent: a row supplies this handle only while it exists. */
export interface TreeRowHandle { focus(): void; }
export interface TreeCounts { members: number; total: number; }
export type TreeLoader = (nodeId: string, ...params: string[]) => Observable<TreeNode[]>;

export interface TreeNode {
  id: string;
  label: string;
  parent: TreeNode | null;
  index: number;
  isRoot: boolean;
  children?: TreeNode[];
  hasChildren: boolean;
  expanded: boolean;
  isLoaded: boolean;
  lazyLoading: boolean;
  lazyLoad: TreeLoader | null;
  lazyLoadParams: string[];
  loading: boolean;
  pending: boolean;
  row?: TreeRowHandle;
  counts?: TreeCounts;
  selectionProps: NodeSelection;
  additionalInfo?: unknown;
  description?: string;
  error?: string;
  mutationError?: string;
}

export interface TreeSelectionChange { node: TreeNode; }
