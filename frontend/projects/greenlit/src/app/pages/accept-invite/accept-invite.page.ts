import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Injector,
  OnInit,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { INVITATION_SERVICE, Invitation } from 'api';
import {
  Alert,
  AuthCard,
  Button,
  FormSummary,
  FormSummaryItem,
  Skeleton,
  TextField,
} from 'components';

import { SIGNED_IN_PAUSE_MS } from '../sign-in/sign-in.page';

type Field = 'name' | 'password' | 'confirm';

const NAME_ID = 'ai-name';
const EMAIL_ID = 'ai-email';
const PASSWORD_ID = 'ai-pw';
const CONFIRM_ID = 'ai-confirm';
const MIN_PASSWORD = 10;

type View =
  | { readonly kind: 'loading' }
  | { readonly kind: 'open'; readonly invitation: Invitation }
  /** `managerName` is null for a link that matches no invitation. */
  | { readonly kind: 'expired'; readonly managerName: string | null }
  | { readonly kind: 'unavailable' }
  | { readonly kind: 'joined'; readonly firstName: string; readonly teamName: string };

/**
 * Accept an invitation (docs/detailed-designs/identity-and-access/accept-invitation, L2-004): the
 * bare-shell card the emailed link opens. It reads the invitation, asks for a name and a password,
 * and on joining shows "You're in" and opens the calendar, signed in. Fields validate on blur once,
 * then on every change; a submit attempt with errors shows the summary, moves focus to it and sends
 * nothing. A used, replaced, expired or unknown link shows the expired state.
 */
