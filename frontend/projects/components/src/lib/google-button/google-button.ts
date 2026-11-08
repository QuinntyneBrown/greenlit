import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Button } from '../button/button';

/**
 * The "Continue with Google" / "Join with Google" button (docs/detailed-designs/identity-and-access/sign-in-with-google):
 * the design system's default button, full width, with Google's "G" mark (hidden while busy) before the label
 * projected into it. It is a plain `type="button"`, never a submit, so it lives inside the password form
 * without sending it. `busy` and
 * `disabled` work as on `gl-button`; the host wires `(pressed)` to asking Google for an access token.
 */
@Component({
  selector: 'gl-google-button',
  imports: [Button],
  host: { style: 'display: contents' },
  template: `
    <gl-button
      type="button"
      [block]="true"
      [busy]="busy()"
      [disabled]="disabled() || busy()"
      (click)="press()"
    >
      @if (!busy()) {
        <svg class="icon" aria-hidden="true" viewBox="0 0 24 24">
          <g stroke="none">
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3a7.2 7.2 0 0 1-10.7-3.8H1.4v3.1A12 12 0 0 0 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.4a12 12 0 0 0 0 10.8l3.9-3.1z"
            />
            <path
              fill="#EA4335"
              d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l3.9 3.1A7.2 7.2 0 0 1 12 4.8z"
            />
          </g>
        </svg>
      }
      <ng-content />
    </gl-button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoogleButton {
  /** True while Google's window is open or the API is answering: the spinner shows and nothing else can be pressed. */
  readonly busy = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  /** The person pressed the button (ignored while busy or disabled). */
  readonly pressed = output<void>();

  protected press(): void {
    if (this.busy() || this.disabled()) return;
    this.pressed.emit();
  }
}
