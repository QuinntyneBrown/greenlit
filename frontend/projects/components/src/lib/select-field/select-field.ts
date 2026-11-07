import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';

export interface SelectOption {
  readonly value: string;
  readonly label: string;
}

/**
 * Select in its form field (docs/design-system/components/select.html,
 * form-field.html): the native `<select class="select">` with a visible label
 * bound with `for` and optional help referenced from `aria-describedby`. The
 * native control keeps the platform's keyboard handling and the phone picker.
 */
@Component({
  selector: 'gl-select-field',
  template: `
    <div class="field">
      <label class="field__label" [for]="selectId()">{{ label() }}</label>
      <select
        #control
        class="select"
        [id]="selectId()"
        [name]="selectId()"
        [attr.aria-describedby]="help() ? selectId() + '-help' : null"
        (change)="value.set(control.value)"
      >
        @for (option of options(); track option.value) {
          <option [value]="option.value" [selected]="option.value === value()">
            {{ option.label }}
          </option>
        }
      </select>
      @if (help()) {
        <span class="field__help" [id]="helpId()">{{ help() }}</span>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }
    .field__label {
      font: var(--text-label);
      color: var(--color-fg-default);
      display: flex;
      gap: var(--space-1);
    }
    .field__help {
      font: var(--text-body-sm);
      color: var(--color-fg-muted);
    }
    .select {
      width: 100%;
      min-height: var(--control-height-md);
      padding: var(--space-2) var(--space-10) var(--space-2) var(--space-3);
      font: var(--text-body);
      color: var(--color-fg-default);
      background-color: var(--color-bg-surface);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-md);
      appearance: none;
      background-image:
        linear-gradient(45deg, transparent 50%, currentColor 50%),
        linear-gradient(135deg, currentColor 50%, transparent 50%);
      background-position:
        calc(100% - 18px) 50%,
        calc(100% - 13px) 50%;
      background-size: 5px 5px;
      background-repeat: no-repeat;
      transition: border-color var(--duration-fast) var(--ease-standard);
    }
    .select:hover {
      border-color: var(--color-fg-muted);
    }
    .select:focus-visible {
      outline: var(--focus-ring-width) solid var(--color-focus-ring);
      outline-offset: 0;
      border-color: var(--color-focus-ring);
      border-radius: var(--radius-md);
    }
    .select:disabled {
      background-color: var(--color-bg-subtle);
      color: var(--color-fg-disabled);
      cursor: not-allowed;
      border-color: var(--color-border-default);
    }
    @media (forced-colors: active) {
      .select {
        forced-color-adjust: none;
        border: 1px solid CanvasText;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectField {
  readonly label = input.required<string>();
  /** The select's id; the label and help use it. */
  readonly selectId = input.required<string>();
  readonly options = input.required<readonly SelectOption[]>();
  readonly help = input<string>('');
  readonly value = model<string>('');

  protected readonly helpId = computed(() => `${this.selectId()}-help`);
}
