import { DialogRef } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';

import { InvitedMember, MEMBER_ROLE_OPTIONS, MemberRole, TEAM_SERVICE } from 'api';
import {
  Alert,
  Button,
  Dialog,
  FormSummary,
  FormSummaryItem,
  SelectField,
  TextField,
} from 'components';

const NAME_ID = 'im-name';
const EMAIL_ID = 'im-email';

/** The same shape the API accepts (InviteMemberCommandValidator): something@something.tld. */
const EMAIL = /^[^@\s]+@[^@\s.]+(\.[^@\s.]+)+$/;

/**
 * Invite a member (docs/detailed-designs/teams/invite-member, L2-010): name, email and role in a
 * dialog opened from Settings. Sending with problems shows the summary and sends nothing; a send
 * shows "Sending…" with the fields read-only; a failure keeps the values and offers "Try again";
 * success says the person is on the calendar and offers "Invite another". The dialog closes with
 * `true` when anyone was invited, so the page behind can show the new row.
 */
@Component({
  selector: 'app-invite-member-dialog',
  imports: [Dialog, Alert, FormSummary, TextField, SelectField, Button],
  template: `
    <gl-dialog
      title="Invite a member"
      description="They’ll get an email with a link to set a password."
      [busy]="busy()"
      (closed)="close()"
    >
      @if (sent(); as member) {
        <gl-alert tone="success" [title]="'Invite sent to ' + member.email">
          {{ member.name }} is on the calendar now. The link in the email works for seven days.
        </gl-alert>
      } @else {
        <form class="fields" novalidate (submit)="submit($event)">
          @if (submitted() && summaryItems().length) {
            <gl-form-summary [items]="summaryItems()" />
          } @else if (failed()) {
            <gl-alert tone="danger" title="We couldn’t send the invite">
              Check your connection and try again. Nothing was added to the team.
            </gl-alert>
          }
          <gl-text-field
            label="Name"
            [inputId]="nameId"
            [(value)]="name"
            [error]="shown(nameId) ? nameError() : ''"
            [readonly]="busy()"
            (blurred)="touch(nameId)"
          />
          <gl-text-field
            label="Email"
            type="email"
            autocomplete="off"
            [inputId]="emailId"
            [value]="email()"
            (valueChange)="setEmail($event)"
            [error]="shown(emailId) ? emailError() : ''"
            [readonly]="busy()"
            (blurred)="touch(emailId)"
          />
          <gl-select-field
            label="Role"
            selectId="im-role"
            help="Managers confirm requests and edit any row."
            [options]="roles"
            [(value)]="role"
          />
          <button class="submit-on-enter" type="submit" tabindex="-1" aria-hidden="true"></button>
        </form>
      }
      <div slot="footer" class="actions">
        @if (sent()) {
          <gl-button (click)="another()">Invite another</gl-button>
          <gl-button variant="primary" (click)="close()">Done</gl-button>
        } @else {
          <gl-button [disabled]="busy()" (click)="close()">Cancel</gl-button>
          <gl-button variant="primary" [busy]="busy()" [disabled]="busy()" (click)="submit()">
            {{ busy() ? 'Sending…' : failed() ? 'Try again' : 'Send invite' }}
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
export class InviteMemberDialog {
  private readonly teams = inject(TEAM_SERVICE);
  private readonly ref = inject<DialogRef<boolean>>(DialogRef);
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);
  private readonly summary = viewChild(FormSummary);

  protected readonly nameId = NAME_ID;
  protected readonly emailId = EMAIL_ID;
  protected readonly roles = MEMBER_ROLE_OPTIONS;

  protected readonly name = signal('');
  protected readonly email = signal('');
  protected readonly role = signal<string>('Member');
  protected readonly submitted = signal(false);
  /** The request is running (dialogs/invite-member/busy). */
  protected readonly busy = signal(false);
  /** The last attempt failed (dialogs/invite-member/failed). */
  protected readonly failed = signal(false);
  /** The person just invited (dialogs/invite-member/success). */
  protected readonly sent = signal<InvitedMember | null>(null);
  private readonly invitedAny = signal(false);
  private readonly touched = signal<ReadonlySet<string>>(new Set());
  /** The API said this address has already joined. */
  private readonly alreadyJoined = signal(false);

  protected readonly nameError = computed(() => (this.name().trim() ? '' : 'Enter a name.'));
  protected readonly emailError = computed(() => {
    if (!EMAIL.test(this.email().trim()))
      return 'Enter a valid email address, like name@company.com.';
    return this.alreadyJoined() ? 'Someone on the team already uses this email.' : '';
  });

  /** The summary repeats each field error as a link, without the full stop (dialogs/invite-member/invalid). */
  protected readonly summaryItems = computed<FormSummaryItem[]>(() => {
    const items: FormSummaryItem[] = [];
    if (this.nameError()) items.push({ field: NAME_ID, message: 'Enter a name' });
    if (this.emailError())
      items.push({
        field: EMAIL_ID,
        message: this.alreadyJoined() ? 'Use a different email' : 'Enter a valid email address',
      });
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

  protected setEmail(value: string): void {
    this.email.set(value);
    this.alreadyJoined.set(false);
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
    this.teams
      .invite({
        name: this.name().trim(),
        email: this.email().trim(),
        role: this.role() as MemberRole,
      })
      .subscribe((result) => {
        this.busy.set(false);
        if (result.outcome === 'invited') {
          this.invitedAny.set(true);
          this.sent.set(result.member);
        } else if (result.outcome === 'exists') {
          this.alreadyJoined.set(true);
          afterNextRender(() => this.summary()?.focus(), { injector: this.injector });
        } else {
          this.failed.set(true);
        }
      });
  }

  /** "Invite another": an empty form, with focus on Name. */
  protected another(): void {
    this.name.set('');
    this.email.set('');
    this.role.set('Member');
    this.submitted.set(false);
    this.failed.set(false);
    this.alreadyJoined.set(false);
    this.touched.set(new Set());
    this.sent.set(null);
    afterNextRender(() => this.document.getElementById(NAME_ID)?.focus(), {
      injector: this.injector,
    });
  }

  protected close(): void {
    this.ref.close(this.invitedAny());
  }
}
