import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';

import { ApprovalResult, REQUEST_SERVICE, RequestSummary } from 'api';
import { Alert, Button, Drawer, RequestStatus } from 'components';

import { rangeLabel, sentLabel } from '../../pages/calendar/request-toasts';

/** What the Requests page tells the drawer: the request to show. */
export interface RequestDetailData {
  readonly request: RequestSummary;
}

/**
 * Request detail (dialogs/request-detail, docs/detailed-designs/requests/approve-request): who asked,
 * for which days, its status, when it was sent and the note, with "Approve" in the footer. Approve shows
 * "Approving…" and keeps the drawer open until the decision is recorded (Esc and Close are off meanwhile);
 * a failure says the request is still pending and offers "Try approving again". It closes with the
 * approval so the page can confirm it. "Team those weeks" and "Days left after" arrive with journeys 9
 * and 11, and Decline with journey 10.
 */
@Component({
  selector: 'app-request-detail-dialog',
  imports: [Drawer, Alert, Button, RequestStatus],
  template: `
    <gl-drawer
      [title]="request.memberName"
      [description]="summary"
      [busy]="busy()"
      (closed)="close()"
    >
      @if (failed()) {
        <gl-alert tone="danger" title="We couldn’t record your decision">
          Check your connection and try again. The request is still pending.
        </gl-alert>
      }
      <dl class="facts">
        <div>
          <dt>Status</dt>
          <dd><gl-request-status state="pending" /></dd>
        </div>
        <div>
          <dt>Sent</dt>
          <dd>{{ sent }}</dd>
        </div>
      </dl>
      @if (request.note) {
        <p class="quote">“{{ request.note }}”</p>
      }
      <div slot="footer" class="actions">
        <gl-button variant="approve" [busy]="busy()" [disabled]="busy()" (click)="approve()">
          {{ busy() ? 'Approving…' : failed() ? 'Try approving again' : 'Approve' }}
        </gl-button>
      </div>
    </gl-drawer>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }
    .facts {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3) var(--space-10);
      margin: 0;
    }
    .facts dt {
      font: var(--text-caption);
      color: var(--color-fg-muted);
    }
    .facts dd {
      margin: var(--space-0-5) 0 0;
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-semibold);
      font-variant-numeric: tabular-nums;
    }
    .quote {
      margin: 0;
      padding: var(--space-4);
      background: var(--color-bg-surface);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-lg);
    }
    .actions {
      display: contents;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequestDetailDialog {
  private readonly requests = inject(REQUEST_SERVICE);
  private readonly ref = inject<DialogRef<ApprovalResult | null>>(DialogRef);

  protected readonly request = inject<RequestDetailData>(DIALOG_DATA).request;
  protected readonly summary = `${rangeLabel(this.request.firstDay, this.request.lastDay)} · ${this.request.days} ${this.request.days === 1 ? 'day' : 'days'}`;
  protected readonly sent = sentLabel(this.request.sentUtc);

  protected readonly busy = signal(false);
  protected readonly failed = signal(false);

  constructor() {
    // Esc and the backdrop do nothing while the decision is being recorded.
    effect(() => {
      this.ref.disableClose = this.busy();
    });
  }

  protected approve(): void {
    this.failed.set(false);
    this.busy.set(true);
    this.requests.approve([this.request.id]).subscribe({
      next: ([result]) => this.ref.close(result),
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
