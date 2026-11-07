import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

import { API_BASE_URL, apiUrl } from './api-base-url';
import { ConnectionState, ConnectivityService } from './connectivity.service';

/** How long "You’re back online" stays (L2-045 AC3). */
const BACK_ONLINE_MS = 5000;

/** The connection state from the browser's `online` and `offline` events and the outcome of API calls. */
@Injectable({ providedIn: 'root' })
export class BrowserConnectivityService implements ConnectivityService {
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly current = signal<ConnectionState>(
    this.window?.navigator.onLine === false ? 'offline' : 'online',
  );
  private readonly reloaded = signal(0);
  private leaving: ReturnType<typeof setTimeout> | undefined;

  readonly state = this.current.asReadonly();
  readonly readOnly = computed(() => {
    const state = this.current();
    return state === 'offline' || state === 'reconnecting';
  });
  readonly reloads = this.reloaded.asReadonly();

  constructor() {
    this.window?.addEventListener('offline', () => this.set('offline'));
    this.window?.addEventListener('online', () => void this.check());
  }

  dismiss(): void {
    if (this.current() === 'back-online') this.set('online');
  }

  /** The connection returned: ask the API whether it can be reached; any answer at all will do. */
  private async check(): Promise<void> {
    this.set('reconnecting');
    try {
      await fetch(apiUrl(this.baseUrl, 'api/_ping'), { method: 'HEAD', mode: 'no-cors' });
    } catch {
      if (this.current() === 'reconnecting') this.set('offline');
      return;
    }
    if (this.current() !== 'reconnecting') return;
    this.set('back-online');
    this.reloaded.update((n) => n + 1);
  }

  private set(state: ConnectionState): void {
    clearTimeout(this.leaving);
    this.current.set(state);
    if (state === 'back-online') this.leaving = setTimeout(() => this.dismiss(), BACK_ONLINE_MS);
  }
}
