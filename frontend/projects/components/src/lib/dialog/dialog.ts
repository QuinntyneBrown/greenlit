import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Dialog panel (docs/design-system/components/dialog.html): the title and
 * description that label the dialog, a Close button, the body and a footer
 * with `[slot=footer]`. The page opens it through the CDK Dialog, which gives
 * the surrounding `role="dialog"`, the backdrop, the focus trap, Esc and the
 * inert page behind; this component draws what is inside.
 *
 * `titleId` and `descriptionId` are the ids the opener passes to the CDK as
 * `ariaLabelledBy` and `ariaDescribedBy`.
 */
@Component({
  selector: 'gl-dialog',
  template: `
    <div class="dialog__panel">
      <div class="dialog__header">
        <div class="dialog__heading">
          <h2 class="dialog__title" [id]="titleId()">{{ title() }}</h2>
          @if (description()) {
            <p class="dialog__description" [id]="descriptionId()">{{ description() }}</p>
          }
        </div>
        <button
          class="dialog__close"
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
      <div class="dialog__body"><ng-content /></div>
      <div class="dialog__footer"><ng-content select="[slot=footer]" /></div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .dialog__panel {
      width: 100%;
      max-height: calc(100dvh - var(--space-12));
      overflow: auto;
      background: var(--color-bg-surface-raised);
      color: var(--color-fg-default);
      border-radius: var(--radius-xl) var(--radius-xl) 0 0;
      box-shadow: var(--shadow-4);
      display: flex;
      flex-direction: column;
    }
    @media (min-width: 40rem) {
      .dialog__panel {
        border-radius: var(--radius-lg);
      }
    }
    .dialog__header {
      display: flex;
      align-items: flex-start;
      gap: var(--space-4);
      padding: var(--space-6) var(--space-6) 0;
    }
    .dialog__heading {
      flex: 1;
    }
    .dialog__title {
      font: var(--text-h3);
      margin: 0;
    }
    .dialog__description {
      margin: var(--space-1) 0 0;
      color: var(--color-fg-muted);
    }
    .dialog__close {
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
    .dialog__close:hover {
      background: var(--color-bg-subtle);
    }
    .dialog__close:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .dialog__close:focus-visible {
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
    .dialog__body {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      padding: var(--space-4) var(--space-6);
      flex: 1;
    }
    .dialog__footer {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
      justify-content: flex-end;
      padding: var(--space-4) var(--space-6) var(--space-6);
      border-top: 1px solid var(--color-border-default);
      position: sticky;
      bottom: 0;
      background: var(--color-bg-surface-raised);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dialog {
  readonly title = input.required<string>();
  readonly description = input<string>('');
  /** The id of the title, which the CDK dialog names itself by. */
  readonly titleId = input<string>('dlg-title');
  readonly descriptionId = input<string>('dlg-title-desc');
  /** A request is running: Close is off. */
  readonly busy = input<boolean>(false);
  readonly closed = output<void>();
}
