import { NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, combineLatest, map, of, startWith, switchMap } from 'rxjs';

import { PERSON_SERVICE, Person, SentRequest } from 'api';
import { Avatar, Button, EmptyState, Legend, MonthMini, RunList, Skeleton, Stat } from 'components';

import { AppDialogs } from '../../dialogs/app-dialogs';
import { AdjustAllowanceDialog } from '../../dialogs/adjust-allowance/adjust-allowance.dialog';
import { RemoveMemberDialog } from '../../dialogs/remove-member/remove-member.dialog';
import { EditWorkingDaysDialog } from '../../dialogs/edit-working-days/edit-working-days.dialog';
import { NewRequestData, NewRequestDialog } from '../../dialogs/new-request/new-request.dialog';
import { ToastService } from '../../toasts/toast.service';
import { requestSentToast } from '../calendar/request-toasts';
import { adjustmentItems, caption, facts, miniMonths, runItems, subtitle } from './person-view';

type Load =
  | { readonly state: 'loading' }
  | { readonly state: 'ready'; readonly person: Person }
  | { readonly state: 'forbidden' }
  | { readonly state: 'notfound' }
  | { readonly state: 'error' };

/** What a failed load means: someone else's page (403), no such person (404), or a fault. */
function stateOf(error: unknown): 'forbidden' | 'notfound' | 'error' {
  const status = error instanceof HttpErrorResponse ? error.status : 0;
  return status === 403 ? 'forbidden' : status === 404 ? 'notfound' : 'error';
}

/**
 * A person's page (pages/person, docs/detailed-designs/allowances/person-page, L2-033 to L2-035): days
 * left as a big number, the facts bar, the year at a glance and the person's time off. `/people/{id}`
 * opens a member; `/person` opens the signed-in person's own page ("My time off").
 */
