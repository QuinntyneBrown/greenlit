import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { AUTH_SERVICE } from 'api';
import { Alert, AuthCard, Button, FormSummary, FormSummaryItem, TextField } from 'components';

const EMAIL_ID = 'fp-email';
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Forgot password (docs/detailed-designs/identity-and-access/reset-password, L2-002): the bare-shell
 * card that asks for an email and says "Check your email" whether or not the address has an account.
 */
@Component({
  selector: 'app-forgot-password-page',
  imports: [AuthCard, TextField, Button, Alert, RouterLink, FormSummary],
  template: `
    @if (sentTo(); as address) {
      <gl-auth-card title="Check your email" lead="We’ve sent instructions.">
        <gl-alert tone="success" title="Check your email">
          If {{ address }} has an account, a reset link is on its way. It works for one hour.
        </gl-alert>
        <gl-button link="/sign-in" [block]="true">Back to sign in</gl-button>
      </gl-auth-card>
    } @else {
      <gl-auth-card title="Reset your password" lead="Enter your email and we’ll send you a link.">
        <form class="stack" novalidate (submit)="submit($event)">
          @if (submitted() && summaryItems().length) {
            <gl-form-summary [items]="summaryItems()" />
          } @else if (failed()) {
            <gl-alert tone="danger" title="We couldn’t send the email">
              Something went wrong on our side. Try again in a moment.
            </gl-alert>
          }
          <gl-text-field
            label="Email"
            [inputId]="emailId"
            type="email"
            autocomplete="username"
            help="We’ll send a link to reset your password."
            [(value)]="email"
            [error]="shown() ? emailError() : ''"
            [readonly]="busy()"
            (blurred)="touched.set(true)"
          />
          <gl-button
            type="submit"
            variant="primary"
            [block]="true"
            [busy]="busy()"
            [disabled]="busy()"
          >
            Send reset link
          </gl-button>
          <div class="auth-links"><a routerLink="/sign-in">Back to sign in</a></div>
        </form>
      </gl-auth-card>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .stack {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }
    .auth-links {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: var(--space-2) var(--space-4);
      font: var(--text-body-sm);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordPage {
  private readonly auth = inject(AUTH_SERVICE);
  private readonly injector = inject(Injector);
  private readonly summary = viewChild(FormSummary);

  protected readonly emailId = EMAIL_ID;
  protected readonly email = signal('');
  protected readonly submitted = signal(false);
  protected readonly touched = signal(false);
  /** True while the request runs (pages/forgot-password/submitting). */
  protected readonly busy = signal(false);
  /** True when the last attempt could not send the email (pages/forgot-password/error). */
  protected readonly failed = signal(false);
  /** The address the link was asked for, once the API has answered. */
  protected readonly sentTo = signal<string | null>(null);

  protected readonly emailError = computed(() =>
    EMAIL_SHAPE.test(this.email().trim())
      ? ''
      : 'Enter a valid email address, like name@company.com.',
  );
  protected readonly summaryItems = computed<FormSummaryItem[]>(() =>
    this.emailError() ? [{ field: EMAIL_ID, message: 'Enter a valid email address' }] : [],
  );

  protected shown(): boolean {
    return this.submitted() || this.touched();
  }

  protected submit(event: Event): void {
    event.preventDefault();
    if (this.busy()) return;
    this.submitted.set(true);
    if (this.summaryItems().length) {
      afterNextRender(() => this.summary()?.focus(), { injector: this.injector });
      return;
    }
    const address = this.email().trim();
    this.failed.set(false);
    this.busy.set(true);
    this.auth.requestPasswordReset(address).subscribe((result) => {
      this.busy.set(false);
      if (result.outcome === 'sent') this.sentTo.set(address);
      else this.failed.set(true);
    });
  }
}
