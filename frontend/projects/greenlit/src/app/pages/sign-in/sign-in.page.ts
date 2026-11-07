import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AUTH_SERVICE, safeReturnUrl } from 'api';
import {
  Alert,
  AuthCard,
  Button,
  FormSummary,
  FormSummaryItem,
  ProgressBar,
  TextField,
} from 'components';

type Field = 'email' | 'password';

const EMAIL_ID = 'si-email';
const PASSWORD_ID = 'si-pw';

/** How long "Signed in" shows before the calendar opens (design decision, journey 2). */
export const SIGNED_IN_PAUSE_MS = 1500;

/**
 * Sign in (docs/detailed-designs/identity-and-access/sign-in, L2-001): email
 * and password on the bare-shell auth card. Fields validate on blur once,
 * then on every change; a submit attempt with errors shows the summary,
 * moves focus to it and sends nothing. A successful sign-in shows "Signed
 * in" and then opens the page the visitor was going to (`returnUrl`), or the
 * calendar.
 */
@Component({
  selector: 'app-sign-in-page',
  imports: [AuthCard, TextField, FormSummary, Button, RouterLink, Alert, ProgressBar],
  template: `
    @if (welcomeName(); as name) {
      <gl-auth-card title="Signed in" lead="You’re all set.">
        <gl-alert tone="success" [title]="'Welcome back, ' + name"
          >Taking you to your calendar…</gl-alert
        >
        <gl-progress-bar label="Signing you in" />
        <gl-button [link]="destination()" [block]="true">Go to the calendar now</gl-button>
      </gl-auth-card>
    } @else {
      <gl-auth-card title="Sign in" lead="Welcome back. Your team’s time off is waiting.">
        <form class="stack" novalidate (submit)="submit($event)">
          @if (submitted() && summaryItems().length) {
            <gl-form-summary [items]="summaryItems()" />
          } @else if (failure() === 'invalid-credentials') {
            <gl-alert tone="danger" title="Email or password doesn’t match">
              Check them and try again. If you’ve forgotten your password, you can reset it.
            </gl-alert>
          } @else if (failure() === 'failed') {
            <gl-alert tone="danger" title="We couldn’t sign you in">
              Something went wrong on our side. Try again in a moment.
            </gl-alert>
          }
          <gl-text-field
            label="Email"
            [inputId]="emailId"
            type="email"
            autocomplete="username"
            [(value)]="email"
            [error]="shown('email') ? emailError() : ''"
            [readonly]="busy()"
            (blurred)="touch('email')"
          />
          <gl-text-field
            label="Password"
            [inputId]="passwordId"
            type="password"
            autocomplete="current-password"
            [(value)]="password"
            [error]="shown('password') ? passwordError() : ''"
            [readonly]="busy()"
            (blurred)="touch('password')"
          />
          <gl-button
            type="submit"
            variant="primary"
            [block]="true"
            [busy]="busy()"
            [disabled]="busy()"
          >
            Sign in
          </gl-button>
          <div class="auth-links"><a routerLink="/forgot-password">Forgot your password?</a></div>
        </form>
        <p slot="note" class="text-caption note">
          New here? Greenlit is invite-only. Ask your manager to send you an invitation.
        </p>
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
  private readonly auth = inject(AUTH_SERVICE);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly summary = viewChild(FormSummary);

  protected readonly emailId = EMAIL_ID;
  protected readonly passwordId = PASSWORD_ID;

  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly submitted = signal(false);
  /** True while the sign-in request runs (pages/sign-in/submitting). */
  protected readonly busy = signal(false);
  /** Why the last attempt failed (pages/sign-in/error); null before one has. */
  protected readonly failure = signal<'invalid-credentials' | 'failed' | null>(null);
  /** The first name to welcome once signed in. */
  protected readonly welcomeName = signal<string | null>(null);
  /** Where to go after signing in, as a URL tree so its query survives. */
  protected readonly destination = signal(
    this.router.parseUrl(
      safeReturnUrl(inject(ActivatedRoute).snapshot.queryParamMap.get('returnUrl')),
    ),
  );
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
    if (this.busy()) return;
    this.submitted.set(true);
    if (this.summaryItems().length) {
      afterNextRender(() => this.summary()?.focus(), { injector: this.injector });
      return;
    }
    this.failure.set(null);
    this.busy.set(true);
    this.auth.signIn(this.email().trim(), this.password()).subscribe((result) => {
      this.busy.set(false);
      if (result.outcome !== 'signed-in') {
        this.failure.set(result.outcome);
        return;
      }
      this.welcomeName.set(result.session.displayName.split(' ')[0]);
      const timer = setTimeout(
        () => this.router.navigateByUrl(this.destination()),
        SIGNED_IN_PAUSE_MS,
      );
      this.destroyRef.onDestroy(() => clearTimeout(timer));
    });
  }
}