@Component({
  selector: 'app-accept-invite-page',
  imports: [AuthCard, TextField, FormSummary, Button, Alert, Skeleton],
  template: `
    @switch (view().kind) {
      @case ('loading') {
        <gl-auth-card title="Join your team" lead="Checking your invitation…">
          <div class="stack" aria-busy="true">
            <gl-skeleton shape="rect" width="100%" height="var(--space-10)" />
            <gl-skeleton shape="rect" width="100%" height="var(--space-10)" />
            <gl-skeleton shape="rect" width="100%" height="var(--space-10)" />
          </div>
        </gl-auth-card>
      }
      @case ('expired') {
        <gl-auth-card title="Join your team" lead="We couldn’t use that link.">
          <gl-alert tone="danger" title="This invitation has expired">
            Invitations work for seven days. Ask {{ expiredManager() }} to send you a new one.
          </gl-alert>
          <gl-button link="/sign-in" [block]="true">Go to sign in</gl-button>
        </gl-auth-card>
      }
      @case ('unavailable') {
        <gl-auth-card title="Join your team" lead="We couldn’t open your invitation.">
          <gl-alert tone="danger" title="We couldn’t load your invitation">
            Something went wrong on our side. Nothing was changed. Try again in a moment.
          </gl-alert>
          <gl-button [block]="true" (click)="load()">Try again</gl-button>
        </gl-auth-card>
      }
      @case ('joined') {
        <gl-auth-card [title]="'Welcome, ' + joinedName()" lead="Your account is ready.">
          <gl-alert tone="success" title="You’re in">
            Welcome to {{ joinedTeam() }}. Your row is on the calendar.
          </gl-alert>
          <gl-button link="/" variant="primary" [block]="true">Open the calendar</gl-button>
        </gl-auth-card>
      }
      @default {
        @if (invitation(); as inv) {
          <gl-auth-card
            [title]="'Join ' + inv.teamName"
            [lead]="inv.managerName + ' invited you to share the team’s time off.'"
          >
            <form class="stack" novalidate (submit)="submit($event)">
              @if (submitted() && summaryItems().length) {
                <gl-form-summary [items]="summaryItems()" />
              } @else if (failure() === 'exists') {
                <gl-alert tone="danger" title="You already have a Greenlit account">
                  Sign in with this email to continue.
                </gl-alert>
              } @else if (failure() === 'failed') {
                <gl-alert tone="danger" title="We couldn’t create your account">
                  Something went wrong on our side. Nothing was changed. Try again in a moment.
                </gl-alert>
              }
              <gl-text-field
                label="Your name"
                [inputId]="nameId"
                autocomplete="name"
                [(value)]="name"
                [error]="shown('name') ? nameError() : ''"
                [readonly]="busy()"
                (blurred)="touch('name')"
              />
              <gl-text-field
                label="Email"
                [inputId]="emailId"
                type="email"
                help="This is where your invitation was sent."
                [value]="inv.email"
                [readonly]="true"
              />
              <gl-text-field
                label="Choose a password"
                [inputId]="passwordId"
                type="password"
                autocomplete="new-password"
                [(value)]="password"
                [error]="shown('password') ? passwordError() : ''"
                [readonly]="busy()"
                (blurred)="touch('password')"
              />
              <gl-text-field
                label="Confirm password"
                [inputId]="confirmId"
                type="password"
                autocomplete="new-password"
                [(value)]="confirm"
                [error]="shown('confirm') ? confirmError() : ''"
                [readonly]="busy()"
                (blurred)="touch('confirm')"
              />
              <gl-button
                type="submit"
                variant="primary"
                [block]="true"
                [busy]="busy()"
                [disabled]="busy()"
              >
                Join the team
              </gl-button>
              @if (failure() === 'exists') {
                <gl-button link="/sign-in" [block]="true">Go to sign in</gl-button>
              }
            </form>
          </gl-auth-card>
        }
      }
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .stack {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AcceptInvitePage implements OnInit {
  private readonly invitations = inject(INVITATION_SERVICE);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly token = inject(ActivatedRoute).snapshot.paramMap.get('token') ?? '';
  private readonly summary = viewChild(FormSummary);

  protected readonly nameId = NAME_ID;
  protected readonly emailId = EMAIL_ID;
  protected readonly passwordId = PASSWORD_ID;
  protected readonly confirmId = CONFIRM_ID;

  protected readonly view = signal<View>({ kind: 'loading' });
  protected readonly name = signal('');
  protected readonly password = signal('');
  protected readonly confirm = signal('');
  protected readonly submitted = signal(false);
  /** True while the accept request runs (pages/accept-invite/submitting). */
  protected readonly busy = signal(false);
  /** Why the last attempt failed (pages/accept-invite/failed); null before one has. */
  protected readonly failure = signal<'exists' | 'failed' | null>(null);
  private readonly touched = signal<ReadonlySet<Field>>(new Set());

  /** The invitation while the form shows (also while it is being submitted). */
  protected readonly invitation = computed(() => {
    const view = this.view();
    return view.kind === 'open' ? view.invitation : null;
  });
  protected readonly expiredManager = computed(() => {
    const view = this.view();
    return view.kind === 'expired' && view.managerName ? view.managerName : 'whoever invited you';
  });
  protected readonly joinedName = computed(() => {
    const view = this.view();
    return view.kind === 'joined' ? view.firstName : '';
  });
  protected readonly joinedTeam = computed(() => {
    const view = this.view();
    return view.kind === 'joined' ? view.teamName : '';
  });

  protected readonly nameError = computed(() => (this.name().trim() ? '' : 'Enter your name.'));
  protected readonly passwordError = computed(() =>
    this.password().length >= MIN_PASSWORD ? '' : 'Use at least 10 characters.',
  );
  protected readonly confirmError = computed(() =>
    this.confirm() === this.password() ? '' : 'This doesn’t match the password above.',
  );

  /** The summary repeats each field error as a link, in the wording of pages/accept-invite/invalid. */
  protected readonly summaryItems = computed<FormSummaryItem[]>(() => {
    const items: FormSummaryItem[] = [];
    if (this.nameError()) items.push({ field: NAME_ID, message: 'Enter your name' });
    if (this.passwordError()) {
      items.push({ field: PASSWORD_ID, message: 'Password must be at least 10 characters' });
    }
    if (this.confirmError()) items.push({ field: CONFIRM_ID, message: 'Passwords don’t match' });
    return items;
  });

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.view.set({ kind: 'loading' });
    this.invitations.get(this.token).subscribe((result) => {
      switch (result.outcome) {
        case 'open':
          this.name.set(result.invitation.memberName);
          this.view.set({ kind: 'open', invitation: result.invitation });
          break;
        case 'expired':
          this.view.set({ kind: 'expired', managerName: result.managerName });
          break;
        default:
          this.view.set({ kind: 'unavailable' });
      }
    });
  }

  protected shown(field: Field): boolean {
    return this.submitted() || this.touched().has(field);
  }

  protected touch(field: Field): void {
    if (this.touched().has(field)) return;
    this.touched.update((set) => new Set([...set, field]));
  }

  protected submit(event: Event): void {
    event.preventDefault();
    const invitation = this.invitation();
    if (this.busy() || !invitation) return;
    this.submitted.set(true);
    if (this.summaryItems().length) {
      afterNextRender(() => this.summary()?.focus(), { injector: this.injector });
      return;
    }
    this.failure.set(null);
    this.busy.set(true);
    this.invitations.accept(this.token, this.name().trim(), this.password()).subscribe((result) => {
      this.busy.set(false);
      switch (result.outcome) {
        case 'joined': {
          this.view.set({
            kind: 'joined',
            firstName: result.session.displayName.split(' ')[0],
            teamName: invitation.teamName,
          });
          const timer = setTimeout(() => this.router.navigateByUrl('/'), SIGNED_IN_PAUSE_MS);
          this.destroyRef.onDestroy(() => clearTimeout(timer));
          break;
        }
        case 'expired':
          this.view.set({ kind: 'expired', managerName: result.managerName });
          break;
        default:
          this.failure.set(result.outcome);
      }
    });
  }
}
