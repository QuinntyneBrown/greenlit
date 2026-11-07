import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
} from '@angular/core';

import { Alert } from '../alert/alert';

export interface FormSummaryItem {
  /** The id of the field's control. */
  readonly field: string;
  readonly message: string;
}

/**
 * Error summary (docs/design-system/patterns/forms.html): the danger alert at
 * the top of a form after a submit attempt, naming how many things to fix and
 * linking to each field. A link moves focus to its field; `focus()` moves
 * focus to the summary itself, as the pattern asks after a failed submit.
 */
@Component({
  selector: 'gl-form-summary',
  imports: [Alert],
  host: { tabindex: '-1' },
  template: `
    <gl-alert tone="danger" [summary]="true" [title]="title()">
      <ul class="form-summary__list">
        @for (item of items(); track item.field) {
          <li>
            <a [href]="'#' + item.field" (click)="goTo($event, item.field)">{{ item.message }}</a>
          </li>
        }
      </ul>
    </gl-alert>
  `,
  styles: `
    :host {
      display: block;
    }
    :host(:focus) {
      outline: none;
    }
    :host(:focus-visible) {
      outline: var(--focus-ring-width) solid var(--color-focus-ring);
      outline-offset: var(--focus-ring-offset);
      border-radius: var(--radius-md);
    }
    .form-summary__list {
      margin: var(--space-1) 0 0;
      padding-left: var(--space-5);
    }
    a {
      color: inherit;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormSummary {
  readonly items = input.required<readonly FormSummaryItem[]>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly title = computed(() => {
    const n = this.items().length;
    return `Fix ${n} ${n === 1 ? 'thing' : 'things'} to continue`;
  });

  focus(): void {
    this.host.nativeElement.focus();
  }

  protected goTo(event: Event, field: string): void {
    const control = this.host.nativeElement.ownerDocument.getElementById(field);
    if (!control) return;
    event.preventDefault();
    control.focus();
  }
}
