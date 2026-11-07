import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';

/** One tab: its id names the panel it controls (`tab-{id}`), its count follows the label. */
export interface TabItem {
  readonly id: string;
  readonly label: string;
  /** Shown after the label when given, e.g. the Requests tabs' counts. */
  readonly count?: number;
}

/**
 * Tabs (docs/design-system/components/tabs.html): a `tablist` of `tab` buttons that switch the view of one
 * panel on one page. The selected tab has `aria-selected="true"` and the brand underline; only it is in the
 * tab order (roving `tabindex`), and the arrow keys, Home and End move to a tab and select it (automatic
 * activation). The tab's name includes its count, "Pending 4". The page owns the panel: give it
 * `id="panel"` and `aria-labelledby="tab-{selected}"`.
 */
@Component({
  selector: 'gl-tabs',
  template: `
    <div
      class="tabs"
      role="tablist"
      [attr.aria-label]="label()"
      [style.border-bottom]="bordered() ? null : '0'"
    >
      @for (tab of tabs(); track tab.id) {
        <button
          class="tab"
          type="button"
          role="tab"
          [id]="'tab-' + tab.id"
          [attr.aria-controls]="panelId()"
          [attr.aria-selected]="tab.id === selected()"
          [attr.tabindex]="tab.id === selected() ? null : -1"
          (click)="selectedChange.emit(tab.id)"
          (keydown)="onKey($event)"
        >
          {{ tab.label }}
          @if (tab.count !== undefined) {
            <span class="tab__count">{{ tab.count }}</span>
          }
        </button>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .tabs {
      display: flex;
      gap: var(--space-1);
      border-bottom: 1px solid var(--color-border-default);
      overflow-x: auto;
      scrollbar-width: none;
    }
    .tab {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      min-height: var(--target-comfortable);
      padding: 0 var(--space-3);
      border: 0;
      background: none;
      color: var(--color-fg-muted);
      font: var(--text-label);
      cursor: pointer;
      white-space: nowrap;
    }
    .tab::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      bottom: -1px;
      height: 2px;
      background: transparent;
      border-radius: 2px 2px 0 0;
      transition: background-color var(--duration-fast) var(--ease-standard);
    }
    .tab:hover {
      color: var(--color-fg-default);
    }
    .tab:focus-visible {
      outline: var(--focus-ring-width) solid var(--color-focus-ring);
      outline-offset: -2px;
      border-radius: var(--radius-sm);
    }
    .tab[aria-selected='true'] {
      color: var(--color-fg-accent);
    }
    .tab[aria-selected='true']::after {
      background: var(--color-brand);
    }
    .tab__count {
      color: var(--color-fg-subtle);
      font-variant-numeric: tabular-nums;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Tabs {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Accessible name of the tablist, e.g. "Request status". */
  readonly label = input.required<string>();
  readonly tabs = input.required<readonly TabItem[]>();
  /** The id of the selected tab. */
  readonly selected = input.required<string>();
  /** The id of the panel the tabs control. */
  readonly panelId = input<string>('panel');
  /** Draw the baseline under the tabs; off when the page's toolbar draws it. */
  readonly bordered = input<boolean>(true);

  /** A tab was pressed or reached with the keyboard. */
  readonly selectedChange = output<string>();

  protected onKey(event: KeyboardEvent): void {
    const tabs = this.tabs();
    const current = tabs.findIndex((t) => t.id === this.selected());
    const last = tabs.length - 1;
    const target =
      event.key === 'ArrowRight'
        ? current === last
          ? 0
          : current + 1
        : event.key === 'ArrowLeft'
          ? current === 0
            ? last
            : current - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : -1;
    if (target < 0) return;
    event.preventDefault();
    this.selectedChange.emit(tabs[target].id);
    // The roving tabindex follows the selection on the next render; focus the button now.
    this.host.nativeElement.querySelectorAll<HTMLElement>('[role=tab]')[target]?.focus();
  }
}
