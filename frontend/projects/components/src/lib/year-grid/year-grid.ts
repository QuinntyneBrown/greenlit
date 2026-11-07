import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** A month column heading: "Jan", linking to the calendar on `month`. */
export interface YearGridColumn {
  readonly label: string;
  /** `yyyy-MM`: the calendar's `?month=`. */
  readonly month: string;
}

/** How a sliver is drawn: the mock's `data-status` values. */
export type YearGridSliver = 'empty' | 'off' | 'tentative' | 'requested' | 'confirmed';

/** One month of a member: a link to the calendar, named by its confirmed days. */
export interface YearGridMonth {
  /** `yyyy-MM`. */
  readonly month: string;
  /** "{member}, {Month}: {n} confirmed days off": the colours are never the only carrier. */
  readonly label: string;
  /** One sliver per calendar day. */
  readonly days: readonly YearGridSliver[];
}

export interface YearGridRow {
  readonly memberId: string;
  readonly name: string;
  /** The signed-in person's row, marked "You". */
  readonly you: boolean;
  readonly months: readonly YearGridMonth[];
}

/**
 * Year grid (docs/design-system/components/year-grid.html): twelve months per member, each month a
 * link to the calendar made of one sliver per day. A `role="grid"` labelled "Time off by month".
 */
@Component({
  selector: 'gl-year-grid',
  imports: [RouterLink],
  template: `
    <div class="grid-card">
      <div
        class="year-grid"
        role="grid"
        [attr.aria-label]="label()"
        [attr.aria-busy]="loading() ? 'true' : null"
      >
        <div role="row">
          <div role="columnheader"><span class="visually-hidden">Team member</span></div>
          @for (column of columns(); track column.month) {
            <div role="columnheader">
              <a class="year-grid__month" routerLink="/" [queryParams]="{ month: column.month }">{{
                column.label
              }}</a>
            </div>
          }
        </div>
        @if (loading()) {
          @for (placeholder of placeholderRows; track $index) {
            <div role="row">
              <div role="rowheader" class="year-grid__name">
                <span class="skeleton skeleton--text name-placeholder" aria-hidden="true"></span>
              </div>
              @for (column of columns(); track column.month) {
                <div role="gridcell">
                  <span class="skeleton cell-placeholder" aria-hidden="true"></span>
                </div>
              }
            </div>
          }
        } @else {
          @for (row of rows(); track row.memberId) {
            <div role="row">
              <div role="rowheader" class="year-grid__name">
                <span class="grid-name__text">{{ row.name }}</span>
                @if (row.you) {
                  <span class="grid-name__you">You</span>
                }
              </div>
              @for (month of row.months; track month.month) {
                <div role="gridcell">
                  <a
                    class="year-month"
                    routerLink="/"
                    [queryParams]="{ month: month.month }"
                    [attr.aria-label]="month.label"
                  >
                    @for (day of month.days; track $index) {
                      <span class="sliver" [attr.data-status]="day"></span>
                    }
                  </a>
                </div>
              }
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .grid-card {
      overflow-x: auto;
      background: var(--color-bg-surface);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-lg);
    }
    .year-grid {
      display: grid;
      gap: var(--space-2);
      padding: var(--space-4);
      grid-template-columns: minmax(7.5rem, 10rem) repeat(12, minmax(3.9rem, 1fr));
      min-width: 58.75rem;
    }
    [role='row'] {
      display: contents;
    }
    .year-grid__month {
      font: var(--text-caption);
      font-weight: var(--font-weight-semibold);
      color: var(--color-fg-muted);
      text-decoration: none;
    }
    .year-grid__month:hover {
      color: var(--color-fg-default);
      text-decoration: underline;
    }
    .year-grid__name {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      min-width: 0;
      font: var(--text-label);
    }
    .grid-name__text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .grid-name__you {
      font: var(--text-caption);
      color: var(--color-fg-subtle);
      font-weight: var(--font-weight-regular);
    }
    .year-month {
      display: flex;
      gap: var(--border-width-hairline);
      height: 1.75rem;
      border-radius: var(--radius-xs);
    }
    .year-month:hover {
      box-shadow: 0 0 0 1px var(--color-border-strong);
    }
    .year-month:focus-visible {
      outline-offset: 2px;
    }
    .sliver {
      flex: 1;
      border-radius: 1px;
      background: var(--status-bg, var(--color-status-empty));
    }
    .sliver[data-status='off'] {
      --status-bg: var(--color-status-off-soft);
    }
    .sliver[data-status='tentative'] {
      --status-bg: var(--color-status-tentative);
    }
    .sliver[data-status='requested'] {
      --status-bg: var(--color-status-requested);
    }
    .sliver[data-status='confirmed'] {
      --status-bg: var(--color-status-confirmed);
    }
    .skeleton {
      display: block;
      background: linear-gradient(
        90deg,
        var(--color-bg-subtle) 25%,
        var(--color-bg-subtle-hover) 37%,
        var(--color-bg-subtle) 63%
      );
      background-size: 400% 100%;
      border-radius: var(--radius-md);
      animation: gl-shimmer 1.4s var(--ease-standard) infinite;
    }
    .name-placeholder {
      width: var(--space-24);
      height: 0.9em;
    }
    .cell-placeholder {
      width: 100%;
      height: var(--space-6);
    }
    @keyframes gl-shimmer {
      from {
        background-position: 100% 0;
      }
      to {
        background-position: 0 0;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .skeleton {
        animation: none;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class YearGrid {
  readonly label = input<string>('Time off by month');
  readonly columns = input.required<readonly YearGridColumn[]>();
  readonly rows = input<readonly YearGridRow[]>([]);
  /** Shows placeholder rows under the headings and sets aria-busy while the year loads. */
  readonly loading = input<boolean>(false);

  protected readonly placeholderRows = [0, 1, 2, 3, 4];
}
