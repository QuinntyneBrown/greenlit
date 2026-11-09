import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Legend (docs/design-system/components/legend.html): what each colour on the
 * sheet means. The swatches are decorative; the words carry the meaning. With `band` it also explains the
 * shading of a day short of people on the phone's week (L2-063 AC13). `--gl-legend-row-gap` spaces wrapped rows.
 */
@Component({
  selector: 'gl-legend',
  template: `
    <ul class="legend" aria-label="Legend">
      @for (item of items; track item.status) {
        <li class="legend__item">
          <span class="swatch" [attr.data-status]="item.status" aria-hidden="true"></span
          >{{ item.label }}
        </li>
      }
      @if (schoolClosed()) {
        <li class="legend__item">
          <svg class="icon legend__closure" aria-hidden="true" viewBox="0 0 24 24">
            <path d="M2 9.5 12 5l10 4.5L12 14z" />
            <path d="M6 11.5V16c3.5 2.5 8.5 2.5 12 0v-4.5" />
          </svg>
          School closed
        </li>
      }
      @if (band()) {
        <li class="legend__item">
          <span class="swatch swatch--band" aria-hidden="true"></span>Short of people
        </li>
      }
    </ul>
  `,
  styles: `
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: var(--gl-legend-row-gap, var(--space-1)) var(--space-4);
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .legend__item {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      font: var(--text-caption);
      color: var(--color-fg-muted);
      white-space: nowrap;
    }
    .legend__closure {
      width: 1rem;
      height: 1rem;
      flex: none;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
      color: var(--color-fg-default);
    }
    .swatch {
      width: 0.75rem;
      height: 0.75rem;
      border-radius: var(--radius-xs);
      flex: none;
      background: var(--status-bg);
    }
    .swatch--band {
      width: 1rem;
      background: color-mix(in srgb, var(--color-fg-default) 7%, transparent);
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-fg-default) 10%, transparent);
    }
    [data-status='confirmed'] {
      --status-bg: var(--color-status-confirmed);
    }
    [data-status='requested'] {
      --status-bg: var(--color-status-requested);
    }
    [data-status='tentative'] {
      --status-bg: var(--color-status-tentative);
    }
    [data-status='off'] {
      --status-bg: var(--color-status-off);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Legend {
  /** The school calendar is on (L2-061 AC3): the legend adds "School closed" with the closure icon. */
  readonly schoolClosed = input<boolean>(false);

  /** Adds "Short of people" for the band of a short day. */
  readonly band = input<boolean>(false);

  protected readonly items = [
    { status: 'confirmed', label: 'Confirmed' },
    { status: 'requested', label: 'Requested' },
    { status: 'tentative', label: 'Tentative' },
    { status: 'off', label: 'Weekend / holiday' },
  ] as const;
}
