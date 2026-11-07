import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map, startWith, switchMap } from 'rxjs';

import { PERSON_SERVICE, Person } from 'api';
import { Avatar, Legend, MonthMini, RunList, Skeleton, Stat } from 'components';

import { adjustmentItems, facts, miniMonths, runItems, subtitle } from './person-view';

type Load = { readonly state: 'loading' } | { readonly state: 'ready'; readonly person: Person };

/**
 * A person's page (pages/person, docs/detailed-designs/allowances/person-page, L2-033 to L2-035): days
 * left as a big number, the facts bar, the year at a glance and the person's time off. `/people/{id}`
 * opens a member; `/person` opens the signed-in person's own page ("My time off").
 */
@Component({
  selector: 'app-person-page',
  imports: [RouterLink, Avatar, Stat, Skeleton, Legend, MonthMini, RunList],
  template: `
    @if (person(); as p) {
      <a class="back-link" routerLink="/">
        <svg class="icon icon--sm" aria-hidden="true" viewBox="0 0 24 24">
          <path d="M19 12H5m6-6-6 6 6 6" />
        </svg>
        Calendar
      </a>
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
          <p class="big-number">{{ p.allowance.left }}</p>
          <p class="text-muted text-sm caption">days left in {{ p.year }}</p>
        </div>
      </header>
      <gl-stat class="person-facts" [facts]="facts()" />
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
      <div class="person-columns">
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
      </div>
    } @else {
      <gl-skeleton shape="rect" width="100%" height="var(--space-24)" />
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
    .person-columns__main {
      max-width: 48rem;
    }
    .stack {
      display: flex;
      flex-direction: column;
      gap: var(--space-8);
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

  private readonly load = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('id') ?? 'me'),
      switchMap((id) =>
        this.api.get(id).pipe(
          map((person): Load => ({ state: 'ready', person })),
          startWith<Load>({ state: 'loading' }),
        ),
      ),
    ),
    { initialValue: { state: 'loading' } as Load },
  );

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
  protected readonly facts = computed(() => {
    const p = this.person();
    return p ? facts(p) : [];
  });
}
