import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AUTH_SERVICE } from 'api';
import { Button, Dialog } from 'components';

import { AccountState } from '../../account/account-state';

/**
 * Sign out (dialogs/sign-out, docs/detailed-designs/identity-and-access/sign-out, L2-006): asks first.
 * "Sign out" shows "Signing out…" with every way out off, ends the session and opens sign-in; the
 * session ends even when the server cannot be told. "Stay signed in" closes without a change.
 * It closes with `true` when the person was signed out.
 */
@Component({
  selector: 'app-sign-out-dialog',
  imports: [Dialog, Button],
  template: `
    <gl-dialog title="Sign out of Greenlit?" tone="info" [busy]="busy()" (closed)="stay()">
      <svg slot="icon" class="icon" aria-hidden="true" viewBox="0 0 24 24">
        <path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9" />
      </svg>
      <p>Anything you’ve already saved stays saved.</p>
      <div slot="footer" class="actions">
        <gl-button [disabled]="busy()" (click)="stay()">Stay signed in</gl-button>
        <gl-button variant="primary" [busy]="busy()" [disabled]="busy()" (click)="signOut()">
          {{ busy() ? 'Signing out…' : 'Sign out' }}
        </gl-button>
      </div>
    </gl-dialog>
  `,
  styles: `
    :host {
      display: block;
    }
    p {
      margin: 0;
    }
    .actions {
      display: contents;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignOutDialog {
  private readonly auth = inject(AUTH_SERVICE);
  private readonly account = inject(AccountState);
  private readonly router = inject(Router);
  private readonly ref = inject<DialogRef<boolean>>(DialogRef);

  protected readonly busy = signal(false);

  constructor() {
    // Esc and the backdrop do nothing while the person is being signed out.
    effect(() => {
      this.ref.disableClose = this.busy();
    });
  }

  protected signOut(): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.auth.signOut().subscribe(() => {
      this.account.clear();
      this.ref.close(true);
      void this.router.navigateByUrl('/sign-in');
    });
  }

  protected stay(): void {
    this.ref.close(false);
  }
}
