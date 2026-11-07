import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  signal,
} from '@angular/core';

import { AllowanceDefaults } from 'api';
import { Button, SelectField, SelectOption, TextField } from 'components';

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
 * The Allowances section of Settings (pages/settings/default; docs/detailed-designs/allowances/allowance-defaults):
 * the days a new person gets, the month the leave year starts and the most days to carry over. Saved on its own.
 */
@Component({
  selector: 'app-allowances-section',
  imports: [Button, SelectField, TextField],
  template: `
    <h2 id="allowances-title" class="section-title" tabindex="-1">Allowances</h2>
    <p>
      Defaults for new people. You can override anyone's allowance on the Team list or their
      profile.
    </p>
    <fieldset>
      <div class="form-grid">
        <gl-text-field
          label="Days per year"
          inputId="allow-days"
          type="number"
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
      <gl-button variant="primary" size="sm" [disabled]="!dirty()"> Save changes </gl-button>
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

  protected readonly months: readonly SelectOption[] = MONTHS.map((label, i) => ({
    value: String(i + 1),
    label,
  }));

  protected readonly days = linkedSignal(() => String(this.defaults().defaultYearlyDays));
  protected readonly start = linkedSignal(() => String(this.defaults().leaveYearStartMonth));
  protected readonly carry = linkedSignal(() => String(this.defaults().maxCarryOver));
  protected readonly status = signal('');

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
  }
}
