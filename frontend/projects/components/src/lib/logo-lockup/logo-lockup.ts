import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * The Greenlit mark and wordmark (docs/design-system/components/logo-lockup.html):
 * a month in miniature with four cells tracing a check, and the lowercase
 * name with a green dot on the i.
 *
 * Rendered as a router link labelled "Greenlit, team calendar" by default; auth
 * pages link it to sign-in as "Greenlit, sign in"; the marketing site gives it
 * a plain `href` (`#top`). In the top bar and on auth cards it also carries
 * `topbar__brand`, as in the mocks.
 */
@Component({
  selector: 'gl-logo-lockup',
  imports: [NgTemplateOutlet, RouterLink],
  host: { style: 'display: contents' },
  template: `
    <ng-template #mark>
      <svg class="logo-lockup__mark" viewBox="0 0 41 30" aria-hidden="true">
        <rect class="mark__n" x="0" y="0" width="8" height="8" rx="1.75" />
        <rect class="mark__n" x="11" y="0" width="8" height="8" rx="1.75" />
        <rect class="mark__n" x="22" y="0" width="8" height="8" rx="1.75" />
        <rect class="mark__c" x="33" y="0" width="8" height="8" rx="1.75" />
        <rect class="mark__c" x="0" y="11" width="8" height="8" rx="1.75" />
        <rect class="mark__n" x="11" y="11" width="8" height="8" rx="1.75" />
        <rect class="mark__c" x="22" y="11" width="8" height="8" rx="1.75" />
        <rect class="mark__n" x="33" y="11" width="8" height="8" rx="1.75" />
        <rect class="mark__n" x="0" y="22" width="8" height="8" rx="1.75" />
        <rect class="mark__c" x="11" y="22" width="8" height="8" rx="1.75" />
        <rect class="mark__n" x="22" y="22" width="8" height="8" rx="1.75" />
        <rect class="mark__n" x="33" y="22" width="8" height="8" rx="1.75" />
      </svg>
      <span class="logo-lockup__word" aria-hidden="true"
        >greenl<span class="logo-lockup__i">ı</span>t</span
      >
    </ng-template>
    @if (href(); as url) {
      <a
        class="logo-lockup"
        [class.topbar__brand]="brand()"
        [href]="url"
        [attr.aria-label]="label()"
      >
        <ng-container [ngTemplateOutlet]="mark" />
      </a>
    } @else {
      <a
        class="logo-lockup"
        [class.topbar__brand]="brand()"
        [routerLink]="link()"
        [attr.aria-label]="label()"
      >
        <ng-container [ngTemplateOutlet]="mark" />
      </a>
    }
  `,
  styles: `
    .logo-lockup {
      display: inline-flex;
      align-items: center;
      gap: 0.28em;
      font-size: var(--font-size-xl);
      color: var(--color-fg-default);
      text-decoration: none;
    }
    .logo-lockup:hover {
      color: var(--color-fg-default);
      text-decoration: none;
    }
    .topbar__brand {
      min-height: var(--layout-topbar-height);
    }
    .logo-lockup__mark {
      height: 0.72em;
      width: 0.984em;
      flex: none;
    }
    .logo-lockup__word {
      font-family: var(--font-family-display);
      font-weight: 800;
      line-height: 1;
      letter-spacing: -0.045em;
      padding-bottom: 0.04em;
    }
    .logo-lockup__i {
      position: relative;
      display: inline-block;
    }
    .logo-lockup__i::after {
      content: '';
      position: absolute;
      left: 50%;
      top: 0.04em;
      width: 0.17em;
      height: 0.17em;
      translate: -50% 0;
      border-radius: 0.035em;
      background: var(--color-brand);
    }
    .mark__c {
      fill: var(--color-brand);
    }
    .mark__n {
      fill: currentColor;
      fill-opacity: 0.12;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogoLockup {
  /** Where the logo leads; the calendar by default. */
  readonly link = input<string>('/');
  /** A plain address instead of a router link (the marketing site's `#top`). */
  readonly href = input<string | null>(null);
  /** Set when the logo is the top bar's brand (`topbar__brand`). */
  readonly brand = input<boolean>(false);
  /** The link's accessible name. */
  readonly label = input<string>('Greenlit, team calendar');
}
