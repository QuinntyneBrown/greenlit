import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Day chips (docs/design-system/components/chip.html, "Day chips"): the seven weekdays as pressed or not,
 * in a labelled group. `pressed` lists the day numbers that are on, Monday as 1 to Sunday as 7; pressing a
 * chip emits its number as `toggled` and the owner decides what is on (teams/working-days). `disabled`
 * freezes the group while a save runs.
 */
@Component({
  selector: 'gl-day-chips',
  template: `
    <div
      class="cluster"
      role="group"
      [attr.aria-label]="label()"
      [attr.id]="groupId() || null"
      [attr.tabindex]="groupId() ? -1 : null"
    >
      @for (day of days; track day; let i = $index) {
        <button
          class="chip chip--day"
          type="button"
          [disabled]="disabled()"
          [attr.aria-pressed]="pressed().includes(i + 1)"
          (click)="toggled.emit(i + 1)"
        >
          {{ day }}
        </button>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .cluster {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }
    .chip {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 3rem;
      min-height: var(--control-height-sm);
      padding: 0 var(--space-3);
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border-strong);
      background: var(--color-bg-surface);
      color: var(--color-fg-default);
      font: var(--text-label);
    }
    .chip:disabled {
      cursor: default;
      opacity: 0.6;
    }
    .chip[aria-pressed='true'] {
      background: var(--color-accent-subtle);
      border-color: var(--color-accent);
      color: var(--color-fg-accent);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DayChips {
  protected readonly days = DAYS;
  readonly label = input<string>('Working days');
  readonly pressed = input.required<readonly number[]>();
  /** An id for the group, so an error summary can link to it. */
  readonly groupId = input<string>('');
  readonly disabled = input<boolean>(false);
  readonly toggled = output<number>();
}
