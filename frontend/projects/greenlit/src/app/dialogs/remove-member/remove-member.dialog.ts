import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';

import { TEAM_SERVICE } from 'api';

import { Alert, Button, Dialog } from 'components';

/** What the person page tells the dialog: whom to remove. */
export interface RemoveMemberData {
  readonly memberId: string;
  /** The person's first name, for "Remove Ben from the team?". */
  readonly firstName: string;
}

/** Remove member (dialogs/remove-member, docs/detailed-designs/teams/remove-member, L2-011). */
@Component({
  selector: 'app-remove-member-dialog',
  imports: [Dialog, Alert, Button],
  template: `
    <gl-dialog
      [title]="'Remove ' + data.firstName + ' from the team?'"
      description="Their history is kept, but they won’t appear on the calendar."
      tone="danger"
      [busy]="busy()"
      (closed)="close()"
    >
      <svg slot="icon" class="icon" aria-hidden="true" viewBox="0 0 24 24">
        <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
      </svg>
      @if (failed()) {
        <gl-alert tone="danger" [title]="'We couldn’t remove ' + data.firstName">
          Check your connection and try again. Nothing was changed.
        </gl-alert>
      }
      <ul>
        <li>{{ data.firstName }}’s days stay in the history.</li>
        <li>{{ data.firstName }} won’t appear on the calendar or sign in.</li>
        <li>You can invite {{ data.firstName }} back from Settings at any time.</li>
      </ul>
      <div slot="footer" class="actions">
        <gl-button id="rm-cancel" [disabled]="busy()" (click)="close()">Cancel</gl-button>
        <gl-button variant="danger" [busy]="busy()" [disabled]="busy()" (click)="remove()">
          {{ busy() ? 'Removing…' : 'Yes, remove ' + data.firstName }}
        </gl-button>
      </div>
    </gl-dialog>
  `,
  styles: `
    :host {
      display: block;
    }
    gl-alert {
      display: block;
      margin-bottom: var(--space-4);
    }
    ul {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      margin: 0;
      padding-left: var(--space-5);
    }
    .actions {
      display: contents;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RemoveMemberDialog {
  private readonly team = inject(TEAM_SERVICE);
  private readonly ref = inject<DialogRef<boolean>>(DialogRef);
  protected readonly data = inject<RemoveMemberData>(DIALOG_DATA);

  protected readonly busy = signal(false);
  protected readonly failed = signal(false);

  constructor() {
    // Esc and the backdrop do nothing while the member is being removed.
    effect(() => {
      this.ref.disableClose = this.busy();
    });
  }

  protected remove(): void {
    if (this.busy()) return;
    this.failed.set(false);
    this.busy.set(true);
    this.team.remove(this.data.memberId).subscribe((result) => {
      if (result.ok) {
        this.ref.close(true);
        return;
      }
      this.busy.set(false);
      this.failed.set(true);
    });
  }

  protected close(): void {
    this.ref.close(false);
  }
}
