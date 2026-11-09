import { DayStatus } from './day-status';

/** One paint stroke: `status` null clears the days (L2-015 AC6). */
export interface DayStroke {
  readonly memberId: string;
  /** `yyyy-MM-dd`, in any order. */
  readonly dates: readonly string[];
  readonly status: DayStatus | null;
}

/** One day's status before and after a change; null is a working day. */
export interface DayChange {
  readonly date: string;
  readonly previous: DayStatus | null;
  readonly current: DayStatus | null;
}

/** What a stroke changed; `changes` is what Undo writes back (L2-018 AC1). Empty when nothing needed to change. */
export interface ChangeSet {
  readonly memberId: string;
  readonly memberName: string;
  readonly status: DayStatus | null;
  readonly changes: readonly DayChange[];
  /** How many days the member's requested days exceed their days left once saved; 0 when not over (L2-030). */
  readonly daysOver: number;
}

/** The `code` a refused change answers with (docs/detailed-designs/sheet/mark-days). */
export type DayChangeRefusal =
  'not_your_row' | 'confirmed_locked' | 'all_non_working' | 'day_is_holiday' | 'synced_day_locked';
