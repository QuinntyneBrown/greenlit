import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

/** Whether a school calendar change went through; any failure is `{ ok: false }` and nothing changed. */
export interface SchoolCalendarSaveResult {
  readonly ok: boolean;
}

/**
 * The team's school calendar (docs/detailed-designs/teams/school-calendar, L2-059 to L2-062): the setting, children,
 * closures and calendar imports. Writes are the manager's.
 */
export interface SchoolCalendarService {
  /** Turns the school calendar on or off (PUT /api/team/settings/school-calendar). */
  save(on: boolean): Observable<SchoolCalendarSaveResult>;
}

export const SCHOOL_CALENDAR_SERVICE = new InjectionToken<SchoolCalendarService>(
  'SCHOOL_CALENDAR_SERVICE',
);
