import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

/** What the bar offers to do with the selected days. */
export type SelectionAction = 'confirmed' | 'requested' | 'tentative' | 'clear';

interface BarButton {
  readonly key: SelectionAction | 'dismiss';
  readonly label: string;
  readonly swatch?: 'confirmed' | 'requested' | 'tentative' | 'empty';
}

const ACTIONS: readonly BarButton[] = [
  { key: 'confirmed', label: 'Confirm', swatch: 'confirmed' },
  { key: 'requested', label: 'Request', swatch: 'requested' },
  { key: 'tentative', label: 'Tentative', swatch: 'tentative' },
  { key: 'clear', label: 'Clear', swatch: 'empty' },
];

function days(n: number): string {
  return `${n} ${n === 1 ? 'day' : 'days'}`;
}

/**
 * Selection bar (docs/design-system/components/selection-bar.html): the toolbar
 * "Selected days" that follows the sheet while days are selected. It names the
 * member and range, counts working days, warns when the range goes over the
 * member's allowance (a warning, never a block), and offers the actions. Confirm
 * is only offered when `canConfirm`. One tab stop; the arrow keys, Home and End
 * move between the buttons. While `busy` the actions are disabled.
 */
@Component({
  selector: 'gl-selection-bar',
  template: `
    <div class="selection-bar-region">
      <div
        class="selection-bar"
        role="toolbar"
        aria-label="Selected days"
        [attr.aria-busy]="busy() ? 'true' : null"
      >
        <div>
          <div class="selection-bar__title">{{ title() }}</div>
          <div class="selection-bar__meta">
            <span>{{ days(workingDays()) }} working</span>
            @if (over() > 0) {
              <span class="selection-bar__warn">
                <svg class="icon icon--sm" aria-hidden="true" viewBox="0 0 24 24">
                  <path d="M12 4 3 20h18z" />
                  <path d="M12 10v4M12 17h.01" />
                </svg>
                {{ days(over()) }} over allowance
              </span>
            }
          </div>
        </div>
        <div class="selection-bar__actions">
          @for (button of buttons(); track button.key; let i = $index) {
            @if (button.key === 'dismiss') {
              <button
                class="btn btn--inverse btn--icon btn--sm"
                type="button"
                aria-label="Clear selection"
                [attr.tabindex]="i === stop() ? 0 : -1"
                (focus)="stop.set(i)"
                (click)="dismissed.emit()"
              >
                <svg class="icon" aria-hidden="true" viewBox="0 0 24 24">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            } @else {
              <button
                class="btn btn--inverse btn--sm"
                type="button"
                [disabled]="busy()"
                [attr.tabindex]="i === stop() ? 0 : -1"
                (focus)="stop.set(i)"
                (click)="chosen.emit(button.key)"
              >
                <span class="swatch" [attr.data-status]="button.swatch" aria-hidden="true"></span>
                {{ button.label }}
              </button>
            }
          }
        </div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }
    .selection-bar-region {
      position: fixed;
      inset-inline: 0;
      bottom: var(--space-6);
      z-index: var(--z-dropdown);
      display: flex;
      justify-content: center;
      padding-inline: var(--space-4);
      pointer-events: none;
    }
    .selection-bar {
      --color-focus-ring: var(--color-fg-inverse);
      pointer-events: auto;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-3) var(--space-4);
      max-width: 100%;
      padding: var(--space-3) var(--space-4);
      border-radius: var(--radius-lg);
      background: var(--color-bg-inverse);
      color: var(--color-fg-inverse);
      box-shadow: var(--shadow-4);
      animation: slide-up var(--duration-base) var(--ease-enter);
    }
    .selection-bar__title {
      font: var(--text-label);
      white-space: nowrap;
    }
    .selection-bar__meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-1) var(--space-2);
      font: var(--text-caption);
      opacity: 0.9;
    }
    .selection-bar__warn {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      color: var(--color-warning-on-inverse);
      font-weight: var(--font-weight-semibold);
      opacity: 1;
    }
    .selection-bar__actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      min-height: var(--control-height-sm);
      padding: 0 var(--space-3);
      font: var(--text-label);
      font-size: var(--font-size-sm);
      line-height: 1;
      white-space: nowrap;
      color: var(--color-fg-inverse);
      background: color-mix(in srgb, currentColor 12%, transparent);
      border: 1px solid transparent;
      border-radius: var(--radius-md);
      cursor: pointer;
    }
    .btn:hover {
      background: color-mix(in srgb, currentColor 22%, transparent);
    }
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn--icon {
      padding: 0;
      width: var(--control-height-sm);
    }
    .icon {
      width: 1.25em;
      height: 1.25em;
      flex: none;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .icon--sm {
      width: 1em;
      height: 1em;
    }
    .swatch {
      width: 0.75rem;
      height: 0.75rem;
      border-radius: var(--radius-xs);
      flex: none;
      background: var(--status-bg, var(--color-status-empty));
      box-shadow: inset 0 0 0 1px var(--color-border-default);
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
    .swatch[data-status='empty'] {
      background: color-mix(in srgb, currentColor 30%, transparent);
    }
    @keyframes slide-up {
      from {
        opacity: 0;
        translate: 0 var(--space-4);
      }
    }
    @media print {
      .selection-bar-region {
        display: none;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .selection-bar {
        animation: none;
      }
    }
  `,
  host: { '(keydown)': 'onKey($event)' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectionBar {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** "Ana Ruiz · 23–25 Nov". */
  readonly title = input.required<string>();
  readonly workingDays = input.required<number>();
  /** Days over the member's allowance if the range were requested; 0 shows no warning. */
  readonly over = input<number>(0);
  /** Only the manager may confirm. */
  readonly canConfirm = input<boolean>(false);
  /** An action is being saved. */
  readonly busy = input<boolean>(false);

  /** An action button was pressed. */
  readonly chosen = output<SelectionAction>();
  /** "Clear selection" was pressed. */
  readonly dismissed = output<void>();

  protected readonly days = days;
  protected readonly stop = signal(0);

  protected readonly buttons = computed((): readonly BarButton[] => [
    ...ACTIONS.filter((a) => a.key !== 'confirmed' || this.canConfirm()),
    { key: 'dismiss', label: 'Clear selection' },
  ]);

  /** Moves focus to the toolbar's tab stop, as Tab from the sheet does (L2-047). */
  focus(): void {
    this.host.nativeElement.querySelectorAll<HTMLElement>('button')[this.stop()]?.focus();
  }

  /** Arrow keys, Home and End move among the buttons (the toolbar pattern). */
  protected onKey(event: KeyboardEvent): void {
    const count = this.buttons().length;
    const move: Record<string, number> = {
      ArrowRight: (this.stop() + 1) % count,
      ArrowLeft: (this.stop() + count - 1) % count,
      Home: 0,
      End: count - 1,
    };
    const next = move[event.key];
    if (next === undefined) return;
    event.preventDefault();
    this.stop.set(next);
    this.host.nativeElement.querySelectorAll<HTMLElement>('button')[next]?.focus();
  }
}
