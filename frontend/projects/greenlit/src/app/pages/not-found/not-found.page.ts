import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Button, ErrorPage } from 'components';

/**
 * Not found (L2-046 AC1): any address Greenlit does not know, including the
 * old `/sheet` (L2-049 AC5) and destinations whose journeys have not landed.
 */
@Component({
  selector: 'app-not-found-page',
  imports: [ErrorPage, Button],
  template: `
    <gl-error-page title="This page doesn’t exist" text="The link may be old or mistyped.">
      <svg slot="icon" class="icon icon--lg" aria-hidden="true" viewBox="0 0 24 24">
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M4 10h16M9 3v4M15 3v4" />
      </svg>
      <gl-button slot="actions" variant="primary" link="/">Back to calendar</gl-button>
    </gl-error-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPage {}
