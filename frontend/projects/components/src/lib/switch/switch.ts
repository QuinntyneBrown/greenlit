import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

let nextId = 0;

/**
 * Switch (docs/design-system/components/switch.html): a native `<input type="checkbox" role="switch">`
 * inside its label, so Space toggles it and a screen reader announces "switch, on/off". The label names
 * what is turned on ("New requests", never "Enable new requests"); the description is linked with
 * `aria-describedby`. The owner keeps the state through `checked` and decides when it is saved.
 */
@Component({
  selector: 'gl-switch',
  template: `
    <label class="switch">
      <input
        type="checkbox"
        role="switch"
        [checked]="checked()"
        [disabled]="disabled()"
        [attr.aria-describedby]="describedBy()"
        (change)="toggle($event)"
      />
      <span class="choice__text">
        <span class="choice__label">{{ label() }}</span>
        @if (description()) {
          <small [id]="descriptionId" class="text-muted">{{ description() }}</small>
        }
        @if (note()) {
          <small [id]="noteId" class="text-muted">{{ note() }}</small>
        }
      </span>
    </label>
  `,
  styles: `
    :host {
      display: block;
    }
    .switch {
      display: inline-flex;
      align-items: flex-start;
      gap: var(--space-3);
      cursor: pointer;
      min-height: var(--target-min);
    }
    .switch input {
      appearance: none;
      margin: 0;
      flex: none;
      width: 2.75rem;
      height: 1.5rem;
      border-radius: var(--radius-full);
      background: var(--color-border-strong);
      position: relative;
      cursor: pointer;
      transition: background-color var(--duration-base) var(--ease-standard);
    }
    .switch input::before {
      content: '';
      position: absolute;
      top: 0.125rem;
      left: 0.125rem;
      width: 1.25rem;
      height: 1.25rem;
      border-radius: 50%;
      background: var(--color-bg-surface);
      box-shadow: var(--shadow-1);
      transition: translate var(--duration-base) var(--ease-standard);
    }
    .switch input:checked {
      background: var(--color-accent);
    }
    .switch input:checked::before {
      translate: 1.25rem 0;
    }
    .switch input:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .switch input:focus-visible {
      outline: 2px solid var(--color-focus-ring);
      outline-offset: 2px;
    }
    .choice__text {
      display: flex;
      flex-direction: column;
      gap: var(--space-0-5);
    }
    .choice__label {
      font: var(--text-label);
    }
    small {
      color: var(--color-fg-muted);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Switch {
  readonly label = input.required<string>();
  readonly description = input<string>('');
  /** A second line under the description, e.g. what turning it off does (pages/settings/school-calendar). */
  readonly note = input<string>('');
  readonly checked = model<boolean>(false);
  readonly disabled = input<boolean>(false);

  protected readonly descriptionId = `gl-switch-description-${nextId}`;
  protected readonly noteId = `gl-switch-note-${nextId++}`;

  protected describedBy(): string | null {
    const ids = [
      this.description() ? this.descriptionId : '',
      this.note() ? this.noteId : '',
    ].filter(Boolean);
    return ids.length ? ids.join(' ') : null;
  }

  protected toggle(event: Event): void {
    this.checked.set((event.target as HTMLInputElement).checked);
  }
}
