import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The labelled rule between two ways in on an auth card (docs/design-system/components/divider.html,
 * "Auth divider"): `.auth-divider` with the label in the line and a separator role that names it.
 */
@Component({
  selector: 'gl-auth-divider',
  template: `
    <div class="auth-divider" role="separator" [attr.aria-label]="label()">
      <span>{{ label() }}</span>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .auth-divider {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      color: var(--color-fg-muted);
      font: var(--text-caption);
      text-transform: lowercase;
    }
    .auth-divider::before,
    .auth-divider::after {
      content: '';
      flex: 1;
      border-top: 1px solid var(--color-border-default);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthDivider {
  readonly label = input<string>('or');
}
