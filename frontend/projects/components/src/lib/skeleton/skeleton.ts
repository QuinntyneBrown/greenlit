import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type SkeletonShape = 'text' | 'title' | 'circle' | 'rect';

/**
 * Skeleton (docs/design-system/components/skeleton.html): holds the shape of
 * content while it loads. Always `aria-hidden`; the loading region carries
 * `aria-busy="true"` and a visually hidden `role="status"` sentence instead.
 * Sizes are tokens or lengths (`var(--space-24)`, `100%`).
 */
@Component({
  selector: 'gl-skeleton',
  host: { style: 'display: contents' },
  template: `<span
    class="skeleton"
    [class]="'skeleton skeleton--' + shape()"
    [style.width]="width() || null"
    [style.height]="height() || null"
    aria-hidden="true"
  ></span>`,
  styles: `
    .skeleton {
      display: block;
      background: linear-gradient(
        90deg,
        var(--color-bg-subtle) 25%,
        var(--color-bg-subtle-hover) 37%,
        var(--color-bg-subtle) 63%
      );
      background-size: 400% 100%;
      border-radius: var(--radius-sm);
      animation: gl-shimmer 1.4s var(--ease-standard) infinite;
      min-height: 1em;
    }
    .skeleton--text {
      height: 0.9em;
      margin-block: 0.3em;
    }
    .skeleton--title {
      height: 1.5em;
      width: 40%;
    }
    .skeleton--circle {
      border-radius: 50%;
    }
    .skeleton--rect {
      border-radius: var(--radius-md);
    }
    @keyframes gl-shimmer {
      from {
        background-position: 100% 0;
      }
      to {
        background-position: 0 0;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .skeleton {
        animation: none;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Skeleton {
  readonly shape = input<SkeletonShape>('text');
  readonly width = input<string>('');
  readonly height = input<string>('');
}
