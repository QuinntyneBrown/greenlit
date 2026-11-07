import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/** One destination in the app navigation. */
export interface AppNavItem {
  readonly label: string;
  readonly link: string;
  /** Match the link exactly when deciding the current item (needed for `/`). */
  readonly exact?: boolean;
}

/**
 * The app navigation row in the top bar (docs/design-system/components/app-nav.html).
 * A `nav` landmark labelled "Main" by default; the current destination gets
 * `aria-current="page"` and the brand underline.
 */
@Component({
  selector: 'gl-app-nav',
  imports: [RouterLink, RouterLinkActive],
  host: { style: 'display: contents' },
  template: `
    <nav class="app-nav" [attr.aria-label]="label()">
      @for (item of items(); track item.link) {
        <a
          class="app-nav__link"
          [routerLink]="item.link"
          routerLinkActive
          ariaCurrentWhenActive="page"
          [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
          >{{ item.label }}</a
        >
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
}
