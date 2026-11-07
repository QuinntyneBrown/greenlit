import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';

import { DeclineResult, REQUEST_SERVICE, RequestSummary } from 'api';
import { Alert, Button, Dialog, TextareaField } from 'components';

import { rangeLabel } from '../../pages/calendar/request-toasts';

/** The longest reason the API takes. */
const MAX_REASON = 500;

/** What the Requests page tells the dialog: the request to decline. */
export interface DeclineRequestData {
  readonly request: RequestSummary;
}

/**
 * Decline request (dialogs/decline-request, docs/detailed-designs/requests/decline-request, L2-025): names
 * the request and asks for a reason, which may stay empty ("Ana will see this. Leave it blank to decline
 * without a reason."). "Decline request" shows "Declining…" with the reason read-only and every way out
 * off (Esc and Close too); a failure says Ana still sees the request as pending and keeps what was typed.
 * "Keep pending" closes without a decision. It closes with the result when the request was declined.
 */
@Component({
  selector: 'app-decline-request-dialog',
  imports: [Dialog, Alert, Button, TextareaField],
  template: `
    <gl-dialog
      [title]="'Decline ' + first + '’s request?'"
      [description]="description"
      tone="danger"
      [busy]="busy()"
      (closed)="close()"
    >
      <svg slot="icon" class="icon" aria-hidden="true" viewBox="0 0 24 24">
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
      <div class="fields">
        @if (failed()) {
          <gl-alert tone="danger" title="We couldn’t decline the request">
            Check your connection and try again. {{ first }} still sees it as pending.
          </gl-alert>
        }
        <gl-textarea-field
          label="Reason"
          inputId="dc-reason"
          [optional]="true"
          [placeholder]="'Let ' + first + ' know why (optional)'"
          [help]="first + ' will see this. Leave it blank to decline without a reason.'"
          [maxLength]="maxReason"
          [readonly]="busy()"
          [(value)]="reason"
        />
      </div>
      <div slot="footer" class="actions">
        <gl-button [disabled]="busy()" (click)="close()">Keep pending</gl-button>
        <gl-button variant="danger" [busy]="busy()" [disabled]="busy()" (click)="decline()">
          {{ busy() ? 'Declining…' : 'Decline request' }}
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
    .actions {
      display: contents;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeclineRequestDialog {
  private readonly requests = inject(REQUEST_SERVICE);
  private readonly ref = inject<DialogRef<DeclineResult | null>>(DialogRef);
  private readonly request = inject<DeclineRequestData>(DIALOG_DATA).request;

  protected readonly maxReason = MAX_REASON;
  protected readonly first = this.request.memberName.trim().split(/\s+/)[0];
  protected readonly description = `${this.request.memberName} asked for ${rangeLabel(this.request.firstDay, this.request.lastDay)} (${this.request.days} ${this.request.days === 1 ? 'day' : 'days'}).`;

  protected readonly reason = signal('');
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);

  constructor() {
    // Esc and the backdrop do nothing while the decision is being recorded.
    effect(() => {
      this.ref.disableClose = this.busy();
    });
  }

  protected decline(): void {
    if (this.busy()) return;
    this.failed.set(false);
    this.busy.set(true);
    this.requests.decline(this.request.id, this.reason().trim() || null).subscribe({
      next: (result) => this.ref.close(result),
      error: () => {
        this.busy.set(false);
        this.failed.set(true);
      },
    });
  }

  protected close(): void {
    this.ref.close(null);
  }
}
