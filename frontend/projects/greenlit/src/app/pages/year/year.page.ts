import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, catchError, combineLatest, map, of, startWith, switchMap } from 'rxjs';

import { TeamYear, YEAR_SERVICE } from 'api';
import { AllowanceTable, Button, EmptyState, Legend, PeriodNav, YearGrid } from 'components';

import { allowanceRows, yearColumns, yearRows } from './year-view';

const YEAR_PARAM = /^\d{4}$/;

type Load =
  | { readonly state: 'loading' }
  | { readonly state: 'ready'; readonly year: TeamYear }
  | { readonly state: 'error' };

/**
 * Year (pages/year, docs/detailed-designs/allowances/year-overview, L2-031, L2-032): the whole team's
 * twelve months as slivers of colour, each month a link to the calendar, and below it each person's
 * allowance. The year lives in the address (`?year=yyyy`) so it survives a reload; without it this
 * browser's current year is shown. A team of one shows its single row (L2-057); only a year with no rows is empty;
 * a year that cannot be loaded says so and offers Try again.
 */
@Component({
  selector: 'app-year-page',
  imports: [PeriodNav, Legend, YearGrid, AllowanceTable, EmptyState, Button],
  template: `
    <div class="page-title-row">
      <gl-period-nav unit="year" [title]="'' + year()" (previous)="go(-1)" (next)="go(1)" />
      <gl-legend />
    </div>
    <p class="text-muted intro">The whole team's year in one view. Select a month to open it.</p>
    @switch (load().state) {
      @case ('error') {
        <div class="card-plain region">
          <gl-empty-state
            tone="error"
            title="We couldn't load the year"
            text="Something went wrong on our side. Nothing was changed."
          >
            <svg slot="icon" class="icon icon--lg" aria-hidden="true" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v5M12 16h.01" />
            </svg>
            <gl-button slot="actions" variant="primary" (click)="reload()">Try again</gl-button>
          </gl-empty-state>
        </div>
      }
      @case ('ready') {
        @if (isEmpty()) {
          <div class="card-plain region">
            <gl-empty-state
              title="No one on the team yet"
              text="Invite your team from Settings to see their year here."
            >
              <svg slot="icon" class="icon icon--lg" aria-hidden="true" viewBox="0 0 24 24">
                <circle cx="9" cy="8" r="3" />
                <path d="M3 20a6 6 0 0 1 12 0M17 11v6M14 14h6" />
              </svg>
              <gl-button slot="actions" variant="primary" link="/settings">Open settings</gl-button>
            </gl-empty-state>
          </div>
        } @else {
          <gl-year-grid class="region" [columns]="columns()" [rows]="rows()" />
          <gl-allowance-table
            class="summary"
            [title]="'Allowance in ' + year()"
            [rows]="summary()"
            [linkNames]="isManager()"
            [(sorted)]="sorted"
          />
        }
      }
      @default {
        <gl-year-grid class="region" [columns]="columns()" [loading]="true" />
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
    .intro {
      margin-top: var(--space-2);
    }
    .region {
      display: block;
      margin-top: var(--space-5);
    }
    .summary {
      margin-top: var(--space-12);
    }
    .card-plain {
      background: var(--color-bg-surface);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-lg);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class YearPage {
  private readonly api = inject(YEAR_SERVICE);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly attempt = new BehaviorSubject(0);

  /** The year in the address when it is four digits, else this browser's current year. */
  private readonly requested$ = this.route.queryParamMap.pipe(
    map((params) => params.get('year')),
    map((year) => (year && YEAR_PARAM.test(year) ? Number(year) : new Date().getFullYear())),
  );

  protected readonly year = toSignal(this.requested$, { initialValue: new Date().getFullYear() });

  protected readonly load = toSignal(
    combineLatest([this.requested$, this.attempt]).pipe(
      switchMap(([year]) =>
        this.api.year(year).pipe(
          map((loaded): Load => ({ state: 'ready', year: loaded })),
          catchError(() => of<Load>({ state: 'error' })),
          startWith<Load>({ state: 'loading' }),
        ),
      ),
    ),
    { initialValue: { state: 'loading' } as Load },
  );

  private readonly loaded = computed(() => {
    const load = this.load();
    return load.state === 'ready' ? load.year : null;
  });

  /** L2-031 AC5: nobody on the team but the manager. */
  /** A team of one shows its manager's row (L2-057); only a year with no rows at all is empty. */
  protected readonly isEmpty = computed(() => (this.loaded()?.members.length ?? 0) === 0);

  protected readonly isManager = computed(() => this.loaded()?.isManager ?? false);
  protected readonly columns = computed(() => yearColumns(this.year()));
  protected readonly rows = computed(() => {
    const year = this.loaded();
    return year ? yearRows(year) : [];
  });

  /** L2-032 AC3: rows ordered by days left, most first; a client-side reorder of the same data. */
  protected readonly sorted = signal(false);
  protected readonly summary = computed(() => {
    const year = this.loaded();
    return year ? allowanceRows(year, this.sorted()) : [];
  });

  protected reload(): void {
    this.attempt.next(this.attempt.value + 1);
  }

  protected go(step: number): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { year: this.year() + step },
    });
  }
}
