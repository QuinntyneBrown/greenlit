import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

/** The team's coverage minimum and how many people it can be (teams/coverage-minimum). */
export interface CoverageSettings {
  /** The fewest people who should be in on a working day; 0 means none. */
  readonly minimum: number;
  /** The people on the team, which the minimum cannot exceed. */
  readonly teamSize: number;
}

/** What saving the minimum came to. */
export interface CoverageResult {
  /** False when nothing was saved: the API failed, could not be reached, or refused the request. */
  readonly ok: boolean;
}

/** The coverage minimum (teams/coverage-minimum). Managers only. */
export interface CoverageService {
  settings(): Observable<CoverageSettings>;
  /** Saves the minimum, between 0 and the team size. */
  save(minimum: number): Observable<CoverageResult>;
}

export const COVERAGE_SERVICE = new InjectionToken<CoverageService>('COVERAGE_SERVICE');
