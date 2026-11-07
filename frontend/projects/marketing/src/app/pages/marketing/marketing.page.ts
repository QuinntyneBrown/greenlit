import { ChangeDetectionStrategy, Component } from '@angular/core';

import { Button, LogoLockup } from 'components';

import { environment } from '../../../environments/environment';
import { HERO_SHEET } from './hero-sheet';
import { RevealDirective } from './reveal.directive';

/**
 * The marketing page (L2-050): the mock `pages/marketing/default.html` section
 * by section, with the mock's `mk-*` classes. App links are absolute addresses
 * into the Greenlit app from `environment.appUrl`.
 */
@Component({
  selector: 'mk-marketing-page',
  imports: [Button, LogoLockup, RevealDirective],
  templateUrl: './marketing.page.html',
  styleUrl: './marketing.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketingPage {
  protected readonly signInUrl = `${environment.appUrl}/sign-in`;
  protected readonly createTeamUrl = `${environment.appUrl}/create-team`;
  protected readonly sheet = HERO_SHEET;
}
