import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Button } from '../button/button';

/**
 * The "Continue with Google" / "Join with Google" button (docs/detailed-designs/identity-and-access/sign-in-with-google):
 * the design system's default button, full width, carrying the label projected into it. It is a plain
 * `type="button"`, never a submit, so it lives inside the password form without sending it. `busy` and
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
