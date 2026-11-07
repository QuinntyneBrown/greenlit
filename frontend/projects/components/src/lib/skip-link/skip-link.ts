import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * "Skip to content" link: the first focusable element on every screen, visible
 * only while focused, jumping to `main#main`.
 */
@Component({
  selector: 'gl-skip-link',
  template: `<a class="skip-link" href="#main">Skip to content</a>`,
  styles: `
    .skip-link {
      position: absolute;
      left: var(--space-4);
      top: calc(-1 * var(--space-24));
      z-index: var(--z-tooltip);
      padding: var(--space-2) var(--space-4);
      background: var(--color-bg-surface-raised);
      color: var(--color-fg-default);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-3);
      text-decoration: none;
      transition: top var(--duration-fast) var(--ease-standard);
    }
    .skip-link:focus-visible {
      top: var(--space-4);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkipLink {}
