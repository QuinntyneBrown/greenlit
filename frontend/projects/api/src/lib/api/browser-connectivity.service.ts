import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

import { ConnectionState, ConnectivityService } from './connectivity.service';

/** The connection state from the browser's `online` and `offline` events and the outcome of API calls. */
@Injectable({ providedIn: 'root' })
export class BrowserConnectivityService implements ConnectivityService {
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly current = signal<ConnectionState>(
    this.window?.navigator.onLine === false ? 'offline' : 'online',
  );

  readonly state = this.current.asReadonly();
  readonly readOnly = computed(() => this.current() === 'offline');

  constructor() {
    this.window?.addEventListener('offline', () => this.current.set('offline'));
  }
}
