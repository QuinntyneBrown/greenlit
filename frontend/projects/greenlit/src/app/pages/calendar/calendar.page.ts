import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, combineLatest, map, of, startWith, switchMap, tap } from 'rxjs';

import {
  CellKind,
  ChangeSet,
  DayStatus,
  DayStroke,
  SHEET_SERVICE,
  SentRequest,
  SheetMonth,
  problemCode,
} from 'api';
import {
  Button,
  EmptyState,
  Legend,
  PeriodNav,
  SegmentedControl,
  SegmentedOption,
  TeamGrid,
  TeamGridCellStatus,
  TeamGridStroke,
} from 'components';

import { AppDialogs } from '../../dialogs/app-dialogs';
import { NewRequestData, NewRequestDialog } from '../../dialogs/new-request/new-request.dialog';
import { ToastService } from '../../toasts/toast.service';
import { addMonths, calendarView, columnsFor, monthTitle } from './calendar-view';
import { FAILED_SAVE, PaintContext, refusedToast, savedToast } from './paint-toasts';
import { requestSentToast } from './request-toasts';

type Load =
  | { readonly state: 'loading' }
  | { readonly state: 'ready'; readonly sheet: SheetMonth }
  | { readonly state: 'error' };

const MONTH_PARAM = /^\d{4}-(0[1-9]|1[0-2])$/;

/** The paint picker's choices; `select` is the Select mode of journey 12 (sheet/select-days). */
type PaintChoice = 'select' | 'confirmed' | 'requested' | 'tentative' | 'clear';

const PAINT_STATUS: Record<Exclude<PaintChoice, 'select'>, DayStatus | null> = {
  confirmed: 'Confirmed',
  requested: 'Requested',
  tentative: 'Tentative',
  clear: null,
};

const KIND_OF: Record<DayStatus, CellKind> = {
  Tentative: 'Tentative',
  Requested: 'Requested',
  Confirmed: 'Confirmed',
};

/** This browser's current month, used only until the team's own "today" arrives. */
function localMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * The team calendar, Greenlit's home screen (docs/detailed-designs/sheet/view-month):
 * one month for the whole team (L2-012), every day cell (L2-013), days left
 * and the Out row (L2-014). The month lives in the address (`?month=yyyy-MM`)
 * so it survives a reload; without it the API returns the current month in the
 * team's time zone.
 *
 * It is also where days are marked (docs/detailed-designs/sheet/mark-days):
 * choose a paint colour, press or drag across cells (L2-015). A stroke shows at
 * once, is saved on release, and is put back if the save fails (L2-018). The
 * API decides what a stroke may change (L2-017).
 */
