import { CheckState } from '../tree/tree.model';
import { Counts, Id } from './organisation.model';

export function checkState(counts: Counts): CheckState {
  return counts.total === 0 || counts.members === 0
    ? 'unchecked'
    : counts.members === counts.total
      ? 'checked'
      : 'mixed';
}
export const personKey = (branchId: Id, employeeId: Id): string =>
  JSON.stringify([branchId, employeeId]);
