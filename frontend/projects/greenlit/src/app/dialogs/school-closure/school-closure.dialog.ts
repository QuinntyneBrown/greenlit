import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';

import { SCHOOL_CALENDAR_SERVICE, SchoolClosure, SchoolClosureInput } from 'api';
import {
  Alert,
  Button,
  Dialog,
  FormSummary,
  FormSummaryItem,
  SelectField,
  TextField,
} from 'components';

/** A child the closure can be for. */
export interface ClosureChild {
  readonly id: string;
  readonly name: string;
}

/** What Settings tells the dialog: the closure to edit (null to add one) and the team's children. */
export interface SchoolClosureData {
  readonly closure: SchoolClosure | null;
  readonly children: readonly ClosureChild[];
}

/** What the dialog closes with when it saved. */
export interface SchoolClosureOutcome {
  readonly kind: 'added' | 'saved';
  readonly closure: SchoolClosure;
}

const ALL = 'all';
const MAX_DAYS = 366;

/**
 * Add or edit a school closure (dialogs/school-closure/*, docs/detailed-designs/teams/school-calendar, L2-061): what
 * it is, the first and last day, and whose calendar ("All children" or one child). Problems show the summary and send
 * nothing; a send shows "Adding…" or "Saving…"; a failure keeps the values and offers "Try again".
 */
@Component({
  selector: 'app-school-closure-dialog',
  imports: [Dialog, Alert, FormSummary, TextField, SelectField, Button],
  template: `
    <gl-dialog
      [title]="editing ? 'Edit school closure' : 'Add a school closure'"
      description="It shows on the children’s rows and never counts as time off."
      [busy]="busy()"
      (closed)="close()"
    >
      <form class="fields" novalidate (submit)="submit($event)">
        @if (submitted() && summaryItems().length) {
          <gl-form-summary [items]="summaryItems()" />
        } @else if (failed()) {
          <gl-alert tone="danger" title="We couldn’t save the closure">
            Check your connection and try again. Nothing was changed.
          </gl-alert>
        }
        <gl-text-field
          label="What is it?"
          inputId="sc-label"
          placeholder="PA day"
          [(value)]="label"
          [error]="submitted() ? labelError() : ''"
          [readonly]="busy()"
        />
        <div class="days">
          <gl-text-field
            label="First day"
            inputId="sc-first"
            type="date"
            [(value)]="first"
            [error]="submitted() ? firstError() : ''"
            [readonly]="busy()"
          />
          <gl-text-field
            label="Last day"
            inputId="sc-last"
            type="date"
            [(value)]="last"
            [error]="submitted() ? lastError() : ''"
            [readonly]="busy()"
          />
        </div>
        <gl-select-field
          label="Whose calendar?"
          selectId="sc-who"
          [options]="whose"
          [(value)]="who"
        />
        <button class="submit-on-enter" type="submit" tabindex="-1" aria-hidden="true"></button>
      </form>
      <div slot="footer" class="actions">
        <gl-button [disabled]="busy()" (click)="close()">Cancel</gl-button>
        <gl-button variant="primary" [busy]="busy()" [disabled]="busy()" (click)="submit()">
          {{
            busy()
              ? editing
                ? 'Saving…'
                : 'Adding…'
              : failed()
                ? 'Try again'
                : editing
                  ? 'Save closure'
                  : 'Add closure'
          }}
        </gl-button>
      </div>
    </gl-dialog>
  `,
  styles: `
    :host {
      display: block;
    }
    .fields {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }
    .days {
      display: grid;
      gap: var(--space-4);
    }
    @media (min-width: 30rem) {
      .days {
        grid-template-columns: 1fr 1fr;
      }
    }
    .actions {
      display: contents;
    }
    .submit-on-enter {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      border: 0;
      opacity: 0;
      overflow: hidden;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchoolClosureDialog {
  private readonly service = inject(SCHOOL_CALENDAR_SERVICE);
  private readonly ref = inject<DialogRef<SchoolClosureOutcome>>(DialogRef);
  private readonly data = inject<SchoolClosureData>(DIALOG_DATA);
  private readonly injector = inject(Injector);
  private readonly summary = viewChild(FormSummary);

  protected readonly editing = this.data.closure !== null;
  protected readonly whose = [
    { value: ALL, label: 'All children' },
    ...this.data.children.map((c) => ({ value: c.id, label: c.name })),
  ];

  protected readonly label = signal(this.data.closure?.label ?? '');
  protected readonly first = signal(this.data.closure?.firstDay ?? '');
  protected readonly last = signal(this.data.closure?.lastDay ?? '');
  protected readonly who = signal(this.data.closure?.memberId ?? ALL);
  protected readonly submitted = signal(false);
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);

  protected readonly labelError = computed(() =>
    this.label().trim() ? '' : 'Enter a name for the closure.',
  );
  protected readonly firstError = computed(() => (this.first() ? '' : 'Choose the first day.'));
  protected readonly lastError = computed(() => {
    const first = this.first();
    const last = this.last();
    if (!last) return 'Choose the last day.';
    if (first && last < first) return 'The last day can’t be before the first.';
    if (first && daysBetween(first, last) >= MAX_DAYS) return 'A closure can be at most 366 days.';
    return '';
  });

  /** One link per problem, in field order (dialogs/school-closure/invalid). */
  protected readonly summaryItems = computed<FormSummaryItem[]>(() => {
    const items: FormSummaryItem[] = [];
    if (this.labelError()) items.push({ field: 'sc-label', message: this.labelError() });
    if (this.firstError()) items.push({ field: 'sc-first', message: this.firstError() });
    if (this.lastError()) items.push({ field: 'sc-last', message: this.lastError() });
    return items;
  });

  constructor() {
    // Esc and the backdrop do nothing while a request runs.
    effect(() => {
      this.ref.disableClose = this.busy();
    });
  }

  protected submit(event?: Event): void {
    event?.preventDefault();
    if (this.busy()) return;
    this.submitted.set(true);
    if (this.summaryItems().length) {
      afterNextRender(() => this.summary()?.focus(), { injector: this.injector });
      return;
    }
    const input: SchoolClosureInput = {
      label: this.label().trim(),
      firstDay: this.first(),
      lastDay: this.last(),
      memberId: this.who() === ALL ? null : this.who(),
    };
    this.busy.set(true);
    this.failed.set(false);
    const closure = this.data.closure;
    const request = closure
      ? this.service.updateClosure(closure.id, input)
      : this.service.addClosure(input);
    request.subscribe((result) => {
      this.busy.set(false);
      if (result.outcome === 'saved') {
        this.ref.close({ kind: closure ? 'saved' : 'added', closure: result.closure });
      } else {
        this.failed.set(true);
      }
    });
  }

  protected close(): void {
    if (this.busy()) return;
    this.ref.close();
  }
}

/** Whole days from `first` to `last` (`yyyy-MM-dd`), read as calendar dates. */
function daysBetween(first: string, last: string): number {
  return Math.round(
    (Date.parse(`${last}T00:00:00Z`) - Date.parse(`${first}T00:00:00Z`)) / 86_400_000,
  );
}
