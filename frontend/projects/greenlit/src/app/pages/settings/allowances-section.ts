import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';

import { AllowanceDefaults, TEAM_SETTINGS_SERVICE } from 'api';
import { Button, FormSummary, SelectField, SelectOption, TextField } from 'components';

import { ToastService } from '../../toasts/toast.service';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * The Allowances section of Settings (pages/settings/default; docs/detailed-designs/allowances/allowance-figures):
 * the days a new person gets, the month the leave year starts and the most days to carry over. Saved on its own.
 */
@Component({
  selector: 'app-allowances-section',
  imports: [Button, FormSummary, SelectField, TextField],
  template: `
    <h2 id="allowances-title" class="section-title" tabindex="-1">Allowances</h2>
    <p>
      Defaults for new people. You can override anyone's allowance on the Team list or their
      profile.
    </p>
    @if (daysError()) {
      <gl-form-summary
        class="summary"
        [items]="[{ field: 'allow-days', message: 'Days per year must be 0 or more' }]"
      />
    }
    <fieldset>
      <div class="form-grid">
        <gl-text-field
          label="Days per year"
          inputId="allow-days"
          type="number"
          [error]="daysError()"
          [(value)]="days"
          (valueChange)="edited()"
        />
        <gl-select-field
          label="Leave year starts"
          selectId="allow-start"
          [options]="months"
          [(value)]="start"
          (valueChange)="edited()"
        />
        <gl-text-field
          label="Max carry-over"
          inputId="allow-carry"
          type="number"
          [(value)]="carry"
          (valueChange)="edited()"
        />
      </div>
    </fieldset>
    <div class="settings-actions">
      <gl-button
        variant="primary"
        size="sm"
        [busy]="busy()"
        [disabled]="!dirty() || busy()"
        (click)="save()"
      >
        {{ busy() ? 'Saving…' : 'Save changes' }}
      </gl-button>
      <span aria-live="polite">{{ status() }}</span>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    p {
      margin: var(--space-1) 0 0;
      max-width: 36rem;
      color: var(--color-fg-muted);
      font: var(--text-body-sm);
    }
    .summary {
      margin-top: var(--space-4);
    }
    fieldset {
      border: 0;
      padding: 0;
      margin: var(--space-6) 0 0;
      min-width: 0;
    }
    .form-grid {
      display: grid;
      gap: var(--space-4);
    }
    @media (min-width: 40rem) {
      .form-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }
    .settings-actions {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      margin-top: var(--space-6);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AllowancesSection {
  readonly defaults = input.required<AllowanceDefaults>();
  /** The defaults as the API now has them, after a save. */
  readonly saved = output<AllowanceDefaults>();

  private readonly service = inject(TEAM_SETTINGS_SERVICE);
  private readonly toasts = inject(ToastService);

  protected readonly months: readonly SelectOption[] = MONTHS.map((label, i) => ({
    value: String(i + 1),
    label,
  }));

  protected readonly days = linkedSignal(() => String(this.defaults().defaultYearlyDays));
  protected readonly start = linkedSignal(() => String(this.defaults().leaveYearStartMonth));
  protected readonly carry = linkedSignal(() => String(this.defaults().maxCarryOver));
  protected readonly busy = signal(false);
  protected readonly status = signal('');
  protected readonly daysError = signal('');

  protected readonly dirty = computed(() => {
    const d = this.defaults();
    return (
      this.days() !== String(d.defaultYearlyDays) ||
      this.start() !== String(d.leaveYearStartMonth) ||
      this.carry() !== String(d.maxCarryOver)
    );
  });

  protected edited(): void {
    this.status.set('');
    this.daysError.set('');
  }

  /** "Save changes": the whole section goes as one request. */
  protected save(): void {
    if (this.busy() || !this.dirty()) return;
    const entered: AllowanceDefaults = {
      defaultYearlyDays: Number(this.days()),
      leaveYearStartMonth: Number(this.start()),
      maxCarryOver: Number(this.carry()),
    };
    if (!(entered.defaultYearlyDays >= 0)) {
      this.daysError.set('Enter 0 or more days.');
      return;
    }
    this.busy.set(true);
    this.service.saveAllowances(entered).subscribe((result) => {
      this.busy.set(false);
      if (!result.ok) {
        this.toasts.show({
          tone: 'danger',
          title: 'We couldn’t save your changes',
          body: 'Nothing was changed. Check your connection and try again.',
          action: { label: 'Try again', run: () => this.save() },
        });
        return;
      }
      this.status.set('Saved');
      this.saved.emit(entered);
    });
  }
}
