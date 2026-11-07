import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import { CreatedTeam, NewTeam } from '../models/new-team';

/** What a create-team attempt came to. */
export type CreateTeamResult =
  | { readonly outcome: 'created'; readonly team: CreatedTeam }
  /** Nothing was saved: the API failed, could not be reached, or refused the request. */
  | { readonly outcome: 'failed' };

/** The team (teams/create-team). Creating one stores the new session that names it. */
export interface TeamService {
  create(team: NewTeam): Observable<CreateTeamResult>;
}

export const TEAM_SERVICE = new InjectionToken<TeamService>('TEAM_SERVICE');
