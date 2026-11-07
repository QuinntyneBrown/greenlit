import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { catchError, map, of, startWith, switchMap, tap } from 'rxjs';

import { ApprovalResult, REQUEST_SERVICE, RequestSummary } from 'api';
import {
  Button,
  EmptyState,
  RequestList,
  RequestListItem,
  Skeleton,
  TabItem,
  Tabs,
} from 'components';

import { AppDialogs } from '../../dialogs/app-dialogs';
import {
  RequestDetailData,
  RequestDetailDialog,
} from '../../dialogs/request-detail/request-detail.dialog';
import { RequestCountsState } from '../../requests/request-counts';
import { ToastService } from '../../toasts/toast.service';
import { approveFailedToast, approvedToast, undoFailedToast } from '../calendar/request-toasts';
import { requestRow } from './request-rows';

type TabId = 'pending' | 'approved' | 'declined';

type Load =
  | { readonly state: 'loading' }
  | { readonly state: 'ready'; readonly requests: readonly RequestSummary[] }
  | { readonly state: 'error' };

const STATUS: Record<TabId, RequestSummary['status']> = {
  pending: 'Pending',
  approved: 'Approved',
  declined: 'Declined',
};

/**
 * Requests (pages/requests/*, docs/detailed-designs/requests/review-requests): the manager's ledger by
 * status. The tabs Pending, Approved and Declined carry their counts; a row says who asked, for which
 * days, the note and who else is out, and a pending one has "Approve" and a name that opens its detail.
 * Approving shows "Approving…" on that row, then a toast with "Undo" (and the coverage warning when the
 * team will be short); a failure leaves the request pending and offers "Try again". A member has nothing
 * to decide and is sent to the calendar. Decline is journey 10.
 */
@Component({
  selector: 'app-requests-page',
  imports: [RequestList, EmptyState, Button, Skeleton, Tabs],
  template: `
    <div class="requests">
      <h1>Requests</h1>
      <div class="toolbar-row">
        <gl-tabs
          label="Request status"
          [tabs]="tabItems()"
          [selected]="tab()"
          [bordered]="false"
          (selectedChange)="selectTab($event)"
        />
      </div>
      <div
        class="card-plain"
        id="panel"
        role="tabpanel"
        [attr.aria-labelledby]="'tab-' + tab()"
        [attr.aria-busy]="load().state === 'loading' ? 'true' : null"
      >
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
                [label]="label()"
                [items]="items()"
                [busy]="busy()"
                (opened)="open($event)"
                (approved)="approve($event)"
              />
            } @else {
              <gl-empty-state [title]="emptyTitle()" [text]="emptyText()">
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
    .toolbar-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      margin-top: var(--space-5);
      border-bottom: 1px solid var(--color-border-default);
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
  private readonly counts = inject(RequestCountsState);

  protected readonly tab = signal<TabId>('pending');
  /** What to load: a new object each time, so a reload and a tab change both run. */
  private readonly want = signal<{ tab: TabId; keepList: boolean }>({
    tab: 'pending',
    keepList: false,
  });

  /** Ids whose Approve is running. */
  protected readonly busy = signal<readonly string[]>([]);

  protected readonly load = toSignal(
    toObservable(this.want).pipe(
      switchMap(({ tab, keepList }) => {
        const list = this.requests.list(STATUS[tab]).pipe(
          map((requests): Load => ({ state: 'ready', requests })),
          catchError((error: unknown) => {
            // A member has nothing to decide here (journey 13 gives them My requests).
            if (error instanceof HttpErrorResponse && error.status === 403) {
              void this.router.navigateByUrl('/', { replaceUrl: true });
            }
            return of<Load>({ state: 'error' });
          }),
        );
        // A tab shows the skeleton while it loads; a reload after a decision keeps the list on screen.
        return keepList ? list : list.pipe(startWith<Load>({ state: 'loading' }));
      }),
    ),
    { initialValue: { state: 'loading' } as Load },
  );

  constructor() {
    this.counts.refresh();
  }

  protected readonly tabItems = computed<TabItem[]>(() => {
    const counts = this.counts.counts();
    return [
      { id: 'pending', label: 'Pending', count: counts?.pending },
      { id: 'approved', label: 'Approved', count: counts?.approved },
      { id: 'declined', label: 'Declined', count: counts?.declined },
    ];
  });

  private readonly listed = computed(() => {
    const load = this.load();
    return load.state === 'ready' ? load.requests : [];
  });

  protected readonly items = computed<RequestListItem[]>(() => this.listed().map(requestRow));

  protected readonly label = computed(() => `${STATUS[this.tab()]} requests`);
  protected readonly emptyTitle = computed(() =>
    this.tab() === 'pending' ? "Nothing waiting. Everyone's greenlit." : 'Nothing here yet',
  );
  protected readonly emptyText = computed(() =>
    this.tab() === 'pending'
      ? 'New requests from your team will show up here.'
      : 'Requests you have decided will be listed here.',
  );

  protected selectTab(tab: string): void {
    if (tab === this.tab()) return;
    this.tab.set(tab as TabId);
    this.want.set({ tab: tab as TabId, keepList: false });
  }

  protected reload(): void {
    this.want.set({ tab: this.tab(), keepList: false });
    this.counts.refresh();
  }

  /** Reads the list and the counts again after a decision, leaving the rows on screen. */
  private refresh(): void {
    this.want.set({ tab: this.tab(), keepList: true });
    this.counts.refresh();
  }

  protected approve(id: string): void {
    const request = this.listed().find((r) => r.id === id);
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
    const request = this.listed().find((r) => r.id === id);
    if (!request) return;
    const data: RequestDetailData = { request };
    this.dialogs
      .openDrawer<ApprovalResult | null>(
        RequestDetailDialog,
        request.status === 'Pending' ? '.drawer__footer .btn' : '.drawer__close',
        data,
      )
      .closed.subscribe((result) => {
        if (result) this.approved(result);
      });
  }

  /** The request is approved: confirm with a toast that can take it back, and refresh the list. */
  private approved(result: ApprovalResult): void {
    this.toasts.show(approvedToast(result, () => this.undo(result)));
    this.refresh();
  }

  private undo(result: ApprovalResult): void {
    this.requests.reopen(result.requestId).subscribe({
      next: () => this.refresh(),
      error: () => this.toasts.show(undoFailedToast(result.memberName, () => this.undo(result))),
    });
  }
}
