import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import {
  API_BASE_URL,
  AUTH_SERVICE,
  HttpAuthService,
  HttpHolidayService,
  HttpInvitationService,
  HttpRequestService,
  HttpSheetService,
  HttpTeamService,
  HOLIDAY_SERVICE,
  INVITATION_SERVICE,
  LocalStorageSessionStore,
  REQUEST_SERVICE,
  SESSION_STORE,
  SHEET_SERVICE,
  TEAM_SERVICE,
  authInterceptor,
} from 'api';

import { environment } from '../environments/environment';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }),
    ),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    { provide: API_BASE_URL, useValue: environment.apiBaseUrl },

    // Composition root: pages depend on service tokens from `api`; the
    // production host binds each token to its real implementation here.
    // Swap any of them for a mock at test time without touching page code.
    { provide: SESSION_STORE, useExisting: LocalStorageSessionStore },
    { provide: SHEET_SERVICE, useExisting: HttpSheetService },
    { provide: AUTH_SERVICE, useExisting: HttpAuthService },
    { provide: TEAM_SERVICE, useExisting: HttpTeamService },
    { provide: HOLIDAY_SERVICE, useExisting: HttpHolidayService },
    { provide: INVITATION_SERVICE, useExisting: HttpInvitationService },
    { provide: REQUEST_SERVICE, useExisting: HttpRequestService },
  ],
};