@Component({
  selector: 'app-calendar-page',
  imports: [PeriodNav, Legend, TeamGrid, EmptyState, Button, SegmentedControl],
  template: `
    <div class="page-title-row">
      <gl-period-nav
        [title]="title()"
        [showToday]="showToday()"
        (previous)="go(-1)"
        (next)="go(1)"
        (today)="goToday()"
      />
      @if (showPicker()) {
        <div class="toolbar-end">
          <gl-segmented-control
            label="Paint"
            [options]="paintOptions()"
            [value]="paintChoice()"
            (valueChange)="choosePaint($event)"
          />
          @if (canRequest()) {
            <gl-button variant="primary" (click)="requestTimeOff()">
              <svg class="icon" aria-hidden="true" viewBox="0 0 24 24">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Request time off
            </gl-button>
          }
        </div>
      }
    </div>
    <div class="toolbar-row">
      <gl-legend />
      @if (showPicker()) {
        <p class="text-caption">{{ hint() }}</p>
      }
    </div>

    @switch (load().state) {
      @case ('error') {
        <div class="card-plain region">
          <gl-empty-state
            tone="error"
            title="We couldn't load the calendar"
            text="Something went wrong on our side. Your days are safe, and nothing was changed."
          >
            <svg slot="icon" class="icon icon--lg" aria-hidden="true" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v5M12 16h.01" />
            </svg>
            <gl-button slot="actions" (click)="retry()">Try again</gl-button>
          </gl-empty-state>
        </div>
      }
      @default {
        @if (isEmpty()) {
          <div class="card-plain region">
            <gl-empty-state
              title="No one on the team yet"
              text="Invite your team from Settings to start planning time off."
            >
              <svg slot="icon" class="icon icon--lg" aria-hidden="true" viewBox="0 0 24 24">
                <circle cx="9" cy="8" r="3" />
                <path d="M3 20a6 6 0 0 1 12 0M17 11v6M14 14h6" />
              </svg>
              <gl-button slot="actions" variant="primary" link="/settings">Open settings</gl-button>
            </gl-empty-state>
          </div>
        } @else {
          <gl-team-grid
            class="region"
            [label]="view().label"
            [columns]="view().columns"
            [rows]="view().rows"
            [cover]="view().cover"
            [loading]="load().state === 'loading'"
            [paint]="gridPaint()"
            (stroke)="paintStroke($event)"
            (monthStep)="go($event)"
          />
        }
      }
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .page-title-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
    }
    .toolbar-end {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-3);
    }
    .toolbar-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      margin-top: var(--space-5);
    }
    .text-caption {
      margin: 0;
      font: var(--text-caption);
      color: var(--color-fg-muted);
    }
    .region {
      display: block;
      margin-top: var(--space-4);
    }
    .card-plain {
      background: var(--color-bg-surface);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-lg);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarPage {
  private readonly sheetApi = inject(SHEET_SERVICE);
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(AppDialogs);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly attempt = signal(0);

  /** The month in the address, when it is a valid `yyyy-MM`. */
  private readonly requested = toSignal(
    this.route.queryParamMap.pipe(
      map((params) => params.get('month')),
      map((month) => (month && MONTH_PARAM.test(month) ? month : null)),
    ),
    { initialValue: null },
  );

  /** The month as the person sees it: what the API sent, with painted cells applied at once. */
  private readonly current = signal<SheetMonth | null>(null);

  protected readonly load = toSignal(
    combineLatest([this.route.queryParamMap, toObservable(this.attempt)]).pipe(
      map(([params]) => params.get('month')),
      switchMap((month) =>
        this.sheetApi.month(month && MONTH_PARAM.test(month) ? month : undefined).pipe(
          tap((sheet) => this.current.set(sheet)),
          map((sheet): Load => ({ state: 'ready', sheet })),
          catchError(() => of<Load>({ state: 'error' })),
          startWith<Load>({ state: 'loading' }),
        ),
      ),
    ),
    { initialValue: { state: 'loading' } as Load },
  );

  private readonly loaded = computed(() => (this.load().state === 'ready' ? this.current() : null));

  /** The month on screen: the loaded one, else the requested one, else this browser's. */
  protected readonly month = computed(
    () => this.loaded()?.month ?? this.requested() ?? localMonth(),
  );
  protected readonly title = computed(() => monthTitle(this.month()));

  protected readonly showToday = computed(() => {
    const sheet = this.loaded();
    return sheet !== null && sheet.month !== sheet.today.slice(0, 7);
  });

  /** L2-012 AC6: nobody on the team but the manager. */
  protected readonly isEmpty = computed(() => {
    const sheet = this.loaded();
    return sheet !== null && sheet.members.length <= 1;
  });

  protected readonly view = computed(() => {
    const sheet = this.loaded();
    if (sheet) return calendarView(sheet);
    const month = this.month();
    return {
      label: `Time off, ${monthTitle(month)}`,
      columns: columnsFor(month, null),
      rows: [],
      cover: [],
    };
  });

  // ---- painting days (docs/detailed-designs/sheet/mark-days) ----

  protected readonly showPicker = computed(() => this.loaded() !== null && !this.isEmpty());
  private readonly isManager = computed(() => this.loaded()?.isManager ?? false);
  private readonly choice = signal<PaintChoice>('select');
  protected readonly paintChoice = this.choice.asReadonly();

  /** L2-015 AC1-2: the manager also offers Confirmed. */
  protected readonly paintOptions = computed((): SegmentedOption[] => [
    { value: 'select', label: 'Select', pointer: true },
    ...(this.isManager()
      ? [{ value: 'confirmed', label: 'Confirmed', swatch: 'confirmed' } as const]
      : []),
    { value: 'requested', label: 'Requested', swatch: 'requested' },
    { value: 'tentative', label: 'Tentative', swatch: 'tentative' },
    { value: 'clear', label: 'Clear', swatch: 'empty' },
  ]);

  protected readonly hint = computed(() =>
    this.isManager()
      ? 'Click or drag across days to set time off.'
      : 'Click or drag across your own row to request time off.',
  );

  /** What the sheet previews while a stroke runs; null in Select mode, where nothing is painted yet. */
  protected readonly gridPaint = computed((): TeamGridCellStatus | null => {
    const choice = this.choice();
    return choice === 'select' ? null : choice === 'clear' ? 'empty' : choice;
  });

  /** L2-019: a member asks the manager; the manager has nobody to ask. */
  protected readonly canRequest = computed(() => {
    const sheet = this.loaded();
    return sheet !== null && !sheet.isManager && sheet.members.some((m) => m.isYou);
  });

  /** Opens the request dialog (L2-019 AC1); a sent request turns its days yellow and is announced. */
  protected requestTimeOff(): void {
    const managerName = this.current()?.managerName ?? '';
    const own = this.current()?.members.find((m) => m.isYou)?.allowance;
    const data: NewRequestData = {
      managerName,
      daysToRequest: own ? Math.max(0, own.left - own.requested) : null,
    };
    this.dialogs
      .open<SentRequest>(NewRequestDialog, '#nr-start', data)
      .closed.subscribe((request) => {
        if (!request) return;
        this.refresh();
        this.toasts.show(requestSentToast(request, managerName));
      });
  }

  protected choosePaint(value: string): void {
    this.choice.set(value as PaintChoice);
  }

  /** A press, drag or key finished on a row the person may paint (L2-015 AC3). */
  protected paintStroke(stroke: TeamGridStroke): void {
    const choice = this.choice();
    if (choice === 'select') return;
    this.save({ memberId: stroke.memberId, dates: stroke.dates, status: PAINT_STATUS[choice] });
  }

  /** Shows the stroke at once, saves it, and puts the cells back if the save fails (L2-018 AC2). */
  private save(stroke: DayStroke): void {
    const before = this.applyKinds(stroke.memberId, stroke.dates, stroke.status);
    this.sheetApi.setDays(stroke).subscribe({
      next: (set) => this.saved(set),
      error: (error: unknown) => {
        this.restoreKinds(stroke.memberId, before);
        this.refused(error, () => this.save(stroke));
      },
    });
  }

  private saved(set: ChangeSet): void {
    this.refresh();
    if (set.changes.length === 0) return;
    const sheet = this.current();
    const context: PaintContext = {
      managerName: sheet?.managerName ?? '',
      callerIsManager: sheet?.isManager ?? false,
      ownRow: sheet?.members.find((m) => m.isYou)?.id === set.memberId,
    };
    this.toasts.show({
      ...savedToast(set, context),
      action: { label: 'Undo', run: () => this.undo(set) },
    });
  }

  /** L2-018 AC1: write the previous statuses back, for as long as the toast is there. */
  private undo(set: ChangeSet): void {
    this.sheetApi.restore(set.memberId, set.changes).subscribe({
      next: () => this.refresh(),
      error: (error: unknown) => this.refused(error, () => this.undo(set)),
    });
  }

  private refused(error: unknown, retry: () => void): void {
    const refusal = refusedToast(problemCode(error), this.current()?.managerName ?? '');
    this.toasts.show(refusal ?? { ...FAILED_SAVE, action: { label: 'Try again', run: retry } });
  }

  /** Quietly reads the month again so the Out row and every cell match the server. */
  private refresh(): void {
    const month = this.current()?.month;
    if (!month) return;
    this.sheetApi.month(month).subscribe({
      next: (sheet) => {
        if (this.current()?.month === sheet.month) this.current.set(sheet);
      },
    });
  }

  /** Paints cells in the local copy; returns what they were, to put back. */
  private applyKinds(
    memberId: string,
    dates: readonly string[],
    status: DayStatus | null,
  ): Map<string, CellKind> {
    const before = new Map<string, CellKind>();
    const kind: CellKind = status ? KIND_OF[status] : 'Working';
    this.current.update((sheet) => {
      if (!sheet) return sheet;
      const members = sheet.members.map((member) => {
        if (member.id !== memberId) return member;
        const cells = member.cells.map((cell) => {
          // Red days never change, and a member's own confirmed days stay as they are.
          const locked = cell.kind === 'Confirmed' && !sheet.isManager;
          const red = cell.kind === 'NotWorking' || cell.kind === 'Holiday';
          if (!dates.includes(cell.date) || red || locked) return cell;
          before.set(cell.date, cell.kind);
          return { ...cell, kind };
        });
        return { ...member, cells };
      });
      return { ...sheet, members };
    });
    return before;
  }

  private restoreKinds(memberId: string, before: ReadonlyMap<string, CellKind>): void {
    this.current.update(
      (sheet) =>
        sheet && {
          ...sheet,
          members: sheet.members.map((member) =>
            member.id !== memberId
              ? member
              : {
                  ...member,
                  cells: member.cells.map((cell) => {
                    const kind = before.get(cell.date);
                    return kind ? { ...cell, kind } : cell;
                  }),
                },
          ),
        },
    );
  }

  protected go(step: number): void {
    this.navigate(addMonths(this.month(), step));
  }

  protected goToday(): void {
    const sheet = this.loaded();
    if (sheet) this.navigate(sheet.today.slice(0, 7));
  }

  /** L2-012 AC7: load the same month again. */
  protected retry(): void {
    this.attempt.update((n) => n + 1);
  }

  private navigate(month: string): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: { month } });
  }
}
