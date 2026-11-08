import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';

import { SCHOOL_CALENDAR_SERVICE, SchoolClosure } from 'api';
import { Alert, Button, Dialog, SelectField } from 'components';

import { ClosureChild } from './school-closure.dialog';

/** What Settings tells the dialog: the team's children and its closures (to say what a re-import replaces). */
export interface ImportCalendarData {
  readonly children: readonly ClosureChild[];
  readonly closures: readonly SchoolClosure[];
}

/** The largest file the API reads (ADR-015). */
const MAX_BYTES = 1_048_576;

/**
 * Import a school calendar (dialogs/import-calendar/*, docs/detailed-designs/teams/school-calendar, L2-062): one
 * child, one .ics file. A child with an earlier import gets the replace note; success says how many closures it
 * added; a file that is not a calendar is refused and nothing changes. Closes with `true` when anything was imported.
 */
@Component({
  selector: 'app-import-calendar-dialog',
  imports: [Dialog, Alert, SelectField, Button],
  template: `
    <gl-dialog
      title="Import a school calendar"
      description="Add a school’s closures from its calendar file (.ics) to one child’s row."
      [busy]="busy()"
      (closed)="close()"
    >
      @if (imported() !== null) {
        <gl-alert
          tone="success"
          [title]="
            'Imported ' +
            imported() +
            (imported() === 1 ? ' closure' : ' closures') +
            ' for ' +
            childFirstName()
          "
        >
          They’re on {{ childFirstName() }}’s row now.
        </gl-alert>
      } @else {
        <div class="fields">
          @if (failure() === 'unreadable') {
            <gl-alert tone="danger" title="That file isn’t a calendar we can read">
              Choose an .ics file of up to 1 MB exported from the school’s calendar. Nothing was
              changed.
            </gl-alert>
          } @else if (failure() === 'failed') {
            <gl-alert tone="danger" title="We couldn’t import the calendar">
              Check your connection and try again. Nothing was changed.
            </gl-alert>
          }
          <gl-select-field
            label="Child"
            selectId="ic-child"
            [options]="options"
            [(value)]="child"
          />
          <div class="field">
            <span class="field__label" id="ic-file-label">Calendar file</span>
            <div class="file-field">
              <label class="btn btn--sm file-field__button">
                <input
                  class="file-field__input"
                  type="file"
                  accept=".ics,text/calendar"
                  aria-labelledby="ic-file-label ic-file-btn"
                  aria-describedby="ic-file-help"
                  [disabled]="busy()"
                  (change)="pick($event)"
                />
                <span id="ic-file-btn">Choose an .ics file</span>
              </label>
              <span class="file-field__name" [class.text-muted]="!file()">{{
                file()?.name ?? 'No file chosen'
              }}</span>
            </div>
            <span class="field__help" id="ic-file-help"
              >Up to 1 MB. All-day events become closures.</span
            >
          </div>
          @if (replacing() > 0) {
            <p class="inline-note">
              Importing again replaces the {{ replacing() }}
              {{ replacing() === 1 ? 'closure' : 'closures' }} from {{ childFirstName() }}’s last
              import. Closures you added yourself stay.
            </p>
          }
        </div>
      }
      <div slot="footer" class="actions">
        @if (imported() !== null) {
          <gl-button variant="primary" (click)="close()">Done</gl-button>
        } @else {
          <gl-button [disabled]="busy()" (click)="close()">Cancel</gl-button>
          <gl-button
            variant="primary"
            [busy]="busy()"
            [disabled]="busy() || !file()"
            (click)="submit()"
          >
            {{ busy() ? 'Importing…' : failure() === 'failed' ? 'Try again' : 'Import' }}
          </gl-button>
        }
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
      gap: var(--space-1-5, 0.375rem);
    }
    .field__label {
      font: var(--text-label);
      color: var(--color-fg-default);
    }
    .field__help {
      font: var(--text-caption);
      color: var(--color-fg-muted);
    }
    .file-field {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-3);
    }
    .btn {
      position: relative;
      display: inline-flex;
      align-items: center;
      min-height: var(--control-height-sm);
      padding: 0 var(--space-3);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-md);
      background: var(--color-bg-surface);
      color: var(--color-fg-default);
      font: var(--text-label);
      cursor: pointer;
      overflow: hidden;
    }
    .file-field__button:focus-within {
      outline: 2px solid var(--color-focus-ring);
      outline-offset: 2px;
    }
    .file-field__input {
      position: absolute;
      inset: 0;
      opacity: 0;
      cursor: pointer;
    }
    .file-field__name {
      min-width: 0;
      font: var(--text-body-sm);
      overflow-wrap: anywhere;
    }
    .text-muted {
      color: var(--color-fg-muted);
    }
    .inline-note {
      margin: 0;
      font: var(--text-body-sm);
      color: var(--color-fg-muted);
    }
    .actions {
      display: contents;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportCalendarDialog {
  private readonly service = inject(SCHOOL_CALENDAR_SERVICE);
  private readonly ref = inject<DialogRef<boolean>>(DialogRef);
  private readonly data = inject<ImportCalendarData>(DIALOG_DATA);

  protected readonly options = this.data.children.map((c) => ({ value: c.id, label: c.name }));
  protected readonly child = signal(this.data.children[0]?.id ?? '');
  protected readonly file = signal<File | null>(null);
  protected readonly busy = signal(false);
  protected readonly failure = signal<'unreadable' | 'failed' | null>(null);
  protected readonly imported = signal<number | null>(null);

  protected readonly childFirstName = computed(
    () => this.data.children.find((c) => c.id === this.child())?.name.split(' ')[0] ?? '',
  );
  /** The child's closures from an earlier import, which a new one replaces (L2-062 AC2). */
  protected readonly replacing = computed(
    () => this.data.closures.filter((c) => c.imported && c.memberId === this.child()).length,
  );

  constructor() {
    effect(() => {
      this.ref.disableClose = this.busy();
    });
  }

  protected pick(event: Event): void {
    this.file.set((event.target as HTMLInputElement).files?.[0] ?? null);
    this.failure.set(null);
  }

  protected submit(): void {
    const file = this.file();
    if (this.busy() || !file || !this.child()) return;
    if (file.size > MAX_BYTES) {
      this.failure.set('unreadable');
      return;
    }
    this.busy.set(true);
    this.failure.set(null);
    this.service.importCalendar(this.child(), file, file.name).subscribe((result) => {
      this.busy.set(false);
      if (result.outcome === 'imported') this.imported.set(result.imported);
      else this.failure.set(result.outcome);
    });
  }

  protected close(): void {
    if (this.busy()) return;
    this.ref.close(this.imported() !== null);
  }
}
