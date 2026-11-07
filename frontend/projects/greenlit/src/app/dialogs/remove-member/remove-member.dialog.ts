import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { Button, Dialog } from 'components';

/** What the person page tells the dialog: whom to remove. */
export interface RemoveMemberData {
  readonly memberId: string;
  /** The person's first name, for "Remove Ben from the team?". */
  readonly firstName: string;
}

/** Remove member (dialogs/remove-member, docs/detailed-designs/teams/remove-member, L2-011). */
@Component({
  selector: 'app-remove-member-dialog',
  imports: [Dialog, Button],
  template: `
    <gl-dialog
      [title]="'Remove ' + data.firstName + ' from the team?'"
      description="Their history is kept, but they won’t appear on the calendar."
      tone="danger"
      (closed)="close()"
    >
      <svg slot="icon" class="icon" aria-hidden="true" viewBox="0 0 24 24">
        <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
      </svg>
      <ul>
        <li>{{ data.firstName }}’s days stay in the history.</li>
        <li>{{ data.firstName }} won’t appear on the calendar or sign in.</li>
        <li>You can invite {{ data.firstName }} back from Settings at any time.</li>
      </ul>
      <div slot="footer" class="actions">
        <gl-button id="rm-cancel" (click)="close()">Cancel</gl-button>
        <gl-button variant="danger">Yes, remove {{ data.firstName }}</gl-button>
      </div>
    </gl-dialog>
  `,
  styles: `
    :host {
      display: block;
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
  private readonly ref = inject<DialogRef<boolean>>(DialogRef);
  protected readonly data = inject<RemoveMemberData>(DIALOG_DATA);

  protected close(): void {
    this.ref.close(false);
  }
}
