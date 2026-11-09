import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { TeamGridCell, TeamGridColumn, TeamGridCover } from '../team-grid/team-grid';

/** One day of the week shown; a day of the week outside the month is null. */
export interface WeekStripColumn extends TeamGridColumn {
  /** `yyyy-MM-dd`. */
  readonly date: string;
  /** The Out line under the day; null on a day nobody works. */
  readonly cover: TeamGridCover | null;
  /** A short day (L2-063 AC4): its column is banded. */
  readonly short: boolean;
}

/** One member's row of the week. */
export interface WeekStripRow {
  readonly memberId: string;
  readonly name: string;
  readonly initials: string;
  /** The signed-in member's own row, marked "You". */
  readonly you: boolean;
  /** "5 left". */
  readonly left: string;
  readonly over: boolean;
  /** The person may change this row: its cells are buttons. */
  readonly editable: boolean;
  /** Seven cells, Monday first; null outside the month. */
  readonly cells: readonly (TeamGridCell | null)[];
}

/** A tap on one member's day. */
export interface WeekStripTap {
  readonly memberId: string;
  readonly date: string;
}

const WEEKDAY_INITIALS = ['M', 'T', 'W', 'Th', 'F', 'S', 'Su'];

/**
 * Week strip (docs/design-system/components/week-strip.html): one week of the team on a phone, the panel of
 * the week tabs, labelled "Week of 2–8 Nov". A row of dates, each a button "See who is out Mon 2 Nov"; one
 * row per member with name, "You" and days left, and seven cells named as on the grid (L2-013, L2-048) —
 * buttons on rows the person may change, images otherwise; blank placeholders for days outside the month;
 * and the Out line (L2-014).
 */
