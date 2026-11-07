import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** One fact of the bar: a label, its value and an optional note ("incl. +3 adj."). */
export interface StatFact {
  readonly label: string;
  readonly value: string;
  readonly note?: string;
}

/**
 * Stat (docs/design-system/components/stat.html, description-list.html): the `.facts` bar of a person's
 * page, a row of label and value pairs between two rules. One action may sit at the end of the bar
 * (`[slot=action]`), as "Request time off" does on a member's own page.
 */
@Component({
  selector: 'gl-stat',
  template: `
    <div class="facts-bar">
      <dl class="facts">
        @for (fact of facts(); track fact.label) {
          <div>
            <dt>{{ fact.label }}</dt>
            <dd>
              <span>{{ fact.value }}</span>
              @if (fact.note) {
                <small>{{ fact.note }}</small>
              }
            </dd>
          </div>
        }
      </dl>
      <ng-content select="[slot=action]" />
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .facts-bar {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      padding-block: var(--space-5);
      border-block: 1px solid var(--color-border-default);
    }
    @media (min-width: 40rem) {
      .facts-bar {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
    }
    .facts {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3) var(--space-10);
      margin: 0;
    }
    dt {
      font: var(--text-caption);
      color: var(--color-fg-muted);
    }
    dd {
      margin: var(--space-0-5) 0 0;
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-semibold);
      font-variant-numeric: tabular-nums;
    }
    small {
      margin-left: var(--space-2);
      font: var(--text-caption);
      color: var(--color-fg-muted);
      font-weight: var(--font-weight-regular);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Stat {
  readonly facts = input.required<readonly StatFact[]>();
}
