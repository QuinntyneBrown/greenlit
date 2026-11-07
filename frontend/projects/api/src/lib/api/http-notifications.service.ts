import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { API_BASE_URL, apiUrl } from './api-base-url';
import {
  NotificationSwitches,
  NotificationsResult,
  NotificationsService,
} from './notifications.service';

/** GET /api/team/settings and PUT /api/team/settings/notifications. */
@Injectable({ providedIn: 'root' })
export class HttpNotificationsService implements NotificationsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  settings(): Observable<NotificationSwitches> {
    return this.http
      .get<{
        notifyNewRequests: boolean;
        notifyDecisions: boolean;
      }>(apiUrl(this.baseUrl, 'api/team/settings'))
      .pipe(map((s) => ({ newRequests: s.notifyNewRequests, decisions: s.notifyDecisions })));
  }

  save(switches: NotificationSwitches): Observable<NotificationsResult> {
    return this.http.put(apiUrl(this.baseUrl, 'api/team/settings/notifications'), switches).pipe(
      map((): NotificationsResult => ({ ok: true })),
      catchError(() => of<NotificationsResult>({ ok: false })),
    );
  }
}
