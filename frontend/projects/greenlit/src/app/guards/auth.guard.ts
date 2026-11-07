import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { SESSION_STORE } from 'api';

/**
 * Guarded screens need a session (identity-and-access/sign-in). A visitor
 * without one goes to sign-in, which brings them back here afterwards.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  if (inject(SESSION_STORE).isSignedIn()) return true;
  return inject(Router).createUrlTree(['/sign-in'], { queryParams: { returnUrl: state.url } });
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

/** Create-team is for people on no team; anyone already on one goes to the calendar. */
export const noTeamGuard: CanActivateFn = () =>
  inject(SESSION_STORE).teamId() ? inject(Router).createUrlTree(['/']) : true;
