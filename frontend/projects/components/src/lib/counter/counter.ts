import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { Button } from '../button/button';

/**
 * Counter (docs/design-system/components/counter.html): a stepper that changes a whole number by one
 * between `min` and `max`. The owner keeps the value and decides what a step means (teams/coverage-minimum);
 * the buttons switch off at the bounds, and `disabled` freezes both while a save runs. The readout is a
 * polite `<output>`, so a screen reader hears each step; `suffix` follows it ("of 7 people in").
 */
@Component({
  selector: 'gl-counter',
  imports: [Button],
  template: `
    <div class="counter">
      <gl-button
        [icon]="true"
        [ariaLabel]="decrementLabel()"
        [disabled]="disabled() || !canDecrement()"
        (click)="step(-1)"
      >
        <svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h14" /></svg>
      </gl-button>
      <output class="counter__value" aria-live="polite">{{ value() }}</output>
      <gl-button
        [icon]="true"
        [ariaLabel]="incrementLabel()"
        [disabled]="disabled() || !canIncrement()"
        (click)="step(1)"
      >
        <svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
      </gl-button>
      @if (suffix()) {
        <span class="suffix">{{ suffix() }}</span>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .counter {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }
    .counter__value {
      min-width: 3rem;
      text-align: center;
      font: var(--text-h2);
      font-variant-numeric: tabular-nums;
    }
    .suffix {
      font: var(--text-body-sm);
      color: var(--color-fg-muted);
    }
    .icon {
      width: 1.25rem;
      height: 1.25rem;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Counter {
  readonly value = input.required<number>();
  readonly min = input<number>(0);
  readonly max = input.required<number>();
  readonly decrementLabel = input<string>('Fewer');
  readonly incrementLabel = input<string>('More');
  /** Text after the readout, e.g. "of 7 people in". */
  readonly suffix = input<string>('');
  readonly disabled = input<boolean>(false);
  /** The value after a step, always within `min` and `max`. */
  readonly valueChange = output<number>();

  protected readonly canDecrement = computed(() => this.value() > this.min());
  protected readonly canIncrement = computed(() => this.value() < this.max());

  protected step(by: -1 | 1): void {
    const next = Math.min(this.max(), Math.max(this.min(), this.value() + by));
    if (next !== this.value()) this.valueChange.emit(next);
  }
}
