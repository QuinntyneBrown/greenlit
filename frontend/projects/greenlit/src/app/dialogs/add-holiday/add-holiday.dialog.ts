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

import { HOLIDAY_SERVICE, Holiday, holidayDateLabel } from 'api';
import { Alert, Button, Dialog, FormSummary, FormSummaryItem, TextField } from 'components';

const DATE_ID = 'ah-date';
const NAME_ID = 'ah-name';

/** What the Settings page tells the dialog: the holidays on screen, to catch a date that is already one. */
export interface AddHolidayData {
  readonly holidays: readonly Holiday[];
}

/** How the dialog ended: a day off was added, or the date turned out to be a weekend. Null when it was dismissed. */
export type AddHolidayOutcome = 'added' | 'weekend' | null;

/**
 * Add a day off (dialogs/add-holiday, docs/detailed-designs/teams/manage-holidays, L2-037): date and name
 * in a dialog opened from Settings. Submitting with problems shows the summary and sends nothing; an add
 * shows "Adding…" with the fields read-only; a failure keeps the values and offers "Try again".
 * It closes with `'added'` once the day off is in, or `'weekend'` when the API said the date is a weekend.
 */
@Component({
  selector: 'app-add-holiday-dialog',
  imports: [Dialog, Alert, FormSummary, TextField, Button],
  template: `
    <gl-dialog
      title="Add a day off"
      description="It turns red for everyone and never counts against allowance."
      [busy]="busy()"
      (closed)="close()"
    >
      <form class="fields" novalidate (submit)="submit($event)">
        @if (submitted() && summaryItems().length) {
          <gl-form-summary [items]="summaryItems()" />
        } @else if (failed()) {
          <gl-alert tone="danger" title="We couldn’t add the day off">
            Check your connection and try again. Nothing was changed.
          </gl-alert>
        }
        <gl-text-field
          label="Date"
          type="date"
          [inputId]="dateId"
          [value]="date()"
          (valueChange)="setDate($event)"
          [error]="shown(dateId) ? dateError() : ''"
          [readonly]="busy()"
          (blurred)="touch(dateId)"
        />
        <gl-text-field
          label="Name"
          placeholder="e.g. Company offsite"
          [inputId]="nameId"
          [(value)]="name"
          [error]="shown(nameId) ? nameError() : ''"
          [readonly]="busy()"
          (blurred)="touch(nameId)"
        />
        <button class="submit-on-enter" type="submit" tabindex="-1" aria-hidden="true"></button>
      </form>
      <div slot="footer" class="actions">
        <gl-button [disabled]="busy()" (click)="close()">Cancel</gl-button>
        <gl-button
          variant="primary"
          [busy]="busy()"
          [disabled]="busy() || (!date() && !name().trim())"
          (click)="submit()"
        >
          {{ busy() ? 'Adding…' : failed() ? 'Try again' : 'Add day off' }}
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
export class AddHolidayDialog {
  private readonly holidays = inject(HOLIDAY_SERVICE);
  private readonly ref = inject<DialogRef<AddHolidayOutcome>>(DialogRef);
  private readonly data = inject<AddHolidayData>(DIALOG_DATA);
  private readonly injector = inject(Injector);
  private readonly summary = viewChild(FormSummary);

  protected readonly dateId = DATE_ID;
  protected readonly nameId = NAME_ID;

  protected readonly date = signal('');
  protected readonly name = signal('');
  protected readonly submitted = signal(false);
  /** The request is running (dialogs/add-holiday/busy). */
  protected readonly busy = signal(false);
  /** The last attempt failed (dialogs/add-holiday/failed). */
  protected readonly failed = signal(false);
  private readonly touched = signal<ReadonlySet<string>>(new Set());
  /** The API said the date is already a holiday, with this sentence. */
  private readonly takenMessage = signal('');

  private readonly existing = computed(() =>
    this.data.holidays.find((h) => h.date === this.date()),
  );

  protected readonly dateError = computed(() => {
    if (!this.date()) return 'Pick a date.';
    const existing = this.existing();
    if (existing)
      return `${holidayDateLabel(existing.date)} is already a holiday (${existing.name}).`;
    return this.takenMessage();
  });
  protected readonly nameError = computed(() =>
    this.name().trim() ? '' : 'Give the day off a name.',
  );

  /** The summary repeats each field error as a link, without the weekday or the full stop (dialogs/add-holiday/invalid). */
  protected readonly summaryItems = computed<FormSummaryItem[]>(() => {
    const items: FormSummaryItem[] = [];
    if (this.dateError()) {
      const day = this.date() ? holidayDateLabel(this.date()).slice(4) : '';
      items.push({
        field: DATE_ID,
        message: this.date() ? `${day} is already a holiday` : 'Pick a date',
      });
    }
    if (this.nameError()) items.push({ field: NAME_ID, message: 'Give the day off a name' });
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

  protected setDate(value: string): void {
    this.date.set(value);
    this.takenMessage.set('');
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
    this.holidays.add(this.date(), this.name().trim()).subscribe((result) => {
      this.busy.set(false);
      switch (result.outcome) {
        case 'added':
          this.ref.close('added');
          break;
        case 'weekend':
          this.ref.close('weekend');
          break;
        case 'exists':
          this.takenMessage.set(result.message);
          afterNextRender(() => this.summary()?.focus(), { injector: this.injector });
          break;
        default:
          this.failed.set(true);
      }
    });
  }

  protected close(): void {
    this.ref.close(null);
  }
}
