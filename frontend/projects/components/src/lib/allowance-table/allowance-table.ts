import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

import { initialsOf } from '../avatar/avatar';
import { Button } from '../button/button';

/** One person's row of the allowance table. */
export interface AllowanceTableRow {
  readonly memberId: string;
  readonly name: string;
  readonly allowance: number;
  readonly used: number;
  readonly booked: number;
  readonly requested: number;
  readonly left: number;
  /** Used plus booked as a percentage of the allowance, 0 to 100: the green segment. */
  readonly takenPercent: number;
  /** Requested days as a percentage of the allowance, 0 to 100: the yellow segment. */
  readonly requestedPercent: number;
  /** "{used + booked} of {allowance} days taken or booked, {requested} requested": the bar's name. */
  readonly usageLabel: string;
}

/**
 * Allowance table (docs/design-system/components/year-grid.html, table.html): one row per person with the
 * allowance figures and a usage bar of confirmed (green) and requested (yellow) days. The toolbar
 * above it has the sort toggle "Most days left first" (`aria-pressed`); the page orders the rows.
 */
@Component({
  selector: 'gl-allowance-table',
  imports: [Button],
  template: `
    <section aria-labelledby="allowance-title">
      <div class="toolbar-row">
        <div>
          <h2 id="allowance-title" class="section-title">{{ title() }}</h2>
          <p class="text-muted text-sm hint">{{ hint() }}</p>
        </div>
        <gl-button size="sm" [pressed]="sorted()" (click)="sorted.set(!sorted())">
          <svg class="icon" aria-hidden="true" viewBox="0 0 24 24">
            <path d="M3 6h7M3 12h11M3 18h15M18 9v10m0 0 3-3m-3 3-3-3" />
          </svg>
          Most days left first
        </gl-button>
      </div>
      <div class="table-wrap">
        <table class="table summary-table">
          <caption class="visually-hidden">
            {{
              title()
            }}
          </caption>
          <thead>
            <tr>
              <th scope="col">Person</th>
              <th scope="col" class="num">Allowance</th>
              <th scope="col" class="num">Used</th>
              <th scope="col" class="num">Booked</th>
              <th scope="col" class="num">Requested</th>
              <th scope="col" class="num" [attr.aria-sort]="sorted() ? 'descending' : null">
                Left
              </th>
              <th scope="col"><span class="visually-hidden">Usage</span></th>
            </tr>
          </thead>
          <tbody>
            @for (row of rows(); track row.memberId) {
              <tr>
                <td>
                  <span class="cluster">
                    <span class="avatar" aria-hidden="true">{{ initials(row.name) }}</span>
                    <span class="person">{{ row.name }}</span>
                  </span>
                </td>
                <td class="num">{{ row.allowance }}</td>
                <td class="num">{{ row.used }}</td>
                <td class="num">{{ row.booked }}</td>
                <td class="num">{{ row.requested }}</td>
                <td class="num left">{{ row.left }}</td>
                <td class="usage-cell">
                  <div class="usage-bar" role="img" [attr.aria-label]="row.usageLabel">
                    <span
                      class="usage-bar__seg"
                      data-status="confirmed"
                      [style.--value]="row.takenPercent + '%'"
                    ></span>
                    <span
                      class="usage-bar__seg"
                      data-status="requested"
                      [style.--value]="row.requestedPercent + '%'"
                    ></span>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    .toolbar-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
    }
    .section-title {
      margin: 0;
    }
    .hint {
      margin: var(--space-1) 0 0;
    }
    .table-wrap {
      position: relative;
      overflow-x: auto;
      margin-top: var(--space-4);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-lg);
      background: var(--color-bg-surface);
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      font: var(--text-body-sm);
    }
    th,
    td {
      text-align: left;
      padding: var(--space-3) var(--space-4);
      border-bottom: 1px solid var(--color-border-default);
      vertical-align: middle;
      white-space: nowrap;
    }
    th {
      background: var(--color-bg-surface-sunken);
      font: var(--text-label);
      color: var(--color-fg-muted);
    }
    tbody tr:last-child td {
      border-bottom: 0;
    }
    tbody tr:hover {
      background: var(--color-bg-subtle);
    }
    .num {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .left {
      font-weight: var(--font-weight-semibold);
    }
    .cluster {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      flex-wrap: nowrap;
    }
    .person {
      font-weight: var(--font-weight-medium);
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
    .usage-cell {
      width: 28%;
      min-width: 9rem;
    }
    .usage-bar {
      display: flex;
      height: 0.5rem;
      border-radius: var(--radius-full);
      overflow: hidden;
      background: var(--color-bg-subtle-hover);
    }
    .usage-bar__seg {
      width: var(--value, 0%);
      background: var(--status-bg);
    }
    .usage-bar__seg[data-status='confirmed'] {
      --status-bg: var(--color-status-confirmed);
    }
    .usage-bar__seg[data-status='requested'] {
      --status-bg: var(--color-status-requested);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AllowanceTable {
  /** "Allowance in 2026": the section heading and the table's caption. */
  readonly title = input.required<string>();
  readonly hint = input<string>("Sort by days left to see who hasn't had a break yet.");
  readonly rows = input.required<readonly AllowanceTableRow[]>();
  /** The rows are ordered by days left, most first. */
  readonly sorted = model<boolean>(false);

  protected initials(name: string): string {
    return initialsOf(name);
  }
}
