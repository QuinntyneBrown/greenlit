import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  model,
} from '@angular/core';

/** One choice of the control. `swatch` draws the status colour next to the label. */
export interface SegmentedOption {
  readonly value: string;
  readonly label: string;
  readonly swatch?: 'confirmed' | 'requested' | 'tentative' | 'empty';
  /** A pointer glyph instead of a swatch, for the Select mode. */
  readonly pointer?: boolean;
  readonly disabled?: boolean;
  /** Why it is disabled; shown as the tooltip. */
  readonly hint?: string;
}

/**
 * Segmented control (docs/design-system/components/segmented-control.html) as the
 * paint picker: a labelled radio group where exactly one choice is on. One tab
 * stop; the arrow keys move between choices and choose them. The swatch is
 * decorative, so the label always names the choice.
 */
@Component({
  selector: 'gl-segmented-control',
  template: `
    <div class="paint-picker">
      <span [id]="labelId" class="paint-picker__label">{{ label() }}</span>
      <div class="segmented" role="radiogroup" [attr.aria-labelledby]="labelId">
        @for (option of options(); track option.value) {
          <button
            class="segmented__btn"
            type="button"
            role="radio"
            [attr.aria-checked]="option.value === value()"
            [attr.tabindex]="option.value === value() ? 0 : -1"
            [attr.title]="option.hint ?? null"
            [disabled]="option.disabled"
            (click)="value.set(option.value)"
            (keydown)="onKeydown($event)"
          >
            @if (option.pointer) {
              <svg class="icon icon--sm" aria-hidden="true" viewBox="0 0 24 24">
                <path d="m5 3 14 7-6 2-2 6z" />
              </svg>
            } @else if (option.swatch) {
              <span class="swatch" [attr.data-status]="option.swatch" aria-hidden="true"></span>
            }
            {{ option.label }}
          </button>
        }
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
      max-width: 100%;
    }
    .paint-picker {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      min-width: 0;
      max-width: 100%;
    }
    .paint-picker__label {
      font: var(--text-caption);
      font-weight: var(--font-weight-medium);
      color: var(--color-fg-muted);
    }
    .segmented {
      display: inline-flex;
      gap: var(--space-0-5);
      padding: var(--space-0-5);
      min-width: 0;
      max-width: 100%;
      overflow-x: auto;
      background: var(--color-bg-surface);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-md);
    }
    .segmented__btn {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      min-height: var(--target-comfortable);
      padding: 0 var(--space-3);
      border: 0;
      border-radius: var(--radius-sm);
      background: none;
      color: var(--color-fg-muted);
      font: var(--text-caption);
      font-weight: var(--font-weight-medium);
      white-space: nowrap;
      cursor: pointer;
    }
    .segmented__btn:hover {
      background: var(--color-bg-subtle);
    }
    .segmented__btn[aria-checked='true'] {
      background: var(--color-fg-default);
      color: var(--color-bg-surface);
    }
    .segmented__btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .swatch {
      width: 0.75rem;
      height: 0.75rem;
      border-radius: var(--radius-xs);
      flex: none;
      background: var(--status-bg, var(--color-status-empty));
      box-shadow: inset 0 0 0 1px var(--color-border-default);
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
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SegmentedControl {
  private static nextId = 0;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The group's name, shown before the choices ("Paint"). */
  readonly label = input.required<string>();
  readonly options = input.required<readonly SegmentedOption[]>();
  /** The `value` of the chosen option. */
  readonly value = model.required<string>();

  protected readonly labelId = `gl-segmented-${SegmentedControl.nextId++}`;

  protected onKeydown(event: KeyboardEvent): void {
    const step =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;
    if (step === 0) return;
    const options = this.options();
    const start = options.findIndex((o) => o.value === this.value());
    // The next enabled option in that direction, wrapping round.
    const ordered = options.map(
      (_, i) => options[(start + step * (i + 1) + options.length * 2) % options.length],
    );
    const next = ordered.find((o) => !o.disabled);
    if (!next) return;
    event.preventDefault();
    this.value.set(next.value);
    queueMicrotask(() =>
      this.host.nativeElement.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus(),
    );
  }
}
