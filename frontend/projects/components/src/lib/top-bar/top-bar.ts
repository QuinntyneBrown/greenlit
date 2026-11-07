import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { LogoLockup } from '../logo-lockup/logo-lockup';

/**
 * The app's single global header (docs/design-system/components/top-bar.html):
 * the logo as brand, then the projected navigation, then an optional
 * `[slot=end]` area (team name, account menu) pushed to the right.
 */
@Component({
  selector: 'gl-top-bar',
  imports: [LogoLockup],
  template: `
    <header class="topbar topbar--app">
      <div class="topbar__inner shell">
        <gl-logo-lockup [link]="homeLink()" [brand]="true" />
        <ng-content />
        <div class="topbar__end"><ng-content select="[slot=end]" /></div>
      </div>
    </header>
  `,
  styles: `
    :host {
      display: block;
      position: sticky;
      top: 0;
      z-index: var(--z-sticky);
    }
    .topbar {
      display: block;
      background: var(--color-bg-surface);
      border-bottom: 1px solid var(--color-border-default);
    }
    .topbar__inner {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      column-gap: var(--space-8);
    }
    .topbar__end {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }
    @media print {
      :host {
        display: none;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopBar {
  /** Where the logo leads. */
  readonly homeLink = input<string>('/');
}
