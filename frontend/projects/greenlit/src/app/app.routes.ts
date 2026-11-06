import { Routes } from '@angular/router';

/**
 * Greenlit application routes.
 *
 * Route data drives the shell (`app.ts`): `shell` picks the chrome (`app`
 * default, `bare` for auth), `page` the `<body data-page>` slug the e2e page
 * objects anchor on. Children inherit their parent's data.
 *
 * `/` and unknown paths go to `/sheet`, the team's time-off sheet.
 */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: '/sheet' },
  {
    path: 'sheet',
    data: { page: 'sheet' },
    loadComponent: () => import('./pages/sheet/sheet.page').then((m) => m.SheetPage),
  },
  { path: '**', redirectTo: '/sheet' },
];
