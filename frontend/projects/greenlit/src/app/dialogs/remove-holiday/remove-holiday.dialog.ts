import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';

import { HOLIDAY_SERVICE, Holiday, holidayDateLabel } from 'api';
import { Alert, Button, Dialog } from 'components';

/** What Settings tells the dialog: the holiday to remove. */
export interface RemoveHolidayData {
  readonly holiday: Holiday;
}

/**
 * Remove holiday (dialogs/remove-holiday, docs/detailed-designs/teams/manage-holidays, L2-038): names the
 * holiday and what changes for the team. "Remove holiday" shows "Removing…" with every way out off (Esc and
 * Close too); a failure says nothing was changed and offers the button again. "Keep it" closes without a
 * change. It closes with `true` when the holiday was removed.
 */
@Component({
  selector: 'app-remove-holiday-dialog',
  imports: [Dialog, Alert, Button],
  template: `
    <gl-dialog
      [title]="'Remove ' + holiday.name + '?'"
      [description]="
        holidayDateLabel(holiday.date) + ' becomes a working day again for the whole team.'
      "
      tone="danger"
      [busy]="busy()"
      (closed)="close()"
    >
      <svg slot="icon" class="icon" aria-hidden="true" viewBox="0 0 24 24">
        <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
      </svg>
      <div class="fields">
        @if (failed()) {
          <gl-alert tone="danger" title="We couldn’t remove the holiday">
            Check your connection and try again. Nothing was changed.
          </gl-alert>
        }
        <p>It will count against allowances again for anyone who books it.</p>
      </div>
      <div slot="footer" class="actions">
        <gl-button [disabled]="busy()" (click)="close()">Keep it</gl-button>
        <gl-button variant="danger" [busy]="busy()" [disabled]="busy()" (click)="remove()">
          {{ busy() ? 'Removing…' : 'Remove holiday' }}
        </gl-button>
      </div>
    </gl-dialog>
  `,
  styles: `
    :host {
      display: block;
    }
    .fields {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
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
export class RemoveHolidayDialog {
  private readonly holidays = inject(HOLIDAY_SERVICE);
  private readonly ref = inject<DialogRef<boolean>>(DialogRef);

  protected readonly holiday = inject<RemoveHolidayData>(DIALOG_DATA).holiday;
  protected readonly holidayDateLabel = holidayDateLabel;

  protected readonly busy = signal(false);
  protected readonly failed = signal(false);

  constructor() {
    // Esc and the backdrop do nothing while the holiday is being removed.
    effect(() => {
      this.ref.disableClose = this.busy();
    });
  }

  protected remove(): void {
    if (this.busy()) return;
    this.failed.set(false);
    this.busy.set(true);
    this.holidays.remove(this.holiday.id).subscribe((result) => {
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
