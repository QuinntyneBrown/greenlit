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

import { PERSON_SERVICE } from 'api';
import { Alert, Button, Dialog, FormSummary, FormSummaryItem, TextField } from 'components';

const DAYS_ID = 'aa-days';
const REASON_ID = 'aa-reason';

/** What the person page tells the dialog: whose allowance. */
export interface AdjustAllowanceData {
  readonly memberId: string;
  /** The person's first name, for "Adjust Ana’s allowance". */
  readonly firstName: string;
}

/**
 * Adjust allowance (dialogs/adjust-allowance, docs/detailed-designs/allowances/adjust-allowance, L2-028):
 * a number of days (negative to remove) and a reason, opened from a person's page. Submitting with
 * problems shows the summary and sends nothing; a save shows "Adding…" with the fields read-only; a
 * failure keeps the values and offers "Try again". It closes with `true` once the adjustment is recorded.
 */
@Component({
  selector: 'app-adjust-allowance-dialog',
  imports: [Dialog, Alert, FormSummary, TextField, Button],
  template: `
    <gl-dialog
      [title]="'Adjust ' + data.firstName + '’s allowance'"
      description="Carry-over, extra days or corrections."
      [busy]="busy()"
      (closed)="close()"
    >
      <form class="fields" novalidate (submit)="submit($event)">
        @if (submitted() && summaryItems().length) {
          <gl-form-summary [items]="summaryItems()" />
        } @else if (failed()) {
          <gl-alert tone="danger" title="We couldn’t save the adjustment">
            Check your connection and try again. {{ data.firstName }}’s allowance is unchanged.
          </gl-alert>
        }
        <gl-text-field
          label="Days"
          type="number"
          placeholder="+2"
          [inputId]="daysId"
          [(value)]="days"
          [help]="shown(daysId) && daysError() ? '' : 'Use a negative number to remove days.'"
          [error]="shown(daysId) ? daysError() : ''"
          [readonly]="busy()"
          (blurred)="touch(daysId)"
        />
        <gl-text-field
          label="Reason"
          placeholder="e.g. Carried over from 2025"
          [inputId]="reasonId"
          [(value)]="reason"
          [error]="shown(reasonId) ? reasonError() : ''"
          [readonly]="busy()"
          (blurred)="touch(reasonId)"
        />
        <button class="submit-on-enter" type="submit" tabindex="-1" aria-hidden="true"></button>
      </form>
      <div slot="footer" class="actions">
        <gl-button [disabled]="busy()" (click)="close()">Cancel</gl-button>
        <gl-button
          variant="primary"
          [busy]="busy()"
          [disabled]="busy() || (!days() && !reason().trim())"
          (click)="submit()"
        >
          {{ busy() ? 'Adding…' : failed() ? 'Try again' : 'Add adjustment' }}
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
export class AdjustAllowanceDialog {
  private readonly people = inject(PERSON_SERVICE);
  private readonly ref = inject<DialogRef<boolean>>(DialogRef);
  protected readonly data = inject<AdjustAllowanceData>(DIALOG_DATA);
  private readonly injector = inject(Injector);
  private readonly summary = viewChild(FormSummary);

  protected readonly daysId = DAYS_ID;
  protected readonly reasonId = REASON_ID;

  protected readonly days = signal('');
  protected readonly reason = signal('');
  protected readonly submitted = signal(false);
  /** The request is running (dialogs/adjust-allowance/busy). */
  protected readonly busy = signal(false);
  /** The last attempt failed (dialogs/adjust-allowance/failed). */
  protected readonly failed = signal(false);
  private readonly touched = signal<ReadonlySet<string>>(new Set());

  /** Whole days other than zero; the API stores whole days only (ADR-003, ADR-007). */
  private readonly amount = computed(() => {
    const text = this.days().trim();
    const n = text === '' ? NaN : Number(text);
    return Number.isInteger(n) && n !== 0 ? n : null;
  });
  protected readonly daysError = computed(() =>
    this.amount() === null ? 'Enter a number other than 0.' : '',
  );
  protected readonly reasonError = computed(() =>
    this.reason().trim() ? '' : 'Give a reason so the history makes sense later.',
  );

  /** The summary repeats each field error as a link, without the full stop (dialogs/adjust-allowance/invalid). */
  protected readonly summaryItems = computed<FormSummaryItem[]>(() => {
    const items: FormSummaryItem[] = [];
    if (this.daysError()) items.push({ field: DAYS_ID, message: 'Enter a number other than 0' });
    if (this.reasonError()) items.push({ field: REASON_ID, message: 'Give a reason' });
    return items;
  });

  constructor() {
    // Esc and the backdrop do nothing while a request runs.
    effect(() => {
      this.ref.disableClose = this.busy();
    });
  }

  protected shown(field: string): boolean {
    return this.submitted() || this.touched().has(field);
  }

  protected touch(field: string): void {
    if (this.touched().has(field)) return;
    this.touched.update((set) => new Set([...set, field]));
  }

  protected submit(event?: Event): void {
    event?.preventDefault();
    if (this.busy()) return;
    this.submitted.set(true);
    if (this.summaryItems().length) {
      afterNextRender(() => this.summary()?.focus(), { injector: this.injector });
      return;
    }
    this.failed.set(false);
    this.busy.set(true);
    this.people.adjust(this.data.memberId, this.amount()!, this.reason().trim()).subscribe((r) => {
      this.busy.set(false);
      if (r.ok) this.ref.close(true);
      else this.failed.set(true);
    });
  }

  protected close(): void {
    this.ref.close(false);
  }
}
