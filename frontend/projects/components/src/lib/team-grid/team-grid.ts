import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { initialsOf } from '../avatar/avatar';

/** One day column of the sheet. */
export interface TeamGridColumn {
  /** Accessible name of the column header, e.g. "Mon 2 Nov". */
  readonly label: string;
  /** Weekday initial shown above the number: M, T, W, Th, F, S, Su. */
  readonly initial: string;
  /** Day of the month. */
  readonly day: number;
  /** A weekend or team holiday: the header turns red. */
  readonly off: boolean;
  /** Today's column carries `aria-current="date"`. */
  readonly today: boolean;
}

/** How a cell is drawn: the mock's `data-status` values. */
export type TeamGridCellStatus = 'empty' | 'off' | 'tentative' | 'requested' | 'confirmed';

export interface TeamGridCell {
  readonly status: TeamGridCellStatus;
  /** "{member}, {Day d Mon}: {state}": the state always travels in the name too (L2-048). */
  readonly label: string;
}

export interface TeamGridRow {
  readonly name: string;
  /** The signed-in person's row, marked "You". */
  readonly you: boolean;
  readonly cells: readonly TeamGridCell[];
  /** The Left column's figure, e.g. "5" or "-2". */
  readonly left: string;
  /** The Left column's accessible description, e.g. "5 days left". */
  readonly leftLabel: string;
  /** Over the allowance: the figure turns red. */
  readonly over: boolean;
}

/** The Out row's cell for one day; null where nobody works (weekends, holidays). */
export interface TeamGridCover {
  /** "·" when nobody is out, otherwise the count. */
  readonly text: string;
  /** "{n} out, {m} in", plus ". Below the minimum of {min}" when flagged. */
  readonly label: string;
  readonly level: 'none' | 'some' | 'short';
}

/**
 * The sheet (docs/design-system/components/team-grid.html): members down the
 * side, days across, a Left column and the Out row. A `role="grid"` labelled
 * "Time off, {Month yyyy}". Read-only until marking days (sheet/mark-days)
 * makes cells editable. While `loading`, the headings render with placeholder
 * rows and the grid is `aria-busy`.
 */
