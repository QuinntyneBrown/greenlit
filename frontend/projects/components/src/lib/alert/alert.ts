import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

/** A picture that replaces the tone's icon, for connection banners. */
export type AlertGlyph = 'offline' | 'reconnecting';

/**
 * Alert (docs/design-system/components/alert.html): a message that stays on
 * the page until the situation changes. Four tones, an optional title,
 * projected body text and `[slot=actions]`, an optional Dismiss button, and a
 * full-width `banner` form for page-level and connection status.
 *
 * Failures are announced assertively (`role="alert"`), the other tones
 * politely (`role="status"`). The icon is decorative; the text says it all.
 */
@Component({
  selector: 'gl-alert',
  template: `
    <div
      class="alert"
      [class]="'alert alert--' + tone()"
      [class.banner]="banner()"
      [class.form-summary]="summary()"
      [attr.tabindex]="summary() ? -1 : null"
      [attr.role]="tone() === 'danger' ? 'alert' : 'status'"
    >
      @switch (glyph() ?? tone()) {
        @case ('offline') {
          <svg class="icon" aria-hidden="true" viewBox="0 0 24 24">
            <path d="M3 3l18 18M9 5a6 6 0 0 1 10 4 4 4 0 0 1 2 6M6 18a4 4 0 0 1 0-8" />
          </svg>
        }
        @case ('reconnecting') {
          <svg class="icon" aria-hidden="true" viewBox="0 0 24 24">
            <path d="M20 11a8 8 0 0 0-14-4L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4l2-2M20 20v-5h-5" />
          </svg>
        }
        @case ('success') {
          <svg class="icon" aria-hidden="true" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" />
            <path d="m8 12 3 3 5-6" />
          </svg>
        }
        @case ('warning') {
          <svg class="icon" aria-hidden="true" viewBox="0 0 24 24">
            <path d="M12 4 3 20h18z" />
            <path d="M12 10v4M12 17h.01" />
          </svg>
        }
        @case ('danger') {
          <svg class="icon" aria-hidden="true" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16h.01" />
          </svg>
        }
        @default {
          <svg class="icon" aria-hidden="true" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5M12 8h.01" />
          </svg>
        }
      }
      <div class="alert__body">
        @if (title()) {
          <div class="alert__title">{{ title() }}</div>
        }
        <div><ng-content /></div>
        <div class="alert__actions"><ng-content select="[slot=actions]" /></div>
      </div>
      @if (dismissible()) {
        <button class="close" type="button" aria-label="Dismiss" (click)="dismissed.emit()">
          <svg class="icon icon--sm" aria-hidden="true" viewBox="0 0 24 24">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .alert {
      --alert-bg: var(--color-info-bg);
      --alert-fg: var(--color-info-fg);
      --alert-border: var(--color-info-border);
      --alert-icon: var(--color-info-icon);
      display: flex;
      gap: var(--space-3);
      padding: var(--space-4);
      border: 1px solid var(--alert-border);
      border-left-width: 4px;
      border-radius: var(--radius-md);
      background: var(--alert-bg);
      color: var(--alert-fg);
    }
    .alert--success {
      --alert-bg: var(--color-success-bg);
      --alert-fg: var(--color-success-fg);
      --alert-border: var(--color-success-border);
      --alert-icon: var(--color-success-icon);
    }
    .alert--warning {
      --alert-bg: var(--color-warning-bg);
      --alert-fg: var(--color-warning-fg);
      --alert-border: var(--color-warning-border);
      --alert-icon: var(--color-warning-icon);
    }
    .alert--danger {
      --alert-bg: var(--color-danger-bg);
      --alert-fg: var(--color-danger-fg);
      --alert-border: var(--color-danger-border);
      --alert-icon: var(--color-danger-icon);
    }
    .form-summary {
      border-left: 4px solid var(--color-danger-solid);
    }
    .form-summary:focus:not(:focus-visible) {
      outline: none;
    }
    .alert > .icon {
      width: 1.25rem;
      height: 1.25rem;
      flex: none;
      color: var(--alert-icon);
      margin-top: 0.1rem;
    }
    .alert__body {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }
    .alert__title {
      font: var(--text-label);
    }
    .alert__actions {
      display: flex;
      gap: var(--space-3);
      margin-top: var(--space-1);
    }
    .alert__actions:empty {
      display: none;
    }
    .close {
      background: none;
      border: 0;
      color: inherit;
      cursor: pointer;
      width: var(--target-min);
      height: var(--target-min);
      display: grid;
      place-items: center;
      border-radius: var(--radius-sm);
      margin: calc(-1 * var(--space-1)) calc(-1 * var(--space-1)) 0 0;
    }
    .close:hover {
      background: color-mix(in srgb, currentColor 8%, transparent);
    }
    .banner {
      border-radius: 0;
      border-left-width: 1px;
      border-top: 0;
      border-inline: 0;
      justify-content: center;
    }
    .banner .alert__body {
      flex: 0 1 auto;
      flex-direction: row;
      align-items: center;
      gap: var(--space-4);
      flex-wrap: wrap;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Alert {
  readonly tone = input<AlertTone>('info');
  readonly title = input<string>('');
  /** Replaces the tone's icon. */
  readonly glyph = input<AlertGlyph | null>(null);
  /** Full-width page-level form. */
  readonly banner = input<boolean>(false);
  /** The error summary of a form (`form-summary`), focusable from script; see `gl-form-summary`. */
  readonly summary = input<boolean>(false);
  /** Shows a Dismiss button that emits `dismissed`. */
  readonly dismissible = input<boolean>(false);
  readonly dismissed = output<void>();
}
