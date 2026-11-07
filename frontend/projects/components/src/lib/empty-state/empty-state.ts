import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Empty state (docs/design-system/components/empty-state.html): why a region
 * has nothing to show, and the next step. An icon (`[slot=icon]`, decorative),
 * a title, a sentence and up to two actions (`[slot=actions]`).
 *
 * `level` sets the title's heading level: 1 when the state is the whole page
 * (error pages), 2 inside a page.
 */
@Component({
  selector: 'gl-empty-state',
  template: `
    <div class="empty" [class.empty--compact]="compact()" [class.empty--error]="tone() === 'error'">
      <div class="empty__icon" aria-hidden="true"><ng-content select="[slot=icon]" /></div>
      @switch (level()) {
        @case (1) {
          <h1 class="empty__title">{{ title() }}</h1>
        }
        @case (3) {
          <h3 class="empty__title">{{ title() }}</h3>
        }
        @default {
          <h2 class="empty__title">{{ title() }}</h2>
        }
      }
      @if (text()) {
        <p class="empty__text">{{ text() }}</p>
      }
      <div class="empty__actions"><ng-content select="[slot=actions]" /></div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: var(--space-3);
      padding: var(--space-12) var(--space-6);
    }
    .empty__icon {
      width: 4rem;
      height: 4rem;
      border-radius: var(--radius-full);
      display: grid;
      place-items: center;
      background: var(--color-accent-subtle);
      color: var(--color-fg-accent);
      margin-bottom: var(--space-2);
    }
    .empty__title {
      font: var(--text-h3);
    }
    .empty__text {
      color: var(--color-fg-muted);
      max-width: 36ch;
    }
    .empty__actions {
      display: flex;
      gap: var(--space-3);
      margin-top: var(--space-2);
      flex-wrap: wrap;
      justify-content: center;
    }
    .empty__actions:empty {
      display: none;
    }
    .empty--compact {
      padding: var(--space-8) var(--space-4);
    }
    .empty--error .empty__icon {
      background: var(--color-danger-bg);
      color: var(--color-danger-icon);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly text = input<string>('');
  readonly level = input<1 | 2 | 3>(2);
  readonly tone = input<'default' | 'error'>('default');
  readonly compact = input<boolean>(false);
}
