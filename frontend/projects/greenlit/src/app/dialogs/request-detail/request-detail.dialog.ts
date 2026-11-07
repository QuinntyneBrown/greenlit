import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith, switchMap } from 'rxjs';

import { ApprovalResult, REQUEST_SERVICE, RequestDetail, RequestSummary } from 'api';
import { Alert, Button, Drawer, RequestStatus, Skeleton, TeamGrid } from 'components';

import { rangeLabel, sentLabel } from '../../pages/calendar/request-toasts';
import { stateOf } from '../../pages/requests/request-rows';
import { requestWeeks } from './request-weeks';

/** What the Requests page tells the drawer: the request to show. */
export interface RequestDetailData {
  readonly request: RequestSummary;
}

type Weeks =
  | { readonly state: 'loading' }
  | { readonly state: 'ready'; readonly detail: RequestDetail }
  | { readonly state: 'error' };

/**
 * Request detail (dialogs/request-detail, docs/detailed-designs/requests/review-requests and approve-request):
 * who asked, for which days, its status, when it was sent and the note, and "Team those weeks": every
 * member from the Monday of the request's first week to the Sunday of its last, with the Out row, so the
 * overlaps are in view. A pending request has "Approve" in the footer; a decided one has no footer, and a
 * declined one says why. The body scrolls while the footer stays in view. Approve shows "Approving…" and
 * keeps the drawer open until the decision is recorded (Esc and Close are off meanwhile); a failure says
 * the request is still pending and offers "Try approving again". It closes with the approval so the page can
 * confirm it. If the weeks cannot be loaded the rest still shows, with a way to try again. "Days left
 * after" waits for allowances (journey 11) and Decline is journey 10.
 */
@Component({
  selector: 'app-request-detail-dialog',
  imports: [Drawer, Alert, Button, RequestStatus, Skeleton, TeamGrid],
  template: `
    <gl-drawer
      [title]="request.memberName"
      [description]="summary"
      [busy]="busy()"
      [footer]="pending"
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
          <dd><gl-request-status [state]="state" /></dd>
        </div>
        <div>
          <dt>Sent</dt>
          <dd>{{ sent }}</dd>
        </div>
      </dl>
      @if (shown().note; as note) {
        <p class="quote">“{{ note }}”</p>
      }
      @if (shown().declineReason; as reason) {
        <p class="decline-reason">Decline reason: {{ reason }}</p>
      }
      <section>
        <h3 class="section-title">Team those weeks</h3>
        @switch (weeks().state) {
          @case ('ready') {
            <gl-team-grid
              label="Team those weeks"
              [columns]="view().columns"
              [rows]="view().rows"
              [cover]="view().cover"
              [showLeft]="false"
            />
          }
          @case ('error') {
            <gl-alert tone="warning" title="We couldn’t load the team for those weeks">
              Check your connection and try again. You can still decide on this request.
              <gl-button slot="actions" size="sm" (click)="reloadWeeks()">Try again</gl-button>
            </gl-alert>
          }
          @default {
            <div aria-busy="true"><gl-skeleton shape="rect" height="12rem" /></div>
          }
        }
      </section>
      <div slot="footer" class="actions">
        @if (pending) {
          <gl-button variant="approve" [busy]="busy()" [disabled]="busy()" (click)="approve()">
            {{ busy() ? 'Approving…' : failed() ? 'Try approving again' : 'Approve' }}
          </gl-button>
        }
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
      overflow-wrap: anywhere;
    }
    .decline-reason {
      margin: 0;
      color: var(--color-fg-muted);
    }
    .section-title {
      margin: 0 0 var(--space-3);
      font: var(--text-h3);
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
  protected readonly state = stateOf(this.request);
  protected readonly pending = this.state === 'pending';
  protected readonly summary = `${rangeLabel(this.request.firstDay, this.request.lastDay)} · ${this.request.days} ${this.request.days === 1 ? 'day' : 'days'}`;
  protected readonly sent = sentLabel(this.request.sentUtc);

  protected readonly busy = signal(false);
  protected readonly failed = signal(false);

  private readonly weeksAttempt = signal(0);
  protected readonly weeks = toSignal(
    toObservable(this.weeksAttempt).pipe(
      switchMap(() =>
        this.requests.get(this.request.id).pipe(
          map((detail): Weeks => ({ state: 'ready', detail })),
          catchError(() => of<Weeks>({ state: 'error' })),
          startWith<Weeks>({ state: 'loading' }),
        ),
      ),
    ),
    { initialValue: { state: 'loading' } as Weeks },
  );
  /** The request as the API last said it: the detail's own copy once it has loaded, else the list's. */
  protected readonly shown = computed(() => {
    const weeks = this.weeks();
    return weeks.state === 'ready' ? weeks.detail.request : this.request;
  });
  protected readonly view = computed(() => {
    const weeks = this.weeks();
    return requestWeeks(
      weeks.state === 'ready' ? weeks.detail : { request: this.request, members: [], coverage: [] },
    );
  });

  constructor() {
    // Esc and the backdrop do nothing while the decision is being recorded.
    effect(() => {
      this.ref.disableClose = this.busy();
    });
  }

  protected reloadWeeks(): void {
    this.weeksAttempt.update((n) => n + 1);
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
