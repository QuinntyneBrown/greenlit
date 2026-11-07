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

import { AuthCard, Button, FormSummary, FormSummaryItem, TextField } from 'components';

type Field = 'email' | 'password';

const EMAIL_ID = 'si-email';
const PASSWORD_ID = 'si-pw';

/**
 * Sign in (docs/detailed-designs/identity-and-access/sign-in, L2-001): email
 * and password on the bare-shell auth card. Fields validate on blur once,
 * then on every change; a submit attempt with errors shows the summary,
 * moves focus to it and sends nothing.
 */
@Component({
  selector: 'app-sign-in-page',
  imports: [AuthCard, TextField, FormSummary, Button, RouterLink],
  template: `
    <gl-auth-card title="Sign in" lead="Welcome back. Your team’s time off is waiting.">
      <form class="stack" novalidate (submit)="submit($event)">
        @if (submitted() && summaryItems().length) {
          <gl-form-summary [items]="summaryItems()" />
        }
        <gl-text-field
          label="Email"
          [inputId]="emailId"
          type="email"
          autocomplete="username"
          [(value)]="email"
          [error]="shown('email') ? emailError() : ''"
          (blurred)="touch('email')"
        />
        <gl-text-field
          label="Password"
          [inputId]="passwordId"
          type="password"
          autocomplete="current-password"
          [(value)]="password"
          [error]="shown('password') ? passwordError() : ''"
          (blurred)="touch('password')"
        />
        <gl-button type="submit" variant="primary" [block]="true">Sign in</gl-button>
        <div class="auth-links"><a routerLink="/forgot-password">Forgot your password?</a></div>
      </form>
      <p slot="note" class="text-caption note">
        New here? Greenlit is invite-only. Ask your manager to send you an invitation.
      </p>
    </gl-auth-card>
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
    .text-caption {
      font: var(--text-caption);
      color: var(--color-fg-muted);
    }
    .note {
      text-align: center;
      margin-inline: auto;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignInPage {
  private readonly injector = inject(Injector);
  private readonly summary = viewChild(FormSummary);

  protected readonly emailId = EMAIL_ID;
  protected readonly passwordId = PASSWORD_ID;

  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly submitted = signal(false);
  private readonly touched = signal<ReadonlySet<Field>>(new Set());

  protected readonly emailError = computed(() =>
    this.email().trim() ? '' : 'Enter your email address.',
  );
  protected readonly passwordError = computed(() =>
    this.password() ? '' : 'Enter your password.',
  );

  /** The summary repeats each field error as a link, without the full stop (pages/sign-in/invalid). */
  protected readonly summaryItems = computed<FormSummaryItem[]>(() => {
    const items: FormSummaryItem[] = [];
    if (this.emailError()) items.push({ field: EMAIL_ID, message: 'Enter your email address' });
    if (this.passwordError()) items.push({ field: PASSWORD_ID, message: 'Enter your password' });
    return items;
  });

  protected shown(field: Field): boolean {
    return this.submitted() || this.touched().has(field);
  }

  protected touch(field: Field): void {
    if (this.touched().has(field)) return;
    this.touched.update((set) => new Set([...set, field]));
  }

  protected submit(event: Event): void {
    event.preventDefault();
    this.submitted.set(true);
    if (this.summaryItems().length) {
      afterNextRender(() => this.summary()?.focus(), { injector: this.injector });
      return;
    }
  }
}
