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
  WORKING_DAYS_SERVICE,
  TEAM_SETTINGS_SERVICE,
  HttpTeamSettingsService,
  COVERAGE_SERVICE,
  HttpCoverageService,
  HttpWorkingDaysService,
  INVITATION_SERVICE,
  LocalStorageSessionStore,
  REQUEST_SERVICE,
  SESSION_STORE,
  SHEET_SERVICE,
  TEAM_SERVICE,
  YEAR_SERVICE,
  HttpYearService,
  authInterceptor,
  sessionExpiredInterceptor,
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
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, sessionExpiredInterceptor])),
    { provide: API_BASE_URL, useValue: environment.apiBaseUrl },

    // Composition root: pages depend on service tokens from `api`; the
    // production host binds each token to its real implementation here.
    // Swap any of them for a mock at test time without touching page code.
    { provide: SESSION_STORE, useExisting: LocalStorageSessionStore },
    { provide: SHEET_SERVICE, useExisting: HttpSheetService },
    { provide: AUTH_SERVICE, useExisting: HttpAuthService },
    { provide: TEAM_SERVICE, useExisting: HttpTeamService },
    { provide: HOLIDAY_SERVICE, useExisting: HttpHolidayService },
    { provide: WORKING_DAYS_SERVICE, useExisting: HttpWorkingDaysService },
    { provide: TEAM_SETTINGS_SERVICE, useExisting: HttpTeamSettingsService },
    { provide: COVERAGE_SERVICE, useExisting: HttpCoverageService },
    { provide: INVITATION_SERVICE, useExisting: HttpInvitationService },
    { provide: REQUEST_SERVICE, useExisting: HttpRequestService },
    { provide: YEAR_SERVICE, useExisting: HttpYearService },
  ],
};
