import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { SelectionAction } from '../selection-bar/selection-bar';

interface SheetButton {
  readonly key: SelectionAction;
  readonly label: string;
  readonly swatch?: 'confirmed' | 'requested' | 'tentative';
  readonly variant: 'primary' | 'default' | 'link';
}

const ACTIONS: readonly SheetButton[] = [
  { key: 'requested', label: 'Request these days', swatch: 'requested', variant: 'primary' },
  { key: 'tentative', label: 'Tentative', swatch: 'tentative', variant: 'default' },
  { key: 'confirmed', label: 'Confirm', swatch: 'confirmed', variant: 'default' },
  { key: 'clear', label: 'Clear these days', variant: 'link' },
];

function days(n: number): string {
  return `${n} ${n === 1 ? 'day' : 'days'}`;
}

/**
 * Mark sheet (docs/design-system/components/mark-sheet.html): the panel "Selected days" fixed to the foot of a
 * phone while days are picked on the week strip. It is not a dialog: nothing behind it is blocked, so the week
 * tabs and cells stay usable while the last day is picked. While `picking` it names the first day and offers
 * "Just this day"; with a range it shows the working days, the overage (a warning, never a block), who else is
 * out, and the actions. Confirm is only offered when `canConfirm`. While `busy` the actions are disabled.
 */
