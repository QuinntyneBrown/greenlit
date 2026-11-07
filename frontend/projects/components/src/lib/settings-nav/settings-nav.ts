import { ChangeDetectionStrategy, Component, DOCUMENT, inject, input } from '@angular/core';

export interface SettingsNavItem {
  /** The id of the section the link goes to. */
  readonly id: string;
  readonly label: string;
}

/**
 * Settings navigation (docs/design-system/components/settings-nav.html): the section links beside Settings from
 * 1024px. A link scrolls to its section and puts focus on the section's heading; it is not a route change.
 */
@Component({
  selector: 'gl-settings-nav',
  template: `
    <nav class="settings-nav" aria-label="Settings sections">
      <ul>
        @for (item of items(); track item.id) {
          <li>
            <a [href]="'#' + item.id" (click)="go($event, item.id)">{{ item.label }}</a>
          </li>
        }
      </ul>
    </nav>
  `,
  styles: `
    :host {
      display: none;
    }
    @media (min-width: 64rem) {
      :host {
        display: block;
        position: sticky;
        top: 6rem;
        align-self: start;
      }
    }
    ul {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: var(--space-0-5);
    }
    a {
      display: block;
      padding: var(--space-2) var(--space-3);
      border-radius: var(--radius-md);
      color: var(--color-fg-muted);
      font: var(--text-body-sm);
      text-decoration: none;
    }
    a:hover {
      background: var(--color-bg-subtle);
      color: var(--color-fg-default);
    }
    a:focus-visible {
      outline: var(--focus-ring-width) solid var(--color-focus-ring);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsNav {
  readonly items = input.required<readonly SettingsNavItem[]>();
  private readonly document = inject(DOCUMENT);

  protected go(event: Event, id: string): void {
    event.preventDefault();
    const heading = this.document.getElementById(`${id}-title`);
    heading?.scrollIntoView({ block: 'start' });
    heading?.focus({ preventScroll: true });
  }
}
