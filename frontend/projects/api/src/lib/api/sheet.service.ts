import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import { ChangeSet, DayChange, DayStroke } from '../models/change-set';
import { SheetMonth } from '../models/sheet-month';

/** The team's sheet: reading a month and marking days (docs/detailed-designs/sheet/mark-days). */
export interface SheetService {
  /** One month, `yyyy-MM`; without it, the current month in the team's time zone. */
  month(month?: string): Observable<SheetMonth>;
  /** Applies a paint stroke; a refused change errors with a `code` (see `problemCode`). */
  setDays(stroke: DayStroke): Observable<ChangeSet>;
  /** Undo: writes each change's previous status back under the same rules. */
  restore(memberId: string, changes: readonly DayChange[]): Observable<ChangeSet>;
}

export const SHEET_SERVICE = new InjectionToken<SheetService>('SHEET_SERVICE');
