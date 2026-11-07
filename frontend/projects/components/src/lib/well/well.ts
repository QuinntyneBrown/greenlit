import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Well (docs/design-system/components/card.html): a sunken block for a short status line inside
 * a dialog or card, such as the day count of the request dialog. It is a polite live region, so
 * the line is announced as it changes.
 */
@Component({
  selector: 'gl-well',
  host: { class: 'well', 'aria-live': 'polite' },
  template: `<ng-content />`,
  styles: `
    :host {
      display: block;
      background: var(--color-bg-surface-sunken);
      border-radius: var(--radius-md);
      padding: var(--space-4);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Well {}
