import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';

import { REQUEST_SERVICE, RequestSummary } from 'api';
import { Alert, Button, Dialog } from 'components';

import { rangeLabel } from '../../pages/calendar/request-toasts';

/** What My requests tells the dialog: the request to cancel and who has not decided it. */
export interface CancelRequestData {
  readonly request: RequestSummary;
  readonly managerName: string;
}

/**
 * Cancel request (dialogs/cancel-request, docs/detailed-designs/requests/my-requests, L2-021): names the
 * request and says the manager has not decided it. "Cancel request" shows "Cancelling…" with every way out
 * off (Esc and Close too); a failure says the request is still pending and offers the button again. "Keep
 * request" closes without a change. It closes with `true` when the request was cancelled.
 */
@Component({
  selector: 'app-cancel-request-dialog',
  imports: [Dialog, Alert, Button],
  template: `
    <gl-dialog
      title="Cancel this request?"
      [description]="description"
      tone="danger"
      [busy]="busy()"
      (closed)="close()"
    >
      <svg slot="icon" class="icon" aria-hidden="true" viewBox="0 0 24 24">
        <path d="M12 4 3 20h18z" />
        <path d="M12 10v4M12 17h.01" />
      </svg>
      <div class="fields">
        @if (failed()) {
          <gl-alert tone="danger" title="We couldn’t cancel the request">
            Check your connection and try again. Your request is still pending.
          </gl-alert>
        }
        <p>
          {{ managerName }} hasn’t decided yet. Cancelling removes the request and clears the yellow
          days from your row.
        </p>
      </div>
      <div slot="footer" class="actions">
        <gl-button [disabled]="busy()" (click)="close()">Keep request</gl-button>
        <gl-button variant="danger" [busy]="busy()" [disabled]="busy()" (click)="cancel()">
          {{ busy() ? 'Cancelling…' : 'Cancel request' }}
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
export class CancelRequestDialog {
  private readonly requests = inject(REQUEST_SERVICE);
  private readonly ref = inject<DialogRef<boolean>>(DialogRef);
  private readonly data = inject<CancelRequestData>(DIALOG_DATA);

  protected readonly managerName = this.data.managerName;
  protected readonly description = this.describe(this.data.request);

  protected readonly busy = signal(false);
  protected readonly failed = signal(false);

  constructor() {
    // Esc and the backdrop do nothing while the request is being cancelled.
    effect(() => {
      this.ref.disableClose = this.busy();
    });
  }

  protected cancel(): void {
    if (this.busy()) return;
    this.failed.set(false);
    this.busy.set(true);
    this.requests.cancel(this.data.request.id).subscribe({
      next: () => this.ref.close(true),
      error: () => {
        this.busy.set(false);
        this.failed.set(true);
      },
    });
  }

  protected close(): void {
    this.ref.close(false);
  }

  /** "16–20 Nov · 5 days · “Visiting family in Seville”" */
  private describe(request: RequestSummary): string {
    const days = `${request.days} ${request.days === 1 ? 'day' : 'days'}`;
    const note = request.note ? ` · “${request.note}”` : '';
    return `${rangeLabel(request.firstDay, request.lastDay)} · ${days}${note}`;
  }
}
