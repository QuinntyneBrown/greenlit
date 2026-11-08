import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, map, of, startWith, switchMap } from 'rxjs';

import {
  HOLIDAY_SERVICE,
  Holiday,
  SHEET_SERVICE,
  SheetMonth,
  AllowanceDefaults,
  TEAM_SETTINGS_SERVICE,
  TeamSettingsTeam,
  TeamHolidays,
  COVERAGE_SERVICE,
  NOTIFICATIONS_SERVICE,
  NotificationSwitches,
  WORKING_DAYS_SERVICE,
  holidayDateLabel,
  weekDayNames,
  weekDayNumbers,
} from 'api';
import {
  Alert,
  Button,
  Counter,
  DayChips,
  EmptyState,
  HolidayList,
  HolidayListItem,
  MemberListItem,
  SettingsNav,
  Skeleton,
  Switch,
} from 'components';

import { AppDialogs } from '../../dialogs/app-dialogs';
import { EditWorkingDaysDialog } from '../../dialogs/edit-working-days/edit-working-days.dialog';
import { InviteMemberDialog } from '../../dialogs/invite-member/invite-member.dialog';
import { AddHolidayDialog, AddHolidayOutcome } from '../../dialogs/add-holiday/add-holiday.dialog';
import { RemoveHolidayDialog } from '../../dialogs/remove-holiday/remove-holiday.dialog';
import { ToastService } from '../../toasts/toast.service';
import { AllowancesSection } from './allowances-section';
import { TeamSection } from './team-section';
import { YourTeamsSection } from './your-teams-section';
import { ManagedTeamsState } from '../../teams/managed-teams';

type Load =
  | { readonly state: 'loading' }
  | { readonly state: 'ready'; readonly sheet: SheetMonth; readonly team: TeamSettingsTeam }
  | { readonly state: 'error' };

type HolidaysLoad =
  | { readonly state: 'idle' }
  | { readonly state: 'loading' }
  | { readonly state: 'ready'; readonly holidays: TeamHolidays }
  | { readonly state: 'error' };

/**
 * Settings (pages/settings/default). Journey 5 builds the Team section far enough to invite
 * people from it (docs/detailed-designs/teams/invite-member): who is on the team, and for a
 * manager "Invite a member". Journey 14 adds the holidays of Work week & holidays for a manager
 * (docs/detailed-designs/teams/manage-holidays). Team name, time zone, roles, yearly days and
 * "Save changes" are journey 18 (L2-009), and the other sections come with theirs.
 */
