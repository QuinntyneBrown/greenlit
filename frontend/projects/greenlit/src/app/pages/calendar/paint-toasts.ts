import { ChangeSet, DayStatus } from 'api';
import { ToastRequest } from '../../toasts/toast.service';

/**
 * What each outcome of painting says (L2-015 AC4-5, L2-017 AC2-3, L2-018 AC2).
 * Pure, so the page only decides which one applies.
 */

export interface PaintContext {
  /** The manager's name, "Maya Chen". */
  readonly managerName: string;
  readonly callerIsManager: boolean;
  /** The stroke was on the caller's own row. */
  readonly ownRow: boolean;
}

function days(n: number): string {
  return `${n} ${n === 1 ? 'day' : 'days'}`;
}

const firstName = (name: string): string => name.split(' ')[0];

/** A saved stroke: "Requested 3 days", "3 days marked confirmed for Ana", "Cleared 2 days". */
export function savedToast(
  set: ChangeSet,
  context: PaintContext,
): Pick<ToastRequest, 'tone' | 'title' | 'body'> {
  const n = set.changes.length;
  const status: DayStatus | null = set.status;
  const forWhom = context.ownRow ? '' : ` for ${firstName(set.memberName)}`;
  switch (status) {
    case 'Confirmed':
      return {
        tone: 'success',
        title: `${days(n)} marked confirmed${forWhom}`,
        body: 'They’re green on the calendar now.',
      };
    case 'Requested': {
      // L2-030 AC5: a warning, never a block.
      const over =
        set.daysOver > 0
          ? `That’s ${days(set.daysOver)} over ${context.ownRow ? 'your' : 'their'} allowance.`
          : '';
      if (!context.ownRow) {
        return {
          tone: over ? 'warning' : 'success',
          title: `Marked ${days(n)} requested${forWhom}`,
          body: over || undefined,
        };
      }
      const notified = context.callerIsManager ? '' : `${context.managerName} will be notified.`;
      return {
        tone: over ? 'warning' : 'success',
        title: `Requested ${days(n)}`,
        body: [notified, over].filter(Boolean).join(' ') || undefined,
      };
    }
    case 'Tentative':
      return { tone: 'success', title: `Marked ${days(n)} tentative${forWhom}` };
    default:
      return { tone: 'success', title: `Cleared ${days(n)}${forWhom}` };
  }
}

/** A change the rules refused, or null when the answer is not one of them (L2-017 AC2, AC3). */
export function refusedToast(
  code: string | null,
  managerName: string,
): Pick<ToastRequest, 'tone' | 'title' | 'body'> | null {
  switch (code) {
    case 'confirmed_locked':
      return {
        tone: 'warning',
        title: `Confirmed days can only be changed by ${firstName(managerName)}`,
        body: `Ask ${managerName} if one of these needs to move.`,
      };
    case 'all_non_working':
    case 'day_is_holiday':
      return {
        tone: 'info',
        title: 'Those are all non-working days',
        body: 'Weekends and holidays are red by rule, so nothing changed.',
      };
    default:
      return null;
  }
}

/** The save failed (L2-018 AC2). */
export const FAILED_SAVE = {
  tone: 'danger',
  title: 'We couldn’t save those days',
  body: 'Your selection is still there. Check your connection and try again.',
} as const satisfies Pick<ToastRequest, 'tone' | 'title' | 'body'>;
