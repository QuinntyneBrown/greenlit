import { InjectionToken, Signal } from '@angular/core';

/**
 * Whether the web application can reach Greenlit
 * (docs/detailed-designs/web-experience/connectivity, ADR-012).
 */
export type ConnectionState = 'online' | 'offline';

/** What the browser and the API calls say about the connection; drives the banner and the read-only calendar. */
export interface ConnectivityService {
  readonly state: Signal<ConnectionState>;
  /** True while changes cannot be saved: nothing on the sheet may be painted or selected. */
  readonly readOnly: Signal<boolean>;
}

export const CONNECTIVITY_SERVICE = new InjectionToken<ConnectivityService>('CONNECTIVITY_SERVICE');