@Component({
  selector: 'app-settings-page',
  imports: [
    Alert,
    Button,
    Counter,
    DayChips,
    EmptyState,
    AllowancesSection,
    HolidayList,
    SettingsNav,
    Skeleton,
    Switch,
    TeamSection,
    YourTeamsSection,
  ],
  template: `
    @if (review(); as review) {
      <gl-alert
        class="review"
        [banner]="true"
        [dismissible]="true"
        [title]="review.name + ' are ready'"
        (dismissed)="reviewDismissed.set(true)"
      >
        Review them and add the ones your team observes.
        <gl-button slot="actions" size="sm" (click)="reviewHolidays()">Review holidays</gl-button>
      </gl-alert>
    }
    @if (withoutAllowance(); as without) {
      <gl-alert
        class="review"
        tone="warning"
        [banner]="true"
        [dismissible]="true"
        [title]="
          countWord(without.count) +
          (without.count === 1 ? ' member has' : ' members have') +
          ' no allowance set'
        "
        (dismissed)="noAllowanceDismissed.set(true)"
      >
        They’re using the default of {{ without.days }} days until you change it.
      </gl-alert>
    }
    @if (teamSavedBanner()) {
      <gl-alert
        class="review"
        tone="success"
        [banner]="true"
        [dismissible]="true"
        title="Team settings saved"
        (dismissed)="teamSavedBanner.set(false)"
      >
        Everyone sees the new settings straight away.
      </gl-alert>
    }
    <div class="settings-layout">
      <gl-settings-nav [items]="navItems()" />
      <div class="settings-content">
        <h1>Settings</h1>
        <section id="team" class="settings-section" aria-labelledby="team-title">
          @switch (load().state) {
            @case ('error') {
              <h2 id="team-title" class="section-title" tabindex="-1">Team</h2>
              <div class="card-plain">
                <gl-empty-state
                  tone="error"
                  title="We couldn’t load your settings"
                  text="Something went wrong on our side. Nothing was changed."
                >
                  <svg slot="icon" class="icon icon--lg" aria-hidden="true" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 8v5M12 16h.01" />
                  </svg>
                  <gl-button slot="actions" (click)="retry()">Try again</gl-button>
                </gl-empty-state>
              </div>
            }
            @case ('ready') {
              <app-team-section
                [team]="team()!"
                (saved)="teamSaved($event)"
                (invite)="invite()"
                (editWorkingDays)="editWorkingDays($event)"
              />
            }
            @default {
              <h2 id="team-title" class="section-title" tabindex="-1">Team</h2>
              <gl-skeleton />
            }
          }
        </section>
        @if (isManager()) {
          <section id="allowances" class="settings-section" aria-labelledby="allowances-title">
            @if (allowances(); as defaults) {
              <app-allowances-section [defaults]="defaults" (saved)="allowancesSaved($event)" />
            } @else {
              <h2 id="allowances-title" class="section-title" tabindex="-1">Allowances</h2>
              <gl-skeleton />
            }
          </section>
        }
        @if (isManager()) {
          <section id="work-week" class="settings-section" aria-labelledby="work-week-title">
            <h2 id="work-week-title" class="section-title" tabindex="-1">
              Work week &amp; holidays
            </h2>
            <p>
              Non-working days and holidays show red on the calendar and never count against
              allowance.
            </p>
            <p class="label label--days">Working days</p>
            <gl-day-chips
              [pressed]="pressedDays()"
              [disabled]="weekBusy() || savedWeek() === null"
              (toggled)="toggleDay($event)"
            />
            @if (noDays()) {
              <span class="field__error">Pick at least one working day.</span>
            }
            @switch (holidaysLoad().state) {
              @case ('error') {
                <div class="card-plain holidays">
                  <gl-empty-state
                    tone="error"
                    [compact]="true"
                    title="We couldn’t load the holidays"
                    text="Something went wrong on our side. Nothing was changed."
                  >
                    <svg slot="icon" class="icon icon--lg" aria-hidden="true" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 8v5M12 16h.01" />
                    </svg>
                    <gl-button slot="actions" (click)="retryHolidays()">Try again</gl-button>
                  </gl-empty-state>
                </div>
              }
              @case ('ready') {
                <div class="toolbar-row">
                  <p class="label">Holidays</p>
                  @if (source(); as source) {
                    <p class="text-caption">{{ source }}</p>
                  }
                </div>
                @if (holidays().length) {
                  <gl-holiday-list
                    class="holidays"
                    label="Holidays"
                    [holidays]="holidays()"
                    (removed)="removeHoliday($event)"
                  />
                } @else {
                  <div class="card-plain holidays">
                    <gl-empty-state
                      [compact]="true"
                      title="No holidays yet"
                      text="Add the days your team is off together. They turn red for everyone and never count against allowance."
                    >
                      <svg slot="icon" class="icon icon--lg" aria-hidden="true" viewBox="0 0 24 24">
                        <rect x="4" y="5" width="16" height="15" rx="2" />
                        <path d="M4 10h16M9 3v4M15 3v4" />
                      </svg>
                    </gl-empty-state>
                  </div>
                }
                <div class="actions">
                  <gl-button (click)="addDayOff()">
                    <svg class="icon" aria-hidden="true" viewBox="0 0 24 24">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    Add day off
                  </gl-button>
                </div>
              }
              @default {
                <gl-skeleton />
              }
            }
            <div class="settings-actions">
              <gl-button
                variant="primary"
                size="sm"
                [busy]="weekBusy()"
                [disabled]="!canSaveWeek()"
                (click)="saveWorkWeek()"
              >
                {{ weekBusy() ? 'Saving…' : 'Save changes' }}
              </gl-button>
              <span aria-live="polite">{{ weekStatus() }}</span>
            </div>
          </section>
        }
        @if (isManager()) {
          <section id="coverage" class="settings-section" aria-labelledby="coverage-title">
            <h2 id="coverage-title" class="section-title">Coverage</h2>
            <p>
              The fewest people who should be in on any working day. Days below this are flagged on
              the calendar’s “Out” row.
            </p>
            @if (coverageSettings(); as coverage) {
              <fieldset>
                <gl-counter
                  [value]="minimum()"
                  [max]="coverage.teamSize"
                  decrementLabel="Fewer people"
                  incrementLabel="More people"
                  [suffix]="'of ' + coverage.teamSize + ' people in'"
                  [disabled]="coverageBusy()"
                  (valueChange)="stepCoverage($event)"
                />
              </fieldset>
            } @else {
              <gl-skeleton />
            }
            <div class="settings-actions">
              <gl-button
                variant="primary"
                size="sm"
                [busy]="coverageBusy()"
                [disabled]="!canSaveCoverage()"
                (click)="saveCoverage()"
              >
                {{ coverageBusy() ? 'Saving…' : 'Save changes' }}
              </gl-button>
              <span aria-live="polite">{{ coverageStatus() }}</span>
            </div>
          </section>
        }
        @if (isManager()) {
          <section
            id="notifications"
            class="settings-section"
            aria-labelledby="notifications-title"
          >
            <h2 id="notifications-title" class="section-title">Notifications</h2>
            <p>Email only. Greenlit never sends daily digests.</p>
            @if (notificationSettings(); as saved) {
              <fieldset>
                <div class="stack">
                  <gl-switch
                    label="New requests"
                    [description]="'Email ' + managerName() + ' when someone requests time off.'"
                    [checked]="newRequestsOn()"
                    [disabled]="notificationsBusy()"
                    (checkedChange)="flipNewRequests($event)"
                  />
                  <gl-switch
                    label="Decisions"
                    description="Email team members when their request is approved or declined."
                    [checked]="decisionsOn()"
                    [disabled]="notificationsBusy()"
                    (checkedChange)="flipDecisions($event)"
                  />
                </div>
              </fieldset>
            } @else {
              <gl-skeleton />
            }
            <div class="settings-actions">
              <gl-button
                variant="primary"
                size="sm"
                [busy]="notificationsBusy()"
                [disabled]="!canSaveNotifications()"
                (click)="saveNotifications()"
              >
                {{ notificationsBusy() ? 'Saving…' : 'Save changes' }}
              </gl-button>
              <span aria-live="polite">{{ notificationsStatus() }}</span>
            </div>
          </section>
        }
        @if (isManager()) {
          <section id="teams" class="settings-section" aria-labelledby="teams-title">
            <app-your-teams-section
              [load]="managedTeams.load()"
              [busy]="managedTeams.busy()"
              (retry)="managedTeams.refresh()"
              (switchTo)="managedTeams.switchTo($event)"
              (makeDefault)="managedTeams.makeDefault($event)"
            />
          </section>
        }
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .settings-layout {
      display: grid;
      gap: var(--space-10);
    }
    @media (min-width: 64rem) {
      .settings-layout {
        grid-template-columns: 12.5rem minmax(0, 1fr);
      }
    }
    .settings-content {
      max-width: 48rem;
      min-width: 0;
    }
    h1 {
      margin-bottom: var(--space-6);
    }
    .section-title {
      margin-bottom: var(--space-2);
    }
    section > p {
      margin-bottom: var(--space-4);
    }
    .settings-section + .settings-section {
      margin-top: var(--space-10);
    }
    .note {
      color: var(--color-fg-muted);
    }
    .actions {
      margin-top: var(--space-4);
    }
    .label {
      font: var(--text-label);
      margin: 0;
    }
    section > .label--days {
      margin-bottom: var(--space-2);
    }
    .toolbar-row {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--space-2);
      margin-top: var(--space-8);
    }
    section > .text-caption,
    .toolbar-row > .text-caption {
      font: var(--text-caption);
      color: var(--color-fg-muted);
      margin: 0;
    }
    .holidays {
      margin-top: var(--space-2);
    }
    .field__error {
      display: block;
      margin-top: var(--space-2);
      font: var(--text-caption);
      color: var(--color-danger-fg);
    }
    .settings-actions {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      margin-top: var(--space-6);
    }
    .review {
      margin-bottom: var(--space-6);
    }
    .card-plain {
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-md);
      background: var(--color-bg-surface);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {
  private readonly sheet = inject(SHEET_SERVICE);
  private readonly teamSettings = inject(TEAM_SETTINGS_SERVICE);
  private readonly holidayService = inject(HOLIDAY_SERVICE);
  private readonly workingDaysService = inject(WORKING_DAYS_SERVICE);
  private readonly coverageService = inject(COVERAGE_SERVICE);
  private readonly notificationsService = inject(NOTIFICATIONS_SERVICE);
  private readonly dialogs = inject(AppDialogs);
  private readonly toasts = inject(ToastService);
  private readonly document = inject(DOCUMENT);
  private readonly attempt = signal(0);
  private readonly holidayAttempt = signal(0);
  /** Your teams (L2-054): the app shell reads them after every navigation. */
  protected readonly managedTeams = inject(ManagedTeamsState);

  protected readonly load = toSignal(
    toObservable(this.attempt).pipe(
      switchMap((attempt) => {
        const month = forkJoin([this.sheet.month(), this.teamSettings.team()]).pipe(
          map(([sheet, team]): Load => ({ state: 'ready', sheet, team })),
          catchError(() => of<Load>({ state: 'error' })),
        );
        // The first load shows the skeleton; a reload after inviting keeps the list on screen.
        return attempt === 0 ? month.pipe(startWith<Load>({ state: 'loading' })) : month;
      }),
    ),
    { initialValue: { state: 'loading' } as Load },
  );

  private readonly ready = computed(() => {
    const load = this.load();
    return load.state === 'ready' ? load.sheet : null;
  });

  /** The Team section as the API now has it after a save, until the page loads again. */
  private readonly savedTeam = signal<TeamSettingsTeam | null>(null);
  protected readonly teamSavedBanner = signal(false);
  protected readonly team = computed(() => {
    const load = this.load();
    return load.state === 'ready' ? (this.savedTeam() ?? load.team) : null;
  });

  /** The sections the viewer has, for the nav beside them. */
  protected readonly navItems = computed(() => [
    { id: 'team', label: 'Team' },
    ...(this.isManager()
      ? [
          { id: 'allowances', label: 'Allowances' },
          { id: 'work-week', label: 'Work week & holidays' },
          { id: 'coverage', label: 'Coverage' },
          { id: 'notifications', label: 'Notifications' },
          { id: 'teams', label: 'Your teams' },
        ]
      : []),
  ]);

  protected readonly isManager = computed(() => this.ready()?.isManager ?? false);
  protected readonly managerName = computed(() => this.ready()?.managerName ?? '');

  /** The allowance defaults, the manager's to read; null until they have loaded. */
  private readonly loadedAllowances = toSignal(
    toObservable(this.isManager).pipe(
      switchMap((manager) =>
        manager
          ? this.teamSettings
              .allowances()
              .pipe(catchError(() => of<AllowanceDefaults | null>(null)))
          : of(null),
      ),
    ),
    { initialValue: null },
  );

  private readonly savedAllowances = signal<AllowanceDefaults | null>(null);
  protected readonly allowances = computed(() => this.savedAllowances() ?? this.loadedAllowances());

  protected readonly noAllowanceDismissed = signal(false);
  private static readonly WORDS = [
    'No',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
  ];

  protected countWord(count: number): string {
    return SettingsPage.WORDS[count] ?? String(count);
  }

  /** Members who use the default days because they have none of their own (L2-027 AC4). */
  protected readonly withoutAllowance = computed(() => {
    const team = this.team();
    const defaults = this.allowances();
    if (this.noAllowanceDismissed() || !team?.canEdit || !defaults) return null;
    const count = team.members.filter((m) => m.yearlyDays === null).length;
    return count === 0 ? null : { count, days: defaults.defaultYearlyDays };
  });

  protected allowancesSaved(defaults: AllowanceDefaults): void {
    this.savedAllowances.set(defaults);
    this.teamSavedBanner.set(true);
  }

  /** The holidays are the manager's: a member never asks for them. */
  protected readonly holidaysLoad = toSignal(
    toObservable(
      computed(() => ({ manager: this.isManager(), attempt: this.holidayAttempt() })),
    ).pipe(
      switchMap(({ manager, attempt }) => {
        if (!manager) return of<HolidaysLoad>({ state: 'idle' });
        const list = this.holidayService.list().pipe(
          map((holidays): HolidaysLoad => ({ state: 'ready', holidays })),
          catchError(() => of<HolidaysLoad>({ state: 'error' })),
        );
        // The first load shows the skeleton; a reload keeps the list on screen.
        return attempt === 0 ? list.pipe(startWith<HolidaysLoad>({ state: 'loading' })) : list;
      }),
    ),
    { initialValue: { state: 'idle' } as HolidaysLoad },
  );

  /** The team's work week as saved; null until it has loaded (the chips wait). */
  private readonly loadedWeek = toSignal(
    toObservable(this.isManager).pipe(
      switchMap((manager) =>
        manager
          ? this.workingDaysService.workWeek().pipe(
              map((days) => weekDayNumbers(days)),
              catchError(() => of(null)),
            )
          : of(null),
      ),
    ),
    { initialValue: null },
  );
  private readonly savedOverride = signal<readonly number[] | null>(null);
  protected readonly savedWeek = computed(() => this.savedOverride() ?? this.loadedWeek());
  /** What the chips show while the manager edits (L2-039); null while they match what is saved. */
  private readonly draftWeek = signal<readonly number[] | null>(null);
  protected readonly pressedDays = computed(() => this.draftWeek() ?? this.savedWeek() ?? []);
  protected readonly weekBusy = signal(false);
  protected readonly weekStatus = signal('');
  protected readonly noDays = computed(
    () => this.savedWeek() !== null && this.pressedDays().length === 0,
  );
  protected readonly canSaveWeek = computed(() => {
    const draft = this.draftWeek();
    const saved = this.savedWeek();
    if (draft === null || saved === null || this.weekBusy() || draft.length === 0) return false;
    return draft.join() !== saved.join();
  });

  /** The coverage minimum and team size as saved; null until they have loaded (the stepper waits). */
  private readonly loadedCoverage = toSignal(
    toObservable(this.isManager).pipe(
      switchMap((manager) =>
        manager ? this.coverageService.settings().pipe(catchError(() => of(null))) : of(null),
      ),
    ),
    { initialValue: null },
  );
  private readonly savedCoverage = signal<number | null>(null);
  protected readonly coverageSettings = computed(() => {
    const loaded = this.loadedCoverage();
    return loaded === null
      ? null
      : { teamSize: loaded.teamSize, saved: this.savedCoverage() ?? loaded.minimum };
  });
  /** What the stepper shows while the manager edits; null while it matches what is saved. */
  private readonly draftCoverage = signal<number | null>(null);
  protected readonly minimum = computed(
    () => this.draftCoverage() ?? this.coverageSettings()?.saved ?? 0,
  );
  protected readonly coverageBusy = signal(false);
  protected readonly coverageStatus = signal('');
  protected readonly canSaveCoverage = computed(() => {
    const draft = this.draftCoverage();
    const saved = this.coverageSettings()?.saved;
    return draft !== null && saved !== undefined && !this.coverageBusy() && draft !== saved;
  });

  protected stepCoverage(value: number): void {
    this.draftCoverage.set(value);
    this.coverageStatus.set('');
  }

  /** "Save changes" of Coverage; a failure keeps the value as entered and offers Try again. */
  protected saveCoverage(): void {
    const draft = this.draftCoverage();
    if (draft === null || this.coverageBusy()) return;
    this.coverageBusy.set(true);
    this.coverageService.save(draft).subscribe((result) => {
      this.coverageBusy.set(false);
      if (result.ok) {
        this.savedCoverage.set(draft);
        this.draftCoverage.set(null);
        this.coverageStatus.set('Saved');
        return;
      }
      this.toasts.show({
        tone: 'danger',
        title: 'We couldn’t save your changes',
        body: 'Nothing was changed. Check your connection and try again.',
        action: { label: 'Try again', run: () => this.saveCoverage() },
      });
    });
  }

  /** The two email switches as saved; null until they have loaded (the switches wait). */
  private readonly loadedNotifications = toSignal(
    toObservable(this.isManager).pipe(
      switchMap((manager) =>
        manager ? this.notificationsService.settings().pipe(catchError(() => of(null))) : of(null),
      ),
    ),
    { initialValue: null },
  );
  private readonly savedNotifications = signal<NotificationSwitches | null>(null);
  protected readonly notificationSettings = computed(
    () => this.savedNotifications() ?? this.loadedNotifications(),
  );
  /** What the switches show while the manager edits; null while they match what is saved. */
  private readonly draftNotifications = signal<NotificationSwitches | null>(null);
  protected readonly newRequestsOn = computed(
    () => (this.draftNotifications() ?? this.notificationSettings())?.newRequests ?? false,
  );
  protected readonly decisionsOn = computed(
    () => (this.draftNotifications() ?? this.notificationSettings())?.decisions ?? false,
  );
  protected readonly notificationsBusy = signal(false);
  protected readonly notificationsStatus = signal('');
  protected readonly canSaveNotifications = computed(() => {
    const draft = this.draftNotifications();
    const saved = this.notificationSettings();
    return (
      draft !== null &&
      saved !== null &&
      !this.notificationsBusy() &&
      (draft.newRequests !== saved.newRequests || draft.decisions !== saved.decisions)
    );
  });

  protected flipNewRequests(on: boolean): void {
    this.draftNotifications.set({ newRequests: on, decisions: this.decisionsOn() });
    this.notificationsStatus.set('');
  }

  protected flipDecisions(on: boolean): void {
    this.draftNotifications.set({ newRequests: this.newRequestsOn(), decisions: on });
    this.notificationsStatus.set('');
  }

  /** "Save changes" of Notifications; a failure keeps the switches as set and offers Try again. */
  protected saveNotifications(): void {
    const draft = this.draftNotifications();
    if (draft === null || this.notificationsBusy()) return;
    this.notificationsBusy.set(true);
    this.notificationsService.save(draft).subscribe((result) => {
      this.notificationsBusy.set(false);
      if (result.ok) {
        this.savedNotifications.set(draft);
        this.draftNotifications.set(null);
        this.notificationsStatus.set('Saved');
        return;
      }
      this.toasts.show({
        tone: 'danger',
        title: 'We couldn’t save your changes',
        body: 'Nothing was changed. Check your connection and try again.',
        action: { label: 'Try again', run: () => this.saveNotifications() },
      });
    });
  }

  private readonly loadedHolidays = computed(() => {
    const load = this.holidaysLoad();
    return load.state === 'ready' ? load.holidays : null;
  });

  protected readonly reviewDismissed = signal(false);

  /** Next year's public holidays are ready to review (L2-036 AC3), until the manager dismisses the banner. */
  protected readonly review = computed(() =>
    this.reviewDismissed() ? null : (this.loadedHolidays()?.review ?? null),
  );

  protected readonly source = computed(() => this.loadedHolidays()?.source ?? null);

  protected readonly holidays = computed<HolidayListItem[]>(() =>
    (this.loadedHolidays()?.holidays ?? []).map((h) => ({
      id: h.id,
      date: holidayDateLabel(h.date),
      name: h.name,
    })),
  );

  protected toggleDay(day: number): void {
    const days = this.pressedDays();
    const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort();
    this.draftWeek.set(next);
    this.weekStatus.set('');
  }

  /** "Save changes" of Work week & holidays; a failure keeps the chips as entered and offers Try again. */
  protected saveWorkWeek(): void {
    const draft = this.draftWeek();
    if (draft === null || this.weekBusy()) return;
    this.weekBusy.set(true);
    this.workingDaysService.saveWorkWeek(weekDayNames(draft)).subscribe((result) => {
      this.weekBusy.set(false);
      if (result.ok) {
        this.savedOverride.set(draft);
        this.draftWeek.set(null);
        this.weekStatus.set('Saved');
        return;
      }
      this.toasts.show({
        tone: 'danger',
        title: 'We couldn’t save your changes',
        body: 'Nothing was changed. Check your connection and try again.',
        action: { label: 'Try again', run: () => this.saveWorkWeek() },
      });
    });
  }

  protected teamSaved(team: TeamSettingsTeam): void {
    this.savedTeam.set(team);
    this.teamSavedBanner.set(true);
  }

  protected retry(): void {
    this.savedTeam.set(null);
    this.attempt.update((n) => n + 1);
  }

  protected retryHolidays(): void {
    this.holidayAttempt.update((n) => n + 1);
  }

  /** "Review holidays": takes the manager to the holidays and puts focus on their heading. */
  protected reviewHolidays(): void {
    const heading = this.document.getElementById('work-week-title');
    heading?.scrollIntoView({ block: 'start' });
    heading?.focus({ preventScroll: true });
  }

  protected addDayOff(): void {
    const holidays = this.loadedHolidays()?.holidays ?? [];
    this.dialogs
      .open<AddHolidayOutcome>(AddHolidayDialog, '#ah-date', { holidays })
      .closed.subscribe((outcome) => {
        if (outcome === 'added') this.retryHolidays();
        if (outcome === 'weekend')
          this.toasts.show({
            tone: 'warning',
            title: 'That day is already a weekend',
            body: 'Nothing changes on the calendar, so we didn’t add it.',
          });
      });
  }

  protected removeHoliday(id: string): void {
    const holiday = this.loadedHolidays()?.holidays.find((h) => h.id === id);
    if (!holiday) return;
    this.dialogs
      .open<boolean>(RemoveHolidayDialog, '.dialog__footer .btn', { holiday })
      .closed.subscribe((removed) => {
        if (!removed) return;
        this.retryHolidays();
        this.toasts.show({
          tone: 'success',
          title: `Removed ${holiday.name}`,
          body: `${holidayDateLabel(holiday.date)} is a working day again.`,
          action: { label: 'Undo', run: () => this.restoreHoliday(holiday) },
        });
      });
  }

  /** Undo of a removal; when it fails the toast offers to try again. */
  private restoreHoliday(holiday: Holiday): void {
    this.holidayService.restore(holiday.id).subscribe((result) => {
      if (result.ok) {
        this.retryHolidays();
        return;
      }
      this.toasts.show({
        tone: 'danger',
        title: 'We couldn’t undo that',
        body: `${holiday.name} is still removed. Check your connection and try again.`,
        action: { label: 'Try again', run: () => this.restoreHoliday(holiday) },
      });
    });
  }

  /** "Edit working days" on a member's row: a part-timer's days in a dialog (L2-040). */
  protected editWorkingDays(item: MemberListItem): void {
    const member = this.ready()?.members.find((m) => m.id === item.id);
    if (!member) return;
    this.dialogs
      .open<boolean>(EditWorkingDaysDialog, '.chip--day', {
        memberId: member.id,
        firstName: member.name.split(' ')[0],
        days: member.workingDays,
      })
      .closed.subscribe((saved) => {
        if (saved) this.retry();
      });
  }

  protected invite(): void {
    this.dialogs.open<boolean>(InviteMemberDialog, '#im-name').closed.subscribe((invited) => {
      if (invited) this.retry();
    });
  }
}
