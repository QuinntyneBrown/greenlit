import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IsActiveMatchOptions, RouterLink, RouterLinkActive } from '@angular/router';

import { CountPill } from '../badge/badge';

/** One destination in the app navigation. */
export interface AppNavItem {
  readonly label: string;
  readonly link: string;
  /** Match the link exactly when deciding the current item (needed for `/`). */
  readonly exact?: boolean;
  /** A count shown after the label, read as "{n} pending"; nothing at zero or when unset. */
  readonly badge?: number;
}

/**
 * The app navigation row in the top bar (docs/design-system/components/app-nav.html).
 * A `nav` landmark labelled "Main" by default; the current destination gets
 * `aria-current="page"` and the brand underline.
 */
@Component({
  selector: 'gl-app-nav',
  imports: [RouterLink, RouterLinkActive, CountPill],
  host: { style: 'display: contents' },
  template: `
    <nav class="app-nav" [attr.aria-label]="label()">
      @for (item of items(); track item.link) {
        <a
          class="app-nav__link"
          [routerLink]="item.link"
          routerLinkActive
          ariaCurrentWhenActive="page"
          [routerLinkActiveOptions]="activeOptions(item)"
          >{{ item.label }}
          @if (item.badge) {
            <gl-count-pill [count]="item.badge" />
          }
        </a>
      }
    </nav>
  `,
  styles: `
    .app-nav {
      display: flex;
      gap: var(--space-1);
      order: 3;
      width: 100%;
      overflow-x: auto;
      margin-inline: calc(-1 * var(--space-3));
      padding-inline: var(--space-3);
      scrollbar-width: none;
    }
    @media (min-width: 48rem) {
      .app-nav {
        order: 0;
        width: auto;
        margin-inline: 0;
        padding-inline: 0;
      }
    }
    .app-nav__link {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      min-height: var(--target-comfortable);
      padding: 0 var(--space-3);
      color: var(--color-fg-muted);
      font: var(--text-label);
      text-decoration: none;
      white-space: nowrap;
    }
    @media (min-width: 48rem) {
      .app-nav__link {
        min-height: var(--layout-topbar-height);
      }
    }
    .app-nav__link:hover {
      color: var(--color-fg-default);
      text-decoration: none;
    }
    .app-nav__link[aria-current='page'] {
      color: var(--color-fg-default);
    }
    .app-nav__link[aria-current='page']::after {
      content: '';
      position: absolute;
      inset-inline: var(--space-3);
      bottom: 0;
      height: 2px;
      border-radius: var(--radius-full);
      background: var(--color-brand);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppNav {
  readonly items = input.required<readonly AppNavItem[]>();
  /** Accessible name of the navigation landmark. */
  readonly label = input<string>('Main');

  /**
   * A destination stays current whatever its query string says: the calendar
   * on `/?month=2026-10` is still the calendar (L2-049 AC3).
   */
  protected activeOptions(item: AppNavItem): IsActiveMatchOptions {
    return {
      paths: item.exact ? 'exact' : 'subset',
      queryParams: 'ignored',
      matrixParams: 'ignored',
      fragment: 'ignored',
    };
  }
}
