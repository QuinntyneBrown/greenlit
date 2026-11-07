import { Routes } from '@angular/router';

import {
  authGuard,
  managerMatch,
  noTeamGuard,
  signedOutGuard,
  teamGuard,
} from './guards/auth.guard';

/**
 * Greenlit application routes.
 *
 * Route data drives the shell (`app.ts`): `shell` picks the chrome (`app`
 * default, `bare` for auth), `page` the `<body data-page>` slug the e2e page
 * objects anchor on. Children inherit their parent's data.
 *
 * `/` is the calendar (L2-049); `authGuard` sends a visitor without a
 * session to `/sign-in` and back (identity-and-access/sign-in), and `teamGuard`
 * sends a session on no team to `/create-team` (teams/create-team). Screens join this table with their journeys;
 * until then their addresses, and any unknown one, show not found (L2-046).
 */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    data: { page: 'calendar' },
    canActivate: [authGuard, teamGuard],
    loadComponent: () => import('./pages/calendar/calendar.page').then((m) => m.CalendarPage),
  },
  {
    path: 'year',
    data: { page: 'year' },
    canActivate: [authGuard, teamGuard],
    loadComponent: () => import('./pages/year/year.page').then((m) => m.YearPage),
  },
  {
    path: 'people/:id',
    data: { page: 'person' },
    canActivate: [authGuard, teamGuard],
    loadComponent: () => import('./pages/person/person.page').then((m) => m.PersonPage),
  },
  {
    path: 'person',
    data: { page: 'person' },
    canActivate: [authGuard, teamGuard],
    loadComponent: () => import('./pages/person/person.page').then((m) => m.PersonPage),
  },
  {
    path: 'requests',
    data: { page: 'requests' },
    canMatch: [managerMatch],
    canActivate: [authGuard, teamGuard],
    loadComponent: () => import('./pages/requests/requests.page').then((m) => m.RequestsPage),
  },
  {
    path: 'requests',
    data: { page: 'requests' },
    canActivate: [authGuard, teamGuard],
    loadComponent: () => import('./pages/requests/my-requests.page').then((m) => m.MyRequestsPage),
  },
  {
    path: 'settings',
    data: { page: 'settings' },
    canActivate: [authGuard, teamGuard],
    loadComponent: () => import('./pages/settings/settings.page').then((m) => m.SettingsPage),
  },
  {
    path: 'account',
    data: { page: 'account' },
    canActivate: [authGuard],
    loadComponent: () => import('./pages/account/account.page').then((m) => m.AccountPage),
  },
  {
    path: 'create-team',
    data: { shell: 'bare', page: 'create-team' },
    canActivate: [authGuard, noTeamGuard],
    loadComponent: () =>
      import('./pages/create-team/create-team.page').then((m) => m.CreateTeamPage),
  },
  {
    path: 'accept-invite/:token',
    data: { shell: 'bare', page: 'accept-invite' },
    loadComponent: () =>
      import('./pages/accept-invite/accept-invite.page').then((m) => m.AcceptInvitePage),
  },
  {
    path: 'sign-in',
    data: { shell: 'bare', page: 'sign-in' },
    canActivate: [signedOutGuard],
    loadComponent: () => import('./pages/sign-in/sign-in.page').then((m) => m.SignInPage),
  },
  {
    path: 'session-expired',
    data: { shell: 'bare', page: 'session-expired' },
    loadComponent: () =>
      import('./pages/session-expired/session-expired.page').then((m) => m.SessionExpiredPage),
  },
  {
    path: 'forgot-password',
    data: { shell: 'bare', page: 'forgot-password' },
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password.page').then((m) => m.ForgotPasswordPage),
  },
  {
    path: 'reset-password/:token',
    data: { shell: 'bare', page: 'reset-password' },
    loadComponent: () =>
      import('./pages/reset-password/reset-password.page').then((m) => m.ResetPasswordPage),
  },
  {
    path: 'server-error',
    data: { page: 'server-error' },
    loadComponent: () =>
      import('./pages/server-error/server-error.page').then((m) => m.ServerErrorPage),
  },
  {
    path: '**',
    data: { page: 'not-found' },
    loadComponent: () => import('./pages/not-found/not-found.page').then((m) => m.NotFoundPage),
  },
];
