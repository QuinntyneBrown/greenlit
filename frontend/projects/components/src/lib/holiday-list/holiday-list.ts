import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Button } from '../button/button';

export interface HolidayListItem {
  readonly id: string;
  /** The date as shown, e.g. "Thu 1 Jan". */
  readonly date: string;
  readonly name: string;
}

/**
 * Holiday list (pages/settings/default): one row per holiday with its date, its name and a "Remove {name}"
 * button. The button only asks (`removed` carries the holiday's id); the page confirms and removes.
 * The `holiday-row` classes are the mock's, so one set of locators serves both.
 */
@Component({
  selector: 'gl-holiday-list',
  imports: [Button],
  template: `
    <ul class="list card-plain" [attr.aria-label]="label() || null">
      @for (holiday of holidays(); track holiday.id) {
        <li class="holiday-row">
          <span class="holiday-row__date">{{ holiday.date }}</span>
          <span class="holiday-row__name">{{ holiday.name }}</span>
          <gl-button
            variant="ghost"
            size="sm"
            [icon]="true"
            [ariaLabel]="'Remove ' + holiday.name"
            (click)="removed.emit(holiday.id)"
          >
            <svg class="icon icon--sm" aria-hidden="true" viewBox="0 0 24 24">
              <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
            </svg>
          </gl-button>
        </li>
      }
    </ul>
  `,
  styles: `
    :host {
      display: block;
    }
    .list {
      list-style: none;
      margin: 0;
      padding: 0;
      background: var(--color-bg-surface);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-md);
    }
    .holiday-row {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-3) var(--space-4);
      border-bottom: 1px solid var(--color-border-default);
    }
    .holiday-row:last-child {
      border-bottom: 0;
    }
    .holiday-row__date {
      width: 7rem;
      flex: none;
      font: var(--text-body-sm);
      font-variant-numeric: tabular-nums;
      color: var(--color-fg-muted);
    }
    .holiday-row__name {
      flex: 1;
      font: var(--text-body-sm);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HolidayList {
  readonly holidays = input.required<readonly HolidayListItem[]>();
  readonly label = input<string>('');
  /** The id of the holiday whose remove button was pressed. */
  readonly removed = output<string>();
}
