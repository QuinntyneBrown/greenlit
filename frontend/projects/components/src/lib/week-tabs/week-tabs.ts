import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';

/** One week of the month. */
export interface WeekTab {
  /** The week's days in the month: "1", "2–8", …, "30". */
  readonly label: string;
  /** The week holds a short day: the tab carries a marker named "Short of people this week". */
  readonly short: boolean;
}

/**
 * Week tabs (docs/design-system/components/week-tabs.html): the weeks of the month on a phone, a `tablist`
 * labelled "Week". The selected tab has `aria-selected="true"`; only it is in the tab order (roving
 * `tabindex`), and the arrow keys, Home and End move to a tab and select it. A week that holds a short day
 * carries a marker with its own name. The tabs control the week strip, whose id is `panelId`.
 */
@Component({
  selector: 'gl-week-tabs',
  template: `
    <div class="week-tabs" role="tablist" aria-label="Week" [style.--weeks]="tabs().length">
      @for (tab of tabs(); track $index; let i = $index) {
        <button
          class="week-tab"
          type="button"
          role="tab"
          [attr.aria-controls]="panelId()"
          [attr.aria-selected]="i === selected()"
          [attr.tabindex]="i === selected() ? null : -1"
          (click)="selectedChange.emit(i)"
          (keydown)="onKey($event, i)"
        >
          {{ tab.label }}
          @if (tab.short) {
            <span class="week-tab__mark" role="img" aria-label="Short of people this week"></span>
          }
        </button>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .week-tabs {
      display: grid;
      grid-template-columns: repeat(var(--weeks, 5), minmax(0, 1fr));
      gap: var(--space-1);
      padding: var(--space-1);
      border-radius: var(--radius-md);
      background: var(--color-bg-subtle);
    }
    .week-tab {
      position: relative;
      min-height: var(--target-min);
      padding: 0 var(--space-1);
      border: 0;
      border-radius: var(--radius-sm);
      background: none;
      color: var(--color-fg-muted);
      font: var(--text-caption);
      font-weight: var(--font-weight-medium);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
      cursor: pointer;
    }
    .week-tab:hover {
      color: var(--color-fg-default);
    }
    .week-tab:focus-visible {
      outline: var(--focus-ring-width) solid var(--color-focus-ring);
      outline-offset: -2px;
    }
    .week-tab[aria-selected='true'] {
      background: var(--color-bg-surface);
      color: var(--color-fg-default);
      box-shadow: var(--shadow-1);
    }
    .week-tab__mark {
      position: absolute;
      top: var(--space-1);
      right: var(--space-1);
      width: 0.375rem;
      height: 0.375rem;
      border-radius: var(--radius-full);
      background: var(--color-fg-default);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeekTabs {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly tabs = input.required<readonly WeekTab[]>();
  /** The index of the selected week. */
  readonly selected = input.required<number>();
  /** The id of the week strip the tabs control. */
  readonly panelId = input<string>('week-card');

  /** A week was pressed or reached with the keyboard. */
  readonly selectedChange = output<number>();

  protected onKey(event: KeyboardEvent, current: number): void {
    const last = this.tabs().length - 1;
    const moves: Record<string, number> = {
      ArrowRight: current === last ? 0 : current + 1,
      ArrowLeft: current === 0 ? last : current - 1,
      Home: 0,
      End: last,
    };
    const target = moves[event.key];
    if (target === undefined) return;
    event.preventDefault();
    this.selectedChange.emit(target);
    this.host.nativeElement.querySelectorAll<HTMLElement>('[role=tab]')[target]?.focus();
  }
}
