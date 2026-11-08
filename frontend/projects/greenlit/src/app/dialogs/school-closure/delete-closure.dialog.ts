import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';

import { SCHOOL_CALENDAR_SERVICE, SchoolClosure } from 'api';
import { Alert, Button, Dialog } from 'components';

/** What Settings tells the dialog: the closure, and its dates and whose calendar as the list shows them. */
export interface DeleteClosureData {
  readonly closure: SchoolClosure;
  readonly meta: string;
}

/**
 * Delete a school closure (dialogs/delete-closure/*, L2-061 AC6): names the closure and says nothing else changes.
 * "Yes, delete" shows "Deleting…"; a failure says nothing was changed and offers "Try again". Closes with `true` when
 * the closure was deleted.
 */
@Component({
  selector: 'app-delete-closure-dialog',
  imports: [Dialog, Alert, Button],
  template: `
    <gl-dialog
      [title]="'Delete ' + data.closure.label + '?'"
      description="It comes off the children’s rows. Nothing else changes."
      tone="danger"
      [busy]="busy()"
      (closed)="close()"
    >
      <div class="fields">
        @if (failed()) {
          <gl-alert tone="danger" title="We couldn’t delete the closure">
            Check your connection and try again. Nothing was changed.
          </gl-alert>
        }
        <p>{{ data.meta }}</p>
      </div>
      <div slot="footer" class="actions">
        <gl-button [disabled]="busy()" (click)="close()">Cancel</gl-button>
        <gl-button variant="danger" [busy]="busy()" [disabled]="busy()" (click)="remove()">
          {{ busy() ? 'Deleting…' : failed() ? 'Try again' : 'Yes, delete' }}
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
export class DeleteClosureDialog {
  private readonly service = inject(SCHOOL_CALENDAR_SERVICE);
  private readonly ref = inject<DialogRef<boolean>>(DialogRef);
  protected readonly data = inject<DeleteClosureData>(DIALOG_DATA);
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);

  constructor() {
    effect(() => {
      this.ref.disableClose = this.busy();
    });
  }

  protected remove(): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.failed.set(false);
    this.service.deleteClosure(this.data.closure.id).subscribe((result) => {
      this.busy.set(false);
      if (result.ok) this.ref.close(true);
      else this.failed.set(true);
    });
  }

  protected close(): void {
    if (this.busy()) return;
    this.ref.close(false);
  }
}
