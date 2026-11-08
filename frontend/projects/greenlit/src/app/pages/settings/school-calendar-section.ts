import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';

import { SCHOOL_CALENDAR_SERVICE, SchoolClosure } from 'api';
import { Badge, Button, EmptyState, Switch } from 'components';

import { AppDialogs } from '../../dialogs/app-dialogs';
import {
  DeleteClosureData,
  DeleteClosureDialog,
} from '../../dialogs/school-closure/delete-closure.dialog';
import {
  ClosureChild,
  SchoolClosureData,
  SchoolClosureDialog,
  SchoolClosureOutcome,
} from '../../dialogs/school-closure/school-closure.dialog';
import {
  ImportCalendarData,
  ImportCalendarDialog,
} from '../../dialogs/school-closure/import-calendar.dialog';
import { ToastService } from '../../toasts/toast.service';
import { closureDates } from './closure-dates';

type ClosuresLoad =
  | { readonly state: 'loading' }
  | { readonly state: 'ready'; readonly closures: readonly SchoolClosure[] }
  | { readonly state: 'error' };

const SCHOOL_ICON = 'M2 9.5 12 5l10 4.5L12 14zM6 11.5V16c3.5 2.5 8.5 2.5 12 0v-4.5';

/**
 * Settings → School calendar (pages/settings/school-calendar*, docs/detailed-designs/teams/school-calendar, L2-059):
 * the switch, saved with the section's own "Save changes". A member sees it read-only. Turning it off deletes
 * nothing; the page shows or hides children and closures from the saved value it is told about through `saved`.
 */
