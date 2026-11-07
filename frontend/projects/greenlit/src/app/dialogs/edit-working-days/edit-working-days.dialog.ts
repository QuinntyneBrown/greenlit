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

import { WORKING_DAYS_SERVICE, WeekDay, weekDayNames, weekDayNumbers } from 'api';
import { Alert, Button, DayChips, Dialog, FormSummary, FormSummaryItem } from 'components';

const GROUP_ID = 'wd-group';

/** What Settings tells the dialog: whose days, and the days they work now. */
export interface EditWorkingDaysData {
  readonly memberId: string;
  /** The person's first name, for "Dev’s working days". */
  readonly firstName: string;
  readonly days: readonly WeekDay[];
}

/**
 * Edit working days (dialogs/edit-working-days, docs/detailed-designs/teams/working-days, L2-040): a
 * part-timer's days as chips. Saving with no day on shows the summary and sends nothing; a save shows
 * "Saving…" with the chips and every way out off; a failure keeps the days as entered and offers "Try
 * again". It closes with `true` once the days are saved.
 */
@Component({
  selector: 'app-edit-working-days-dialog',
  imports: [Dialog, Alert, Button, DayChips, FormSummary],
  template: `
    <gl-dialog
      [title]="data.firstName + '’s working days'"
      [description]="'For part-timers. ' + data.firstName + ' currently works ' + currently + '.'"
      [busy]="busy()"
      (closed)="close()"
    >
      <div class="fields">
        @if (summaryItems().length) {
          <gl-form-summary [items]="summaryItems()" />
        } @else if (failed()) {
          <gl-alert tone="danger" title="We couldn’t save the working days">
            Check your connection and try again. Nothing was changed.
          </gl-alert>
        }
        <div class="field">
          <span class="field__label">Working days</span>
          <gl-day-chips
            [groupId]="groupId"
            [pressed]="pressed()"
            [disabled]="busy()"
            (toggled)="toggle($event)"
          />
          @if (noDays()) {
            <span class="field__error">Pick at least one working day.</span>
          } @else {
            <span class="field__help">
              Days they don’t work show red on their row and never count against allowance.
            </span>
          }
        </div>
      </div>
      <div slot="footer" class="actions">
        <gl-button [disabled]="busy()" (click)="close()">Cancel</gl-button>
        <gl-button
          variant="primary"
          [busy]="busy()"
          [disabled]="busy() || summaryItems().length > 0"
          (click)="save()"
        >
          {{ busy() ? 'Saving…' : failed() ? 'Try again' : 'Save working days' }}
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
    .field {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }
    .field__label {
      font: var(--text-label);
      color: var(--color-fg-default);
    }
    .field__help {
      font: var(--text-body-sm);
      color: var(--color-fg-muted);
    }
    .field__error {
      font: var(--text-body-sm);
      color: var(--color-danger-fg);
    }
    .actions {
      display: contents;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditWorkingDaysDialog {
  private readonly service = inject(WORKING_DAYS_SERVICE);
  private readonly ref = inject<DialogRef<boolean>>(DialogRef);
  protected readonly data = inject<EditWorkingDaysData>(DIALOG_DATA);
  private readonly injector = inject(Injector);
  private readonly summary = viewChild(FormSummary);

  protected readonly groupId = GROUP_ID;
  protected readonly currently = this.data.days.join(', ');
  protected readonly pressed = signal<readonly number[]>(weekDayNumbers(this.data.days));
  /** Save was pressed with no day on (dialogs/edit-working-days/invalid). */
  private readonly submitted = signal(false);
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);

  protected readonly noDays = computed(() => this.submitted() && this.pressed().length === 0);
  protected readonly summaryItems = computed<FormSummaryItem[]>(() =>
    this.noDays() ? [{ field: GROUP_ID, message: 'Pick at least one working day' }] : [],
  );

  constructor() {
    // Esc and the backdrop do nothing while a save runs.
    effect(() => {
      this.ref.disableClose = this.busy();
    });
  }

  protected toggle(day: number): void {
    this.pressed.update((days) =>
      days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort(),
    );
  }

  protected save(): void {
    if (this.busy()) return;
    this.submitted.set(true);
    if (this.pressed().length === 0) {
      afterNextRender(() => this.summary()?.focus(), { injector: this.injector });
      return;
    }
    this.failed.set(false);
    this.busy.set(true);
    this.service.setMemberDays(this.data.memberId, weekDayNames(this.pressed())).subscribe((r) => {
      this.busy.set(false);
      if (r.ok) this.ref.close(true);
      else this.failed.set(true);
    });
  }

  protected close(): void {
    this.ref.close(false);
  }
}
