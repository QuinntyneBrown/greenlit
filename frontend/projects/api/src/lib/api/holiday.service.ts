import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import { TeamHolidays } from '../models/team-holidays';

/** The team's holidays (teams/manage-holidays). Managers only. */
export interface HolidayService {
  /** This year's holidays in date order, with where they came from. */
  list(): Observable<TeamHolidays>;
}

export const HOLIDAY_SERVICE = new InjectionToken<HolidayService>('HOLIDAY_SERVICE');
