import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { catchError, map, of, startWith, switchMap, tap } from 'rxjs';

import { ApprovalResult, REQUEST_SERVICE, RequestSummary } from 'api';
import { Button, EmptyState, RequestList, RequestListItem, Skeleton } from 'components';

import { AppDialogs } from '../../dialogs/app-dialogs';
import {
  RequestDetailData,
  RequestDetailDialog,
} from '../../dialogs/request-detail/request-detail.dialog';
import { ToastService } from '../../toasts/toast.service';
import {
  approveFailedToast,
  approvedToast,
  rangeLabel,
  undoFailedToast,
} from '../calendar/request-toasts';

type Load =
  | { readonly state: 'loading' }
  | { readonly state: 'ready'; readonly requests: readonly RequestSummary[] }
  | { readonly state: 'error' };

/**
 * Requests (pages/requests/default, docs/detailed-designs/requests/approve-request): the manager's
 * pending requests, each with "Approve" and a name that opens its detail. Approving shows "Approving…" on
 * that row, then a toast with "Undo" (and the coverage warning when the team will be short); a failure
 * leaves the request pending and offers "Try again". A member has nothing to decide and is sent to the
 * calendar. The tabs, selection, overlaps and bulk approve are journey 9, Decline journey 10.
 */
@Component({
  selector: 'app-requests-page',
  imports: [RequestList, EmptyState, Button, Skeleton],
  template: `
    <div class="requests">
      <h1>Requests</h1>
      <div class="card-plain">
        @switch (load().state) {
          @case ('error') {
            <gl-empty-state
              tone="error"
              title="We couldn't load requests"
              text="Something went wrong on our side. Nothing was changed."
            >
              <svg slot="icon" class="icon icon--lg" aria-hidden="true" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5M12 16h.01" />
              </svg>
              <gl-button slot="actions" (click)="reload()">Try again</gl-button>
            </gl-empty-state>
          }
          @case ('ready') {
            @if (items().length) {
              <gl-request-list
                label="Pending requests"
                [items]="items()"
                [busy]="busy()"
                (opened)="open($event)"
                (approved)="approve($event)"
              />
            } @else {
              <gl-empty-state
                title="Nothing waiting. Everyone's greenlit."
                text="New requests from your team will show up here."
              >
                <svg slot="icon" class="icon icon--lg" aria-hidden="true" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" />
                  <path d="m8 12 3 3 5-6" />
                </svg>
              </gl-empty-state>
            }
          }
          @default {
            <gl-skeleton />
          }
        }
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .requests {
      max-width: 64rem;
      margin-inline: auto;
    }
    .card-plain {
      margin-top: var(--space-5);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-md);
      background: var(--color-bg-surface);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequestsPage {
  private readonly requests = inject(REQUEST_SERVICE);
  private readonly dialogs = inject(AppDialogs);
  private readonly toasts = inject(ToastService);
  private readonly router = inject(Router);
  private readonly attempt = signal(0);

  /** Ids whose Approve is running. */
  protected readonly busy = signal<readonly string[]>([]);

  protected readonly load = toSignal(
    toObservable(this.attempt).pipe(
      switchMap((attempt) => {
        const list = this.requests.list('Pending').pipe(
          map((requests): Load => ({ state: 'ready', requests })),
          catchError((error: unknown) => {
            // A member has nothing to decide here (journey 13 gives them My requests).
            if (error instanceof HttpErrorResponse && error.status === 403) {
              void this.router.navigateByUrl('/', { replaceUrl: true });
            }
            return of<Load>({ state: 'error' });
          }),
        );
        // The first load shows the skeleton; a reload after a decision keeps the list on screen.
        return attempt === 0 ? list.pipe(startWith<Load>({ state: 'loading' })) : list;
      }),
    ),
    { initialValue: { state: 'loading' } as Load },
  );

  private readonly pending = computed(() => {
    const load = this.load();
    return load.state === 'ready' ? load.requests : [];
  });

  protected readonly items = computed<RequestListItem[]>(() =>
    this.pending().map((r) => ({
      id: r.id,
      name: r.memberName,
      summary: `${rangeLabel(r.firstDay, r.lastDay)} · ${r.days} ${r.days === 1 ? 'day' : 'days'}`,
      note: r.note,
    })),
  );

  protected reload(): void {
    this.attempt.update((n) => n + 1);
  }

  protected approve(id: string): void {
    const request = this.pending().find((r) => r.id === id);
    if (!request || this.busy().includes(id)) return;
    this.busy.update((ids) => [...ids, id]);
    this.requests
      .approve([id])
      .pipe(tap({ finalize: () => this.busy.update((ids) => ids.filter((x) => x !== id)) }))
      .subscribe({
        next: ([result]) => this.approved(result),
        error: () =>
          this.toasts.show(approveFailedToast(request.memberName, () => this.approve(id))),
      });
  }

  protected open(id: string): void {
    const request = this.pending().find((r) => r.id === id);
    if (!request) return;
    const data: RequestDetailData = { request };
    this.dialogs
      .openDrawer<ApprovalResult | null>(RequestDetailDialog, '.drawer__footer .btn', data)
      .closed.subscribe((result) => {
        if (result) this.approved(result);
      });
  }

  /** The request is approved: confirm with a toast that can take it back, and refresh the list. */
  private approved(result: ApprovalResult): void {
    this.toasts.show(approvedToast(result, () => this.undo(result)));
    this.reload();
  }

  private undo(result: ApprovalResult): void {
    this.requests.reopen(result.requestId).subscribe({
      next: () => this.reload(),
      error: () => this.toasts.show(undoFailedToast(result.memberName, () => this.undo(result))),
    });
  }
}
