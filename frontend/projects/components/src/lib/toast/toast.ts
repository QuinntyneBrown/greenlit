import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export type ToastTone = 'info' | 'success' | 'warning' | 'danger';

/**
 * Toast (docs/design-system/components/toast.html): a short message on the
 * inverse surface that reports what just happened. Tone icon, title, optional
 * body, an optional action ("Undo", "Try again") and Dismiss. The icon is
 * decorative; the title carries the meaning. A danger toast is `role="alert"`.
 * The stack, timers and live region belong to the app's toast outlet.
 */
@Component({
  selector: 'gl-toast',
  template: `
    <div
      class="toast"
      [class]="'toast toast--' + tone()"
      [attr.role]="tone() === 'danger' ? 'alert' : null"
    >
      @switch (tone()) {
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
      <div class="toast__body">
        <div class="toast__title">{{ title() }}</div>
        @if (text()) {
          <div class="toast__text">{{ text() }}</div>
        }
        @if (action()) {
          <button class="toast__action" type="button" (click)="acted.emit()">
            {{ action() }}
          </button>
        }
      </div>
      <button class="close" type="button" aria-label="Dismiss" (click)="dismissed.emit()">
        <svg class="icon icon--sm" aria-hidden="true" viewBox="0 0 24 24">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
      @if (timed()) {
        <span
          class="toast__progress"
          [class.toast__progress--paused]="paused()"
          aria-hidden="true"
        ></span>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .toast {
      pointer-events: auto;
      position: relative;
      overflow: hidden;
      display: flex;
      gap: var(--space-3);
      align-items: flex-start;
      padding: var(--space-4);
      background: var(--color-bg-inverse);
      color: var(--color-fg-inverse);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-3);
      animation: toast-in var(--duration-base) var(--ease-enter);
    }
    .toast .icon {
      width: 1.25rem;
      height: 1.25rem;
      flex: none;
      margin-top: 0.1rem;
    }
    .toast--info .icon {
      color: var(--color-info-icon-on-inverse);
    }
    .toast--success .icon {
      color: var(--color-success-icon-on-inverse);
    }
    .toast--warning .icon {
      color: var(--color-warning-icon-on-inverse);
    }
    .toast--danger .icon {
      color: var(--color-danger-icon-on-inverse);
    }
    .toast__body {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: var(--space-0-5);
    }
    .toast__title {
      font: var(--text-label);
    }
    .toast__text {
      font: var(--text-body-sm);
      opacity: 0.9;
    }
    .toast__action {
      align-self: flex-start;
      font: var(--text-label);
      color: inherit;
      background: none;
      border: 0;
      padding: var(--space-1) 0;
      text-decoration: underline;
      cursor: pointer;
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
      opacity: 0.8;
    }
    .close:hover {
      opacity: 1;
      background: color-mix(in srgb, currentColor 12%, transparent);
    }
    .toast__progress {
      position: absolute;
      left: 0;
      bottom: 0;
      height: 2px;
      width: 100%;
      background: currentColor;
      opacity: 0.4;
      transform-origin: left;
      animation: toast-progress var(--toast-ms, 8000ms) linear forwards;
    }
    .toast__progress--paused {
      animation-play-state: paused;
    }
    @keyframes toast-in {
      from {
        opacity: 0;
        transform: translateY(0.5rem);
      }
    }
    @keyframes toast-progress {
      to {
        transform: scaleX(0);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .toast,
      .toast__progress {
        animation: none;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Toast {
  readonly tone = input<ToastTone>('info');
  readonly title = input.required<string>();
  readonly text = input<string>('');
  /** Label of the action button ("Undo", "Try again"); none when empty. */
  readonly action = input<string>('');
  /** Draws the countdown line; false for toasts that stay until dismissed. */
  readonly timed = input<boolean>(true);
  readonly paused = input<boolean>(false);
  readonly acted = output<void>();
  readonly dismissed = output<void>();
}
