import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  OnInit,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { AUTH_SERVICE } from 'api';
import {
  Alert,
  AuthCard,
  Button,
  FormSummary,
  FormSummaryItem,
  Skeleton,
  TextField,
} from 'components';

type Field = 'new' | 'confirm';
type View = 'loading' | 'open' | 'expired' | 'done';

const NEW_ID = 'rp-new';
const CONFIRM_ID = 'rp-confirm';
const MIN_PASSWORD = 10;

/**
 * Reset password (docs/detailed-designs/identity-and-access/reset-password, L2-003): the bare-shell
 * card the emailed link opens. It checks the link, asks for a new password and its confirmation, and
 * says "This link has expired" for a link that is used, past its hour or unknown, on opening or on
 * submitting. If the check itself cannot be made the form still shows, and the submit decides.
 * Fields validate on blur once, then on every change; a submit attempt with errors shows the
 * summary, moves focus to it and sends nothing.
 */
@Component({
  selector: 'app-reset-password-page',
  imports: [AuthCard, TextField, FormSummary, Button, Alert, Skeleton],
  template: `
    @switch (view()) {
      @case ('loading') {
        <gl-auth-card title="Choose a new password" lead="Checking your link…">
          <div class="stack" aria-busy="true">
            <gl-skeleton shape="rect" width="100%" height="var(--space-10)" />
            <gl-skeleton shape="rect" width="100%" height="var(--space-10)" />
            <gl-skeleton shape="rect" width="100%" height="var(--space-10)" />
          </div>
        </gl-auth-card>
      }
      @case ('expired') {
        <gl-auth-card title="Choose a new password" lead="We couldn’t use that link.">
          <gl-alert tone="danger" title="This link has expired">
            Reset links work for one hour and only once. Request a new one to continue.
          </gl-alert>
          <gl-button link="/forgot-password" variant="primary" [block]="true">
            Request a new link
          </gl-button>
        </gl-auth-card>
      }
      @case ('done') {
        <gl-auth-card title="All done" lead="Your password has been changed.">
          <gl-alert tone="success" title="Password updated">
            You can sign in with your new password.
          </gl-alert>
          <gl-button link="/sign-in" variant="primary" [block]="true">Sign in</gl-button>
        </gl-auth-card>
      }
      @default {
        <gl-auth-card
          title="Choose a new password"
          lead="Pick something you haven’t used here before."
        >
          <form class="stack" novalidate (submit)="submit($event)">
            @if (submitted() && summaryItems().length) {
              <gl-form-summary [items]="summaryItems()" />
            } @else if (failed()) {
              <gl-alert tone="danger" title="We couldn’t update your password">
                Something went wrong on our side. Nothing was changed. Try again in a moment.
              </gl-alert>
            }
            <gl-text-field
              label="New password"
              [inputId]="newId"
              type="password"
              autocomplete="new-password"
              help="Use at least 10 characters."
              [(value)]="password"
              [error]="shown('new') ? passwordError() : ''"
              [readonly]="busy()"
              (blurred)="touch('new')"
            />
            <gl-text-field
              label="Confirm new password"
              [inputId]="confirmId"
              type="password"
              autocomplete="new-password"
              [(value)]="confirm"
              [error]="shown('confirm') ? confirmError() : ''"
              [readonly]="busy()"
              (blurred)="touch('confirm')"
            />
            <gl-button
              type="submit"
              variant="primary"
              [block]="true"
              [busy]="busy()"
              [disabled]="busy()"
            >
              Update password
            </gl-button>
          </form>
        </gl-auth-card>
      }
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
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordPage implements OnInit {
  private readonly auth = inject(AUTH_SERVICE);
  private readonly injector = inject(Injector);
  private readonly token = inject(ActivatedRoute).snapshot.paramMap.get('token') ?? '';
  private readonly summary = viewChild(FormSummary);

  protected readonly newId = NEW_ID;
  protected readonly confirmId = CONFIRM_ID;

  protected readonly view = signal<View>('loading');
  protected readonly password = signal('');
  protected readonly confirm = signal('');
  protected readonly submitted = signal(false);
  /** True while the update request runs (pages/reset-password/submitting). */
  protected readonly busy = signal(false);
  /** True when the last attempt failed for a reason other than the link (pages/reset-password/failed). */
  protected readonly failed = signal(false);
  private readonly touched = signal<ReadonlySet<Field>>(new Set());

  protected readonly passwordError = computed(() =>
    this.password().length >= MIN_PASSWORD ? '' : 'Use at least 10 characters.',
  );
  protected readonly confirmError = computed(() =>
    this.confirm() === this.password() ? '' : 'This doesn’t match the new password.',
  );

  /** The summary repeats each field error as a link, in the wording of pages/reset-password/invalid. */
  protected readonly summaryItems = computed<FormSummaryItem[]>(() => {
    const items: FormSummaryItem[] = [];
    if (this.passwordError()) {
      items.push({ field: NEW_ID, message: 'New password must be at least 10 characters' });
    }
    if (this.confirmError()) items.push({ field: CONFIRM_ID, message: 'Passwords don’t match' });
    return items;
  });

  ngOnInit(): void {
    this.auth.checkResetLink(this.token).subscribe((result) => {
      this.view.set(result.outcome === 'expired' ? 'expired' : 'open');
    });
  }

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
    this.failed.set(false);
    this.busy.set(true);
    this.auth.resetPassword(this.token, this.password(), this.confirm()).subscribe((result) => {
      this.busy.set(false);
      if (result.outcome === 'updated') this.view.set('done');
      else if (result.outcome === 'expired') this.view.set('expired');
      else this.failed.set(true);
    });
  }
}