@Component({
  selector: 'gl-week-strip',
  template: `
    <section [id]="panelId()" class="week-strip" role="tabpanel" [attr.aria-label]="label()">
      <div class="week-strip__days">
        @for (column of columns(); track $index; let i = $index) {
          @if (column) {
            <button
              class="week-strip__date"
              type="button"
              [attr.data-off]="column.off ? '' : null"
              [attr.aria-label]="'See who is out ' + column.label"
              [attr.aria-expanded]="column.date === openDate()"
              (click)="dateTap.emit(column.date)"
            >
              <span class="week-strip__initial" aria-hidden="true">{{ column.initial }}</span>
              <span class="week-strip__num" [attr.aria-current]="column.today ? 'date' : null">{{
                column.day
              }}</span>
            </button>
          } @else {
            <span class="week-strip__date" data-blank aria-hidden="true">
              <span class="week-strip__initial">{{ initials[i] }}</span>
              <span class="week-strip__num">·</span>
            </span>
          }
        }
      </div>
      <div class="week-strip__body">
        <div class="week-strip__bands" aria-hidden="true">
          @for (column of columns(); track $index) {
            <div
              class="week-strip__band"
              [attr.data-short]="column?.short ? '' : null"
              [attr.data-open]="column && column.date === openDate() ? '' : null"
            ></div>
          }
        </div>
        <ul class="week-strip__rows">
          @for (row of rows(); track row.memberId) {
            <li>
              <div class="week-strip__who">
                <span class="avatar" aria-hidden="true">{{ row.initials }}</span>
                <span class="week-strip__name">{{ row.name }}</span>
                @if (row.you) {
                  <span class="week-strip__you">You</span>
                }
                <span class="week-strip__left" [attr.data-over]="row.over ? '' : null">{{
                  row.left
                }}</span>
              </div>
              <div class="week-strip__cells">
                @for (cell of row.cells; track $index) {
                  <div class="week-strip__slot">
                    @if (!cell) {
                      <span class="week-strip__blank"></span>
                    } @else if (row.editable) {
                      <button
                        class="cell"
                        type="button"
                        [attr.data-status]="cell.status"
                        [attr.aria-label]="cell.label"
                        aria-pressed="false"
                        (click)="cellTap.emit({ memberId: row.memberId, date: cell.date })"
                      ></button>
                    } @else {
                      <span
                        class="cell"
                        role="img"
                        [attr.data-status]="cell.status"
                        [attr.aria-label]="cell.label"
                      ></span>
                    }
                  </div>
                }
              </div>
            </li>
          }
        </ul>
      </div>
      <div class="week-strip__out">
        @for (column of columns(); track $index) {
          <div>
            @if (column?.cover; as cover) {
              <div
                class="cover"
                role="img"
                [attr.data-level]="cover.level"
                [attr.aria-label]="cover.label"
                [attr.title]="cover.label"
              >
                {{ cover.text }}
              </div>
            }
          </div>
        }
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    .week-strip {
      background: var(--color-bg-surface);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-lg);
      padding: var(--space-3) var(--space-2);
    }
    .week-strip__days,
    .week-strip__cells,
    .week-strip__out,
    .week-strip__bands {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
    }
    .week-strip__days {
      padding-bottom: var(--space-2);
    }
    .week-strip__date {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-0-5);
      min-height: var(--target-min);
      padding: 0;
      border: 0;
      background: none;
      color: var(--color-fg-default);
      font: inherit;
      cursor: pointer;
    }
    .week-strip__date[data-blank] {
      cursor: default;
    }
    .week-strip__date[data-blank] .week-strip__num {
      color: var(--color-border-default);
    }
    .week-strip__date:focus-visible {
      outline: var(--focus-ring-width) solid var(--color-focus-ring);
      outline-offset: -2px;
      border-radius: var(--radius-md);
    }
    .week-strip__initial {
      font: var(--text-caption);
      font-weight: var(--font-weight-semibold);
      color: var(--color-fg-subtle);
    }
    .week-strip__date[data-off] .week-strip__initial,
    .week-strip__date[data-off] .week-strip__num {
      color: var(--color-danger-fg);
    }
    .week-strip__num {
      display: grid;
      place-items: center;
      width: 2rem;
      height: 2rem;
      border-radius: var(--radius-full);
      font: var(--text-label);
      font-variant-numeric: tabular-nums;
      transition: background-color var(--duration-fast) var(--ease-standard);
    }
    .week-strip__num[aria-current='date'] {
      box-shadow: inset 0 0 0 1.5px var(--color-brand);
    }
    .week-strip__date[aria-expanded='true'] .week-strip__num {
      background: var(--color-bg-inverse);
      color: var(--color-fg-inverse);
    }
    .week-strip__body {
      position: relative;
    }
    .week-strip__bands {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
    .week-strip__band {
      margin-inline: 1px;
      border-radius: var(--radius-md);
    }
    .week-strip__band[data-short] {
      background: color-mix(in srgb, var(--color-fg-default) 7%, transparent);
    }
    .week-strip__band[data-open] {
      box-shadow: inset 0 0 0 2px var(--color-fg-default);
    }
    .week-strip__rows {
      position: relative;
      display: grid;
      gap: var(--space-3);
      padding-block: var(--space-1);
      list-style: none;
      margin: 0;
      padding-inline: 0;
    }
    .week-strip__who {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      margin-bottom: var(--space-1-5, 0.375rem);
      padding-inline: var(--space-1);
      font: var(--text-label);
    }
    .avatar {
      display: inline-grid;
      place-items: center;
      flex: none;
      width: 1.5rem;
      height: 1.5rem;
      overflow: hidden;
      border-radius: var(--radius-full);
      background: var(--color-bg-subtle);
      color: var(--color-fg-muted);
      font: var(--text-label);
      font-size: var(--font-size-xs);
      font-weight: var(--font-weight-semibold);
    }
    .week-strip__name {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .week-strip__you {
      font: var(--text-caption);
      color: var(--color-fg-subtle);
    }
    .week-strip__left {
      margin-left: auto;
      font: var(--text-caption);
      color: var(--color-fg-muted);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .week-strip__left[data-over] {
      color: var(--color-danger-fg);
    }
    .week-strip__slot {
      display: flex;
      height: 2.75rem;
      padding-inline: 2px;
    }
    .cell {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      padding: 0;
      border: 0;
      border-radius: var(--radius-md);
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
    button.cell {
      cursor: pointer;
      transition: filter var(--duration-fast) var(--ease-standard);
    }
    button.cell:hover {
      filter: brightness(0.9);
    }
    button.cell:focus-visible {
      outline: var(--focus-ring-width) solid var(--color-on-status);
      outline-offset: -2px;
    }
    button.cell[data-status='empty']:focus-visible {
      outline-color: var(--color-focus-ring);
    }
    /* A selected cell is outlined in ink on a status colour, in the text colour on an empty day. */
    .cell[aria-pressed='true'] {
      box-shadow: inset 0 0 0 2px var(--color-on-status);
    }
    .cell[data-edge] {
      box-shadow: inset 0 0 0 3px var(--color-on-status);
    }
    .cell[data-status='empty'][aria-pressed='true'] {
      box-shadow: inset 0 0 0 2px var(--color-fg-default);
    }
    .cell[data-status='empty'][data-edge] {
      box-shadow: inset 0 0 0 3px var(--color-fg-default);
    }
    .week-strip__blank {
      flex: 1;
      border: 1px dashed var(--color-border-default);
      border-radius: var(--radius-md);
    }
    .week-strip__out {
      margin-top: var(--space-2);
      padding-top: var(--space-2);
      border-top: 1px solid var(--color-border-default);
    }
    .week-strip__out > div {
      display: flex;
      justify-content: center;
      padding-inline: 2px;
    }
    .cover {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 1.5rem;
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
export class WeekStrip {
  /** "Week of 2–8 Nov". */
  readonly label = input.required<string>();
  /** Seven days, Monday first; null outside the month. */
  readonly columns = input.required<readonly (WeekStripColumn | null)[]>();
  readonly rows = input<readonly WeekStripRow[]>([]);
  /** The id the week tabs point at. */
  readonly panelId = input<string>('week-card');
  /** The date whose panel is open, if any. */
  readonly openDate = input<string | null>(null);

  /** A date was pressed. */
  readonly dateTap = output<string>();
  /** A cell on a row the person may change was pressed. */
  readonly cellTap = output<WeekStripTap>();

  protected readonly initials = WEEKDAY_INITIALS;
}
