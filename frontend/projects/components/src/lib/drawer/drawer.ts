import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Avatar } from '../avatar/avatar';

/**
 * Drawer panel (docs/design-system/components/drawer.html): a person's avatar with the title and
 * description that label it, a Close button, the body and a footer with `[slot=footer]`. The page
 * opens it through the CDK Dialog (`AppDialogs.openDrawer`), which gives the surrounding
 * `role="dialog"`, the backdrop, the focus trap and Esc; this component draws what is inside and
 * fills the height of the pane.
 */
@Component({
  selector: 'gl-drawer',
  imports: [Avatar],
  template: `
    <div class="drawer">
      <div class="drawer__header">
        <div class="drawer__person">
          <gl-avatar [name]="title()" />
          <div>
            <h2 class="drawer__title" [id]="titleId()">{{ title() }}</h2>
            <p class="drawer__description" [id]="descriptionId()">{{ description() }}</p>
          </div>
        </div>
        <button
          class="drawer__close"
          type="button"
          aria-label="Close"
          [disabled]="busy()"
          (click)="closed.emit()"
        >
          <svg class="icon" aria-hidden="true" viewBox="0 0 24 24">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
      <div class="drawer__body"><ng-content /></div>
      <div class="drawer__footer" [hidden]="!footer()"><ng-content select="[slot=footer]" /></div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }
    .drawer {
      height: 100%;
      display: flex;
      flex-direction: column;
      background: var(--color-bg-surface-raised);
      color: var(--color-fg-default);
      box-shadow: var(--shadow-4);
      animation: gl-drawer-in var(--duration-slow) var(--ease-enter);
    }
    @keyframes gl-drawer-in {
      from {
        translate: 100% 0;
      }
    }
    .drawer__header {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-4) var(--space-6);
      border-bottom: 1px solid var(--color-border-default);
    }
    .drawer__person {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      flex: 1;
      min-width: 0;
    }
    .drawer__title {
      font: var(--text-h4);
      margin: 0;
    }
    .drawer__description {
      margin: 0;
      font: var(--text-body-sm);
      color: var(--color-fg-muted);
    }
    .drawer__close {
      display: grid;
      place-items: center;
      width: var(--target-min);
      height: var(--target-min);
      flex: none;
      padding: 0;
      border: 0;
      border-radius: var(--radius-md);
      background: transparent;
      color: inherit;
      cursor: pointer;
    }
    .drawer__close:hover {
      background: var(--color-bg-subtle);
    }
    .drawer__close:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .drawer__close:focus-visible {
      outline: var(--focus-ring-width) solid var(--color-focus-ring);
    }
    .icon {
      width: 1.25rem;
      height: 1.25rem;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .drawer__body {
      display: flex;
      flex-direction: column;
      gap: var(--space-6);
      padding: var(--space-6);
      overflow: auto;
      flex: 1;
    }
    .drawer__footer[hidden] {
      display: none;
    }
    .drawer__footer {
      display: flex;
      gap: var(--space-3);
      justify-content: flex-end;
      padding: var(--space-4) var(--space-6);
      border-top: 1px solid var(--color-border-default);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Drawer {
  /** The person's name: the title, and the avatar's initials. */
  readonly title = input.required<string>();
  readonly description = input<string>('');
  readonly titleId = input<string>('dlg-title');
  readonly descriptionId = input<string>('dlg-desc');
  /** A request is running: Close is off. */
  readonly busy = input<boolean>(false);
  /** Draw the footer bar; off for a request that offers no decision. */
  readonly footer = input<boolean>(true);
  readonly closed = output<void>();
}
