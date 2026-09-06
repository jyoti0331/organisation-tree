import { CheckState } from '../tree/tree.model';
import { Counts, Id } from './organisation.model';
export function checkState(counts: Counts): CheckState {
  console.log('[tree-debug] checkState | enter', { counts });
  debugger;
  console.log(
    "[tree-debug] checkState | return counts.total === 0 || counts.members === 0 ? 'unchecked' : counts.members === counts.total ? 'checked' : 'mixed';",
  );
  debugger;
  return counts.total === 0 || counts.members === 0
    ? 'unchecked'
    : counts.members === counts.total
      ? 'checked'
      : 'mixed';
}
export const personKey = (branchId: Id, employeeId: Id): string => {
  console.log(
    '[tree-debug] src/app/demo/membership.utils.ts callback | evaluate JSON.stringify([branchId, employeeId])',
    { branchId, employeeId },
  );
  debugger;
  return JSON.stringify([branchId, employeeId]);
};