@Component({
  selector: 'gl-team-grid',
  template: `
    <div class="grid-card">
      <div
        class="team-grid team-grid--left"
        role="grid"
        [attr.aria-label]="label()"
        [attr.aria-busy]="loading() ? 'true' : null"
        [style.--days]="columns().length"
      >
        <div role="row">
          <div role="columnheader" class="grid-corner">
            <span class="visually-hidden">Team member</span>
          </div>
          @for (column of columns(); track column.label) {
            <div
              role="columnheader"
              class="grid-colhead"
              [attr.data-off]="column.off ? '' : null"
              [attr.aria-label]="column.label"
            >
              <span aria-hidden="true">{{ column.initial }}</span>
              <span class="date-chip" [attr.aria-current]="column.today ? 'date' : null">{{
                column.day
              }}</span>
            </div>
          }
          <div role="columnheader" class="grid-colhead grid-colhead--tail">Left</div>
        </div>

        @if (loading()) {
          @for (placeholder of placeholderRows; track $index) {
            <div role="row">
              <div role="rowheader" class="grid-name">
                <span
                  class="skeleton skeleton--circle avatar-placeholder"
                  aria-hidden="true"
                ></span>
                <span class="skeleton skeleton--text name-placeholder" aria-hidden="true"></span>
              </div>
              @for (column of columns(); track column.label) {
                <div role="gridcell"><span class="cell skeleton" aria-hidden="true"></span></div>
              }
              <div role="gridcell"></div>
            </div>
          }
        } @else {
          @for (row of rows(); track row.name) {
            <div role="row">
              <div role="rowheader" class="grid-name">
                <span class="avatar avatar--sm" aria-hidden="true">{{ initials(row.name) }}</span>
                <span class="grid-name__text">{{ row.name }}</span>
                @if (row.you) {
                  <span class="grid-name__you">You</span>
                }
              </div>
              @for (cell of row.cells; track $index) {
                <div
                  role="gridcell"
                  class="cell"
                  [attr.data-status]="cell.status"
                  [attr.aria-label]="cell.label"
                  [attr.title]="cell.label"
                ></div>
              }
              <div
                role="gridcell"
                class="grid-left"
                [attr.data-over]="row.over ? '' : null"
                [attr.aria-label]="row.leftLabel"
                [attr.title]="row.leftLabel"
              >
                {{ row.left }}
              </div>
            </div>
          }
          <div role="row">
            <div role="rowheader" class="grid-name grid-name--cover">Out</div>
            @for (cover of covers(); track $index) {
              <div role="gridcell">
                @if (cover) {
                  <div
                    class="cover"
                    [attr.data-level]="cover.level"
                    role="img"
                    [attr.aria-label]="cover.label"
                    [attr.title]="cover.label"
                  >
                    {{ cover.text }}
                  </div>
                }
              </div>
            }
            <div role="gridcell"></div>
          </div>
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
    .team-grid {
      display: grid;
      gap: var(--space-0-5);
      padding: var(--space-3);
      user-select: none;
    }
    @media (min-width: 48rem) {
      .team-grid {
        padding: var(--space-4);
      }
    }
    .team-grid--left {
      grid-template-columns:
        minmax(8.25rem, 11rem) repeat(var(--days, 30), minmax(1.5rem, 1fr))
        3.25rem;
      min-width: calc(11rem + var(--days, 30) * 1.7rem + 5rem);
    }
    [role='row'] {
      display: contents;
    }
    [role='gridcell'] {
      display: flex;
      min-width: 0;
    }
    .grid-corner,
    .grid-name {
      position: sticky;
      left: 0;
      z-index: var(--z-raised);
      background: var(--color-bg-surface);
    }
    .grid-name {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      min-width: 0;
      height: var(--cell-height);
      padding-right: var(--space-2);
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
    .grid-name--cover {
      height: auto;
      padding-top: var(--space-2);
      font: var(--text-caption);
      color: var(--color-fg-muted);
    }
    .avatar {
      display: inline-grid;
      place-items: center;
      flex: none;
      width: 1.5rem;
      height: 1.5rem;
      border-radius: var(--radius-full);
      background: var(--color-bg-subtle);
      color: var(--color-fg-muted);
      font: var(--text-label);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-semibold);
    }
    .grid-colhead {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-0-5);
      padding-bottom: var(--space-1);
      font: var(--text-caption);
      font-weight: var(--font-weight-semibold);
      color: var(--color-fg-muted);
    }
    .grid-colhead[data-off] {
      color: var(--color-danger-fg);
    }
    .grid-colhead--tail {
      justify-content: flex-end;
      align-items: flex-end;
    }
    .date-chip {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.5rem;
      height: 1.5rem;
      padding: 0 var(--space-1);
      border-radius: var(--radius-sm);
      font-weight: var(--font-weight-regular);
      font-variant-numeric: tabular-nums;
      color: var(--color-fg-muted);
    }
    .date-chip[aria-current='date'] {
      background: var(--color-fg-default);
      color: var(--color-bg-surface);
      font-weight: var(--font-weight-semibold);
    }
    .cell {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: var(--cell-height);
      padding: 0;
      border: 0;
      border-radius: var(--radius-sm);
      background: var(--status-bg, var(--color-status-empty));
      color: var(--color-on-status);
      font: var(--text-caption);
      font-weight: var(--font-weight-bold);
      line-height: 1;
    }
    .cell[data-status='confirmed'] {
      --status-bg: var(--color-status-confirmed);
    }
    .cell[data-status='requested'] {
      --status-bg: var(--color-status-requested);
    }
    .cell[data-status='tentative'] {
      --status-bg: var(--color-status-tentative);
    }
    .cell[data-status='off'] {
      --status-bg: var(--color-status-off);
    }
    /* A cell's colour is never its only carrier: a glyph says it too (L2-048). */
    .cell[data-status='confirmed']::after {
      content: '✓';
    }
    .cell[data-status='requested']::after {
      content: '…';
    }
    .cell[data-status='tentative']::after {
      content: '?';
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
      border-radius: var(--radius-sm);
      animation: shimmer 1.4s var(--ease-standard) infinite;
    }
    .skeleton--circle {
      border-radius: 50%;
    }
    .cell.skeleton {
      background-color: var(--color-bg-subtle);
    }
    .avatar-placeholder {
      width: var(--space-6);
      height: var(--space-6);
      flex: none;
    }
    .name-placeholder {
      width: var(--space-24);
      height: 0.9em;
    }
    @keyframes shimmer {
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
    .grid-left {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      height: var(--cell-height);
      font: var(--text-label);
      font-variant-numeric: tabular-nums;
    }
    .grid-left[data-over] {
      color: var(--color-danger-fg);
    }
    .cover {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 1.5rem;
      margin-top: var(--space-2);
      border-radius: var(--radius-sm);
      background: var(--color-bg-subtle);
      color: var(--color-fg-muted);
      font: var(--text-caption);
      font-weight: var(--font-weight-semibold);
      font-variant-numeric: tabular-nums;
    }
    .cover[data-level='none'] {
      background: transparent;
      color: var(--color-fg-subtle);
    }
    .cover[data-level='short'] {
      background: var(--color-bg-surface);
      color: var(--color-danger-fg);
      box-shadow: inset 0 0 0 1px var(--color-danger-solid);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamGrid {
  /** "Time off, November 2026". */
  readonly label = input.required<string>();
  readonly columns = input.required<readonly TeamGridColumn[]>();
  readonly rows = input<readonly TeamGridRow[]>([]);
  /** The Out row, aligned with `columns`. */
  readonly cover = input<readonly (TeamGridCover | null)[]>([]);
  readonly loading = input<boolean>(false);

  protected readonly placeholderRows = Array.from({ length: 5 });
  protected readonly covers = computed(() => this.columns().map((_, i) => this.cover()[i] ?? null));
  protected readonly initials = initialsOf;
}
