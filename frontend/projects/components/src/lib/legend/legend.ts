import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Legend (docs/design-system/components/legend.html): what each colour on the
 * sheet means. The swatches are decorative; the words carry the meaning.
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
    </ul>
  `,
  styles: `
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-1) var(--space-4);
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
    .swatch {
      width: 0.75rem;
      height: 0.75rem;
      border-radius: var(--radius-xs);
      flex: none;
      background: var(--status-bg);
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
  protected readonly items = [
    { status: 'confirmed', label: 'Confirmed' },
    { status: 'requested', label: 'Requested' },
    { status: 'tentative', label: 'Tentative' },
    { status: 'off', label: 'Weekend / holiday' },
  ] as const;
}
