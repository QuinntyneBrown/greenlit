import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map, startWith, switchMap } from 'rxjs';

import { PERSON_SERVICE, Person } from 'api';
import { Avatar, Skeleton, Stat } from 'components';

import { facts, subtitle } from './person-view';

type Load = { readonly state: 'loading' } | { readonly state: 'ready'; readonly person: Person };

/**
 * A person's page (pages/person, docs/detailed-designs/allowances/person-page, L2-033 to L2-035): days
 * left as a big number, the facts bar, the year at a glance and the person's time off. `/people/{id}`
 * opens a member; `/person` opens the signed-in person's own page ("My time off").
 */
@Component({
  selector: 'app-person-page',
  imports: [RouterLink, Avatar, Stat, Skeleton],
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
  protected readonly facts = computed(() => {
    const p = this.person();
    return p ? facts(p) : [];
  });
}
