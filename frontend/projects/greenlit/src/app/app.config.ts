import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { RouteReuseStrategy, provideRouter, withInMemoryScrolling } from '@angular/router';

import {
  ACCOUNT_SERVICE,
  API_BASE_URL,
  AUTH_SERVICE,
  HttpAccountService,
  HttpAuthService,
  GisGoogleIdentity,
  GOOGLE_CLIENT_ID,
  GOOGLE_IDENTITY,
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
  NOTIFICATIONS_SERVICE,
  HttpNotificationsService,
  HttpCoverageService,
  HttpWorkingDaysService,
  INVITATION_SERVICE,
  LocalStorageSessionStore,
  REQUEST_SERVICE,
  SESSION_STORE,
  SHEET_SERVICE,
  TEAM_SERVICE,
  PERSON_SERVICE,
  HttpPersonService,
  YEAR_SERVICE,
  CONNECTIVITY_SERVICE,
  BrowserConnectivityService,
  HttpYearService,
  authInterceptor,
  connectivityInterceptor,
  serverErrorInterceptor,
  sessionExpiredInterceptor,
} from 'api';

import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { TeamSwitchReuseStrategy } from './teams/team-switch-reuse-strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }),
    ),
    provideHttpClient(
      withFetch(),
      withInterceptors([
        authInterceptor,
        sessionExpiredInterceptor,
        serverErrorInterceptor,
        connectivityInterceptor,
      ]),
    ),
    { provide: API_BASE_URL, useValue: environment.apiBaseUrl },
    { provide: GOOGLE_CLIENT_ID, useValue: environment.googleClientId },
    // A team switch builds the current screen again for the new team (teams/switch-team).
    { provide: RouteReuseStrategy, useExisting: TeamSwitchReuseStrategy },

    // Composition root: pages depend on service tokens from `api`; the
    // production host binds each token to its real implementation here.
    // Swap any of them for a mock at test time without touching page code.
    { provide: SESSION_STORE, useExisting: LocalStorageSessionStore },
    { provide: SHEET_SERVICE, useExisting: HttpSheetService },
    { provide: AUTH_SERVICE, useExisting: HttpAuthService },
    { provide: ACCOUNT_SERVICE, useExisting: HttpAccountService },
    { provide: GOOGLE_IDENTITY, useExisting: GisGoogleIdentity },
    { provide: TEAM_SERVICE, useExisting: HttpTeamService },
    { provide: HOLIDAY_SERVICE, useExisting: HttpHolidayService },
    { provide: WORKING_DAYS_SERVICE, useExisting: HttpWorkingDaysService },
    { provide: TEAM_SETTINGS_SERVICE, useExisting: HttpTeamSettingsService },
    { provide: COVERAGE_SERVICE, useExisting: HttpCoverageService },
    { provide: NOTIFICATIONS_SERVICE, useExisting: HttpNotificationsService },
    { provide: INVITATION_SERVICE, useExisting: HttpInvitationService },
    { provide: REQUEST_SERVICE, useExisting: HttpRequestService },
    { provide: YEAR_SERVICE, useExisting: HttpYearService },
    { provide: PERSON_SERVICE, useExisting: HttpPersonService },
    { provide: CONNECTIVITY_SERVICE, useExisting: BrowserConnectivityService },
  ],
};
