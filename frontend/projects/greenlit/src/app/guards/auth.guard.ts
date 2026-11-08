import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, CanMatchFn, Router } from '@angular/router';

import { CONNECTIVITY_SERVICE, SESSION_STORE } from 'api';

/**
 * Guarded screens need a session (identity-and-access/sign-in). A visitor
 * without one goes to sign-in, and one whose session has run out to the
 * session-expired page; both bring them back here afterwards.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const session = inject(SESSION_STORE);
  if (session.isSignedIn()) return true;
  // A token the browser kept past its time says the session expired (L2-007); no token says sign in.
  const page = session.token() ? '/session-expired' : '/sign-in';
  return inject(Router).createUrlTree([page], { queryParams: { returnUrl: state.url } });
};

/** Sign-in is for visitors without a session; anyone signed in goes to the calendar. */
export const signedOutGuard: CanActivateFn = () =>
  inject(SESSION_STORE).isSignedIn() ? inject(Router).createUrlTree(['/']) : true;

/**
 * App screens need a team (teams/create-team): a signed-in person whose
 * session names none is sent to create one.
 */
export const teamGuard: CanActivateFn = () =>
  inject(SESSION_STORE).teamId() ? true : inject(Router).createUrlTree(['/create-team']);

/**
 * A route only a manager's session matches: the next route with the same path then serves everyone else
 * (Requests is the manager's ledger, and a member's My requests). What the API allows is up to the API.
 */
export const managerMatch: CanMatchFn = () => inject(SESSION_STORE).isManager();

/**
 * A screen opened while Greenlit is offline has nothing cached to show, so the offline page opens instead and
 * remembers where the person was going (L2-046 AC4). A screen already open stays, read-only (L2-045).
 */
export const onlineGuard: CanActivateChildFn = (_route, state) =>
  inject(CONNECTIVITY_SERVICE).readOnly()
    ? inject(Router).createUrlTree(['/offline'], { queryParams: { returnUrl: state.url } })
    : true;
