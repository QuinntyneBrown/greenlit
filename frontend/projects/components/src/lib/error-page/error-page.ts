import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { EmptyState } from '../empty-state/empty-state';

/**
 * Error page (docs/design-system/components/error-page.html): replaces a whole
 * screen when the app cannot show it, with one clear next step. A plain card
 * holding a page-level (`h1`) empty state; the icon and actions are projected.
 */
@Component({
  selector: 'gl-error-page',
  imports: [EmptyState],
  template: `
    <div class="card-plain">
      <gl-empty-state [title]="title()" [text]="text()" [level]="1" [tone]="tone()">
        <ng-content select="[slot=icon]" ngProjectAs="[slot=icon]" />
        <ng-content select="[slot=actions]" ngProjectAs="[slot=actions]" />
      </gl-empty-state>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .card-plain {
      background: var(--color-bg-surface);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-lg);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorPage {
  readonly title = input.required<string>();
  readonly text = input<string>('');
  /** `error` for failures (server error, offline); `default` for not found. */
  readonly tone = input<'default' | 'error'>('default');
}
