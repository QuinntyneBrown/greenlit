import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ConnectedPosition } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Avatar } from '../avatar/avatar';

/**
 * The account menu (docs/design-system/components/menu.html): the avatar button in the top bar and the
 * menu it opens, on the CDK Menu so it follows the WAI-ARIA menu button pattern. Enter, Space or ArrowDown
 * on the button opens it on the first item; the arrow keys, Home and End move between items; Escape closes
 * it and focus returns to the button. It names the person and their role when they are known and still
 * offers every item when they are not. "Sign out" does not sign out: it emits `signOut` and the page asks first.
 */
@Component({
  selector: 'gl-user-menu',
  imports: [CdkMenu, CdkMenuItem, CdkMenuTrigger, RouterLink, Avatar],
  host: { class: 'user-menu' },
  template: `
    <button
      class="avatar-btn"
      type="button"
      [cdkMenuTriggerFor]="panel"
      [cdkMenuPosition]="positions"
      [attr.aria-label]="buttonLabel()"
    >
      <gl-avatar [name]="name() ?? '?'" />
      <svg class="icon icon--sm" aria-hidden="true" viewBox="0 0 24 24">
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
    <ng-template #panel>
      <ul class="menu" cdkMenu aria-label="Account">
        @if (name()) {
          <li role="none">
            <div class="user-menu__who">
              <strong>{{ name() }}</strong>
              @if (detail()) {
                <span>{{ detail() }}</span>
              }
            </div>
          </li>
          <li role="none"><hr class="menu__divider" /></li>
        }
        <li role="none">
          <a class="menu__item" cdkMenuItem routerLink="/person">
            <svg class="icon icon--sm" aria-hidden="true" viewBox="0 0 24 24">
              <rect x="4" y="5" width="16" height="15" rx="2" />
              <path d="M4 10h16M9 3v4M15 3v4" />
            </svg>
            My time off
          </a>
        </li>
        <li role="none">
          <a class="menu__item" cdkMenuItem routerLink="/account">
            <svg class="icon icon--sm" aria-hidden="true" viewBox="0 0 24 24">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21a8 8 0 0 1 16 0" />
            </svg>
            Account
          </a>
        </li>
        <li role="none">
          <a class="menu__item" cdkMenuItem routerLink="/brand">
            <svg class="icon icon--sm" aria-hidden="true" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 11v5M12 8h.01" />
            </svg>
            Brand guide
          </a>
        </li>
        <li role="none"><hr class="menu__divider" /></li>
        <li role="none">
          <button
            class="menu__item"
            type="button"
            cdkMenuItem
            (cdkMenuItemTriggered)="signOut.emit()"
          >
            <svg class="icon icon--sm" aria-hidden="true" viewBox="0 0 24 24">
              <path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9" />
            </svg>
            Sign out
          </button>
        </li>
      </ul>
    </ng-template>
  `,
  styles: `
    :host {
      position: relative;
      display: block;
    }
    .avatar-btn {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      padding: var(--space-1);
      border: 0;
      background: none;
      border-radius: var(--radius-full);
      color: var(--color-fg-subtle);
      cursor: pointer;
    }
    .avatar-btn:hover,
    .avatar-btn[aria-expanded='true'] {
      background: var(--color-bg-subtle);
    }
    .avatar-btn:focus-visible {
      outline: var(--focus-ring-width) solid var(--color-focus-ring);
      outline-offset: var(--focus-ring-offset, 2px);
    }
    .menu {
      min-width: 15rem;
      padding: var(--space-1);
      margin: var(--space-1) 0 0;
      list-style: none;
      background: var(--color-bg-surface-raised);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-3);
    }
    .menu__item {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      width: 100%;
      min-height: var(--control-height-sm);
      padding: 0 var(--space-3);
      border: 0;
      border-radius: var(--radius-sm);
      background: none;
      color: var(--color-fg-default);
      font: var(--text-body-sm);
      text-align: left;
      text-decoration: none;
      cursor: pointer;
    }
    .menu__item:hover,
    .menu__item:focus-visible {
      background: var(--color-bg-subtle);
      outline: none;
    }
    .menu__item:focus-visible {
      outline: var(--focus-ring-width) solid var(--color-focus-ring);
      outline-offset: calc(-1 * var(--focus-ring-width));
    }
    .menu__divider {
      border: 0;
      border-top: 1px solid var(--color-border-default);
      margin: var(--space-1) 0;
    }
    .user-menu__who {
      padding: var(--space-2) var(--space-3);
    }
    .user-menu__who strong {
      display: block;
      font: var(--text-label);
    }
    .user-menu__who span {
      font: var(--text-caption);
      color: var(--color-fg-muted);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserMenu {
  /** The signed-in person's name; null while it is not known. */
  readonly name = input<string | null>(null);
  /** The line under the name, e.g. "Manager · maya@northwind.studio". */
  readonly detail = input<string | null>(null);
  /** The person chose Sign out. */
  readonly signOut = output<void>();

  protected readonly buttonLabel = computed(() =>
    this.name() ? `Account menu for ${this.name()}` : 'Account menu',
  );
  protected readonly positions: ConnectedPosition[] = [
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top' },
  ];
}
