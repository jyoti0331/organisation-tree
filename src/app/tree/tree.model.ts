export type Loader<T> = (
  node: TreeNode<T>,
  signal: AbortSignal,
) => Promise<readonly NodeInput<T>[]>;
export interface NodeInput<T> {
  data: T;
  hasChildren?: boolean;
  expanded?: boolean;
  loader?: Loader<T> | null;
  children?: readonly NodeInput<T>[];
}
export class TreeNode<T> {
  readonly children: TreeNode<T>[] = [];
  expanded = false;
  isLoaded = false;
  loading = false;
  error: string | null = null;
  hasChildren = false;
  loader: Loader<T> | null = null;
  constructor(
    readonly id: string,
    public data: T,
    readonly parent: TreeNode<T> | null,
    public index: number,
  ) {
    console.log('[tree-debug] TreeNode.constructor | enter', { id, data, parent, index });
    debugger;
  }
}
export type CheckState = 'unchecked' | 'mixed' | 'checked';
export interface TreeCheckbox {
  state: CheckState;
  disabled?: boolean;
  label?: string;
}
/** Payload interpretation and checkbox policy belong to the host. */
export interface TreePresentation<T> {
  label(node: TreeNode<T>): string;
  checkbox?(node: TreeNode<T>): TreeCheckbox | null;
  description?(node: TreeNode<T>): string | null;
}
export interface CheckboxToggle<T> {
  node: TreeNode<T>;
  checked: boolean;
}
/** Pass the token back unchanged to the helper that issued it. */
export interface SearchRequestToken {
  readonly revision: number;
}
export type SearchApplyResult = 'applied' | 'superseded' | 'data-changed';
