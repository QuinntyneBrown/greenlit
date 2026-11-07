import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { safeReturnUrl } from 'api';
import { Button, ErrorPage } from 'components';

/**
 * Server error (docs/detailed-designs/web-experience/error-pages, L2-046 AC3): a page failed on our side.
 * Says so, reassures that days are safe and prints the error reference from the address (`reference`) so a
 * report can be matched to the failure. "Try again" opens the page that failed (`returnUrl`) again.
 */
@Component({
  selector: 'app-server-error-page',
  imports: [ErrorPage, Button],
  template: `
    <gl-error-page tone="error" title="Something went wrong on our side" [text]="text">
      <svg slot="icon" class="icon icon--lg" aria-hidden="true" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5M12 16h.01" />
      </svg>
      <gl-button slot="actions" variant="primary" (click)="tryAgain()">
        <svg class="icon" aria-hidden="true" viewBox="0 0 24 24">
          <path d="M20 11a8 8 0 0 0-14-4L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4l2-2M20 20v-5h-5" />
        </svg>
        Try again
      </gl-button>
      <gl-button slot="actions" link="/">Back to calendar</gl-button>
    </gl-error-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServerErrorPage {
  private readonly router = inject(Router);
  private readonly query = inject(ActivatedRoute).snapshot.queryParamMap;

  protected readonly text =
    'We’ve been told and we’re looking into it. Your days are safe.' +
    (this.query.get('reference') ? ` Error reference ${this.query.get('reference')}.` : '');

  protected tryAgain(): void {
    void this.router.navigateByUrl(safeReturnUrl(this.query.get('returnUrl')), {
      replaceUrl: true,
    });
  }
}
