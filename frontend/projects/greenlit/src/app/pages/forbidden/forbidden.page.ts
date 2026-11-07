import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of } from 'rxjs';

import { SHEET_SERVICE } from 'api';
import { Button, ErrorPage } from 'components';

/**
 * Forbidden (docs/detailed-designs/web-experience/error-pages, L2-046 AC2): a manager-only page opened by
 * someone who is not the manager. Names the manager, read from the team's month, so the person knows whom
 * to ask; when the team cannot be read it says "your manager".
 */
@Component({
  selector: 'app-forbidden-page',
  imports: [ErrorPage, Button],
  template: `
    <gl-error-page
      title="You don’t have access to this"
      [text]="
        'Only managers can open this page. Ask ' +
        (manager() ?? 'your manager') +
        ' if you need it.'
      "
    >
      <svg slot="icon" class="icon icon--lg" aria-hidden="true" viewBox="0 0 24 24">
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
      <gl-button slot="actions" variant="primary" link="/">Back to calendar</gl-button>
    </gl-error-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForbiddenPage {
  protected readonly manager = toSignal(
    inject(SHEET_SERVICE)
      .month()
      .pipe(
        map((sheet) => sheet.managerName),
        catchError(() => of(null)),
      ),
    { initialValue: null },
  );
}