@Component({
  selector: 'gl-mark-sheet',
  template: `
    <div class="mark-sheet-region">
      <section
        class="mark-sheet"
        aria-label="Selected days"
        [attr.aria-busy]="busy() ? 'true' : null"
      >
        <div class="shell">
          <div class="mark-sheet__head">
            <div>
              <p class="mark-sheet__who">{{ who() }}</p>
              <h2 class="mark-sheet__range">{{ title() }}</h2>
              <p class="mark-sheet__meta">
                @if (picking()) {
                  Now tap the last day. You can change week first.
                } @else {
                  {{ workingDays() }} {{ workingDays() === 1 ? 'working day' : 'working days' }}
                  @if (over() > 0) {
                    <span class="mark-sheet__warn">{{ days(over()) }} over allowance</span>
                  }
                }
              </p>
            </div>
            <button
              class="btn btn--ghost btn--icon btn--sm mark-sheet__cancel"
              type="button"
              aria-label="Cancel"
              (click)="cancelled.emit()"
            >
              <svg class="icon" aria-hidden="true" viewBox="0 0 24 24">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          @if (picking()) {
            <div class="mark-sheet__actions" data-single>
              <button class="btn" type="button" (click)="single.emit()">Just this day</button>
            </div>
          } @else {
            @if (clash()) {
              <p class="mark-sheet__clash">{{ clash() }}</p>
            }
            <div class="mark-sheet__actions" [attr.data-member]="canConfirm() ? null : ''">
              @for (button of buttons(); track button.key) {
                <button
                  class="btn"
                  [class.btn--primary]="button.variant === 'primary'"
                  [class.btn--link]="button.variant === 'link'"
                  type="button"
                  [disabled]="busy()"
                  (click)="chosen.emit(button.key)"
                >
                  @if (button.swatch) {
                    <span
                      class="swatch"
                      [attr.data-status]="button.swatch"
                      aria-hidden="true"
                    ></span>
                  }
                  {{ button.label }}
                </button>
              }
            </div>
          }
        </div>
      </section>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }
    .mark-sheet-region {
      position: fixed;
      inset-inline: 0;
      bottom: 0;
      z-index: var(--z-dropdown);
    }
    .mark-sheet {
      padding: var(--space-4) 0 var(--space-6);
      border-top: 1px solid var(--color-border-default);
      border-radius: var(--radius-xl) var(--radius-xl) 0 0;
      background: var(--color-bg-surface);
      box-shadow: var(--shadow-4);
      animation: slide-up var(--duration-base) var(--ease-enter);
    }
    .mark-sheet__head {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3);
    }
    .mark-sheet__who {
      margin: 0;
      font: var(--text-caption);
      color: var(--color-fg-muted);
    }
    .mark-sheet__range {
      margin: 0;
      font: var(--text-h4);
      font-family: var(--font-family-display);
    }
    .mark-sheet__meta {
      margin: 0;
      font: var(--text-caption);
      color: var(--color-fg-muted);
    }
    .mark-sheet__warn {
      color: var(--color-warning-fg);
      font-weight: var(--font-weight-semibold);
    }
    .mark-sheet__warn::before {
      content: '· ';
    }
    .mark-sheet__clash {
      margin: var(--space-3) 0 0;
      padding: var(--space-2) var(--space-3);
      border-radius: var(--radius-md);
      background: var(--color-bg-subtle);
      font: var(--text-body-sm);
    }
    .mark-sheet__actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-2);
      margin-top: var(--space-3);
    }
    .mark-sheet__actions > .btn--primary,
    .mark-sheet__actions > .btn--link,
    .mark-sheet__actions[data-single] > .btn,
    .mark-sheet__actions[data-member] > .btn {
      grid-column: 1 / -1;
    }
    .mark-sheet__cancel {
      margin-left: auto;
      flex: none;
    }
    .btn {
      --btn-bg: var(--color-bg-surface);
      --btn-fg: var(--color-fg-default);
      --btn-border: var(--color-border-strong);
      --btn-bg-hover: var(--color-bg-subtle);
      --btn-bg-active: var(--color-bg-subtle-hover);
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      min-height: var(--control-height-md);
      padding: 0 var(--space-4);
      font: var(--text-label);
      font-size: var(--font-size-md);
      line-height: 1;
      white-space: nowrap;
      color: var(--btn-fg);
      background: var(--btn-bg);
      border: 1px solid var(--btn-border);
      border-radius: var(--radius-md);
      cursor: pointer;
      user-select: none;
      transition:
        background-color var(--duration-fast) var(--ease-standard),
        border-color var(--duration-fast) var(--ease-standard),
        transform var(--duration-fast) var(--ease-standard);
    }
    .btn:hover {
      background: var(--btn-bg-hover);
    }
    .btn:active {
      background: var(--btn-bg-active);
      transform: translateY(1px);
    }
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }
    .btn:focus-visible {
      outline: var(--focus-ring-width) solid var(--color-focus-ring);
      outline-offset: 2px;
    }
    .btn--primary {
      --btn-bg: var(--color-accent);
      --btn-fg: var(--color-fg-on-accent);
      --btn-border: var(--color-accent);
      --btn-bg-hover: var(--color-accent-hover);
      --btn-bg-active: var(--color-accent-active);
    }
    .btn--ghost {
      --btn-bg: transparent;
      --btn-border: transparent;
    }
    .btn--link {
      --btn-bg: transparent;
      --btn-border: transparent;
      --btn-fg: var(--color-fg-link);
      --btn-bg-hover: var(--color-accent-subtle);
      text-decoration: underline;
      text-underline-offset: 0.15em;
    }
    .btn--sm {
      min-height: var(--control-height-sm);
      padding-inline: var(--space-3);
      font-size: var(--font-size-sm);
    }
    .btn--icon {
      padding: 0;
      width: var(--control-height-sm);
    }
    .swatch {
      width: 0.75rem;
      height: 0.75rem;
      border-radius: var(--radius-xs);
      flex: none;
      background: var(--status-bg);
    }
    .swatch[data-status='confirmed'] {
      --status-bg: var(--color-status-confirmed);
    }
    .swatch[data-status='requested'] {
      --status-bg: var(--color-status-requested);
    }
    .swatch[data-status='tentative'] {
      --status-bg: var(--color-status-tentative);
    }
    @keyframes slide-up {
      from {
        opacity: 0;
        translate: 0 var(--space-4);
      }
    }
    @keyframes fade-in {
      from {
        opacity: 0;
      }
    }
    @media print {
      .mark-sheet-region {
        display: none;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .mark-sheet {
        animation: fade-in var(--duration-fast) linear;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarkSheet {
  /** The member the days are for, "Ana Ruiz". */
  readonly who = input.required<string>();
  /** "From Mon 23 Nov" while picking, then the range, "Mon 23 – Thu 26 Nov". */
  readonly title = input.required<string>();
  /** Only a first day is picked: offer "Just this day" and ask for the last day. */
  readonly picking = input<boolean>(false);
  readonly workingDays = input<number>(0);
  /** Days over the member's allowance if the range were requested; 0 shows no warning. */
  readonly over = input<number>(0);
  /** Who else is out on the range's working days; null shows nothing. */
  readonly clash = input<string | null>(null);
  /** Only the manager may confirm. */
  readonly canConfirm = input<boolean>(false);
  /** An action is being saved. */
  readonly busy = input<boolean>(false);

  /** An action was pressed. */
  readonly chosen = output<SelectionAction>();
  /** "Just this day" was pressed. */
  readonly single = output<void>();
  /** "Cancel" was pressed. */
  readonly cancelled = output<void>();

  protected readonly days = days;

  protected buttons(): readonly SheetButton[] {
    return ACTIONS.filter((a) => a.key !== 'confirmed' || this.canConfirm());
  }
}
