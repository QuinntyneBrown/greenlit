import { Routes } from '@angular/router';

import { authGuard, signedOutGuard } from './guards/auth.guard';

/**
 * Greenlit application routes.
 *
 * Route data drives the shell (`app.ts`): `shell` picks the chrome (`app`
 * default, `bare` for auth), `page` the `<body data-page>` slug the e2e page
 * objects anchor on. Children inherit their parent's data.
 *
 * `/` is the calendar (L2-049); `authGuard` sends a visitor without a
 * session to `/sign-in` and back (identity-and-access/sign-in). Screens join this table with their journeys;
 * until then their addresses, and any unknown one, show not found (L2-046).
 */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    data: { page: 'calendar' },
    canActivate: [authGuard],
    loadComponent: () => import('./pages/calendar/calendar.page').then((m) => m.CalendarPage),
  },
  {
    path: 'sign-in',
    data: { shell: 'bare', page: 'sign-in' },
    canActivate: [signedOutGuard],
    loadComponent: () => import('./pages/sign-in/sign-in.page').then((m) => m.SignInPage),
  },
  {
    path: '**',
    data: { page: 'not-found' },
    loadComponent: () => import('./pages/not-found/not-found.page').then((m) => m.NotFoundPage),
  },
];
