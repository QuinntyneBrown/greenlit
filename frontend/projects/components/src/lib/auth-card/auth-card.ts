import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { LogoLockup } from '../logo-lockup/logo-lockup';

/**
 * Auth card (docs/design-system/patterns/forms.html, "Auth card"): the
 * bare-shell layout of sign-in and the other account pages. The logo links to
 * sign-in; the card carries the heading, the lead and the projected body; an
 * optional `[slot=note]` sits centred under the card.
 */
@Component({
  selector: 'gl-auth-card',
  imports: [LogoLockup],
  host: { class: 'auth-layout' },
  template: `
    <div class="auth-card stack">
      <div class="logo">
        <gl-logo-lockup [brand]="true" link="/sign-in" label="Greenlit, sign in" />
      </div>
      <div class="card stack">
        <div>
          <h1>{{ title() }}</h1>
          <p class="lead">{{ lead() }}</p>
        </div>
        <ng-content />
      </div>
      <ng-content select="[slot=note]" />
    </div>
  `,
  styles: `
    :host {
      min-height: 100dvh;
      display: grid;
      place-items: center;
      padding: var(--space-6) var(--layout-margin);
    }
    .stack {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }
    .auth-card {
      width: 100%;
      max-width: 26rem;
    }
    .logo {
      display: flex;
      justify-content: center;
      margin-bottom: var(--space-6);
    }
    .card {
      background: var(--color-bg-surface);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-1);
      padding: var(--space-6);
    }
    h1 {
      font-size: var(--font-size-2xl);
    }
    .lead {
      margin-top: var(--space-1);
      color: var(--color-fg-muted);
    }
    @media (forced-colors: active) {
      .card {
        forced-color-adjust: none;
        border: 1px solid CanvasText;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthCard {
  readonly title = input.required<string>();
  readonly lead = input<string>('');
}
