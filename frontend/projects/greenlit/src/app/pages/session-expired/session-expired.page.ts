import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { SESSION_STORE, safeReturnUrl } from 'api';
import { AuthCard, Button } from 'components';

/**
 * Session expired (docs/detailed-designs/identity-and-access/sign-out, L2-007): says the session ran out
 * and offers to sign in again. "Sign in" opens sign-in with the page the person was on (`returnUrl`), which
 * sign-in returns them to. Whatever token is left in the browser is discarded.
 */
@Component({
  selector: 'app-session-expired-page',
  imports: [AuthCard, Button],
  template: `
    <gl-auth-card
      title="Your session has expired"
      lead="For your security you were signed out after a while away. Sign in again to pick up where you left off."
    >
      <gl-button variant="primary" [block]="true" [link]="signInLink">Sign in</gl-button>
    </gl-auth-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionExpiredPage {
  private readonly router = inject(Router);

  protected readonly signInLink = this.router.createUrlTree(['/sign-in'], {
    queryParams: {
      returnUrl: safeReturnUrl(inject(ActivatedRoute).snapshot.queryParamMap.get('returnUrl')),
    },
  });

  constructor() {
    inject(SESSION_STORE).clear();
  }
}
