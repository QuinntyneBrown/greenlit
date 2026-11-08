import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { ManagedTeam } from 'api';
import { Alert, Badge, Button, Skeleton } from 'components';

import { ManagedTeamsLoad } from '../../teams/managed-teams';

/** What is in flight in the section: a switch or a default change for one team. */
export interface TeamsBusy {
  readonly teamId: string;
  readonly action: 'switch' | 'default';
}

/**
 * Settings → Your teams (pages/settings/your-teams*, L2-054 AC2–AC6): the teams the manager manages, oldest first,
 * each marked Active and Default in text with an icon, with "Switch to this team" and "Make default" on the others and
 * "Add another team" below. While a change runs, its button says so and every action waits.
 */
@Component({
  selector: 'app-your-teams-section',
  imports: [Alert, Badge, Button, Skeleton],
  template: `
    <h2 id="teams-title" class="section-title" tabindex="-1">Your teams</h2>
    <p>The teams you manage. Greenlit opens your default team when you sign in.</p>
    @switch (load().state) {
      @case ('error') {
        <gl-alert class="teams-error" tone="danger" title="We couldn’t load your teams">
          Something went wrong on our side. Nothing was changed.
          <gl-button slot="actions" size="sm" (click)="retry.emit()">Try again</gl-button>
        </gl-alert>
      }
      @case ('ready') {
        <ul class="team-list" aria-label="Your teams" [attr.aria-busy]="busy() ? 'true' : null">
          @for (team of teams(); track team.id) {
            <li class="team-list__item">
              <span class="team-list__name">{{ team.name }}</span>
              <span class="team-list__marks">
                @if (team.active) {
                  <gl-badge tone="success" [icon]="true"
                    ><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m5 12 5 5 9-10" /></svg
                    >Active</gl-badge
                  >
                }
                @if (team.isDefault) {
                  <gl-badge tone="info" [icon]="true"
                    ><svg aria-hidden="true" viewBox="0 0 24 24">
                      <path
                        d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"
                      /></svg
                    >Default</gl-badge
                  >
                }
              </span>
              @if (!team.active || !team.isDefault) {
                <span class="team-list__actions">
                  @if (!team.active) {
                    <gl-button
                      size="sm"
                      [ariaLabel]="'Switch to ' + team.name"
                      [busy]="isBusy(team, 'switch')"
                      [disabled]="busy() !== null"
                      (click)="switchTo.emit(team)"
                      >{{
                        isBusy(team, 'switch') ? 'Switching…' : 'Switch to this team'
                      }}</gl-button
                    >
                  }
                  @if (!team.isDefault) {
                    <gl-button
                      variant="ghost"
                      size="sm"
                      [ariaLabel]="'Make ' + team.name + ' your default'"
                      [busy]="isBusy(team, 'default')"
                      [disabled]="busy() !== null"
                      (click)="makeDefault.emit(team)"
                      >{{ isBusy(team, 'default') ? 'Saving…' : 'Make default' }}</gl-button
                    >
                  }
                </span>
              }
            </li>
          }
        </ul>
        <div class="settings-actions">
          <gl-button size="sm" link="/create-team">
            <svg class="icon" aria-hidden="true" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add another team
          </gl-button>
        </div>
      }
      @default {
        <div class="team-list team-list--loading" aria-hidden="true">
          <gl-skeleton shape="rect" width="100%" height="var(--space-10)" />
          <gl-skeleton shape="rect" width="100%" height="var(--space-10)" />
        </div>
        <span class="visually-hidden" role="status">Loading your teams…</span>
      }
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .section-title {
      margin-bottom: var(--space-2);
    }
    p {
      margin: var(--space-1) 0 0;
      max-width: 36rem;
      color: var(--color-fg-muted);
      font: var(--text-body-sm);
    }
    .teams-error {
      display: block;
      margin-top: var(--space-6);
    }
    .team-list {
      list-style: none;
      margin: var(--space-6) 0 0;
      padding: 0;
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-lg);
      background: var(--color-bg-surface);
    }
    .team-list--loading {
      display: grid;
      gap: var(--space-3);
      padding: var(--space-4);
    }
    .team-list__item {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2) var(--space-3);
      padding: var(--space-3) var(--space-4);
    }
    .team-list__item + .team-list__item {
      border-top: 1px solid var(--color-border-default);
    }
    .team-list__name {
      font: var(--text-label);
      color: var(--color-fg-default);
    }
    .team-list__marks {
      display: inline-flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }
    .team-list__marks svg {
      width: 0.75rem;
      height: 0.75rem;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .team-list__actions {
      display: inline-flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      margin-left: auto;
    }
    .settings-actions {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      margin-top: var(--space-6);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class YourTeamsSection {
  readonly load = input.required<ManagedTeamsLoad>();
  /** The change in flight, if any; every action waits while one runs. */
  readonly busy = input<TeamsBusy | null>(null);

  readonly retry = output<void>();
  readonly switchTo = output<ManagedTeam>();
  readonly makeDefault = output<ManagedTeam>();

  protected teams(): readonly ManagedTeam[] {
    const load = this.load();
    return load.state === 'ready' ? load.teams : [];
  }

  protected isBusy(team: ManagedTeam, action: TeamsBusy['action']): boolean {
    const busy = this.busy();
    return busy !== null && busy.teamId === team.id && busy.action === action;
  }
}
