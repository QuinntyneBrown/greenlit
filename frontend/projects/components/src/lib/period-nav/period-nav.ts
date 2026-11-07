import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Button } from '../button/button';

/**
 * Period navigation (docs/design-system/components/period-nav.html): previous
 * and next arrows, the period as the page's `<h1>`, and "Today" when another
 * period is showing. The labels name the period: "Previous month".
 */
@Component({
  selector: 'gl-period-nav',
  imports: [Button],
  template: `
    <div class="period-nav">
      <div class="period-nav__arrows">
        <gl-button
          variant="ghost"
          [icon]="true"
          [ariaLabel]="'Previous ' + unit()"
          (click)="previous.emit()"
        >
          <svg class="icon icon--lg" aria-hidden="true" viewBox="0 0 24 24">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </gl-button>
        <gl-button
          variant="ghost"
          [icon]="true"
          [ariaLabel]="'Next ' + unit()"
          (click)="next.emit()"
        >
          <svg class="icon icon--lg" aria-hidden="true" viewBox="0 0 24 24">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </gl-button>
      </div>
      <h1>{{ title() }}</h1>
      @if (showToday()) {
        <gl-button size="sm" (click)="today.emit()">Today</gl-button>
      }
    </div>
  `,
  styles: `
    .period-nav {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      flex-wrap: wrap;
    }
    .period-nav__arrows {
      display: flex;
    }
    h1 {
      margin: 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PeriodNav {
  /** "November 2026". */
  readonly title = input.required<string>();
  /** The period's noun for the arrow labels: "month" or "year". */
  readonly unit = input<string>('month');
  /** True when the period shown is not the current one. */
  readonly showToday = input<boolean>(false);

  readonly previous = output<void>();
  readonly next = output<void>();
  readonly today = output<void>();
}
