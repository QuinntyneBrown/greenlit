import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { CONNECTIVITY_SERVICE, safeReturnUrl } from 'api';
import { Button, ErrorPage } from 'components';

/**
 * Offline (docs/detailed-designs/web-experience/error-pages, L2-046 AC4): a page was opened while Greenlit
 * is offline and there is nothing of it to show. "Try again" checks the connection; when it answers, the page
 * that was wanted (`returnUrl`) opens. The page is part of the main bundle: it must show with no network.
 */
@Component({
  selector: 'app-offline-page',
  imports: [ErrorPage, Button],
  template: `
    <gl-error-page
      tone="error"
      title="You’re offline"
      text="Check your connection. Greenlit will pick up where you left off, and nothing you’ve seen has changed."
    >
      <svg slot="icon" class="icon icon--lg" aria-hidden="true" viewBox="0 0 24 24">
        <path d="M3 3l18 18M9 5a6 6 0 0 1 10 4 4 4 0 0 1 2 6M6 18a4 4 0 0 1 0-8" />
      </svg>
      <gl-button slot="actions" variant="primary" (click)="tryAgain()">
        <svg class="icon" aria-hidden="true" viewBox="0 0 24 24">
          <path d="M20 11a8 8 0 0 0-14-4L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4l2-2M20 20v-5h-5" />
        </svg>
        Try again
      </gl-button>
    </gl-error-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OfflinePage {
  private readonly router = inject(Router);
  private readonly connectivity = inject(CONNECTIVITY_SERVICE);
  private readonly returnUrl = safeReturnUrl(
    inject(ActivatedRoute).snapshot.queryParamMap.get('returnUrl'),
  );
  private readonly trying = signal(false);
  private seen = this.connectivity.reloads();

  constructor() {
    // The connection came back after "Try again": open what was wanted.
    effect(() => {
      const reloads = this.connectivity.reloads();
      untracked(() => {
        if (reloads !== this.seen && this.trying()) {
          void this.router.navigateByUrl(this.returnUrl, { replaceUrl: true });
        }
        this.seen = reloads;
      });
    });
  }

  protected tryAgain(): void {
    this.trying.set(true);
    this.connectivity.retry();
  }
}