@Component({
  selector: 'app-school-calendar-section',
  imports: [Switch, Button, Badge, EmptyState],
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
    @if (on()) {
      <h3 class="settings-subtitle">Closures</h3>
      @if (children().length === 0) {
        <p class="closures-note">Mark someone as a child in Team to add closures.</p>
      } @else {
        @switch (load().state) {
          @case ('error') {
            <p class="closures-note">We couldn’t load the closures. Nothing was changed.</p>
            <gl-button size="sm" (click)="reload()">Try again</gl-button>
          }
          @case ('ready') {
            @if (closures().length === 0) {
              <gl-empty-state
                [compact]="true"
                [level]="3"
                title="No closures yet"
                text="Add PA days and school vacations, or import a school’s calendar file."
              >
                <svg slot="icon" class="icon icon--lg" aria-hidden="true" viewBox="0 0 24 24">
                  <path [attr.d]="schoolIcon" />
                </svg>
                @if (canEdit()) {
                  <gl-button slot="actions" size="sm" (click)="add()">Add a closure</gl-button>
                }
                @if (canEdit()) {
                  <gl-button slot="actions" size="sm" (click)="importFile()">
                    Import a calendar
                  </gl-button>
                }
              </gl-empty-state>
            } @else {
              <ul class="closure-list" aria-label="School closures">
                @for (closure of closures(); track closure.id) {
                  <li class="closure-list__item">
                    <span class="closure-list__icon">
                      <svg class="icon" aria-hidden="true" viewBox="0 0 24 24">
                        <path [attr.d]="schoolIcon" />
                      </svg>
                    </span>
                    <span class="closure-list__what">
                      <span class="closure-list__label">{{ closure.label }}</span>
                      <span class="closure-list__meta">{{ meta(closure) }}</span>
                    </span>
                    @if (closure.imported) {
                      <gl-badge>Imported</gl-badge>
                    }
                    @if (canEdit()) {
                      <span class="closure-list__actions">
                        <gl-button
                          size="sm"
                          [ariaLabel]="'Edit ' + closure.label"
                          (click)="edit(closure)"
                          >Edit</gl-button
                        >
                        <gl-button
                          size="sm"
                          variant="ghost"
                          [ariaLabel]="'Delete ' + closure.label"
                          (click)="remove(closure)"
                          >Delete</gl-button
                        >
                      </span>
                    }
                  </li>
                }
              </ul>
              @if (canEdit()) {
                <div class="settings-actions">
                  <gl-button size="sm" (click)="add()">Add a closure</gl-button>
                  <gl-button size="sm" (click)="importFile()">Import a calendar</gl-button>
                </div>
              }
            }
          }
          @default {
            <p class="closures-note" aria-busy="true">Loading closures…</p>
          }
        }
      }
    }
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
    .settings-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-3);
      margin-top: var(--space-6);
    }
    .settings-subtitle {
      margin: var(--space-8) 0 0;
      font: var(--text-label);
      color: var(--color-fg-default);
    }
    .closures-note {
      margin-top: var(--space-3);
    }
    .closure-list {
      list-style: none;
      margin: var(--space-3) 0 0;
      padding: 0;
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-lg);
      background: var(--color-bg-surface);
    }
    .closure-list__item {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2) var(--space-3);
      padding: var(--space-3) var(--space-4);
    }
    .closure-list__item + .closure-list__item {
      border-top: 1px solid var(--color-border-default);
    }
    .closure-list__icon {
      display: inline-flex;
      color: var(--color-fg-muted);
    }
    .closure-list__what {
      display: flex;
      flex-direction: column;
      min-width: 0;
      flex: 1 1 12rem;
    }
    .closure-list__label {
      font: var(--text-label);
      color: var(--color-fg-default);
    }
    .closure-list__meta {
      font: var(--text-caption);
      color: var(--color-fg-muted);
      font-variant-numeric: tabular-nums;
    }
    .closure-list__actions {
      display: inline-flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      margin-left: auto;
    }
    .icon {
      width: 1.25rem;
      height: 1.25rem;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
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
  /** The team's children, in sheet order (L2-060); closures go on their rows. */
  readonly children = input<readonly ClosureChild[]>([]);

  private readonly dialogs = inject(AppDialogs);
  protected readonly schoolIcon = SCHOOL_ICON;
  protected readonly load = signal<ClosuresLoad>({ state: 'loading' });
  protected readonly closures = computed(() => {
    const load = this.load();
    return load.state === 'ready' ? load.closures : [];
  });

  constructor() {
    // The closures are read whenever the school calendar is (or becomes) on.
    effect(() => {
      if (this.on()) untracked(() => this.reload());
    });
  }

  /** Reads the closures again, e.g. after an import (L2-062). */
  reload(): void {
    this.service.closures().subscribe({
      next: (closures) => this.load.set({ state: 'ready', closures }),
      error: () => this.load.set({ state: 'error' }),
    });
  }

  /** "Fri 20 Nov 2026 · All children" (pages/settings/school-calendar). */
  protected meta(closure: SchoolClosure): string {
    const who =
      closure.memberId === null
        ? 'All children'
        : (this.children().find((c) => c.id === closure.memberId)?.name ?? 'A former member');
    return `${closureDates(closure.firstDay, closure.lastDay)} · ${who}`;
  }

  /** "Add a closure" (L2-061 AC1): the dialog, then the list again and a toast. */
  protected add(): void {
    this.openClosure(null);
  }

  /** "Edit {label}" (L2-061 AC6). */
  protected edit(closure: SchoolClosure): void {
    this.openClosure(closure);
  }

  /** "Delete {label}" (L2-061 AC6): asks first. */
  protected remove(closure: SchoolClosure): void {
    const data: DeleteClosureData = { closure, meta: this.meta(closure) };
    this.dialogs
      .open<boolean>(DeleteClosureDialog, '.dialog__footer .btn', data)
      .closed.subscribe((deleted) => {
        if (!deleted) return;
        this.reload();
        this.toasts.show({
          tone: 'success',
          title: 'Closure deleted',
          body: `${closure.label} is off the children’s rows.`,
        });
      });
  }

  /** "Import a calendar" (L2-062): the dialog, then the list again. */
  protected importFile(): void {
    const data: ImportCalendarData = { children: this.children(), closures: this.closures() };
    this.dialogs
      .open<boolean>(ImportCalendarDialog, '#ic-child', data)
      .closed.subscribe((imported) => {
        if (imported) this.reload();
      });
  }

  private openClosure(closure: SchoolClosure | null): void {
    const data: SchoolClosureData = { closure, children: this.children() };
    this.dialogs
      .open<SchoolClosureOutcome>(SchoolClosureDialog, '#sc-label', data)
      .closed.subscribe((outcome) => {
        if (!outcome) return;
        this.reload();
        this.toasts.show(
          outcome.kind === 'added'
            ? {
                tone: 'success',
                title: 'Closure added',
                body: `${outcome.closure.label} is on the children’s rows.`,
              }
            : {
                tone: 'success',
                title: 'Closure saved',
                body: `${outcome.closure.label} is on the children’s rows.`,
              },
        );
      });
  }

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
