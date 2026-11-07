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
import { toObservable } from '@angular/core/rxjs-interop';
import { catchError, map, of, switchMap } from 'rxjs';

import { REQUEST_SERVICE, SentRequest, problemCode } from 'api';
import { Alert, Button, Dialog, FormSummary, FormSummaryItem, TextField, Well } from 'components';

const FIRST_ID = 'nr-start';
const LAST_ID = 'nr-end';
const NOTE_ID = 'nr-note';

const END_BEFORE_START = 'The end date is before the start date';
const DAYS_TAKEN = 'Some of those days are already requested or confirmed';

/** What the calendar tells the dialog: who will be asked. */
export interface NewRequestData {
  readonly managerName: string;
}

/**
 * Request time off (docs/detailed-designs/requests/send-request, L2-019): a first day, a last day
 * and an optional note, opened from the member's calendar. As the dates change it counts the
 * working days; a last day before the first, or days already requested, name the problem and send
 * nothing; a send shows "Sending…" with the fields read-only; a failure keeps the dates and offers
 * "Try again". Days left and the over-allowance warning arrive with journey 11. The dialog closes
 * with the stored request when one was sent.
 */
@Component({
  selector: 'app-new-request-dialog',
  imports: [Dialog, Alert, FormSummary, TextField, Well, Button],
  template: `
    <gl-dialog
      title="Request time off"
      [description]="manager + ' will be asked to approve it.'"
      [busy]="busy()"
      (closed)="close()"
    >
      <form class="fields" novalidate (submit)="submit($event)">
        @if (submitted() && summaryItems().length) {
          <gl-form-summary [items]="summaryItems()" />
        } @else if (failed()) {
          <gl-alert tone="danger" title="We couldn’t send your request">
            Check your connection and try again. Your dates are still here.
          </gl-alert>
        }
        <div class="dates">
          <gl-text-field
            label="First day"
            type="date"
            [inputId]="firstId"
            [value]="first()"
            (valueChange)="setFirst($event)"
            [error]="firstError()"
            [readonly]="busy()"
          />
          <gl-text-field
            label="Last day"
            type="date"
            [inputId]="lastId"
            [value]="last()"
            (valueChange)="setLast($event)"
            [error]="lastError()"
            [readonly]="busy()"
          />
        </div>
        <gl-text-field
          label="Note"
          placeholder="e.g. Family trip"
          [optional]="true"
          [inputId]="noteId"
          [(value)]="note"
          [readonly]="busy()"
        />
        <gl-well>
          @if (busy()) {
            Sending your request to {{ manager }}…
          } @else if (problem(); as text) {
            <span class="problem">{{ text }}</span>
          } @else if (days() === null) {
            Weekends and holidays aren’t counted.
          } @else {
            <strong>{{ days() }} {{ days() === 1 ? 'day' : 'days' }}</strong> from your allowance.
          }
        </gl-well>
        <button class="submit-on-enter" type="submit" tabindex="-1" aria-hidden="true"></button>
      </form>
      <div slot="footer" class="actions">
        <gl-button [disabled]="busy()" (click)="close()">Cancel</gl-button>
        <gl-button variant="primary" [busy]="busy()" [disabled]="!canSend()" (click)="submit()">
          {{ busy() ? 'Sending…' : failed() ? 'Try again' : 'Send request' }}
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
    .dates {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
      gap: var(--space-4);
    }
    .problem {
      color: var(--color-danger-fg);
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
export class NewRequestDialog {
  private readonly requests = inject(REQUEST_SERVICE);
  private readonly ref = inject<DialogRef<SentRequest | null>>(DialogRef);
  private readonly injector = inject(Injector);
  private readonly summary = viewChild(FormSummary);

  protected readonly manager = inject<NewRequestData>(DIALOG_DATA).managerName;
  protected readonly firstId = FIRST_ID;
  protected readonly lastId = LAST_ID;
  protected readonly noteId = NOTE_ID;

  protected readonly first = signal('');
  protected readonly last = signal('');
  protected readonly note = signal('');
  protected readonly busy = signal(false);
  /** The last attempt failed for a reason the dates do not explain (dialogs/new-request/failed). */
  protected readonly failed = signal(false);
  /** Send was pressed on dates the person has not changed since. */
  protected readonly submitted = signal(false);
  /** The API said some of the days are already requested or confirmed (dialogs/new-request/taken). */
  private readonly taken = signal(false);

  private readonly bothSet = computed(() => this.first() !== '' && this.last() !== '');
  private readonly reversed = computed(() => this.bothSet() && this.last() < this.first());
  /** The range worth asking a quote for; null until both dates are set and in order. */
  private readonly range = computed(() =>
    this.bothSet() && !this.reversed() ? `${this.first()}|${this.last()}` : null,
  );
  private readonly quoted = signal<{ range: string; days: number } | null>(null);

  /** Working days in the range; null until known (a quote that failed also leaves it null). */
  protected readonly days = computed(() => {
    const quote = this.quoted();
    return quote && quote.range === this.range() ? quote.days : null;
  });

  /** The line under the fields when something is wrong (dialogs/new-request/invalid, taken). */
  protected readonly problem = computed(() => {
    if (this.reversed()) return `${END_BEFORE_START}.`;
    if (this.taken()) return `${DAYS_TAKEN}.`;
    if (this.days() === 0)
      return 'Those are all non-working days. Weekends and holidays aren’t counted.';
    return '';
  });

  protected readonly summaryItems = computed<FormSummaryItem[]>(() => {
    if (this.reversed()) return [{ field: LAST_ID, message: END_BEFORE_START }];
    if (this.taken()) return [{ field: FIRST_ID, message: DAYS_TAKEN }];
    return [];
  });

  protected readonly lastError = computed(() =>
    this.submitted() && this.reversed() ? 'Pick a day on or after the first day.' : '',
  );
  protected readonly firstError = computed(() =>
    this.taken() ? 'Pick days that aren’t already requested or confirmed.' : '',
  );

  protected readonly canSend = computed(
    () =>
      this.bothSet() &&
      !this.busy() &&
      this.days() !== 0 &&
      !(this.submitted() && this.summaryItems().length > 0),
  );

  constructor() {
    // Esc and the backdrop do nothing while a request runs.
    effect(() => {
      this.ref.disableClose = this.busy();
    });
    // Ask for the count whenever the range changes; a newer answer replaces an older one.
    toObservable(this.range)
      .pipe(
        switchMap((range) => {
          if (!range) return of(null);
          const [first, last] = range.split('|');
          return this.requests.quote(first, last).pipe(
            map((quote) => ({ range, days: quote.days })),
            catchError(() => of(null)),
          );
        }),
      )
      .subscribe((quote) => this.quoted.set(quote));
  }

  protected setFirst(value: string): void {
    this.first.set(value);
    this.datesChanged();
  }

  protected setLast(value: string): void {
    this.last.set(value);
    this.datesChanged();
  }

  private datesChanged(): void {
    this.submitted.set(false);
    this.taken.set(false);
    this.failed.set(false);
  }

  protected submit(event?: Event): void {
    event?.preventDefault();
    if (!this.canSend()) return;
    this.submitted.set(true);
    if (this.summaryItems().length) {
      this.focusSummary();
      return;
    }
    this.failed.set(false);
    this.busy.set(true);
    this.requests
      .send({ firstDay: this.first(), lastDay: this.last(), note: this.note().trim() || undefined })
      .subscribe({
        next: (request) => this.ref.close(request),
        error: (error: unknown) => {
          this.busy.set(false);
          if (problemCode(error) === 'days_taken') {
            this.taken.set(true);
            this.focusSummary();
          } else {
            this.failed.set(true);
          }
        },
      });
  }

  private focusSummary(): void {
    afterNextRender(() => this.summary()?.focus(), { injector: this.injector });
  }

  protected close(): void {
    this.ref.close(null);
  }
}
