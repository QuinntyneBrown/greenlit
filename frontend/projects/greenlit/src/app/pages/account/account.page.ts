import { ChangeDetectionStrategy, Component, inject, linkedSignal, signal } from '@angular/core';

import { ACCOUNT_SERVICE, Account } from 'api';
import { Alert, Button, Skeleton, TextField } from 'components';

import { AppDialogs } from '../../dialogs/app-dialogs';
import { SignOutDialog } from '../../dialogs/sign-out/sign-out.dialog';

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
  imports: [Alert, Button, Skeleton, TextField],
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
              />
              <gl-text-field
                label="Email"
                inputId="acc-email"
                type="email"
                help="This is how you sign in."
                [(value)]="email"
              />
            </div>
            <div class="settings-actions">
              <gl-button variant="primary" size="sm" [disabled]="true">Save changes</gl-button>
              <span aria-live="polite"></span>
            </div>
          </section>
          <section class="settings-section" aria-labelledby="pw-title">
            <h2 id="pw-title" class="section-title">Password</h2>
            <p>Use at least 10 characters.</p>
            <div class="stack">
              <gl-text-field
                label="Current password"
                inputId="pw-current"
                type="password"
                autocomplete="current-password"
                [(value)]="current"
              />
              <gl-text-field
                label="New password"
                inputId="pw-new"
                type="password"
                autocomplete="new-password"
                [(value)]="next"
              />
              <gl-text-field
                label="Confirm new password"
                inputId="pw-confirm"
                type="password"
                autocomplete="new-password"
                [(value)]="confirm"
              />
            </div>
            <div class="settings-actions">
              <gl-button variant="primary" size="sm">Update password</gl-button>
              <span aria-live="polite"></span>
            </div>
          </section>
          <section class="settings-section" aria-labelledby="out-title">
            <h2 id="out-title" class="section-title">Sign out</h2>
            <p>You'll need your email and password to get back in.</p>
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

  protected readonly load = signal<Load>({ state: 'loading' });

  protected readonly name = linkedSignal(() => {
    const load = this.load();
    return load.state === 'ready' ? load.account.displayName : '';
  });
  protected readonly email = linkedSignal(() => {
    const load = this.load();
    return load.state === 'ready' ? load.account.email : '';
  });
  protected readonly current = signal('');
  protected readonly next = signal('');
  protected readonly confirm = signal('');

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

  /** Sign out opens the same dialog as the account menu (L2-006). */
  protected signOut(): void {
    this.dialogs.open<boolean>(SignOutDialog, '.dialog__footer .btn');
  }
}
