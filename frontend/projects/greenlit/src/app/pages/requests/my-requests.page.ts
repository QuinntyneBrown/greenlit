import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith, switchMap } from 'rxjs';

import { MyRequests, REQUEST_SERVICE, SentRequest } from 'api';
import { Button, EmptyState, RequestList, RequestListItem, Skeleton } from 'components';

import { AppDialogs } from '../../dialogs/app-dialogs';
import {
  CancelRequestData,
  CancelRequestDialog,
} from '../../dialogs/cancel-request/cancel-request.dialog';
import { NewRequestData, NewRequestDialog } from '../../dialogs/new-request/new-request.dialog';
import { ToastService } from '../../toasts/toast.service';
import { requestSentToast } from '../calendar/request-toasts';
import { myRequestRow } from './request-rows';

type Load =
  | { readonly state: 'loading' }
  | { readonly state: 'ready'; readonly mine: MyRequests }
  | { readonly state: 'error' };

/**
 * My requests (pages/requests/member, docs/detailed-designs/requests/my-requests, L2-020): a member's
 * own requests, pending ones under Upcoming and decided or cancelled ones under Past, each with its
 * status. "New request" opens the Request time off dialog, as the calendar's button does.
 */
@Component({
  selector: 'app-my-requests-page',
  imports: [RequestList, EmptyState, Button, Skeleton],
  template: `
    <div class="mine">
      <div class="page-title-row">
        <div>
          <h1>My requests</h1>
          <p class="text-muted text-sm intro">
            You can also request days straight from the calendar.
          </p>
        </div>
        <gl-button variant="primary" (click)="newRequest()">
          <svg class="icon" aria-hidden="true" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New request
        </gl-button>
      </div>
      @switch (load().state) {
        @case ('error') {
          <div class="card-plain">
            <gl-empty-state
              tone="error"
              title="We couldn't load your requests"
              text="Something went wrong on our side. Nothing was changed."
            >
              <svg slot="icon" class="icon icon--lg" aria-hidden="true" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5M12 16h.01" />
              </svg>
              <gl-button slot="actions" (click)="reload()">Try again</gl-button>
            </gl-empty-state>
          </div>
        }
        @case ('ready') {
          <section aria-label="Upcoming">
            <h2 class="text-muted text-sm group-title">Upcoming</h2>
            <div class="card-plain">
              @if (upcoming().length) {
                <gl-request-list
                  label="Upcoming requests"
                  [mine]="true"
                  [items]="upcoming()"
                  (cancelled)="cancel($event)"
                />
              } @else {
                <p class="text-muted nothing">Nothing planned yet.</p>
              }
            </div>
          </section>
          <section aria-label="Past">
            <h2 class="text-muted text-sm group-title">Past</h2>
            <div class="card-plain">
              @if (past().length) {
                <gl-request-list label="Past requests" [mine]="true" [items]="past()" />
              } @else {
                <p class="text-muted nothing">No past requests.</p>
              }
            </div>
          </section>
        }
        @default {
          <div class="card-plain" aria-busy="true"><gl-skeleton /></div>
        }
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .mine {
      max-width: 56rem;
      margin-inline: auto;
    }
    .page-title-row {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      justify-content: space-between;
      gap: var(--space-4);
    }
    .intro {
      margin-top: var(--space-1);
    }
    section {
      margin-top: var(--space-8);
    }
    .group-title {
      font-weight: var(--font-weight-semibold);
    }
    .card-plain {
      margin-top: var(--space-3);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-md);
      background: var(--color-bg-surface);
    }
    .mine > .card-plain {
      margin-top: var(--space-8);
    }
    .nothing {
      margin: 0;
      padding: var(--space-8) var(--space-5);
      text-align: center;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyRequestsPage {
  private readonly requests = inject(REQUEST_SERVICE);
  private readonly dialogs = inject(AppDialogs);
  private readonly toasts = inject(ToastService);

  /** What to load: a new object each time, so a reload runs. */
  private readonly want = signal<object>({});

  protected readonly load = toSignal(
    toObservable(this.want).pipe(
      switchMap(() =>
        this.requests.mine().pipe(
          map((mine): Load => ({ state: 'ready', mine })),
          catchError(() => of<Load>({ state: 'error' })),
          startWith<Load>({ state: 'loading' }),
        ),
      ),
    ),
    { initialValue: { state: 'loading' } as Load },
  );

  private readonly mine = computed(() => {
    const load = this.load();
    return load.state === 'ready' ? load.mine : null;
  });

  protected readonly upcoming = computed<RequestListItem[]>(
    () => this.mine()?.upcoming.map(myRequestRow) ?? [],
  );
  protected readonly past = computed<RequestListItem[]>(
    () => this.mine()?.past.map(myRequestRow) ?? [],
  );

  protected reload(): void {
    this.want.set({});
  }

  /** Cancel request: asks first in a dialog; a cancelled request moves to Past (L2-021). */
  protected cancel(id: string): void {
    const mine = this.mine();
    const request = mine?.upcoming.find((r) => r.id === id);
    if (!mine || !request) return;
    const data: CancelRequestData = { request, managerName: mine.managerName };
    this.dialogs
      .open<boolean>(CancelRequestDialog, '.dialog__footer .btn', data)
      .closed.subscribe((cancelled) => {
        if (cancelled) this.reload();
      });
  }

  /** Opens the Request time off dialog (L2-020 AC1); a sent request is announced and listed. */
  protected newRequest(): void {
    const managerName = this.mine()?.managerName ?? '';
    const data: NewRequestData = { managerName, daysToRequest: null };
    this.dialogs
      .open<SentRequest>(NewRequestDialog, '#nr-start', data)
      .closed.subscribe((request) => {
        if (!request) return;
        this.reload();
        this.toasts.show(requestSentToast(request, managerName));
      });
  }
}
