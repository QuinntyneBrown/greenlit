import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

import { InvitedMember, NewMember } from '../models/invited-member';
import { ManagedTeam } from '../models/managed-team';
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

/** Whether a switch or a default change went through; any failure is `{ ok: false }` and nothing changed. */
export interface TeamChangeResult {
  readonly ok: boolean;
}

/**
 * The team: creating one (teams/create-team), inviting people to it (teams/invite-member) and, for a manager of
 * several, listing them, switching the active one and choosing the default (teams/switch-team).
 */
export interface TeamService {
  create(team: NewTeam): Observable<CreateTeamResult>;
  /** Adds a row for the person and emails them a link; inviting a pending address again sends a new link. */
  invite(member: NewMember): Observable<InviteResult>;
  /** Removes the member from the team, keeping their history (teams/remove-member, L2-011). Manager only. */
  remove(memberId: string): Observable<RemoveMemberResult>;
  /** The teams the caller manages, oldest first; empty for anyone who manages none. Errors reach the caller. */
  mine(): Observable<readonly ManagedTeam[]>;
  /** Makes the team the active one: the session is replaced by one that names it (L2-054 AC3). */
  switchTo(teamId: string): Observable<TeamChangeResult>;
  /** Makes the team the one sign-in opens (L2-054 AC4); the active team does not change. */
  makeDefault(teamId: string): Observable<TeamChangeResult>;
}

export const TEAM_SERVICE = new InjectionToken<TeamService>('TEAM_SERVICE');
