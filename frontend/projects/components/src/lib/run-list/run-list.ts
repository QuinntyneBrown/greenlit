import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** What leads a row: the status swatch of a run, or the signed days of an adjustment. */
export interface RunListItem {
  /** A run's status colour; the status is also in words (`status`). */
  readonly swatch?: 'tentative' | 'requested' | 'confirmed';
  /** An adjustment's days, signed ("+3", "-2"). */
  readonly adjustment?: string;
  readonly negative?: boolean;
  /** "13–24 Jul", or the reason of an adjustment. */
  readonly range: string;
  /** "10 days", or the date of an adjustment. */
  readonly days: string;
  /** "Confirmed"; absent for an adjustment. */
  readonly status?: string;
}

/**
 * Run list (docs/design-system/components/list.html): a person's time off as one row per run, or their
 * allowance adjustments, each ruled off from the next.
 */
@Component({
  selector: 'gl-run-list',
  template: `
    <ul class="run-list">
      @for (item of items(); track $index) {
        <li>
          @if (item.swatch) {
            <span class="swatch" [attr.data-status]="item.swatch" aria-hidden="true"></span>
          } @else {
            <span class="adj" [attr.data-negative]="item.negative ? '' : null">{{
              item.adjustment
            }}</span>
          }
          <span class="run-list__range" [class.run-list__range--plain]="!item.swatch">{{
            item.range
          }}</span>
          <span class="run-list__days">{{ item.days }}</span>
          @if (item.status) {
            <span class="run-list__status">{{ item.status }}</span>
          }
        </li>
      }
    </ul>
  `,
  styles: `
    :host {
      display: block;
    }
    .run-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    li {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding-block: var(--space-3);
      border-bottom: 1px solid var(--color-border-default);
    }
    li:last-child {
      border-bottom: 0;
    }
    .swatch {
      width: 0.75rem;
      height: 0.75rem;
      border-radius: var(--radius-xs);
      flex: none;
      background: var(--status-bg);
    }
    .swatch[data-status='confirmed'] {
      --status-bg: var(--color-status-confirmed);
    }
    .swatch[data-status='requested'] {
      --status-bg: var(--color-status-requested);
    }
    .swatch[data-status='tentative'] {
      --status-bg: var(--color-status-tentative);
    }
    .run-list__range {
      flex: 1;
      min-width: 0;
      font: var(--text-label);
      overflow-wrap: anywhere;
    }
    .run-list__range--plain {
      font-weight: var(--font-weight-regular);
    }
    .run-list__days {
      font: var(--text-body-sm);
      color: var(--color-fg-muted);
      font-variant-numeric: tabular-nums;
    }
    .run-list__status {
      min-width: 5rem;
      text-align: right;
      font: var(--text-caption);
      color: var(--color-fg-muted);
    }
    .adj {
      min-width: 3rem;
      font: var(--text-label);
      font-variant-numeric: tabular-nums;
      color: var(--color-fg-accent);
    }
    .adj[data-negative] {
      color: var(--color-danger-fg);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RunList {
  readonly items = input.required<readonly RunListItem[]>();
}
