import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  afterNextRender,
  computed,
  inject,
  linkedSignal,
  signal,
  viewChild,
} from '@angular/core';

import { ACCOUNT_SERVICE, Account } from 'api';
import {
  Alert,
  Button,
  FormSummary,
  FormSummaryItem,
  InlineMessage,
  Skeleton,
  TextField,
} from 'components';

import { AccountState } from '../../account/account-state';
import { AppDialogs } from '../../dialogs/app-dialogs';
import { SignOutDialog } from '../../dialogs/sign-out/sign-out.dialog';

const MIN_PASSWORD = 10;
const MAX_NAME = 100;
const EMAIL = /^[^\s@]+@[^\s@.][^\s@]*\.[^\s@.]+$/;

interface Status {
  readonly tone: 'success' | 'danger';
  readonly text: string;
}

type Load =
  | { readonly state: 'loading' }
  | { readonly state: 'ready'; readonly account: Account }
  | { readonly state: 'error' };

/**
 * Account (pages/account/*, docs/detailed-designs/identity-and-access/manage-account, L2-005): the
 * signed-in person's profile, password and Sign out, each section on its own. The sections are one
 * screen rather than dialogs: they are the page's content, not a button-triggered edit.
 */
@Component({
  selector: 'app-account-page',
  imports: [Alert, Button, FormSummary, InlineMessage, Skeleton, TextField],
  template: `
    <div class="account">
      <h1>Account</h1>
      @switch (load().state) {
        @case ('loading') {
          <section class="settings-section" aria-busy="true">
            <gl-skeleton shape="rect" width="var(--space-24)" height="var(--space-6)" />
            <div class="form-grid">
              <gl-skeleton shape="rect" width="100%" height="var(--space-10)" />
              <gl-skeleton shape="rect" width="100%" height="var(--space-10)" />
            </div>
          </section>
          <section class="settings-section" aria-busy="true">
            <gl-skeleton shape="rect" width="var(--space-24)" height="var(--space-6)" />
            <div class="form-grid">
              <gl-skeleton shape="rect" width="100%" height="var(--space-10)" />
              <gl-skeleton shape="rect" width="100%" height="var(--space-10)" />
            </div>
          </section>
        }
        @case ('error') {
          <gl-alert tone="danger" title="We couldn't load your account">
            Something went wrong on our side. Nothing was changed.
            <gl-button slot="actions" size="sm" (click)="retry()">
              <svg class="icon" aria-hidden="true" viewBox="0 0 24 24">
                <path d="M20 11a8 8 0 0 0-14-4L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4l2-2M20 20v-5h-5" />
              </svg>
              Try again
            </gl-button>
          </gl-alert>
        }
        @case ('ready') {
          <section class="settings-section" aria-labelledby="prof-title">
            <h2 id="prof-title" class="section-title">Profile</h2>
            <p>How you appear to your team.</p>
            <div class="form-grid form-grid--2">
              <gl-text-field
                label="Display name"
                inputId="acc-name"
                autocomplete="name"
                [(value)]="name"
                [error]="profileSubmitted() ? nameError() : ''"
                [readonly]="profileBusy()"
              />
              <gl-text-field
                label="Email"
                inputId="acc-email"
                type="email"
                help="This is how you sign in."
                [(value)]="email"
                [error]="emailFieldError()"
                [readonly]="profileBusy()"
                (valueChange)="emailTaken.set(false)"
              />
            </div>
            <div class="settings-actions">
              <gl-button
                variant="primary"
                size="sm"
                [busy]="profileBusy()"
                [disabled]="!dirty() || profileBusy()"
                (click)="saveProfile()"
              >
                {{ profileBusy() ? 'Saving…' : 'Save changes' }}
              </gl-button>
              <span aria-live="polite">
                @if (profileStatus(); as status) {
                  <gl-inline-message [tone]="status.tone">{{ status.text }}</gl-inline-message>
                }
              </span>
            </div>
          </section>
          <section class="settings-section" aria-labelledby="pw-title">
            <h2 id="pw-title" class="section-title">Password</h2>
            <p>Use at least 10 characters.</p>
            @if (submitted() && summaryItems().length) {
              <gl-form-summary class="summary" [items]="summaryItems()" />
            }
            <div class="stack">
              <gl-text-field
                label="Current password"
                inputId="pw-current"
                type="password"
                autocomplete="current-password"
                [(value)]="current"
                [error]="currentError()"
                [readonly]="passwordBusy()"
                (valueChange)="currentWrong.set(false)"
              />
              <gl-text-field
                label="New password"
                inputId="pw-new"
                type="password"
                autocomplete="new-password"
                [(value)]="next"
                [error]="shown('new') ? newError() : ''"
                [readonly]="passwordBusy()"
                (blurred)="touch('new')"
              />
              <gl-text-field
                label="Confirm new password"
                inputId="pw-confirm"
                type="password"
                autocomplete="new-password"
                [(value)]="confirm"
                [error]="shown('confirm') ? confirmError() : ''"
                [readonly]="passwordBusy()"
                (blurred)="touch('confirm')"
              />
            </div>
            <div class="settings-actions">
              <gl-button
                variant="primary"
                size="sm"
                [busy]="passwordBusy()"
                [disabled]="passwordBusy()"
                (click)="updatePassword()"
              >
                {{ passwordBusy() ? 'Saving…' : 'Update password' }}
              </gl-button>
              <span aria-live="polite">
                @if (passwordStatus(); as status) {
                  <gl-inline-message [tone]="status.tone">{{ status.text }}</gl-inline-message>
                }
              </span>
            </div>
          </section>
          <section class="settings-section" aria-labelledby="out-title">
            <h2 id="out-title" class="section-title">Sign out</h2>
            <div class="settings-actions">
              <gl-button (click)="signOut()">
                <svg class="icon" aria-hidden="true" viewBox="0 0 24 24">
                  <path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9" />
                </svg>
                Sign out
              </gl-button>
            </div>
          </section>
        }
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .account {
      max-width: 40rem;
    }
    h1 {
      margin-bottom: var(--space-6);
    }
    .section-title {
      margin-bottom: var(--space-2);
    }
    section > p {
      margin-bottom: var(--space-4);
      color: var(--color-fg-muted);
    }
    .settings-section + .settings-section {
      margin-top: var(--space-10);
    }
    .summary {
      display: block;
      margin-top: var(--space-4);
    }
    .form-grid {
      display: grid;
      gap: var(--space-4);
      margin-top: var(--space-6);
    }
    @media (min-width: 40rem) {
      .form-grid--2 {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    .stack {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      margin-top: var(--space-6);
      max-width: 24rem;
    }
    .settings-actions {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      margin-top: var(--space-6);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountPage {
  private readonly service = inject(ACCOUNT_SERVICE);
  private readonly dialogs = inject(AppDialogs);
  private readonly accountState = inject(AccountState);

  protected readonly load = signal<Load>({ state: 'loading' });

  protected readonly name = linkedSignal(() => {
    const load = this.load();
    return load.state === 'ready' ? load.account.displayName : '';
  });
  protected readonly email = linkedSignal(() => {
    const load = this.load();
    return load.state === 'ready' ? load.account.email : '';
  });
  protected readonly profileBusy = signal(false);
  protected readonly profileStatus = signal<Status | null>(null);
  protected readonly profileSubmitted = signal(false);
  /** True after the API said another account uses the email; clears when the person edits it. */
  protected readonly emailTaken = signal(false);

  protected readonly dirty = computed(() => {
    const load = this.load();
    return (
      load.state === 'ready' &&
      (this.name().trim() !== load.account.displayName ||
        this.email().trim() !== load.account.email)
    );
  });
  protected readonly nameError = computed(() => {
    const name = this.name().trim();
    if (!name) return 'Enter your name.';
    return name.length > MAX_NAME ? 'Use 100 characters or fewer.' : '';
  });
  private readonly emailError = computed(() =>
    EMAIL.test(this.email().trim()) ? '' : 'Enter a valid email address.',
  );
  protected readonly emailFieldError = computed(() => {
    if (this.emailTaken()) return 'That email is already in use.';
    return this.profileSubmitted() ? this.emailError() : '';
  });
  protected readonly current = signal('');
  protected readonly next = signal('');
  protected readonly confirm = signal('');
  protected readonly passwordBusy = signal(false);
  protected readonly passwordStatus = signal<Status | null>(null);
  /** True after the API said the current password is wrong; clears when the person edits it. */
  protected readonly currentWrong = signal(false);
  protected readonly submitted = signal(false);
  private readonly touched = signal<ReadonlySet<'new' | 'confirm'>>(new Set());
  private readonly injector = inject(Injector);
  private readonly summary = viewChild(FormSummary);

  protected readonly currentError = computed(() =>
    this.currentWrong() ? 'That isn’t your current password.' : '',
  );
  protected readonly newError = computed(() =>
    this.next().length >= MIN_PASSWORD ? '' : 'Use at least 10 characters.',
  );
  protected readonly confirmError = computed(() =>
    this.confirm() === this.next() ? '' : 'This doesn’t match the new password.',
  );

  /** The summary repeats each field error as a link (pages/account/invalid). */
  protected readonly summaryItems = computed<FormSummaryItem[]>(() => {
    const items: FormSummaryItem[] = [];
    if (this.newError()) {
      items.push({ field: 'pw-new', message: 'New password must be at least 10 characters' });
    }
    if (this.confirmError()) items.push({ field: 'pw-confirm', message: "Passwords don't match" });
    return items;
  });

  constructor() {
    this.read();
  }

  protected retry(): void {
    this.load.set({ state: 'loading' });
    this.read();
  }

  private read(): void {
    this.service.get().subscribe((account) => {
      this.load.set(account ? { state: 'ready', account } : { state: 'error' });
    });
  }

  /** Saves the name and email together; nothing is sent while either is invalid. */
  protected saveProfile(): void {
    if (this.profileBusy() || !this.dirty()) return;
    this.profileSubmitted.set(true);
    this.profileStatus.set(null);
    if (this.nameError() || this.emailError()) return;
    this.profileBusy.set(true);
    this.service.updateProfile(this.name().trim(), this.email().trim()).subscribe((result) => {
      this.profileBusy.set(false);
      if (result.outcome === 'saved') {
        this.load.set({ state: 'ready', account: result.account });
        this.accountState.account.set(result.account);
        this.profileSubmitted.set(false);
        this.profileStatus.set({ tone: 'success', text: 'Saved' });
      } else if (result.outcome === 'email-taken') {
        this.emailTaken.set(true);
      } else {
        this.profileStatus.set({
          tone: 'danger',
          text: 'We couldn’t save your changes. Nothing was changed.',
        });
      }
    });
  }

  protected shown(field: 'new' | 'confirm'): boolean {
    return this.submitted() || this.touched().has(field);
  }

  protected touch(field: 'new' | 'confirm'): void {
    if (this.touched().has(field)) return;
    this.touched.update((set) => new Set([...set, field]));
  }

  /** Checks the new password first and sends nothing while it is invalid; then changes it. */
  protected updatePassword(): void {
    if (this.passwordBusy()) return;
    this.submitted.set(true);
    this.passwordStatus.set(null);
    if (this.summaryItems().length) {
      afterNextRender(() => this.summary()?.focus(), { injector: this.injector });
      return;
    }
    this.passwordBusy.set(true);
    this.service.changePassword(this.current(), this.next(), this.confirm()).subscribe((result) => {
      this.passwordBusy.set(false);
      if (result.outcome === 'updated') {
        this.current.set('');
        this.next.set('');
        this.confirm.set('');
        this.submitted.set(false);
        this.touched.set(new Set());
        this.passwordStatus.set({ tone: 'success', text: 'Password updated' });
      } else if (result.outcome === 'current-wrong') {
        this.currentWrong.set(true);
      } else {
        this.passwordStatus.set({
          tone: 'danger',
          text: 'We couldn’t update your password. Nothing was changed.',
        });
      }
    });
  }

  /** Sign out opens the same dialog as the account menu (L2-006). */
  protected signOut(): void {
    this.dialogs.open<boolean>(SignOutDialog, '.dialog__footer .btn');
  }
}
