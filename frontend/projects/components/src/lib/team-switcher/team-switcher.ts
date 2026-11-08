import { CdkMenu, CdkMenuItem, CdkMenuItemRadio, CdkMenuTrigger } from '@angular/cdk/menu';
import { ConnectedPosition } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

/** One team in the switcher: the active one is checked, the default one says so. */
export interface TeamSwitcherTeam {
  readonly id: string;
  readonly name: string;
  readonly active: boolean;
  readonly isDefault: boolean;
}

/**
 * The team switcher (docs/design-system/components/team-switcher.html, L2-054 AC11): for a manager of two or more
 * teams, a button in the top bar that shows the active team's name and opens a CDK Menu labelled "Your teams". Each
 * team is a `menuitemradio`, the active one checked with a check icon and the default one marked "Default" in text;
 * then "Add another team" and "Manage your teams". Enter, Space or ArrowDown opens it on the first item; the arrow
 * keys, Home and End move; Escape closes it and focus returns to the button. Choosing another team emits `chosen`;
 * choosing the active one only closes the menu. It never sets the default team.
 */
@Component({
  selector: 'gl-team-switcher',
  imports: [CdkMenu, CdkMenuItem, CdkMenuItemRadio, CdkMenuTrigger, RouterLink],
  host: { class: 'team-switch' },
  template: `
    <button
      class="team-switch__btn"
      type="button"
      [cdkMenuTriggerFor]="panel"
      [cdkMenuPosition]="positions"
      [attr.aria-label]="'Switch team, current team ' + activeName()"
      [attr.aria-busy]="busy() ? 'true' : null"
    >
      <span class="team-switch__name">{{ activeName() }}</span>
      @if (busy()) {
        <span class="spinner" aria-hidden="true"></span>
        <span class="visually-hidden">Switching…</span>
      } @else {
        <svg class="icon icon--sm" aria-hidden="true" viewBox="0 0 24 24">
          <path d="m6 9 6 6 6-6" />
        </svg>
      }
    </button>
    <ng-template #panel>
      <ul class="menu" cdkMenu aria-label="Your teams">
        <li role="none"><div class="menu__label" aria-hidden="true">Your teams</div></li>
        @for (team of teams(); track team.id) {
          <li role="none">
            <button
              class="menu__item"
              type="button"
              cdkMenuItemRadio
              [cdkMenuItemChecked]="team.active"
              (cdkMenuItemTriggered)="choose(team)"
            >
              <svg class="icon icon--sm menu__check" aria-hidden="true" viewBox="0 0 24 24">
                <path d="m5 12 5 5 9-10" />
              </svg>
              {{ team.name }}
              @if (team.isDefault) {
                <span class="menu__meta">Default</span>
              }
            </button>
          </li>
        }
        <li role="none"><hr class="menu__divider" /></li>
        <li role="none">
          <a class="menu__item" cdkMenuItem routerLink="/create-team">
            <svg class="icon icon--sm" aria-hidden="true" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add another team
          </a>
        </li>
        <li role="none">
          <a class="menu__item" cdkMenuItem routerLink="/settings" fragment="teams">
            <svg class="icon icon--sm" aria-hidden="true" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="3" />
              <path
                d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"
              />
            </svg>
            Manage your teams
          </a>
        </li>
      </ul>
    </ng-template>
  `,
  styles: `
    :host {
      position: relative;
      display: block;
      min-width: 0;
    }
    .team-switch__btn {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      max-width: 11rem;
      min-height: var(--control-height-sm);
      padding: 0 var(--space-2) 0 var(--space-3);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-md);
      background: var(--color-bg-surface);
      color: var(--color-fg-default);
      font: var(--text-label);
      cursor: pointer;
    }
    @media (min-width: 40rem) {
      .team-switch__btn {
        max-width: 16rem;
      }
    }
    .team-switch__btn:hover,
    .team-switch__btn[aria-expanded='true'] {
      background: var(--color-bg-subtle);
    }
    .team-switch__btn:focus-visible {
      outline: var(--focus-ring-width) solid var(--color-focus-ring);
      outline-offset: var(--focus-ring-offset, 2px);
    }
    .team-switch__btn[aria-busy='true'] {
      cursor: progress;
    }
    .team-switch__name {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .spinner {
      flex: none;
      width: 1rem;
      height: 1rem;
      border: 2px solid var(--color-border-default);
      border-top-color: var(--color-accent);
      border-radius: 50%;
      animation: team-switch-spin 0.8s linear infinite;
    }
    @keyframes team-switch-spin {
      to {
        transform: rotate(360deg);
      }
    }
    .menu {
      min-width: 16rem;
      padding: var(--space-1);
      margin: var(--space-1) 0 0;
      list-style: none;
      background: var(--color-bg-surface-raised);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-3);
    }
    .menu__label {
      padding: var(--space-2) var(--space-3) var(--space-1);
      font: var(--text-overline);
      letter-spacing: var(--letter-spacing-wide);
      text-transform: uppercase;
      color: var(--color-fg-muted);
    }
    .menu__item {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      width: 100%;
      min-height: var(--control-height-sm);
      padding: 0 var(--space-3);
      border: 0;
      border-radius: var(--radius-sm);
      background: none;
      color: var(--color-fg-default);
      font: var(--text-body-sm);
      text-align: left;
      text-decoration: none;
      cursor: pointer;
    }
    .menu__item:hover,
    .menu__item:focus-visible {
      background: var(--color-bg-subtle);
      outline: none;
    }
    .menu__item:focus-visible {
      outline: var(--focus-ring-width) solid var(--color-focus-ring);
      outline-offset: calc(-1 * var(--focus-ring-width));
    }
    .menu__check {
      flex: none;
      visibility: hidden;
      color: var(--color-success-fg);
    }
    .menu__item[aria-checked='true'] {
      font-weight: var(--font-weight-semibold);
    }
    .menu__item[aria-checked='true'] .menu__check {
      visibility: visible;
    }
    .menu__meta {
      margin-left: auto;
      font: var(--text-caption);
      color: var(--color-fg-muted);
    }
    .menu__divider {
      border: 0;
      border-top: 1px solid var(--color-border-default);
      margin: var(--space-1) 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamSwitcher {
  /** The teams the manager manages, oldest first. */
  readonly teams = input.required<readonly TeamSwitcherTeam[]>();
  /** True while a switch runs: the button shows a spinner and says "Switching…". */
  readonly busy = input<boolean>(false);
  /** The person chose another team. */
  readonly chosen = output<TeamSwitcherTeam>();

  protected readonly activeName = computed(() => this.teams().find((t) => t.active)?.name ?? '');
  protected readonly positions: ConnectedPosition[] = [
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top' },
  ];

  protected choose(team: TeamSwitcherTeam): void {
    if (!team.active) this.chosen.emit(team);
  }
}
