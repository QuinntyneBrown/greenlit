import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import { Holiday, TeamHolidays } from '../models/team-holidays';

/** What adding a day off came to. */
export type AddHolidayResult =
  | { readonly outcome: 'added'; readonly holiday: Holiday }
  /** The date is already a holiday; `message` names it ("Mon 25 May is already a holiday (Spring bank holiday)."). */
  | { readonly outcome: 'exists'; readonly message: string }
  /** The date is a weekend: nothing was added. */
  | { readonly outcome: 'weekend' }
  /** Nothing was added: the API failed, could not be reached, or refused the request. */
  | { readonly outcome: 'failed' };

/** What removing a holiday, or undoing it, came to. */
export interface HolidayChangeResult {
  /** False when nothing changed: the API failed, could not be reached, or refused the request. */
  readonly ok: boolean;
}

/** The team's holidays (teams/manage-holidays). Managers only. */
export interface HolidayService {
  /** This year's holidays in date order, with where they came from. */
  list(): Observable<TeamHolidays>;
  /** Adds a day off for the whole team; `date` is `yyyy-MM-dd`. */
  add(date: string, name: string): Observable<AddHolidayResult>;
  /** Removes a holiday: its date is a working day again. */
  remove(id: string): Observable<HolidayChangeResult>;
  /** Undo of a removal: the holiday is back with its name and date. */
  restore(id: string): Observable<HolidayChangeResult>;
}

export const HOLIDAY_SERVICE = new InjectionToken<HolidayService>('HOLIDAY_SERVICE');
