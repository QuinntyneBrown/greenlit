import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import { SheetMonth } from '../models/sheet-month';

/** The team's sheet. Marking days (`setDays`, `restore`) arrives with sheet/mark-days. */
export interface SheetService {
  /** One month, `yyyy-MM`; without it, the current month in the team's time zone. */
  month(month?: string): Observable<SheetMonth>;
}

export const SHEET_SERVICE = new InjectionToken<SheetService>('SHEET_SERVICE');
