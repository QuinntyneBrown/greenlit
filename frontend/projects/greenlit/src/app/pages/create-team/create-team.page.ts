import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';

import { CreatedTeam, HOLIDAY_CALENDAR_OPTIONS, TEAM_SERVICE, TIME_ZONE_OPTIONS } from 'api';
import {
  Alert,
  AuthCard,
  Button,
  FormSummary,
  FormSummaryItem,
  SelectField,
  TextField,
} from 'components';

interface MemberRow {
  readonly key: number;
  readonly name: string;
  readonly email: string;
}

const NAME_ID = 'ct-name';
const FIRST_ROWS = 3;

/**
 * Create a team (docs/detailed-designs/teams/create-team, L2-008): team name,
 * time zone, public-holiday calendar and the first member rows on the wide
 * auth card. A submit attempt with errors shows the summary, moves focus to
 * it and sends nothing. The created team replaces the session with one that
 * names it, and the card says the sheet is ready.
 */
@Component({
  selector: 'app-create-team-page',
  imports: [AuthCard, TextField, SelectField, FormSummary, Button, Alert],
  template: `
    @if (created(); as team) {
      <gl-auth-card title="You’re all set" lead="Your sheet is ready." [wide]="true">
        <gl-alert tone="success" [title]="team.name + ' is ready'">{{ readyText(team) }}</gl-alert>
        <gl-button link="/" variant="primary" [block]="true">Open the calendar</gl-button>
      </gl-auth-card>
    } @else {
      <gl-auth-card
        title="Set up your team"
        lead="Name it, pick a time zone and add the people who’ll share the sheet."
        [wide]="true"
      >
        <form class="stack" novalidate (submit)="submit($event)">
          @if (submitted() && summaryItems().length) {
            <gl-form-summary [items]="summaryItems()" />
          } @else if (failed()) {
            <gl-alert tone="danger" title="We couldn’t create your team">
              Something went wrong on our side. Nothing was saved, so you can try again.
            </gl-alert>
          }
          <div class="form-grid form-grid--2">
            <gl-text-field
              label="Team name"
              [inputId]="nameId"
              [(value)]="name"
              [error]="shown(nameId) ? nameError() : ''"
              [readonly]="busy()"
              (blurred)="touch(nameId)"
            />
            <gl-select-field
              label="Time zone"
              selectId="ct-zone"
              help="Weekends and holidays are worked out in this time zone."
              [options]="timeZones"
              [(value)]="timeZone"
            />
          </div>
          <gl-select-field
            label="Public holidays"
            selectId="ct-region"
            help="You can add or remove holidays at any time."
            [options]="holidayCalendars"
            [(value)]="holidayCountry"
          />
          <fieldset class="stack">
            <legend>Who is on the team?</legend>
            <p class="text-muted text-sm">
              Add a name for every row on your sheet. Add an email to send an invitation.
            </p>
            @for (row of rows(); track row.key; let i = $index) {
              <div class="form-grid form-grid--2">
                <gl-text-field
                  [label]="'Member ' + (i + 1) + ' name'"
                  [inputId]="rowId(i, 'name')"
                  [value]="row.name"
                  (valueChange)="setRow(i, { name: $event })"
                  [readonly]="busy()"
                />
                <gl-text-field
                  [label]="'Member ' + (i + 1) + ' email'"
                  [optional]="true"
                  type="email"
                  [inputId]="rowId(i, 'email')"
                  [value]="row.email"
                  (valueChange)="setRow(i, { email: $event })"
                  [readonly]="busy()"
                />
              </div>
            }
            <div>
              <gl-button size="sm" [disabled]="busy()" (click)="addRow()">
                <svg class="icon" aria-hidden="true" viewBox="0 0 24 24">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Add another member
              </gl-button>
            </div>
          </fieldset>
          <gl-button
            type="submit"
            variant="primary"
            [block]="true"
            [busy]="busy()"
            [disabled]="busy()"
          >
            Create team
          </gl-button>
        </form>
      </gl-auth-card>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .stack {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }
    .form-grid {
      display: grid;
      gap: var(--space-4);
      grid-template-columns: minmax(0, 1fr);
    }
    @media (min-width: 40rem) {
      .form-grid--2 {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    fieldset {
      border: 0;
      padding: 0;
      margin: 0;
      min-width: 0;
    }
    legend {
      font: var(--text-label);
      padding: 0;
      margin-bottom: var(--space-2);
    }
    .text-sm {
      font: var(--text-body-sm);
    }
    .text-muted {
      color: var(--color-fg-muted);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateTeamPage {
  private readonly teams = inject(TEAM_SERVICE);
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);
  private readonly summary = viewChild(FormSummary);

  protected readonly nameId = NAME_ID;
  protected readonly timeZones = TIME_ZONE_OPTIONS;
  protected readonly holidayCalendars = HOLIDAY_CALENDAR_OPTIONS;

  protected readonly name = signal('');
  protected readonly timeZone = signal(TIME_ZONE_OPTIONS[0].value);
  protected readonly holidayCountry = signal(HOLIDAY_CALENDAR_OPTIONS[0].value);
  private nextKey = 0;
  protected readonly rows = signal<readonly MemberRow[]>(
    Array.from({ length: FIRST_ROWS }, () => this.emptyRow()),
  );
  protected readonly submitted = signal(false);
  /** True while the request runs (pages/create-team/submitting). */
  protected readonly busy = signal(false);
  /** The last attempt failed (pages/create-team/error). */
  protected readonly failed = signal(false);
  /** The team once created (pages/create-team/success). */
  protected readonly created = signal<CreatedTeam | null>(null);
  private readonly touched = signal<ReadonlySet<string>>(new Set());

  protected readonly nameError = computed(() =>
    this.name().trim() ? '' : 'Give your team a name.',
  );

  /** The summary repeats each field error as a link, without the full stop (pages/create-team/invalid). */
  protected readonly summaryItems = computed<FormSummaryItem[]>(() => {
    const items: FormSummaryItem[] = [];
    if (this.nameError()) items.push({ field: NAME_ID, message: 'Give your team a name' });
    return items;
  });

  protected rowId(index: number, part: 'name' | 'email'): string {
    return `ct-m${index + 1}-${part}`;
  }

  protected setRow(index: number, change: Partial<Omit<MemberRow, 'key'>>): void {
    this.rows.update((rows) => rows.map((row, i) => (i === index ? { ...row, ...change } : row)));
  }

  protected addRow(): void {
    this.rows.update((rows) => [...rows, this.emptyRow()]);
    const id = this.rowId(this.rows().length - 1, 'name');
    afterNextRender(() => this.document.getElementById(id)?.focus(), { injector: this.injector });
  }

  protected shown(field: string): boolean {
    return this.submitted() || this.touched().has(field);
  }

  protected touch(field: string): void {
    if (this.touched().has(field)) return;
    this.touched.update((set) => new Set([...set, field]));
  }

  protected readyText(team: CreatedTeam): string {
    if (team.invited === 0)
      return 'Everyone is on the calendar now, and you can invite them later from Settings.';
    const people = team.invited === 1 ? '1 person' : `${team.invited} people`;
    return `We’ve emailed invitations to ${people}. Anyone without an email is on the calendar now, and you can invite them later from Settings.`;
  }

  protected submit(event: Event): void {
    event.preventDefault();
    if (this.busy()) return;
    this.submitted.set(true);
    if (this.summaryItems().length) {
      afterNextRender(() => this.summary()?.focus(), { injector: this.injector });
      return;
    }
    this.failed.set(false);
    this.busy.set(true);
    // Members are optional: a row without a name is left out, even with an email.
    const members = this.rows()
      .filter((row) => row.name.trim())
      .map((row) => ({ name: row.name.trim(), email: row.email.trim() || null }));
    this.teams
      .create({
        name: this.name().trim(),
        timeZone: this.timeZone(),
        holidayCountry: this.holidayCountry(),
        members,
      })
      .subscribe((result) => {
        this.busy.set(false);
        if (result.outcome === 'created') this.created.set(result.team);
        else this.failed.set(true);
      });
  }

  private emptyRow(): MemberRow {
    return { key: this.nextKey++, name: '', email: '' };
  }
}
