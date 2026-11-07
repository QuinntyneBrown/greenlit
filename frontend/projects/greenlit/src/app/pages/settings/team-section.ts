import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';

import {
  TEAM_SETTINGS_SERVICE,
  TIME_ZONE_OPTIONS,
  TeamSettingsMember,
  TeamSettingsTeam,
} from 'api';
import {
  Button,
  MemberList,
  MemberListItem,
  MemberRoleChange,
  MemberYearlyDaysChange,
  SelectField,
  TextField,
} from 'components';

/**
 * The Team section of Settings (pages/settings/default; docs/detailed-designs/teams/team-settings): the team's
 * name and time zone, and a row per member with their role and yearly days. A member sees the same values
 * read-only. Inviting and editing a part-timer's working days open dialogs, which the page owns.
 */
@Component({
  selector: 'app-team-section',
  imports: [Button, MemberList, SelectField, TextField],
  template: `
    <h2 id="team-title" class="section-title" tabindex="-1">Team</h2>
    <p>Everyone who appears on the calendar. Managers can approve requests and edit any row.</p>
    @if (!team().canEdit) {
      <p class="note">
        Only managers can change team settings. Ask {{ team().managerName }} if something needs
        updating.
      </p>
    }
    <fieldset [disabled]="!team().canEdit">
      <div class="form-grid">
        <gl-text-field label="Team name" inputId="team-name" [(value)]="name" />
        <gl-select-field
          label="Time zone"
          selectId="team-zone"
          help="Weekends and holidays are worked out in this time zone."
          [options]="zones"
          [(value)]="zone"
        />
      </div>
      <gl-member-list
        class="members"
        label="Team members"
        [editable]="true"
        [members]="members()"
        (actioned)="editWorkingDays.emit($event)"
        (roleChange)="setRole($event)"
        (yearlyDaysChange)="setYearlyDays($event)"
      />
      @if (team().canEdit) {
        <div class="invite">
          <gl-button (click)="invite.emit()">
            <svg class="icon" aria-hidden="true" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Invite a member
          </gl-button>
        </div>
      }
    </fieldset>
    @if (team().canEdit) {
      <div class="settings-actions">
        <gl-button variant="primary" size="sm" [busy]="busy()" [disabled]="busy()" (click)="save()">
          {{ busy() ? 'Saving…' : 'Save changes' }}
        </gl-button>
        <span aria-live="polite">{{ status() }}</span>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    fieldset {
      border: 0;
      padding: 0;
      margin: var(--space-6) 0 0;
      min-width: 0;
    }
    fieldset:disabled {
      opacity: 0.7;
    }
    p {
      margin: var(--space-1) 0 0;
      max-width: 36rem;
      color: var(--color-fg-muted);
      font: var(--text-body-sm);
    }
    .form-grid {
      display: grid;
      gap: var(--space-4);
    }
    @media (min-width: 40rem) {
      .form-grid {
        grid-template-columns: 1fr 1fr;
      }
    }
    .members {
      margin-top: var(--space-6);
    }
    .invite {
      margin-top: var(--space-4);
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
export class TeamSection {
  readonly team = input.required<TeamSettingsTeam>();
  /** The team as the API now has it, after a save. */
  readonly saved = output<TeamSettingsTeam>();
  readonly invite = output<void>();
  readonly editWorkingDays = output<MemberListItem>();

  private readonly service = inject(TEAM_SETTINGS_SERVICE);
  protected readonly zones = TIME_ZONE_OPTIONS;

  /** What the fields show; they follow the team again whenever the page hands over a new one. */
  protected readonly name = linkedSignal(() => this.team().name);
  protected readonly zone = linkedSignal(() => this.team().timeZone);
  private readonly roles = linkedSignal<Record<string, TeamSettingsMember['role']>>(() =>
    Object.fromEntries(this.team().members.map((m) => [m.id, m.role])),
  );
  private readonly days = linkedSignal<Record<string, number | null>>(() =>
    Object.fromEntries(this.team().members.map((m) => [m.id, m.yearlyDays])),
  );
  protected readonly busy = signal(false);
  protected readonly status = signal('');

  protected readonly members = computed<MemberListItem[]>(() =>
    this.team().members.map((m) => ({
      id: m.id,
      name: m.name,
      ...(m.email ? { detail: m.email } : {}),
      role: this.roles()[m.id],
      yearlyDays: this.days()[m.id],
      ...(this.team().canEdit ? { action: 'Edit working days' } : {}),
    })),
  );
  protected setRole(change: MemberRoleChange): void {
    this.roles.update((roles) => ({
      ...roles,
      [change.member.id!]: change.role as TeamSettingsMember['role'],
    }));
    this.status.set('');
  }

  protected setYearlyDays(change: MemberYearlyDaysChange): void {
    this.days.update((days) => ({ ...days, [change.member.id!]: change.yearlyDays }));
    this.status.set('');
  }

  /** "Save changes": the whole section goes as one request. */
  protected save(): void {
    if (this.busy()) return;
    const team = this.team();
    const entered = {
      name: this.name().trim(),
      timeZone: this.zone(),
      members: team.members.map((m) => ({
        id: m.id,
        role: this.roles()[m.id],
        yearlyDays: this.days()[m.id],
      })),
    };
    this.busy.set(true);
    this.service.saveTeam(entered).subscribe((result) => {
      this.busy.set(false);
      if (!result.ok) return;
      this.status.set('Saved');
      this.saved.emit({
        ...team,
        name: entered.name,
        timeZone: entered.timeZone,
        members: team.members.map((m, i) => ({ ...m, ...entered.members[i] })),
      });
    });
  }
}
