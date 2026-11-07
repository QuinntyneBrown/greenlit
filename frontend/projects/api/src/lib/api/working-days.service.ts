import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import { WeekDay } from '../models/week-day';

/** What saving working days came to. */
export interface WorkingDaysResult {
  /** False when nothing was saved: the API failed, could not be reached, or refused the request. */
  readonly ok: boolean;
}

/** The team's work week and a part-timer's own working days (teams/working-days). Managers only. */
export interface WorkingDaysService {
  /** The weekdays the team works. */
  workWeek(): Observable<readonly WeekDay[]>;
  /** Saves the team's work week. */
  saveWorkWeek(days: readonly WeekDay[]): Observable<WorkingDaysResult>;
  /** Saves the days one member works; sending the team's own days makes them follow the team again. */
  setMemberDays(memberId: string, days: readonly WeekDay[]): Observable<WorkingDaysResult>;
}

export const WORKING_DAYS_SERVICE = new InjectionToken<WorkingDaysService>('WORKING_DAYS_SERVICE');
