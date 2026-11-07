import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import { TeamYear } from '../models/year';

/** The team's year: twelve months per member and their allowance (docs/detailed-designs/allowances/year-overview). */
export interface YearService {
  year(year: number): Observable<TeamYear>;
}

export const YEAR_SERVICE = new InjectionToken<YearService>('YEAR_SERVICE');
