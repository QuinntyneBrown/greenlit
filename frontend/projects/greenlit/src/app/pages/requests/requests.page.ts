import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { catchError, map, of, startWith, switchMap, tap } from 'rxjs';

import { ApprovalResult, DeclineResult, REQUEST_SERVICE, RequestSummary } from 'api';
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
  DeclineRequestData,
  DeclineRequestDialog,
} from '../../dialogs/decline-request/decline-request.dialog';
import {
  RequestDetailData,
  RequestDetailDialog,
  RequestDetailResult,
} from '../../dialogs/request-detail/request-detail.dialog';
import { RequestCountsState } from '../../requests/request-counts';
import { ToastService } from '../../toasts/toast.service';
import {
  approveFailedToast,
  approvedToast,
  bulkApproveFailedToast,
  bulkApprovedToast,
  bulkUndoFailedToast,
  declinedToast,
  declineUndoFailedToast,
  undoFailedToast,
} from '../calendar/request-toasts';
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
 * team will be short); a failure leaves the request pending and offers "Try again". Decline opens a dialog for
 * the optional reason, then a toast with "Undo" says the request was declined (docs/detailed-designs/requests/decline-request).
 * A member has nothing to decide and is sent to the calendar.
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
        @if (tab() === 'pending' && (items().length || load().state === 'error')) {
          <div class="bulk">
            <label class="choice">
              <input
                type="checkbox"
                aria-label="Select all pending requests"
                [checked]="allSelected()"
                [indeterminate]="someSelected()"
                [disabled]="!items().length"
                (change)="selectAll($event)"
              />
              <span>Select all</span>
            </label>
            <gl-button
              variant="approve"
              size="sm"
              [busy]="approvingMany()"
              [disabled]="!selected().length || approvingMany()"
              (click)="approveSelected()"
            >
              <svg class="icon" aria-hidden="true" viewBox="0 0 24 24">
                <path d="M4 12l6 6L20 6" />
              </svg>
              {{ approveLabel() }}
            </gl-button>
          </div>
        }
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
                [selectable]="tab() === 'pending'"
                [selected]="selected()"
                (opened)="open($event)"
                (declined)="decline($event)"
                (approved)="approve($event)"
                (toggled)="toggle($event.id, $event.selected)"
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
    .bulk {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-3);
    }
    .choice {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font: var(--text-body);
      cursor: pointer;
    }
    .choice input {
      width: 1rem;
      height: 1rem;
      margin: 0;
      accent-color: var(--color-brand-strong);
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
  /** Ids of the ticked pending requests. */
  protected readonly selected = signal<readonly string[]>([]);
  protected readonly approvingMany = signal(false);

  protected readonly load = toSignal(
    toObservable(this.want).pipe(
      switchMap(({ tab, keepList }) => {
        const list = this.requests.list(STATUS[tab]).pipe(
          map((requests): Load => ({ state: 'ready', requests })),
          catchError((error: unknown) => {
            // The ledger is the manager's: the API refusing it opens the forbidden page (L2-046 AC2).
            if (error instanceof HttpErrorResponse && error.status === 403) {
              void this.router.navigateByUrl('/forbidden', { replaceUrl: true });
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
    // A tick means nothing once its request has left the list (approved, or decided elsewhere).
    effect(() => {
      const present = new Set(this.listed().map((r) => r.id));
      const kept = untracked(this.selected).filter((id) => present.has(id));
      if (kept.length !== untracked(this.selected).length) this.selected.set(kept);
    });
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

  protected readonly allSelected = computed(
    () => this.items().length > 0 && this.selected().length === this.items().length,
  );
  protected readonly someSelected = computed(
    () => this.selected().length > 0 && this.selected().length < this.items().length,
  );
  protected readonly approveLabel = computed(() =>
    this.approvingMany()
      ? 'Approving…'
      : this.selected().length
        ? `Approve ${this.selected().length}`
        : 'Approve',
  );

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
    this.selected.set([]);
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

  protected toggle(id: string, on: boolean): void {
    this.selected.update((ids) =>
      on ? (ids.includes(id) ? ids : [...ids, id]) : ids.filter((x) => x !== id),
    );
  }

  protected selectAll(event: Event): void {
    this.selected.set(
      (event.target as HTMLInputElement).checked ? this.items().map((item) => item.id) : [],
    );
  }

  /** "Approve {n}": the ticked requests are approved together, all or none (L2-026 AC3). */
  protected approveSelected(): void {
    const ids = this.selected();
    if (!ids.length || this.approvingMany()) return;
    if (ids.length === 1) {
      this.approve(ids[0]);
      return;
    }
    this.approveMany(ids);
  }

  private approveMany(ids: readonly string[]): void {
    this.approvingMany.set(true);
    this.busy.update((busy) => [...busy, ...ids]);
    this.requests
      .approve(ids)
      .pipe(
        tap({
          finalize: () => {
            this.approvingMany.set(false);
            this.busy.update((busy) => busy.filter((x) => !ids.includes(x)));
          },
        }),
      )
      .subscribe({
        next: (results) => {
          this.selected.set([]);
          this.toasts.show(bulkApprovedToast(results, () => this.undoMany(results)));
          this.refresh();
        },
        error: () =>
          this.toasts.show(bulkApproveFailedToast(ids.length, () => this.approveMany(ids))),
      });
  }

  /** Takes the approvals back one by one; if one fails the rest stay for Try again. */
  private undoMany(results: readonly ApprovalResult[]): void {
    const [next, ...rest] = results;
    if (!next) {
      this.refresh();
      return;
    }
    this.requests.reopen(next.requestId).subscribe({
      next: () => this.undoMany(rest),
      error: () => {
        this.refresh();
        this.toasts.show(bulkUndoFailedToast(() => this.undoMany(results)));
      },
    });
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

  /** Decline: asks for the reason in a dialog, then confirms with a toast that can take it back. */
  protected decline(id: string): void {
    const request = this.listed().find((r) => r.id === id);
    if (!request || this.busy().includes(id)) return;
    this.askToDecline(request);
  }

  private askToDecline(request: RequestSummary): void {
    const data: DeclineRequestData = { request };
    this.dialogs
      .open<DeclineResult | null>(DeclineRequestDialog, '#dc-reason', data)
      .closed.subscribe((result) => {
        if (result) this.declined(result);
      });
  }

  /** The request is declined: confirm with a toast that can take it back, and refresh the list. */
  private declined(result: DeclineResult): void {
    this.toasts.show(declinedToast(result, () => this.undoDecline(result)));
    this.refresh();
  }

  private undoDecline(result: DeclineResult): void {
    this.requests.reopen(result.requestId).subscribe({
      next: () => this.refresh(),
      error: () =>
        this.toasts.show(declineUndoFailedToast(result.memberName, () => this.undoDecline(result))),
    });
  }

  protected open(id: string): void {
    const request = this.listed().find((r) => r.id === id);
    if (!request) return;
    const data: RequestDetailData = { request };
    this.dialogs
      .openDrawer<RequestDetailResult>(
        RequestDetailDialog,
        request.status === 'Pending' ? '.drawer__footer .btn' : '.drawer__close',
        data,
      )
      .closed.subscribe((result) => {
        if (!result) return;
        if ('approved' in result) this.approved(result.approved);
        else this.askToDecline(request);
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
