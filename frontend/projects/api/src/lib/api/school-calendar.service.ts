import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import { SchoolClosure, SchoolClosureInput } from '../models/school-closure';

/** Whether a school calendar change went through; any failure is `{ ok: false }` and nothing changed. */
export interface SchoolCalendarSaveResult {
  readonly ok: boolean;
}

/** A child just added (POST /api/team/children); `invited` when an invitation was emailed. */
export interface AddedChild {
  readonly id: string;
  readonly name: string;
  readonly email: string | null;
  readonly invited: boolean;
}

/** What adding a child came to; any failure is `failed` and nothing was added. */
export type AddChildResult =
  { readonly outcome: 'added'; readonly child: AddedChild } | { readonly outcome: 'failed' };

/** What saving a closure came to; any failure is `failed` and nothing changed. */
export type SaveClosureResult =
  { readonly outcome: 'saved'; readonly closure: SchoolClosure } | { readonly outcome: 'failed' };

/** What importing a calendar file came to (L2-062). */
export type ImportCalendarResult =
  | { readonly outcome: 'imported'; readonly imported: number }
  /** Not a calendar, too big, too many events or no all-day event (code `calendar_unreadable`). */
  | { readonly outcome: 'unreadable' }
  | { readonly outcome: 'failed' };

/**
 * The team's school calendar (docs/detailed-designs/teams/school-calendar, L2-059 to L2-062): the setting, children,
 * closures and calendar imports. Writes are the manager's.
 */
export interface SchoolCalendarService {
  /** Turns the school calendar on or off (PUT /api/team/settings/school-calendar). */
  save(on: boolean): Observable<SchoolCalendarSaveResult>;
  /** Adds a child by name; an email also invites them (L2-060 AC2). */
  addChild(name: string, email: string | null): Observable<AddChildResult>;
  /** The team's closures, earliest first; empty while the school calendar is off. Errors reach the caller. */
  closures(): Observable<readonly SchoolClosure[]>;
  addClosure(input: SchoolClosureInput): Observable<SaveClosureResult>;
  updateClosure(id: string, input: SchoolClosureInput): Observable<SaveClosureResult>;
  deleteClosure(id: string): Observable<SchoolCalendarSaveResult>;
  /** Imports a school's .ics file for one child; a re-import replaces that child's earlier import (L2-062). */
  importCalendar(memberId: string, file: Blob, fileName: string): Observable<ImportCalendarResult>;
}

export const SCHOOL_CALENDAR_SERVICE = new InjectionToken<SchoolCalendarService>(
  'SCHOOL_CALENDAR_SERVICE',
);
