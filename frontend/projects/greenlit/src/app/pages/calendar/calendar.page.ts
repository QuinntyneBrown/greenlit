import {
  ChangeDetectionStrategy,
  Component,
  ApplicationRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, combineLatest, map, of, startWith, switchMap, tap } from 'rxjs';

import {
  CONNECTIVITY_SERVICE,
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
  SelectionAction,
  SelectionBar,
  TeamGrid,
  TeamGridCellStatus,
  TeamGridSelection,
  TeamGridStroke,
} from 'components';

import { AppDialogs } from '../../dialogs/app-dialogs';
import { NewRequestData, NewRequestDialog } from '../../dialogs/new-request/new-request.dialog';
import { ToastService } from '../../toasts/toast.service';
import { addMonths, calendarView, columnsFor, monthTitle } from './calendar-view';
import { CalendarWeek, PhoneMark } from './calendar-week';
import { selectionBarView } from './selection-view';
import { FAILED_SAVE, PaintContext, refusedToast, savedToast, SYNCED_LOCKED } from './paint-toasts';
import { requestSentToast } from './request-toasts';

type Load =
  | { readonly state: 'loading' }
  | { readonly state: 'ready'; readonly sheet: SheetMonth }
  | { readonly state: 'error' };

const MONTH_PARAM = /^\d{4}-(0[1-9]|1[0-2])$/;

/** The grid's own breakpoint (docs/detailed-designs/sheet/phone-week). */
const PHONE = '(max-width: 47.99rem)';

/** The paint picker's choices; `select` is the Select mode of journey 12 (sheet/select-days). */
type PaintChoice = 'select' | 'confirmed' | 'requested' | 'tentative' | 'clear';

const PAINT_STATUS: Record<Exclude<PaintChoice, 'select'>, DayStatus | null> = {
  confirmed: 'Confirmed',
  requested: 'Requested',
  tentative: 'Tentative',
  clear: null,
};

