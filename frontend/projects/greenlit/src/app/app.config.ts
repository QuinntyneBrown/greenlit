import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { API_BASE_URL } from 'api';

import { environment } from '../environments/environment';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }),
    ),
    provideHttpClient(withFetch()),
    { provide: API_BASE_URL, useValue: environment.apiBaseUrl },

    // Composition root: pages depend on service tokens from `api`; the
    // production host binds each token to its real implementation here.
    // Swap any of them for a mock at test time without touching page code.
  ],
};
