import { Injectable, computed, inject, signal } from '@angular/core';

import { REQUEST_SERVICE, RequestCounts, SESSION_STORE } from 'api';

/**
 * How many requests each ledger tab holds (docs/detailed-designs/requests/review-requests): the
 * Requests page's tab counts and the pending pill on the main navigation read the same figures, so a
 * decision made on the page updates the pill at once. Only a manager has a ledger; for anyone else
 * nothing is asked and nothing is shown. A failed read keeps the figures last seen.
 */
@Injectable({ providedIn: 'root' })
export class RequestCountsState {
  private readonly requests = inject(REQUEST_SERVICE);
  private readonly session = inject(SESSION_STORE);

  readonly counts = signal<RequestCounts | null>(null);
  readonly pending = computed(() => this.counts()?.pending ?? 0);

  /** Reads the counts again. */
  refresh(): void {
    if (!this.session.isManager()) {
      this.counts.set(null);
      return;
    }
    this.requests.counts().subscribe({
      next: (counts) => this.counts.set(counts),
      error: () => undefined,
    });
  }
}
