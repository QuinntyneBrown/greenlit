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
      left: 1rem;
      top: -100%;
      padding: 0.5rem 0.75rem;
      background: #fff;
      color: #111;
      text-decoration: none;
      z-index: 100;
    }
    .skip-link:focus {
      top: 1rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkipLink {}
