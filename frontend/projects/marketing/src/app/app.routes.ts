import { Routes } from '@angular/router';

/**
 * Marketing site routes. `page` is the `<body data-page>` slug the e2e page
 * object anchors on (L2-050 AC1); every other address shows the page (AC11).
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/marketing/marketing.page').then((m) => m.MarketingPage),
    data: { page: 'marketing' },
  },
  { path: '**', redirectTo: '' },
];
