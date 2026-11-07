import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith, switchMap } from 'rxjs';

import {
  HOLIDAY_SERVICE,
  Holiday,
  SHEET_SERVICE,
  SheetMonth,
  TeamHolidays,
  holidayDateLabel,
} from 'api';
import {
  Button,
  DayChips,
  EmptyState,
  HolidayList,
  HolidayListItem,
  MemberList,
  MemberListItem,
  Skeleton,
} from 'components';

import { AppDialogs } from '../../dialogs/app-dialogs';
import { InviteMemberDialog } from '../../dialogs/invite-member/invite-member.dialog';
import { AddHolidayDialog, AddHolidayOutcome } from '../../dialogs/add-holiday/add-holiday.dialog';
import { RemoveHolidayDialog } from '../../dialogs/remove-holiday/remove-holiday.dialog';
import { ToastService } from '../../toasts/toast.service';

type Load =
  | { readonly state: 'loading' }
  | { readonly state: 'ready'; readonly sheet: SheetMonth }
  | { readonly state: 'error' };

type HolidaysLoad =
  | { readonly state: 'idle' }
  | { readonly state: 'loading' }
  | { readonly state: 'ready'; readonly holidays: TeamHolidays }
  | { readonly state: 'error' };

/** The team's work week until it can be edited (teams/working-days): Monday to Friday. */
const WORKING_DAYS = [1, 2, 3, 4, 5];

/**
 * Settings (pages/settings/default). Journey 5 builds the Team section far enough to invite
 * people from it (docs/detailed-designs/teams/invite-member): who is on the team, and for a
 * manager "Invite a member". Journey 14 adds the holidays of Work week & holidays for a manager
 * (docs/detailed-designs/teams/manage-holidays). Team name, time zone, roles, yearly days and
 * "Save changes" are journey 18 (L2-009), and the other sections come with theirs.
 */
@Component({
  selector: 'app-settings-page',
  imports: [Button, DayChips, EmptyState, HolidayList, MemberList, Skeleton],
  template: `
    <h1>Settings</h1>
    <section id="team" class="settings-section" aria-labelledby="team-title">
      <h2 id="team-title" class="section-title">Team</h2>
      @switch (load().state) {
        @case ('error') {
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
          <p>
            Everyone who appears on the calendar. Managers can approve requests and edit any row.
          </p>
          @if (!isManager()) {
            <p class="note">
              Only managers can change team settings. Ask {{ managerName() }} if something needs
              updating.
            </p>
          }
          <gl-member-list label="Team members" [members]="members()" />
          @if (isManager()) {
            <div class="actions">
              <gl-button (click)="invite()">
                <svg class="icon" aria-hidden="true" viewBox="0 0 24 24">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Invite a member
              </gl-button>
            </div>
          }
        }
        @default {
          <gl-skeleton />
        }
      }
    </section>
    @if (isManager()) {
      <section id="work-week" class="settings-section" aria-labelledby="work-week-title">
        <h2 id="work-week-title" class="section-title">Work week &amp; holidays</h2>
        <p>
          Non-working days and holidays show red on the calendar and never count against allowance.
        </p>
        <p class="label label--days">Working days</p>
        <gl-day-chips [pressed]="workingDays" />
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
      </section>
    }
  `,
  styles: `
    :host {
      display: block;
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
  private readonly holidayService = inject(HOLIDAY_SERVICE);
  private readonly dialogs = inject(AppDialogs);
  private readonly toasts = inject(ToastService);
  private readonly attempt = signal(0);
  private readonly holidayAttempt = signal(0);

  protected readonly load = toSignal(
    toObservable(this.attempt).pipe(
      switchMap((attempt) => {
        const month = this.sheet.month().pipe(
          map((sheet): Load => ({ state: 'ready', sheet })),
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

  protected readonly isManager = computed(() => this.ready()?.isManager ?? false);
  protected readonly managerName = computed(() => this.ready()?.managerName ?? '');

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

  protected readonly workingDays = WORKING_DAYS;

  private readonly loadedHolidays = computed(() => {
    const load = this.holidaysLoad();
    return load.state === 'ready' ? load.holidays : null;
  });

  protected readonly source = computed(() => this.loadedHolidays()?.source ?? null);

  protected readonly holidays = computed<HolidayListItem[]>(() =>
    (this.loadedHolidays()?.holidays ?? []).map((h) => ({
      id: h.id,
      date: holidayDateLabel(h.date),
      name: h.name,
    })),
  );

  /** Rows in the sheet's display order. */
  protected readonly members = computed<MemberListItem[]>(() =>
    (this.ready()?.members ?? []).map((m) => ({ name: m.name })),
  );

  protected retry(): void {
    this.attempt.update((n) => n + 1);
  }

  protected retryHolidays(): void {
    this.holidayAttempt.update((n) => n + 1);
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

  protected invite(): void {
    this.dialogs.open<boolean>(InviteMemberDialog, '#im-name').closed.subscribe((invited) => {
      if (invited) this.retry();
    });
  }
}
