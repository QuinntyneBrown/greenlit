import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';

export type TextFieldType = 'text' | 'email' | 'password' | 'number' | 'search';

/**
 * Text field in its form field (docs/design-system/components/text-field.html,
 * form-field.html): a visible label bound with `for`, the `.input` control,
 * optional help, and an error sentence that is added below, sets
 * `aria-invalid` and is referenced from `aria-describedby`.
 *
 * `optional` marks a field that may stay empty. `inputId` is the control's id, so an error summary can link to it. Busy
 * forms set `readonly`, never `disabled`, so values stay announced.
 */
@Component({
  selector: 'gl-text-field',
  template: `
    <div class="field">
      <label class="field__label" [for]="inputId()"
        >{{ label() }}
        @if (optional()) {
          <span class="optional">(optional)</span>
        }
      </label>
      <input
        #control
        class="input"
        [type]="type()"
        [id]="inputId()"
        [name]="name() || inputId()"
        [attr.autocomplete]="autocomplete() || null"
        [attr.aria-invalid]="error() ? 'true' : null"
        [attr.aria-describedby]="describedBy()"
        [readOnly]="readonly()"
        [value]="value()"
        (input)="value.set(control.value)"
        (blur)="blurred.emit()"
      />
      @if (help()) {
        <span class="field__help" [id]="inputId() + '-help'">{{ help() }}</span>
      }
      @if (error()) {
        <span class="field__error" [id]="inputId() + '-err'">{{ error() }}</span>
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
    .field__label .optional {
      color: var(--color-fg-subtle);
      font-weight: var(--font-weight-regular);
    }
    .field__help {
      font: var(--text-body-sm);
      color: var(--color-fg-muted);
    }
    .field__error {
      font: var(--text-body-sm);
      color: var(--color-danger-fg);
      display: flex;
      gap: var(--space-1);
      align-items: flex-start;
    }
    .field__error::before {
      content: '⚠' / '';
      flex: none;
    }
    .input {
      width: 100%;
      min-height: var(--control-height-md);
      padding: var(--space-2) var(--space-3);
      font: var(--text-body);
      color: var(--color-fg-default);
      background: var(--color-bg-surface);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-md);
      transition:
        border-color var(--duration-fast) var(--ease-standard),
        box-shadow var(--duration-fast) var(--ease-standard);
    }
    .input::placeholder {
      color: var(--color-fg-subtle);
    }
    .input:hover {
      border-color: var(--color-fg-muted);
    }
    .input:focus-visible {
      outline: var(--focus-ring-width) solid var(--color-focus-ring);
      outline-offset: 0;
      border-color: var(--color-focus-ring);
      border-radius: var(--radius-md);
    }
    .input[aria-invalid='true'] {
      border-color: var(--color-danger-solid);
      box-shadow: inset 0 0 0 1px var(--color-danger-solid);
    }
    .input:read-only:not(:disabled) {
      background: var(--color-bg-surface-sunken);
    }
    @media (forced-colors: active) {
      .input {
        forced-color-adjust: none;
        border: 1px solid CanvasText;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextField {
  readonly label = input.required<string>();
  /** The input's id; the label, help, error and any summary link use it. */
  readonly inputId = input.required<string>();
  readonly name = input<string>('');
  readonly type = input<TextFieldType>('text');
  readonly autocomplete = input<string>('');
  readonly help = input<string>('');
  /** Adds "(optional)" to the label, which is then part of the accessible name. */
  readonly optional = input<boolean>(false);
  /** The error sentence; empty when the field is valid. */
  readonly error = input<string>('');
  readonly readonly = input<boolean>(false);
  readonly value = model<string>('');
  readonly blurred = output<void>();

  private readonly control = viewChild.required<ElementRef<HTMLInputElement>>('control');

  protected readonly describedBy = computed(() => {
    const ids = [];
    if (this.help()) ids.push(`${this.inputId()}-help`);
    if (this.error()) ids.push(`${this.inputId()}-err`);
    return ids.length ? ids.join(' ') : null;
  });

  focus(): void {
    this.control().nativeElement.focus();
  }
}
