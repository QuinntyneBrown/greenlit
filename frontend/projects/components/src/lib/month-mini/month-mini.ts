import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** How a mini day is drawn: the mock's `data-status` values. */
export type MonthMiniStatus = 'empty' | 'off' | 'tentative' | 'requested' | 'confirmed';

/** One day of a mini month: its status and its name ("1 January: New Year's Day"). */
export interface MonthMiniDay {
  readonly status: MonthMiniStatus;
  readonly label: string;
}

/**
 * Month mini (docs/design-system/components/month-mini.html): one month of a person's year as a small
 * Monday-first calendar, each day coloured by its status. Every day is an image named by its date and
 * status, so the colour is never the only carrier (L2-033 AC2).
 */
@Component({
  selector: 'gl-month-mini',
  template: `
    <h3 class="month-mini__title">{{ title() }}</h3>
    <div class="month-mini__days">
      @for (head of heads; track $index) {
        <span class="mini-head" aria-hidden="true">{{ head }}</span>
      }
      @for (blank of blanks(); track $index) {
        <span></span>
      }
      @for (day of days(); track $index) {
        <span
          class="mini-day"
          [attr.data-status]="day.status"
          role="img"
          [attr.aria-label]="day.label"
          [attr.title]="day.label"
          >{{ $index + 1 }}</span
        >
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .month-mini__title {
      font: var(--text-label);
      margin: 0;
    }
    .month-mini__days {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      gap: var(--space-1);
      margin-top: var(--space-2);
      text-align: center;
    }
    .mini-head {
      font: var(--text-caption);
      color: var(--color-fg-subtle);
    }
    .mini-day {
      display: flex;
      align-items: center;
      justify-content: center;
      aspect-ratio: 1;
      border-radius: var(--radius-sm);
      background: var(--status-bg, var(--color-status-empty));
      color: var(--color-on-status);
      font: var(--text-caption);
      font-variant-numeric: tabular-nums;
    }
    .mini-day[data-status='empty'],
    .mini-day[data-status='off'] {
      color: var(--color-fg-muted);
    }
    .mini-day[data-status='off'] {
      --status-bg: var(--color-status-off-soft);
    }
    .mini-day[data-status='tentative'] {
      --status-bg: var(--color-status-tentative);
    }
    .mini-day[data-status='requested'] {
      --status-bg: var(--color-status-requested);
    }
    .mini-day[data-status='confirmed'] {
      --status-bg: var(--color-status-confirmed);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonthMini {
  /** "January". */
  readonly title = input.required<string>();
  /** The weekday of the first day, Monday as 0 to Sunday as 6: how many blank cells lead. */
  readonly offset = input.required<number>();
  /** One entry per calendar day. */
  readonly days = input.required<readonly MonthMiniDay[]>();

  protected readonly heads = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  protected readonly blanks = computed(() => Array.from({ length: this.offset() }));
}
