import { ChangeDetectionStrategy, Component, computed, input, linkedSignal } from '@angular/core';

import { SheetMonth } from 'api';
import { WeekStrip, WeekTabs } from 'components';

import {
  ShortRun,
  shortDates,
  shortDaysHeading,
  shortRuns,
  weekHolding,
  weekStripView,
  weekTabs,
  weeksOf,
} from './week-view';

/**
 * The calendar on a phone (docs/detailed-designs/sheet/phone-week, L2-063): one Monday-to-Sunday week of
 * the team at full width, with the month's short days first. Owns the week shown and the open date;
 * changing month opens the week that holds today, else the first week, with no date open.
 */
@Component({
  selector: 'app-calendar-week',
  imports: [WeekTabs, WeekStrip],
  template: `
    @if (heading(); as heading) {
      <section class="panel short-days" aria-label="Days short of people">
        <h2 class="panel__title">{{ heading }}</h2>
        @if (runs().length > 0) {
          <ul class="panel__list">
            @for (run of runs(); track run.label) {
              <li>
                <button class="short-days__run" type="button" (click)="openRun(run)">
                  <span class="short-days__dates">{{ run.label }}</span>
                  <span class="short-days__who">
                    @for (person of run.people; track person.name) {
                      <span
                        ><span
                          class="swatch"
                          [attr.data-status]="person.status"
                          aria-hidden="true"
                        ></span
                        >{{ person.name }} · {{ person.status }}</span
                      >
                    }
                  </span>
                  <svg class="icon icon--sm" aria-hidden="true" viewBox="0 0 24 24">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>
              </li>
            }
          </ul>
        }
      </section>
    }
    <gl-week-tabs [tabs]="tabs()" [selected]="week()" (selectedChange)="week.set($event)" />
    <gl-week-strip
      [label]="strip().label"
      [columns]="strip().columns"
      [rows]="strip().rows"
      [openDate]="openDate()"
    />
  `,
  styles: `
    :host {
      display: block;
      margin-top: var(--space-4);
      padding-bottom: 9rem;
    }
    :host > * + * {
      margin-top: var(--space-3);
    }
    .panel {
      display: block;
      background: var(--color-bg-surface);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-lg);
      padding: var(--space-3) var(--space-4);
    }
    .panel__title {
      margin: 0;
      font: var(--text-label);
    }
    .panel__list {
      list-style: none;
      margin: var(--space-1) 0 0;
      padding: 0;
    }
    .panel__list > li + li {
      border-top: 1px solid var(--color-border-default);
    }
    .short-days__run {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      width: 100%;
      min-height: var(--target-comfortable);
      padding: var(--space-2) 0;
      border: 0;
      background: none;
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
    }
    .short-days__run:hover {
      color: var(--color-brand-strong);
    }
    .short-days__run:focus-visible {
      outline: var(--focus-ring-width) solid var(--color-focus-ring);
      outline-offset: 2px;
      border-radius: var(--radius-sm);
    }
    .short-days__dates {
      flex: none;
      width: 7.5rem;
      font: var(--text-label);
      font-variant-numeric: tabular-nums;
    }
    .short-days__who {
      display: flex;
      flex: 1;
      flex-wrap: wrap;
      gap: var(--space-0-5) var(--space-3);
      min-width: 0;
      font: var(--text-caption);
      color: var(--color-fg-muted);
    }
    .short-days__who > span {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      white-space: nowrap;
    }
    .short-days__run .icon {
      flex: none;
      color: var(--color-fg-subtle);
    }
    .swatch {
      width: 0.75rem;
      height: 0.75rem;
      border-radius: var(--radius-xs);
      flex: none;
      background: var(--status-bg, var(--color-status-empty));
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
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarWeek {
  readonly sheet = input.required<SheetMonth>();

  private readonly weeks = computed(() => weeksOf(this.sheet().month));
  private readonly short = computed(() => shortDates(this.sheet()));

  /** The week shown: reset to today's week (or the first) whenever the month changes. */
  protected readonly week = linkedSignal({
    source: () => this.sheet().month,
    computation: () => weekHolding(this.weeks(), this.sheet().today),
  });

  /** The date whose panel is open; none after a change of month. */
  protected readonly openDate = linkedSignal<string, string | null>({
    source: () => this.sheet().month,
    computation: () => null,
  });

  protected readonly runs = computed(() => shortRuns(this.sheet(), this.short()));
  protected readonly heading = computed(() => shortDaysHeading(this.sheet(), this.runs().length));
  protected readonly tabs = computed(() => weekTabs(this.weeks(), this.short()));
  protected readonly strip = computed(() =>
    weekStripView(this.sheet(), this.weeks()[this.week()] ?? this.weeks()[0], this.short()),
  );

  /** A short-days run shows its week and opens its first day (L2-063 AC4). */
  protected openRun(run: ShortRun): void {
    this.week.set(weekHolding(this.weeks(), run.dates[0]));
    this.openDate.set(run.dates[0]);
  }
}
