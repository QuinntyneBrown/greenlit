import { DialogRef } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';

import { AddedChild, SCHOOL_CALENDAR_SERVICE } from 'api';
import { Alert, Button, Dialog, TextField } from 'components';

/** The same shape the API accepts: something@something.tld. */
const EMAIL = /^[^@\s]+@[^@\s.]+(\.[^@\s.]+)+$/;

/**
 * Add a child (dialogs/add-child/*, docs/detailed-designs/teams/school-calendar, L2-060 AC2): a name, and an email
 * only for a child who will sign in. A name only adds a row the manager marks; an email also invites the child. The
 * dialog closes with `true` when anyone was added, so Settings shows the new row.
 */
@Component({
  selector: 'app-add-child-dialog',
  imports: [Dialog, Alert, TextField, Button],
  template: `
    <gl-dialog
      title="Add a child"
      description="Children are on the calendar with no allowance."
      [busy]="busy()"
      (closed)="close()"
    >
      @if (added(); as child) {
        @if (child.invited) {
          <gl-alert tone="success" [title]="'Invite sent to ' + child.email">
            {{ child.name }} is on the calendar now. The link in the email works for seven days.
          </gl-alert>
        } @else {
          <gl-alert tone="success" [title]="child.name + ' is on the calendar'">
            You can mark {{ firstName(child.name) }}’s days and add school closures.
          </gl-alert>
        }
      } @else {
        <form class="fields" novalidate (submit)="submit($event)">
          @if (failed()) {
            <gl-alert tone="danger" title="We couldn’t add the child">
              Check your connection and try again. Nothing was added to the team.
            </gl-alert>
          }
          <gl-text-field
            label="Name"
            inputId="ac-name"
            [(value)]="name"
            [error]="submitted() ? nameError() : ''"
            [readonly]="busy()"
          />
          <gl-text-field
            label="Email (optional)"
            type="email"
            autocomplete="off"
            inputId="ac-email"
            help="Add an email only if they’ll sign in. Without one, you mark their days and they’re confirmed straight away."
            [(value)]="email"
            [error]="submitted() ? emailError() : ''"
            [readonly]="busy()"
          />
          <button class="submit-on-enter" type="submit" tabindex="-1" aria-hidden="true"></button>
        </form>
      }
      <div slot="footer" class="actions">
        @if (added()) {
          <gl-button (click)="another()">Add another</gl-button>
          <gl-button variant="primary" (click)="close()">Done</gl-button>
        } @else {
          <gl-button [disabled]="busy()" (click)="close()">Cancel</gl-button>
          <gl-button variant="primary" [busy]="busy()" [disabled]="busy()" (click)="submit()">
            {{ busy() ? 'Adding…' : failed() ? 'Try again' : 'Add child' }}
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
export class AddChildDialog {
  private readonly service = inject(SCHOOL_CALENDAR_SERVICE);
  private readonly ref = inject<DialogRef<boolean>>(DialogRef);

  protected readonly name = signal('');
  protected readonly email = signal('');
  protected readonly submitted = signal(false);
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);
  protected readonly added = signal<AddedChild | null>(null);
  private readonly addedAny = signal(false);

  protected readonly nameError = computed(() => (this.name().trim() ? '' : 'Enter a name.'));
  protected readonly emailError = computed(() => {
    const email = this.email().trim();
    return email && !EMAIL.test(email) ? 'Enter a valid email address, like name@company.com.' : '';
  });

  constructor() {
    // Esc and the backdrop do nothing while a request runs.
    effect(() => {
      this.ref.disableClose = this.busy();
    });
  }

  protected firstName(name: string): string {
    return name.split(' ')[0];
  }

  protected submit(event?: Event): void {
    event?.preventDefault();
    if (this.busy()) return;
    this.submitted.set(true);
    if (this.nameError() || this.emailError()) return;
    this.busy.set(true);
    this.failed.set(false);
    const email = this.email().trim();
    this.service.addChild(this.name().trim(), email || null).subscribe((result) => {
      this.busy.set(false);
      if (result.outcome === 'added') {
        this.added.set(result.child);
        this.addedAny.set(true);
      } else {
        this.failed.set(true);
      }
    });
  }

  protected another(): void {
    this.added.set(null);
    this.name.set('');
    this.email.set('');
    this.submitted.set(false);
  }

  protected close(): void {
    if (this.busy()) return;
    this.ref.close(this.addedAny());
  }
}
