import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import { SaveTeamSettingsInput, TeamSettingsTeam } from '../models/team-settings';

/** What saving a settings section came to. */
export interface SaveSettingsResult {
  /** False when nothing was saved: the API failed, could not be reached, or refused the request. */
  readonly ok: boolean;
}

/** The Team section of Settings (docs/detailed-designs/teams/team-settings). Anyone on the team reads; the manager saves. */
export interface TeamSettingsService {
  team(): Observable<TeamSettingsTeam>;
  /** Saves the name, the time zone and each listed member's role and yearly days as one request. */
  saveTeam(input: SaveTeamSettingsInput): Observable<SaveSettingsResult>;
}

export const TEAM_SETTINGS_SERVICE = new InjectionToken<TeamSettingsService>(
  'TEAM_SETTINGS_SERVICE',
);
