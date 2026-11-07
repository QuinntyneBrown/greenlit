import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  model,
  viewChild,
} from '@angular/core';

/**
 * Textarea in its form field (docs/design-system/components/textarea.html, form-field.html): a visible
 * label bound with `for`, the `.textarea` control, optional help and an error sentence referenced from
 * `aria-describedby`. It shares the text field's rules and adds a minimum height of two and a half rows
 * and vertical resize.
 *
 * `optional` marks a field that may stay empty. `inputId` is the control's id. Busy forms set `readonly`,
 * never `disabled`, so the text stays announced.
 */
@Component({
  selector: 'gl-textarea-field',
  template: `
    <div class="field">
      <label class="field__label" [for]="inputId()"
        >{{ label() }}
        @if (optional()) {
          <span class="optional">(optional)</span>
        }
      </label>
      <textarea
        #control
        class="textarea"
        [rows]="rows()"
        [id]="inputId()"
        [name]="inputId()"
        [attr.placeholder]="placeholder() || null"
        [attr.maxlength]="maxLength() || null"
        [attr.aria-invalid]="error() ? 'true' : null"
        [attr.aria-describedby]="describedBy()"
        [readOnly]="readonly()"
        [value]="value()"
        (input)="value.set(control.value)"
      ></textarea>
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
    }
    .textarea {
      width: 100%;
      min-height: calc(var(--control-height-md) * 2.5);
      padding: var(--space-2) var(--space-3);
      font: var(--text-body);
      color: var(--color-fg-default);
      background: var(--color-bg-surface);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-md);
      resize: vertical;
      transition:
        border-color var(--duration-fast) var(--ease-standard),
        box-shadow var(--duration-fast) var(--ease-standard);
    }
    .textarea::placeholder {
      color: var(--color-fg-subtle);
    }
    .textarea:hover {
      border-color: var(--color-fg-muted);
    }
    .textarea:focus-visible {
      outline: var(--focus-ring-width) solid var(--color-focus-ring);
      outline-offset: 0;
      border-color: var(--color-focus-ring);
    }
    .textarea[aria-invalid='true'] {
      border-color: var(--color-danger-solid);
      box-shadow: inset 0 0 0 1px var(--color-danger-solid);
    }
    .textarea:read-only:not(:disabled) {
      background: var(--color-bg-surface-sunken);
    }
    @media (forced-colors: active) {
      .textarea {
        forced-color-adjust: none;
        border: 1px solid CanvasText;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextareaField {
  readonly label = input.required<string>();
  /** The control's id; the label, help and error use it. */
  readonly inputId = input.required<string>();
  /** Example text shown in an empty field; never the label. */
  readonly placeholder = input<string>('');
  readonly help = input<string>('');
  /** Adds "(optional)" to the label, which is then part of the accessible name. */
  readonly optional = input<boolean>(false);
  /** The error sentence; empty when the field is valid. */
  readonly error = input<string>('');
  readonly readonly = input<boolean>(false);
  readonly rows = input<number>(3);
  /** The longest text the control takes; 0 for no limit. */
  readonly maxLength = input<number>(0);
  readonly value = model<string>('');

  private readonly control = viewChild.required<ElementRef<HTMLTextAreaElement>>('control');

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
