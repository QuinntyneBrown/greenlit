import { InjectionToken, Signal } from '@angular/core';

/**
 * Whether the web application can reach Greenlit
 * (docs/detailed-designs/web-experience/connectivity, ADR-012).
 */
export type ConnectionState =
  'online' | 'offline' | 'reconnecting' | 'back-online' | 'unstable' | 'sync-failed';

/** What the browser and the API calls say about the connection; drives the banner and the read-only calendar. */
export interface ConnectivityService {
  readonly state: Signal<ConnectionState>;
  /** True while changes cannot be saved: nothing on the sheet may be painted or selected. */
  readonly readOnly: Signal<boolean>;
  /** Counts the times the connection came back; a page that shows data reads it again when this changes. */
  readonly reloads: Signal<number>;
  /** When an API call last got a good answer. */
  readonly lastSync: Signal<Date>;
  /** An API call got a good answer; `call` names it (method and path). */
  succeeded(call: string): void;
  /** An API call failed: `status` is 0 when nothing answered, else the HTTP status. */
  failed(status: number, call: string): void;
  /** Checks the connection again and asks the open page to load again ("Retry"). */
  retry(): void;
  /** Hides the "back online" or "unstable" banner before it leaves by itself. */
  dismiss(): void;
}

export const CONNECTIVITY_SERVICE = new InjectionToken<ConnectivityService>('CONNECTIVITY_SERVICE');
