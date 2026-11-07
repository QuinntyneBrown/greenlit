import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, combineLatest, map, of, startWith, switchMap } from 'rxjs';

import { SHEET_SERVICE, SheetMonth } from 'api';
import { Button, EmptyState, Legend, PeriodNav, TeamGrid } from 'components';

import { addMonths, calendarView, columnsFor, monthTitle } from './calendar-view';

type Load =
  | { readonly state: 'loading' }
  | { readonly state: 'ready'; readonly sheet: SheetMonth }
  | { readonly state: 'error' };

const MONTH_PARAM = /^\d{4}-(0[1-9]|1[0-2])$/;

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
 */
@Component({
  selector: 'app-calendar-page',
  imports: [PeriodNav, Legend, TeamGrid, EmptyState, Button],
  template: `
    <div class="page-title-row">
      <gl-period-nav
        [title]="title()"
        [showToday]="showToday()"
        (previous)="go(-1)"
        (next)="go(1)"
        (today)="goToday()"
      />
    </div>
    <div class="toolbar-row">
      <gl-legend />
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
    .toolbar-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      margin-top: var(--space-5);
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
  private readonly sheet = inject(SHEET_SERVICE);
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

  protected readonly load = toSignal(
    combineLatest([this.route.queryParamMap, toObservable(this.attempt)]).pipe(
      map(([params]) => params.get('month')),
      switchMap((month) =>
        this.sheet.month(month && MONTH_PARAM.test(month) ? month : undefined).pipe(
          map((sheet): Load => ({ state: 'ready', sheet })),
          catchError(() => of<Load>({ state: 'error' })),
          startWith<Load>({ state: 'loading' }),
        ),
      ),
    ),
    { initialValue: { state: 'loading' } as Load },
  );

  private readonly loaded = computed(() => {
    const load = this.load();
    return load.state === 'ready' ? load.sheet : null;
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
