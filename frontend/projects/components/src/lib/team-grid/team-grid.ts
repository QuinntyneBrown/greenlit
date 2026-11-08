import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';

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
  /** `yyyy-MM-dd`. */
  readonly date: string;
  readonly status: TeamGridCellStatus;
  /** "{member}, {Day d Mon}: {state}": the state always travels in the name too (L2-048). */
  readonly label: string;
  /** A school closure on a child's row (L2-061): drawn as an icon, never as a colour; the label says it too. */
  readonly closure?: string;
}

export interface TeamGridRow {
  readonly memberId: string;
  readonly name: string;
  /** The caller may paint this row: its cells take a press, a drag or Enter. */
  readonly editable: boolean;
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

/** One paint stroke: the days a press, drag or key covered on one member's row, in column order. */
export interface TeamGridStroke {
  readonly memberId: string;
  readonly dates: readonly string[];
}

/** A selection (sheet/select-days): a contiguous range of one member's days, in column order. */
export interface TeamGridSelection {
  readonly memberId: string;
  readonly dates: readonly string[];
}

/**
 * The sheet (docs/design-system/components/team-grid.html): members down the
 * side, days across, a Left column and the Out row. A `role="grid"` labelled
 * "Time off, {Month yyyy}". Cells of an `editable` row can be painted
 * (sheet/mark-days): press or drag across a run of cells with the mouse or a
 * finger, or press Enter or Space on a focused cell. The run previews in the
 * `paint` colour while the pointer is down and is emitted as a `stroke` on
 * release; the page decides what it means. While `loading`, the headings render with placeholder
 * rows and the grid is `aria-busy`.
 */
@Component({
  selector: 'gl-team-grid',
  template: `
    <div class="grid-card">
      <div
        class="team-grid"
        [class.team-grid--left]="showLeft()"
        role="grid"
        [attr.aria-label]="label()"
        [attr.aria-busy]="loading() ? 'true' : null"
        [attr.data-painting]="paint() ? '' : null"
        [attr.data-selecting]="selecting() ? '' : null"
        [style.--days]="columns().length"
        (pointerdown)="onDown($event)"
        (pointermove)="onMove($event)"
        (pointerup)="onUp($event)"
        (pointercancel)="drag.set(null)"
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
          @if (showLeft()) {
            <div role="columnheader" class="grid-colhead grid-colhead--tail">Left</div>
          }
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
          @for (row of rows(); track row.name; let r = $index) {
            <div role="row">
              <div role="rowheader" class="grid-name">
                <span class="avatar avatar--sm" aria-hidden="true">{{ initials(row.name) }}</span>
                <span class="grid-name__text">{{ row.name }}</span>
                @if (row.you) {
                  <span class="grid-name__you">You</span>
                }
              </div>
              @for (cell of row.cells; track $index; let c = $index) {
                <div
                  role="gridcell"
                  class="cell"
                  [attr.data-status]="shown(r, c, cell.status)"
                  [attr.aria-pressed]="row.editable && selecting() ? isSelected(r, c) : null"
                  [attr.data-editable]="row.editable ? '' : null"
                  [attr.data-row]="r"
                  [attr.data-col]="c"
                  [attr.tabindex]="cell.status === 'off' ? null : isActive(r, c) ? 0 : -1"
                  [attr.aria-label]="cell.label"
                  [attr.title]="cell.label"
                  [attr.data-closure]="cell.closure ? 'true' : null"
                >
                  @if (cell.closure) {
                    <svg class="icon cell__closure" aria-hidden="true" viewBox="0 0 24 24">
                      <path d="M2 9.5 12 5l10 4.5L12 14z" />
                      <path d="M6 11.5V16c3.5 2.5 8.5 2.5 12 0v-4.5" />
                    </svg>
                  }
                </div>
              }
              @if (showLeft()) {
                <div
                  role="gridcell"
                  class="grid-left"
                  [attr.data-over]="row.over ? '' : null"
                  [attr.aria-label]="row.leftLabel"
                  [attr.title]="row.leftLabel"
                >
                  {{ row.left }}
                </div>
              }
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
            @if (showLeft()) {
              <div role="gridcell"></div>
            }
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
    .team-grid {
      grid-template-columns: minmax(8.25rem, 11rem) repeat(var(--days, 30), minmax(1.5rem, 1fr));
      min-width: calc(11rem + var(--days, 30) * 1.7rem + 1.5rem);
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
    .cell[data-editable] {
      cursor: pointer;
    }
    /* With a paint colour chosen a finger drags to paint instead of scrolling the sheet. */
    .team-grid[data-painting],
    .team-grid[data-painting] .cell[data-editable] {
      touch-action: none;
    }
    /* In Select mode a horizontal drag selects; a vertical pan still scrolls the page. */
    .team-grid[data-selecting] .cell[data-editable] {
      touch-action: pan-y;
    }
    /* A selected cell is outlined; the bar and aria-pressed say it too. */
    .cell[aria-pressed='true'] {
      box-shadow: inset 0 0 0 2px var(--color-on-status);
    }
    .cell[data-status='empty'][aria-pressed='true'] {
      box-shadow: inset 0 0 0 2px var(--color-fg-default);
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
    /* A school closure on a child's row (L2-061): an icon in the corner, centred on a day with no glyph; never red. */
    .cell[data-closure] {
      position: relative;
    }
    .cell__closure {
      position: absolute;
      top: 2px;
      right: 2px;
      width: 0.75rem;
      height: 0.75rem;
      fill: none;
      stroke: currentColor;
      stroke-width: 2.25;
      stroke-linecap: round;
      stroke-linejoin: round;
      color: var(--color-on-status);
      pointer-events: none;
    }
    .cell[data-status='empty'] .cell__closure,
    .cell[data-status='off'] .cell__closure {
      position: static;
      width: 1rem;
      height: 1rem;
      color: var(--color-fg-default);
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
  host: { '(keydown)': 'onKey($event)', '(focusin)': 'onFocusIn($event)' },
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
  /** The Left column with each person's days left; off where it has no meaning, such as a request's weeks. */
  readonly showLeft = input<boolean>(true);
  /** The colour a stroke previews; `empty` for Clear. Null: painting is off. */
  readonly paint = input<TeamGridCellStatus | null>(null);
  /** A stroke ended on an editable row. */
  readonly stroke = output<TeamGridStroke>();
  /** Select mode: press or drag across a row to select a range; the page shows the selection bar. */
  readonly selectable = input<boolean>(false);
  /** The selection changed; null when it was cleared. */
  readonly selectionChange = output<TeamGridSelection | null>();
  /** Escape cleared a selection. */
  readonly cleared = output<void>();
  /** PageUp (-1) or PageDown (1): the person asks for the previous or next month. */
  readonly monthStep = output<-1 | 1>();

  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  /** Roving focus: the one cell that is a tab stop. Null until a cell is focused. */
  private readonly focusAt = signal<{ row: number; col: number } | null>(null);
  /** After a month change: the row and day of the month to put focus back on. */
  private pendingFocus: { row: number; day: number } | null = null;

  /** Paint mode wins over Select mode while a colour is chosen. */
  protected readonly selecting = computed(() => this.selectable() && !this.paint());
  /**
   * The chosen range on one row: `anchor` is where it began, `head` where it ends. While `open`
   * (after Enter) the arrow keys move the head instead of only moving focus.
   */
  private readonly range = signal<{
    row: number;
    anchor: number;
    head: number;
    open: boolean;
  } | null>(null);

  private readonly selection = computed((): TeamGridSelection | null => {
    const range = this.range();
    const row = range && this.rows()[range.row];
    if (!range || !row?.editable) return null;
    const dates = row.cells
      .slice(Math.min(range.anchor, range.head), Math.max(range.anchor, range.head) + 1)
      .map((cell) => cell.date);
    return dates.length > 0 ? { memberId: row.memberId, dates } : null;
  });

  protected readonly active = computed(() => {
    const at = this.focusAt();
    if (at && this.focusable(at.row, at.col)) return at;
    const rows = this.rows();
    for (let row = 0; row < rows.length; row++) {
      const col = rows[row].cells.findIndex((c) => c.status !== 'off');
      if (col >= 0) return { row, col };
    }
    return null;
  });

  constructor() {
    effect(() => this.emitSelection(this.selection()));
    // Leaving Select mode, or another month, drops the range.
    effect(() => {
      this.selecting();
      this.label();
      untracked(() => this.range.set(null));
    });
    // A month change (PageUp, PageDown) re-renders the rows; focus returns to the same row and day.
    effect(() => {
      const rows = this.rows();
      if (this.loading() || rows.length === 0) return;
      untracked(() => {
        const pending = this.pendingFocus;
        if (!pending) return;
        this.pendingFocus = null;
        const row = Math.min(pending.row, rows.length - 1);
        const col = this.nearestWorkingColumn(row, pending.day - 1);
        if (col === null) return;
        this.focusAt.set({ row, col });
        afterNextRender(() => this.focusCell(row, col), { injector: this.injector });
      });
    });
  }
  protected readonly drag = signal<{ row: number; from: number; to: number } | null>(null);

  protected readonly placeholderRows = Array.from({ length: 5 });
  protected readonly covers = computed(() => this.columns().map((_, i) => this.cover()[i] ?? null));
  protected readonly initials = initialsOf;

  /** What a cell draws: the preview colour inside a running stroke, except on red days. */
  protected shown(row: number, col: number, status: TeamGridCellStatus): TeamGridCellStatus {
    const drag = this.drag();
    const paint = this.paint();
    if (!drag || !paint || status === 'off' || drag.row !== row) return status;
    return col >= Math.min(drag.from, drag.to) && col <= Math.max(drag.from, drag.to)
      ? paint
      : status;
  }

  protected onDown(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const cell = this.editableCellAt(event.target as Element | null);
    if (!cell || !(this.paint() || this.selecting())) return;
    // Keep the move and release events coming here even when the pointer leaves the sheet.
    if (event.pointerType === 'mouse')
      (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
    const range = this.range();
    // Shift extends the range from where it began.
    const from =
      this.selecting() && event.shiftKey && range?.row === cell.row ? range.anchor : cell.col;
    this.drag.set({ row: cell.row, from, to: cell.col });
    // The pointer captured the press, so the browser will not focus the cell itself.
    this.focusCell(cell.row, cell.col, true);
  }

  protected onMove(event: PointerEvent): void {
    const drag = this.drag();
    if (!drag) return;
    const cell = this.editableCellAt(this.document.elementFromPoint(event.clientX, event.clientY));
    if (cell && cell.row === drag.row && cell.col !== drag.to)
      this.drag.set({ ...drag, to: cell.col });
  }

  protected onUp(event: PointerEvent): void {
    this.onMove(event);
    const drag = this.drag();
    this.drag.set(null);
    if (!drag) return;
    if (this.selecting()) this.choose(drag.row, drag.from, drag.to);
    else this.emit(drag.row, drag.from, drag.to);
  }

  /** Whether a cell is in the range being dragged, or else the chosen one. */
  protected isSelected(row: number, col: number): boolean {
    const drag = this.drag();
    const range = drag ? { row: drag.row, anchor: drag.from, head: drag.to } : this.range();
    return (
      range?.row === row &&
      col >= Math.min(range.anchor, range.head) &&
      col <= Math.max(range.anchor, range.head)
    );
  }

  /** Clears the range without announcing it, for the page to call after an action. */
  clearSelection(): void {
    this.range.set(null);
  }

  /** Puts keyboard focus back on the sheet's tab stop. */
  focusActive(): void {
    const active = this.active();
    if (active) this.focusCell(active.row, active.col);
  }

  /** A press on the only selected cell takes the selection back; anything else selects. */
  private choose(row: number, from: number, to: number): void {
    const current = this.range();
    const same = current?.row === row && current.anchor === from && current.head === from;
    this.range.set(from === to && same ? null : { row, anchor: from, head: to, open: false });
  }

  protected isActive(row: number, col: number): boolean {
    const active = this.active();
    return active?.row === row && active.col === col;
  }

  protected onFocusIn(event: FocusEvent): void {
    const cell = this.cellAt(event.target as Element | null);
    if (cell && this.focusable(cell.row, cell.col)) this.focusAt.set(cell);
  }

  /** The keyboard model (APG grid): arrows, Home, End, PageUp, PageDown; Enter or Space on a cell. */
  protected onKey(event: KeyboardEvent): void {
    this.handleKey(event);
    // Tell the page at once, inside the key event, so the selection bar is there for the very next Tab (L2-047)
    // rather than one change detection later.
    this.emitSelection(untracked(() => this.selection()));
  }

  /** The last selection told to the page, so a change is emitted once whichever path notices it first. */
  private emitted: string | undefined;

  private emitSelection(selection: TeamGridSelection | null): void {
    const key = selection ? `${selection.memberId}|${selection.dates.join(',')}` : '';
    if (key === this.emitted) return;
    this.emitted = key;
    this.selectionChange.emit(selection);
  }

  private handleKey(event: KeyboardEvent): void {
    const here = this.cellAt(event.target as Element | null);
    if (!here) return;
    let target: { row: number; col: number } | null;
    switch (event.key) {
      case 'ArrowRight':
        target = this.step(here.row, here.col, 1);
        break;
      case 'ArrowLeft':
        target = this.step(here.row, here.col, -1);
        break;
      case 'ArrowDown':
        target = this.vertical(here.row, here.col, 1);
        break;
      case 'ArrowUp':
        target = this.vertical(here.row, here.col, -1);
        break;
      case 'Home':
        target = event.ctrlKey ? this.edge(1) : this.rowEdge(here.row, 1);
        break;
      case 'End':
        target = event.ctrlKey ? this.edge(-1) : this.rowEdge(here.row, -1);
        break;
      case 'PageUp':
      case 'PageDown': {
        event.preventDefault();
        const date = this.rows()[here.row]?.cells[here.col]?.date;
        if (!date) return;
        this.pendingFocus = { row: here.row, day: Number(date.slice(8, 10)) };
        this.monthStep.emit(event.key === 'PageUp' ? -1 : 1);
        return;
      }
      case 'Escape':
        // Escape clears a selection; the focus stays on the cell.
        if (this.range()) {
          event.preventDefault();
          this.range.set(null);
          this.cleared.emit();
        }
        return;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (this.paint()) this.emit(here.row, here.col, here.col);
        else if (this.selecting()) this.toggleOpen(here.row, here.col);
        return;
      default:
        return;
    }
    event.preventDefault();
    if (!target) return;
    const range = this.range();
    const horizontal = event.key === 'ArrowRight' || event.key === 'ArrowLeft';
    if (this.selecting() && this.rows()[here.row]?.editable) {
      if (range?.open && target.row === range.row) {
        // After Enter the keys move the end of the range.
        this.range.set({ ...range, head: target.col });
      } else if (range?.open) {
        return;
      } else if (event.shiftKey && horizontal) {
        // Shift+arrow starts or extends a range from the cell the key was pressed on.
        const from = range?.row === here.row && range.head === here.col ? range.anchor : here.col;
        this.range.set({ row: here.row, anchor: from, head: target.col, open: false });
      }
    }
    this.focusAt.set(target);
    this.focusCell(target.row, target.col);
  }

  /** Enter or Space in Select mode: start a range here, or end the one being extended. */
  private toggleOpen(row: number, col: number): void {
    if (!this.rows()[row]?.editable) return;
    const range = this.range();
    if (range?.open) {
      this.range.set({ ...range, open: false });
    } else if (range?.row === row && range.anchor === col && range.head === col) {
      this.range.set(null);
    } else {
      this.range.set({ row, anchor: col, head: col, open: true });
    }
  }

  private focusable(row: number, col: number): boolean {
    const status = this.rows()[row]?.cells[col]?.status;
    return status !== undefined && status !== 'off';
  }

  /** The next working cell along the row, or null at its end. */
  private step(row: number, from: number, direction: 1 | -1): { row: number; col: number } | null {
    const cells = this.rows()[row]?.cells ?? [];
    for (let col = from + direction; col >= 0 && col < cells.length; col += direction) {
      if (cells[col].status !== 'off') return { row, col };
    }
    return null;
  }

  /** The same day on the nearest member row that works that day. */
  private vertical(
    from: number,
    col: number,
    direction: 1 | -1,
  ): { row: number; col: number } | null {
    for (let row = from + direction; row >= 0 && row < this.rows().length; row += direction) {
      if (this.focusable(row, col)) return { row, col };
    }
    return null;
  }

  /** The first (1) or last (-1) working cell of a row. */
  private rowEdge(row: number, direction: 1 | -1): { row: number; col: number } | null {
    const cells = this.rows()[row]?.cells ?? [];
    const order = cells.map((_, i) => i);
    if (direction < 0) order.reverse();
    const col = order.find((i) => cells[i].status !== 'off');
    return col === undefined ? null : { row, col };
  }

  /** The first (1) or last (-1) working cell of the sheet. */
  private edge(direction: 1 | -1): { row: number; col: number } | null {
    const count = this.rows().length;
    for (let row = direction > 0 ? 0 : count - 1; row >= 0 && row < count; row += direction) {
      const found = this.rowEdge(row, direction);
      if (found) return found;
    }
    return null;
  }

  /** `col` if that cell works, else the closest working cell after it, else before it. */
  private nearestWorkingColumn(row: number, col: number): number | null {
    const cells = this.rows()[row]?.cells ?? [];
    const start = Math.min(col, cells.length - 1);
    for (let i = start; i < cells.length; i++) if (cells[i].status !== 'off') return i;
    for (let i = start - 1; i >= 0; i--) if (cells[i].status !== 'off') return i;
    return null;
  }

  private focusCell(row: number, col: number, preventScroll = false): void {
    this.host.nativeElement
      .querySelector<HTMLElement>(`.cell[data-row="${row}"][data-col="${col}"]`)
      ?.focus({ preventScroll });
  }

  private cellAt(element: Element | null): { row: number; col: number } | null {
    const cell = element?.closest<HTMLElement>('.cell[data-row]');
    return cell ? { row: Number(cell.dataset['row']), col: Number(cell.dataset['col']) } : null;
  }

  private emit(rowIndex: number, from: number, to: number): void {
    const row = this.rows()[rowIndex];
    if (!row?.editable) return;
    const dates = row.cells.slice(Math.min(from, to), Math.max(from, to) + 1).map((c) => c.date);
    this.stroke.emit({ memberId: row.memberId, dates });
  }

  private editableCellAt(element: Element | null): { row: number; col: number } | null {
    const cell = element?.closest<HTMLElement>('[data-editable]');
    return cell ? { row: Number(cell.dataset['row']), col: Number(cell.dataset['col']) } : null;
  }
}