const ACTION_STATUS: Record<SelectionAction, DayStatus | null> = {
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
  imports: [
    PeriodNav,
    Legend,
    TeamGrid,
    SelectionBar,
    EmptyState,
    Button,
    SegmentedControl,
    CalendarWeek,
  ],
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
          @if (!phone()) {
            <gl-segmented-control
              label="Paint"
              [options]="paintOptions()"
              [value]="paintChoice()"
              (valueChange)="choosePaint($event)"
            />
          }
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
    @if (!phone()) {
      <div class="toolbar-row">
        <gl-legend [schoolClosed]="schoolCalendar()" [synced]="hasSynced()" />
        @if (showPicker()) {
          <p class="text-caption">{{ hint() }}</p>
        }
      </div>
    }

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
        } @else if (phone()) {
          @if (loaded(); as sheet) {
            <app-calendar-week
              [sheet]="sheet"
              [busy]="saving()"
              [readOnly]="connectivity.readOnly()"
              (mark)="markOnPhone($event)"
              (cleared)="selectionCleared()"
            />
          }
        } @else {
          <gl-team-grid
            class="region"
            (keydown.tab)="tabToBar($event)"
            [label]="view().label"
            [columns]="view().columns"
            [rows]="gridRows()"
            [cover]="view().cover"
            [loading]="load().state === 'loading'"
            [paint]="gridPaint()"
            [selectable]="choice() === 'select'"
            (selectionChange)="selection.set($event)"
            (cleared)="selectionCleared()"
            (stroke)="paintStroke($event)"
            (monthStep)="go($event)"
          />
        }
      }
    }
    <p class="visually-hidden" role="status">{{ announcement() }}</p>
    @if (bar(); as bar) {
      <gl-selection-bar
        [title]="bar.title"
        [workingDays]="bar.workingDays"
        [over]="bar.over"
        [canConfirm]="isManager()"
        [busy]="saving()"
        (chosen)="actOnSelection($event)"
        (dismissed)="dismissSelection()"
      />
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
      min-width: 0;
      max-width: 100%;
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
  protected readonly connectivity = inject(CONNECTIVITY_SERVICE);
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(AppDialogs);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly attempt = signal(0);

  /** Narrower than 48rem the month grid does not fit: the calendar shows one week instead (L2-063). */
  protected readonly phone = toSignal(
    inject(BreakpointObserver)
      .observe(PHONE)
      .pipe(map((state) => state.matches)),
    { initialValue: false },
  );

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

  protected readonly loaded = computed(() =>
    this.load().state === 'ready' ? this.current() : null,
  );

  /** The connection came back (L2-045 AC3): quietly read the month again so "Everything is up to date" is true. */
  private readonly reloadOnReturn = effect(() => {
    if (this.connectivity.reloads() === 0) return;
    untracked(() => (this.load().state === 'error' ? this.retry() : this.refresh()));
  });

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
    // A team of one shows its manager's row (L2-057 AC2); only a month with no rows at all is empty.
    return sheet !== null && sheet.members.length === 0;
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

  /** While offline nothing on the sheet may be painted or selected (L2-045 AC1). */
  protected readonly gridRows = computed(() => {
    const rows = this.view().rows;
    return this.connectivity.readOnly() ? rows.map((row) => ({ ...row, editable: false })) : rows;
  });

  // ---- painting days (docs/detailed-designs/sheet/mark-days) ----

  protected readonly showPicker = computed(() => this.loaded() !== null && !this.isEmpty());
  protected readonly isManager = computed(() => this.loaded()?.isManager ?? false);
  /** The school calendar is on: the legend says what the closure icon means (L2-061 AC3). */
  protected readonly schoolCalendar = computed(() => this.loaded()?.schoolCalendar ?? false);

  /** The month holds a day synced from another of someone's teams: the legend says what it is (L2-064 AC2). */
  protected readonly hasSynced = computed(
    () => this.loaded()?.members.some((m) => m.cells.some((c) => c.synced)) ?? false,
  );
  protected readonly choice = signal<PaintChoice>('select');
  protected readonly paintChoice = this.choice.asReadonly();

  /** L2-015 AC1-2: the manager also offers Confirmed. */
  protected readonly paintOptions = computed((): SegmentedOption[] => {
    const disabled = this.connectivity.readOnly();
    const hint = disabled ? 'You’re offline' : undefined;
    const options: SegmentedOption[] = [
      { value: 'select', label: 'Select', pointer: true },
      ...(this.isManager()
        ? [{ value: 'confirmed', label: 'Confirmed', swatch: 'confirmed' } as const]
        : []),
      { value: 'requested', label: 'Requested', swatch: 'requested' },
      { value: 'tentative', label: 'Tentative', swatch: 'tentative' },
      { value: 'clear', label: 'Clear', swatch: 'empty' },
    ];
    return options.map((option) => ({ ...option, disabled, hint }));
  });

  // ---- selecting days (docs/detailed-designs/sheet/select-days) ----

  /** The range the sheet reports in Select mode; null when nothing is selected. */
  protected readonly selection = signal<TeamGridSelection | null>(null);

  /** What the selection bar shows; null hides the bar. */
  protected readonly bar = computed(() => {
    const sheet = this.loaded();
    const selection = this.selection();
    return sheet && selection ? selectionBarView(sheet, this.view().rows, selection) : null;
  });

  /** The polite status: how many days are selected, nothing once it is cleared. */
  protected readonly announcement = computed(() => {
    const n = this.selection()?.dates.length ?? 0;
    return n === 0 ? '' : `${n} ${n === 1 ? 'day' : 'days'} selected`;
  });

  /** L2-016 AC4: "Clear selection" on the bar. */
  protected dismissSelection(): void {
    this.grid()?.clearSelection();
    this.grid()?.focusActive();
    this.selectionCleared();
  }

  /** L2-016 AC4: Escape or "Clear selection" cleared the range. */
  protected selectionCleared(): void {
    this.toasts.show({
      tone: 'info',
      title: 'Selection cleared',
      body: 'Pick days to start again.',
    });
  }

  private readonly week = viewChild(CalendarWeek);

  /** L2-063 AC10: the phone's mark sheet saves its range as the bar does, and spends it once saved. */
  protected markOnPhone(mark: PhoneMark): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.save(
      { memberId: mark.memberId, dates: mark.dates, status: ACTION_STATUS[mark.action] },
      (saved) => {
        this.saving.set(false);
        if (saved) this.week()?.clearRange();
      },
    );
  }

  /** An action from the bar is being saved. */
  protected readonly saving = signal(false);
  private readonly grid = viewChild(TeamGrid);
  private readonly selectionBar = viewChild(SelectionBar);
  private readonly appRef = inject(ApplicationRef);

  /**
   * Tab from the sheet with days selected goes to the selection bar (L2-047, sheet/select-days), even when it comes
   * before the bar's first render: the bar is rendered then and there, so the next key already reaches it.
   */
  protected tabToBar(event: Event): void {
    if (!this.bar()) return;
    event.preventDefault();
    if (!this.selectionBar()) this.appRef.tick();
    this.selectionBar()?.focus();
  }

  /** L2-016 AC3: the same change a paint stroke makes, over the selected days. */
  protected actOnSelection(action: SelectionAction): void {
    const selection = this.selection();
    if (!selection || this.saving()) return;
    this.saving.set(true);
    this.save(
      { memberId: selection.memberId, dates: selection.dates, status: ACTION_STATUS[action] },
      (saved) => {
        this.saving.set(false);
        if (!saved) return;
        // The change is made: the range is spent, and focus goes back to the sheet to carry on.
        this.grid()?.clearSelection();
        this.grid()?.focusActive();
      },
    );
  }

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
  private save(stroke: DayStroke, settled?: (saved: boolean) => void): void {
    // Synced days change only in the team where they were booked (L2-064 AC3): they are left out of every change,
    // and a change of nothing else says so without calling the API.
    const { kept, onlySynced } = this.withoutSynced(stroke);
    if (onlySynced) {
      settled?.(false);
      this.toasts.show(SYNCED_LOCKED);
      return;
    }
    stroke = kept;
    const before = this.applyKinds(stroke.memberId, stroke.dates, stroke.status);
    this.sheetApi.setDays(stroke).subscribe({
      next: (set) => {
        this.saved(set);
        settled?.(true);
      },
      error: (error: unknown) => {
        this.restoreKinds(stroke.memberId, before);
        settled?.(false);
        this.refused(error, () => this.actOnRetry(stroke, settled));
      },
    });
  }

  private withoutSynced(stroke: DayStroke): { kept: DayStroke; onlySynced: boolean } {
    const member = this.current()?.members.find((m) => m.id === stroke.memberId);
    const cells = new Map((member?.cells ?? []).map((c) => [c.date, c]));
    const dates = stroke.dates.filter((d) => !cells.get(d)?.synced);
    const working = dates.some((d) => {
      const kind = cells.get(d)?.kind;
      return kind !== 'NotWorking' && kind !== 'Holiday';
    });
    return {
      kept: { ...stroke, dates },
      onlySynced: dates.length < stroke.dates.length && !working,
    };
  }

  /** "Try again" on the failed-save toast repeats the same stroke, with the same follow-up. */
  private actOnRetry(stroke: DayStroke, settled?: (saved: boolean) => void): void {
    if (settled) this.saving.set(true);
    this.save(stroke, settled);
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
