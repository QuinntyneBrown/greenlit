import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

/**
 * Badge (docs/design-system/components/badge.html): a small uppercase label
 * that says where something stands. The text carries the meaning; the tone
 * only reinforces it.
 */
@Component({
  selector: 'gl-badge',
  host: { style: 'display: contents' },
  template: `<span class="badge" [class]="toneClass()"><ng-content /></span>`,
  styles: `
    .badge {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      padding: 0 var(--space-2);
      min-height: 1.375rem;
      border-radius: var(--radius-full);
      font: var(--text-overline);
      letter-spacing: var(--letter-spacing-wide);
      text-transform: uppercase;
      background: var(--color-bg-subtle);
      color: var(--color-fg-muted);
      white-space: nowrap;
    }
    .badge::before {
      content: '';
      width: 0.375rem;
      height: 0.375rem;
      border-radius: 50%;
      background: currentColor;
    }
    /* An icon badge (Active, Default in Your teams) leads with the projected icon instead of the dot. */
    .badge--icon::before {
      display: none;
    }
    .badge--info {
      background: var(--color-info-bg);
      color: var(--color-info-fg);
    }
    .badge--success {
      background: var(--color-success-bg);
      color: var(--color-success-fg);
    }
    .badge--warning {
      background: var(--color-warning-bg);
      color: var(--color-warning-fg);
    }
    .badge--danger {
      background: var(--color-danger-bg);
      color: var(--color-danger-fg);
    }
    @media (forced-colors: active) {
      .badge {
        forced-color-adjust: none;
        border: 1px solid CanvasText;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Badge {
  readonly tone = input<BadgeTone>('neutral');
  /** True when the label leads with a projected icon, which replaces the dot. */
  readonly icon = input<boolean>(false);

  protected readonly toneClass = computed(
    () =>
      (this.tone() === 'neutral' ? 'badge' : `badge badge--${this.tone()}`) +
      (this.icon() ? ' badge--icon' : ''),
  );
}

/**
 * Count pill: the pending-request count next to Requests in the app
 * navigation. The number is followed by a visually hidden noun so screen
 * readers hear "4 pending", not "4".
 */
@Component({
  selector: 'gl-count-pill',
  host: { style: 'display: contents' },
  template: `<span class="count-pill"
    >{{ count() }}<span class="visually-hidden"> {{ noun() }}</span></span
  >`,
  styles: `
    .count-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.25rem;
      height: 1.25rem;
      padding: 0 var(--space-1);
      border-radius: var(--radius-full);
      background: var(--color-status-requested);
      color: var(--color-on-status);
      font: var(--text-caption);
      font-weight: var(--font-weight-semibold);
      font-variant-numeric: tabular-nums;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CountPill {
  readonly count = input.required<number>();
  /** Hidden noun read after the number. */
  readonly noun = input<string>('pending');
}
