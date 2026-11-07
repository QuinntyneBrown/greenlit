import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';

/** The team's two email switches (teams/notification-settings). */
export interface NotificationSwitches {
  /** Email the manager when a member sends a request. */
  readonly newRequests: boolean;
  /** Email a member when their request is approved or declined. */
  readonly decisions: boolean;
}

/** What saving the switches came to. */
export interface NotificationsResult {
  /** False when nothing was saved: the API failed, could not be reached, or refused the request. */
  readonly ok: boolean;
}

/** The notification switches (teams/notification-settings). Managers only. */
export interface NotificationsService {
  settings(): Observable<NotificationSwitches>;
  /** Saves both switches as one request. */
  save(switches: NotificationSwitches): Observable<NotificationsResult>;
}

export const NOTIFICATIONS_SERVICE = new InjectionToken<NotificationsService>(
  'NOTIFICATIONS_SERVICE',
);
