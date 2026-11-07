import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type ProgressTone = 'default' | 'success' | 'danger';

/**
 * Progress bar (docs/design-system/components/progress-bar.html): a
 * determinate track (`value` 0 to 100) or, without a value, an indeterminate
 * one. Always named with `label`; reduced motion stops the sweep.
 */
@Component({
  selector: 'gl-progress-bar',
  host: { style: 'display: block' },
  template: `
    <div
      class="progress"
      [class.progress--indeterminate]="value() === null"
      [class.progress--success]="tone() === 'success'"
      [class.progress--danger]="tone() === 'danger'"
      role="progressbar"
      [attr.aria-label]="label()"
      [attr.aria-valuenow]="value()"
      [attr.aria-valuemin]="value() === null ? null : 0"
      [attr.aria-valuemax]="value() === null ? null : 100"
    >
      <div class="progress__bar" [style.--value]="value() === null ? null : value() + '%'"></div>
    </div>
  `,
  styles: `
    .progress {
      width: 100%;
      height: 0.5rem;
      border-radius: var(--radius-full);
      background: var(--color-bg-subtle-hover);
      overflow: hidden;
    }
    .progress__bar {
      height: 100%;
      width: var(--value, 0%);
      background: var(--color-accent);
      border-radius: inherit;
      transition: width var(--duration-slow) var(--ease-standard);
    }
    .progress--indeterminate .progress__bar {
      width: 40%;
      animation: gl-indeterminate 1.4s var(--ease-standard) infinite;
    }
    .progress--success .progress__bar {
      background: var(--color-success-solid);
    }
    .progress--danger .progress__bar {
      background: var(--color-danger-solid);
    }
    @keyframes gl-indeterminate {
      from {
        translate: -100% 0;
      }
      to {
        translate: 350% 0;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .progress--indeterminate .progress__bar {
        animation: none;
        width: 100%;
        opacity: 0.6;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressBar {
  /** 0 to 100; null for an indeterminate bar. */
  readonly value = input<number | null>(null);
  readonly label = input.required<string>();
  readonly tone = input<ProgressTone>('default');
}
