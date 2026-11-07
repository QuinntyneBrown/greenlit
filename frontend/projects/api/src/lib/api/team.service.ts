import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import { InvitedMember, NewMember } from '../models/invited-member';
import { CreatedTeam, NewTeam } from '../models/new-team';

/** What a create-team attempt came to. */
export type CreateTeamResult =
  | { readonly outcome: 'created'; readonly team: CreatedTeam }
  /** Nothing was saved: the API failed, could not be reached, or refused the request. */
  | { readonly outcome: 'failed' };

/** What an invitation came to (teams/invite-member). */
export type InviteResult =
  | { readonly outcome: 'invited'; readonly member: InvitedMember }
  /** That email already belongs to someone who has joined the team. */
  | { readonly outcome: 'exists' }
  /** Nothing was added: the API failed, could not be reached, or refused the request. */
  | { readonly outcome: 'failed' };

/** Whether a removal went through; any failure is `{ ok: false }` (the dialog says only that nothing was changed). */
export interface RemoveMemberResult {
  readonly ok: boolean;
}

/** The team: creating one (teams/create-team) and inviting people to it (teams/invite-member). */
export interface TeamService {
  create(team: NewTeam): Observable<CreateTeamResult>;
  /** Adds a row for the person and emails them a link; inviting a pending address again sends a new link. */
  invite(member: NewMember): Observable<InviteResult>;
  /** Removes the member from the team, keeping their history (teams/remove-member, L2-011). Manager only. */
  remove(memberId: string): Observable<RemoveMemberResult>;
}

export const TEAM_SERVICE = new InjectionToken<TeamService>('TEAM_SERVICE');