@Component({
  selector: 'app-person-page',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    Avatar,
    Button,
    EmptyState,
    Stat,
    Skeleton,
    Legend,
    MonthMini,
    RunList,
  ],
  template: `
    <ng-template #back>
      <a class="back-link" routerLink="/">
        <svg class="icon icon--sm" aria-hidden="true" viewBox="0 0 24 24">
          <path d="M19 12H5m6-6-6 6 6 6" />
        </svg>
        Calendar
      </a>
    </ng-template>
    @if (person(); as p) {
      <ng-container [ngTemplateOutlet]="back" />
      <header class="person-head">
        <div class="person-head__id">
          <gl-avatar [name]="p.name" size="xl" />
          <div class="person-head__text">
            <h1>{{ p.name }}</h1>
            @if (subtitle(); as text) {
              <p class="text-muted text-sm">{{ text }}</p>
            }
          </div>
        </div>
        <div>
          <p class="big-number" [attr.data-over]="p.daysOver > 0 ? '' : null">
            {{ p.allowance.left }}
          </p>
          <p class="text-muted text-sm caption">{{ caption() }}</p>
        </div>
      </header>
      <gl-stat class="person-facts" [facts]="facts()">
        @if (p.isYou && !p.canManage) {
          <gl-button slot="action" variant="primary" (click)="requestTimeOff(p)">
            <svg class="icon" aria-hidden="true" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Request time off
          </gl-button>
        }
      </gl-stat>
      <section class="year" aria-labelledby="year-title">
        <div class="toolbar-row">
          <h2 id="year-title" class="section-title">{{ p.year }} at a glance</h2>
          <gl-legend />
        </div>
        <div class="card-plain">
          <div class="month-mini-grid">
            @for (month of months(); track month.title) {
              <div>
                <gl-month-mini [title]="month.title" [offset]="month.offset" [days]="month.days" />
              </div>
            }
          </div>
        </div>
      </section>
      <div class="person-columns" [class.person-columns--manager]="p.canManage">
        <div class="person-columns__main">
          <div class="stack">
            <section aria-labelledby="up-title">
              <h2 id="up-title" class="section-title">Upcoming</h2>
              @if (p.upcoming.length) {
                <gl-run-list [items]="upcoming()" />
              } @else {
                <p class="text-muted text-sm none">Nothing planned for the rest of the year.</p>
              }
            </section>
            <section aria-labelledby="past-title">
              <h2 id="past-title" class="section-title">Taken in {{ p.year }}</h2>
              @if (p.taken.length) {
                <gl-run-list [items]="taken()" />
              } @else {
                <p class="text-muted text-sm none">No time off taken yet this year.</p>
              }
            </section>
            <section aria-labelledby="adj-title">
              <h2 id="adj-title" class="section-title">Allowance adjustments</h2>
              @if (p.adjustments.length) {
                <gl-run-list [items]="adjustments()" />
              } @else {
                <p class="text-muted text-sm none">No adjustments.</p>
              }
            </section>
          </div>
        </div>
        @if (p.canManage) {
          <div class="stack">
            <section aria-labelledby="adjust-title">
              <h2 id="adjust-title" class="section-title">Adjust allowance</h2>
              <p class="text-muted text-sm hint">
                Carry-over, extra days or corrections. Use a negative number to remove days.
              </p>
              <div class="action">
                <gl-button (click)="adjustAllowance(p)">
                  <svg class="icon" aria-hidden="true" viewBox="0 0 24 24">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Adjust allowance
                </gl-button>
              </div>
            </section>
            <section aria-labelledby="workdays-title">
              <h2 id="workdays-title" class="section-title">Working days</h2>
              <p class="text-muted text-sm hint">
                For part-timers. Days they don't work show red on their row.
              </p>
              <p class="days">{{ workingDays() }}</p>
              <div class="action">
                <gl-button size="sm" (click)="editWorkingDays(p)">Edit working days</gl-button>
              </div>
            </section>
            @if (!p.isYou) {
              <section aria-labelledby="remove-title">
                <h2 id="remove-title" class="section-title">Remove from team</h2>
                <p class="text-muted text-sm hint">
                  Their history is kept, but they won't appear on the calendar.
                </p>
                <div class="action">
                  <gl-button size="sm" class="remove" (click)="removeMember(p)">
                    Remove {{ firstName(p) }}
                  </gl-button>
                </div>
              </section>
            }
          </div>
        }
      </div>
    } @else {
      @switch (load().state) {
        @case ('forbidden') {
          <h1 class="visually-hidden">Time off</h1>
          <div class="card-plain notice">
            <gl-empty-state
              title="Only your own details are visible"
              text="Managers can see everyone's allowance. You can still see the team on the calendar."
            >
              <svg slot="icon" class="icon icon--lg" aria-hidden="true" viewBox="0 0 24 24">
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
              <gl-button slot="actions" variant="link" link="/person">View my time off</gl-button>
            </gl-empty-state>
          </div>
        }
        @case ('notfound') {
          <h1 class="visually-hidden">Person not found</h1>
          <div class="card-plain notice">
            <gl-empty-state
              title="This person isn't on the team"
              text="They may have been removed."
            >
              <svg slot="icon" class="mark" viewBox="0 0 41 30" aria-hidden="true">
                <rect class="mark__n" x="0" y="0" width="8" height="8" rx="1.75" />
                <rect class="mark__n" x="11" y="0" width="8" height="8" rx="1.75" />
                <rect class="mark__n" x="22" y="0" width="8" height="8" rx="1.75" />
                <rect class="mark__c" x="33" y="0" width="8" height="8" rx="1.75" />
                <rect class="mark__c" x="0" y="11" width="8" height="8" rx="1.75" />
                <rect class="mark__n" x="11" y="11" width="8" height="8" rx="1.75" />
                <rect class="mark__c" x="22" y="11" width="8" height="8" rx="1.75" />
                <rect class="mark__n" x="33" y="11" width="8" height="8" rx="1.75" />
                <rect class="mark__n" x="0" y="22" width="8" height="8" rx="1.75" />
                <rect class="mark__c" x="11" y="22" width="8" height="8" rx="1.75" />
                <rect class="mark__n" x="22" y="22" width="8" height="8" rx="1.75" />
                <rect class="mark__n" x="33" y="22" width="8" height="8" rx="1.75" />
              </svg>
              <gl-button slot="actions" variant="link" link="/">Back to calendar</gl-button>
            </gl-empty-state>
          </div>
        }
        @case ('error') {
          <ng-container [ngTemplateOutlet]="back" />
          <h1 class="visually-hidden">Time off</h1>
          <div class="card-plain notice">
            <gl-empty-state
              tone="error"
              title="We couldn't load this page"
              text="Something went wrong on our side. Nothing was changed."
            >
              <svg slot="icon" class="icon icon--lg" aria-hidden="true" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5M12 16h.01" />
              </svg>
              <gl-button slot="actions" variant="primary" (click)="reload()">
                <svg class="icon" aria-hidden="true" viewBox="0 0 24 24">
                  <path d="M20 11a8 8 0 0 0-14-4L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4l2-2M20 20v-5h-5" />
                </svg>
                Try again
              </gl-button>
            </gl-empty-state>
          </div>
        }
        @default {
          <ng-container [ngTemplateOutlet]="back" />
          <div class="person-head">
            <div class="person-head__id">
              <gl-skeleton shape="circle" width="var(--space-16)" height="var(--space-16)" />
              <div>
                <gl-skeleton shape="rect" width="var(--space-24)" height="var(--space-8)" />
                <gl-skeleton shape="text" width="var(--space-24)" />
              </div>
            </div>
            <gl-skeleton shape="rect" width="var(--space-24)" height="var(--space-16)" />
          </div>
          <h1 class="visually-hidden">Loading time off</h1>
          <div class="person-facts facts-placeholder">
            <gl-skeleton shape="rect" width="100%" height="var(--space-10)" />
          </div>
          <div class="year">
            <gl-skeleton shape="rect" width="100%" height="var(--space-24)" />
          </div>
        }
      }
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      min-height: var(--target-min);
      color: var(--color-fg-muted);
      font: var(--text-body-sm);
      text-decoration: none;
    }
    .back-link:hover {
      color: var(--color-fg-default);
    }
    .person-head {
      display: flex;
      flex-direction: column;
      gap: var(--space-6);
      margin-top: var(--space-6);
    }
    @media (min-width: 48rem) {
      .person-head {
        flex-direction: row;
        align-items: flex-end;
        justify-content: space-between;
      }
    }
    .person-head__id {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      min-width: 0;
    }
    .person-head__text {
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .person-head__text p {
      margin-top: var(--space-1);
    }
    .big-number {
      font-family: var(--font-family-display);
      font-weight: 800;
      font-size: calc(var(--font-size-5xl) * 1.25);
      line-height: 1;
      font-variant-numeric: tabular-nums;
      color: var(--color-fg-accent);
    }
    .caption {
      margin-top: var(--space-2);
    }
    .person-facts {
      margin-top: var(--space-8);
    }
    .year {
      margin-top: var(--space-10);
    }
    .person-columns {
      display: grid;
      gap: var(--space-12);
      margin-top: var(--space-12);
    }
    @media (min-width: 64rem) {
      .person-columns--manager {
        grid-template-columns: 1.3fr 1fr;
      }
    }
    .hint {
      margin-top: var(--space-1);
    }
    .days {
      margin-top: var(--space-3);
      font-weight: var(--font-weight-medium);
    }
    .action {
      margin-top: var(--space-3);
    }
    .remove {
      --gl-btn-fg: var(--color-danger-fg);
    }
    .person-columns__main {
      max-width: 48rem;
    }
    .stack {
      display: flex;
      flex-direction: column;
      gap: var(--space-8);
    }
    .notice {
      margin-top: var(--space-6);
    }
    .mark {
      width: 2.5rem;
      height: 1.85rem;
    }
    .mark__c {
      fill: var(--color-brand);
    }
    .mark__n {
      fill: currentColor;
      fill-opacity: 0.12;
    }
    .facts-placeholder {
      padding-block: var(--space-5);
      border-block: 1px solid var(--color-border-default);
    }
    .none {
      padding-block: var(--space-4);
    }
    .toolbar-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
    }
    .section-title {
      font: var(--text-h3);
    }
    .card-plain {
      margin-top: var(--space-5);
      background: var(--color-bg-surface);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-lg);
    }
    .month-mini-grid {
      display: grid;
      gap: var(--space-8);
      grid-template-columns: minmax(0, 1fr);
      padding: var(--space-5);
    }
    @media (min-width: 40rem) {
      .month-mini-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (min-width: 64rem) {
      .month-mini-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
        padding: var(--space-8);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PersonPage {
  private readonly api = inject(PERSON_SERVICE);
  private readonly route = inject(ActivatedRoute);
  private readonly dialogs = inject(AppDialogs);
  private readonly toasts = inject(ToastService);

  private readonly attempt = new BehaviorSubject(0);

  protected readonly load = toSignal(
    combineLatest([
      this.route.paramMap.pipe(map((params) => params.get('id') ?? 'me')),
      this.attempt,
    ]).pipe(
      switchMap(([id]) =>
        this.api.get(id).pipe(
          map((person): Load => ({ state: 'ready', person })),
          catchError((error: unknown) => of<Load>({ state: stateOf(error) })),
          startWith<Load>({ state: 'loading' }),
        ),
      ),
    ),
    { initialValue: { state: 'loading' } as Load },
  );

  /** Opens the request dialog (L2-019); a sent request turns its days yellow and is announced. */
  protected requestTimeOff(person: Person): void {
    const own = person.allowance;
    const data: NewRequestData = {
      managerName: person.managerName,
      daysToRequest: Math.max(0, own.left - own.requested),
    };
    this.dialogs
      .open<SentRequest>(NewRequestDialog, '#nr-start', data)
      .closed.subscribe((request) => {
        if (!request) return;
        this.reload();
        this.toasts.show(requestSentToast(request, person.managerName));
      });
  }

  /** "Adjust allowance": days added or removed with a reason, in a dialog (L2-028). */
  protected adjustAllowance(person: Person): void {
    this.dialogs
      .open<boolean>(AdjustAllowanceDialog, '#aa-days', {
        memberId: person.id,
        firstName: person.name.split(' ')[0],
      })
      .closed.subscribe((saved) => {
        if (saved) this.reload();
      });
  }

  /** "Edit working days": a part-timer's days in a dialog (L2-034 AC1, L2-040). */
  protected editWorkingDays(person: Person): void {
    this.dialogs
      .open<boolean>(EditWorkingDaysDialog, '.chip--day', {
        memberId: person.id,
        firstName: person.name.split(' ')[0],
        days: person.workingDays,
      })
      .closed.subscribe((saved) => {
        if (saved) this.reload();
      });
  }

  /** "Remove {first name}": asks first, then leaves the page of someone who is no longer on the team (L2-011). */
  protected removeMember(person: Person): void {
    this.dialogs.open<boolean>(RemoveMemberDialog, '#rm-cancel', {
      memberId: person.id,
      firstName: this.firstName(person),
    });
  }

  protected firstName(person: Person): string {
    return person.name.split(' ')[0];
  }

  protected reload(): void {
    this.attempt.next(this.attempt.value + 1);
  }

  protected readonly person = computed(() => {
    const load = this.load();
    return load.state === 'ready' ? load.person : null;
  });
  protected readonly subtitle = computed(() => {
    const p = this.person();
    return p ? subtitle(p) : '';
  });
  protected readonly months = computed(() => {
    const p = this.person();
    return p ? miniMonths(p) : [];
  });
  protected readonly upcoming = computed(() => runItems(this.person()?.upcoming ?? []));
  protected readonly taken = computed(() => runItems(this.person()?.taken ?? []));
  protected readonly adjustments = computed(() =>
    adjustmentItems(this.person()?.adjustments ?? []),
  );
  protected readonly caption = computed(() => {
    const p = this.person();
    return p ? caption(p) : '';
  });
  protected readonly workingDays = computed(() => {
    const p = this.person();
    return p ? p.workingDays.join(', ') : '';
  });
  protected readonly facts = computed(() => {
    const p = this.person();
    return p ? facts(p) : [];
  });
}
