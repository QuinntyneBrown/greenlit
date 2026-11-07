import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map, switchMap } from 'rxjs';

import { TeamYear, YEAR_SERVICE } from 'api';
import { AllowanceTable, Legend, PeriodNav, YearGrid } from 'components';

import { allowanceRows, yearColumns, yearRows } from './year-view';

const YEAR_PARAM = /^\d{4}$/;

/**
 * Year (pages/year, docs/detailed-designs/allowances/year-overview, L2-031): the whole team's twelve
 * months as slivers of colour, each month a link to the calendar. The year lives in the address
 * (`?year=yyyy`) so it survives a reload; without it this browser's current year is shown.
 */
@Component({
  selector: 'app-year-page',
  imports: [PeriodNav, Legend, YearGrid, AllowanceTable],
  template: `
    <div class="page-title-row">
      <gl-period-nav unit="year" [title]="'' + year()" (previous)="go(-1)" (next)="go(1)" />
      <gl-legend />
    </div>
    <p class="text-muted intro">The whole team's year in one view. Select a month to open it.</p>
    @if (loaded(); as loaded) {
      <gl-year-grid class="region" [columns]="columns()" [rows]="rows()" />
      <gl-allowance-table
        class="summary"
        [title]="'Allowance in ' + loaded.year"
        [rows]="summary()"
        [(sorted)]="sorted"
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
    .intro {
      margin-top: var(--space-2);
    }
    .region {
      margin-top: var(--space-5);
    }
    .summary {
      margin-top: var(--space-12);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class YearPage {
  private readonly api = inject(YEAR_SERVICE);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** The year in the address when it is four digits, else this browser's current year. */
  private readonly requested$ = this.route.queryParamMap.pipe(
    map((params) => params.get('year')),
    map((year) => (year && YEAR_PARAM.test(year) ? Number(year) : new Date().getFullYear())),
  );

  protected readonly year = toSignal(this.requested$, { initialValue: new Date().getFullYear() });

  protected readonly loaded = toSignal(
    this.requested$.pipe(
      switchMap((year) => this.api.year(year)),
      map((year): TeamYear | null => year),
    ),
    { initialValue: null },
  );

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

  protected go(step: number): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { year: this.year() + step },
    });
  }
}
