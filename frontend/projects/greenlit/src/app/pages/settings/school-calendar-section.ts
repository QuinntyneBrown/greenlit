import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { SCHOOL_CALENDAR_SERVICE } from 'api';
import { Button, Switch } from 'components';

import { ToastService } from '../../toasts/toast.service';

/**
 * Settings → School calendar (pages/settings/school-calendar*, docs/detailed-designs/teams/school-calendar, L2-059):
 * the switch, saved with the section's own "Save changes". A member sees it read-only. Turning it off deletes
 * nothing; the page shows or hides children and closures from the saved value it is told about through `saved`.
 */
@Component({
  selector: 'app-school-calendar-section',
  imports: [Switch, Button],
  template: `
    <h2 id="school-title" class="section-title">School calendar</h2>
    <p>For a family: mark children, and add the days school is closed to their rows.</p>
    <fieldset [disabled]="!canEdit()">
      <div class="stack">
        <gl-switch
          label="Use the school calendar"
          description="Children have no allowance. Closures show on their rows and never count as time off."
          note="Turning it off hides children and closures. Nothing is deleted."
          [checked]="draft() ?? on()"
          [disabled]="!canEdit() || busy()"
          (checkedChange)="flip($event)"
        />
      </div>
    </fieldset>
    @if (canEdit()) {
      <div class="settings-actions">
        <gl-button
          variant="primary"
          size="sm"
          [busy]="busy()"
          [disabled]="!canSave()"
          (click)="save()"
        >
          {{ busy() ? 'Saving…' : 'Save changes' }}
        </gl-button>
        <span aria-live="polite">{{ status() }}</span>
      </div>
    }
    <ng-content />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchoolCalendarSection {
  private readonly service = inject(SCHOOL_CALENDAR_SERVICE);
  private readonly toasts = inject(ToastService);

  /** The saved value. */
  readonly on = input.required<boolean>();
  /** The manager of the active team; everyone else reads. */
  readonly canEdit = input<boolean>(false);
  /** The new saved value, after a successful save. */
  readonly saved = output<boolean>();

  protected readonly draft = signal<boolean | null>(null);
  protected readonly busy = signal(false);
  protected readonly status = signal('');
  protected readonly canSave = computed(() => {
    const draft = this.draft();
    return draft !== null && draft !== this.on() && !this.busy();
  });

  protected flip(on: boolean): void {
    this.draft.set(on);
    this.status.set('');
  }

  /** A failure keeps the switch as set and offers Try again (L2-009 AC5). */
  protected save(): void {
    const draft = this.draft();
    if (draft === null || this.busy()) return;
    this.busy.set(true);
    this.service.save(draft).subscribe((result) => {
      this.busy.set(false);
      if (result.ok) {
        this.draft.set(null);
        this.status.set('Saved');
        this.saved.emit(draft);
        return;
      }
      this.toasts.show({
        tone: 'danger',
        title: 'We couldn’t save your changes',
        body: 'Nothing was changed. Check your connection and try again.',
        action: { label: 'Try again', run: () => this.save() },
      });
    });
  }
}
