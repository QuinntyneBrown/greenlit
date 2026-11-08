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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {
  ACCOUNT_SERVICE,
  GOOGLE_IDENTITY,
  INVITATION_SERVICE,
  Invitation,
  JoinWithAccountResult,
  SESSION_STORE,
} from 'api';
import {
  Alert,
  AuthCard,
  AuthDivider,
  Button,
  FormSummary,
  FormSummaryItem,
  GoogleButton,
  Skeleton,
  TextField,
} from 'components';

import { AppDialogs } from '../../dialogs/app-dialogs';
import { SignOutDialog } from '../../dialogs/sign-out/sign-out.dialog';
import { SIGNED_IN_PAUSE_MS } from '../sign-in/sign-in.page';

type Field = 'name' | 'password' | 'confirm';

const NAME_ID = 'ai-name';
const EMAIL_ID = 'ai-email';
const PASSWORD_ID = 'ai-pw';
const CONFIRM_ID = 'ai-confirm';
const ACCOUNT_PASSWORD_ID = 'aj-pw';
const MIN_PASSWORD = 10;

type View =
  | { readonly kind: 'loading' }
  /** `signedInAs` is the signed-in account's email, null when signed out (L2-058). */
  | { readonly kind: 'open'; readonly invitation: Invitation; readonly signedInAs: string | null }
  /** `managerName` is null for a link that matches no invitation. */
  | { readonly kind: 'expired'; readonly managerName: string | null }
  | { readonly kind: 'unavailable' }
  | {
      readonly kind: 'joined';
      readonly firstName: string;
      readonly teamName: string;
      /** Joined with an account the person already had (L2-058), not a new one. */
      readonly existing: boolean;
    };

/**
 * Accept an invitation (docs/detailed-designs/identity-and-access/accept-invitation, L2-004): the
 * bare-shell card the emailed link opens. It reads the invitation, asks for a name and a password,
 * and on joining shows "You're in" and opens the calendar, signed in. Fields validate on blur once,
 * then on every change; a submit attempt with errors shows the summary, moves focus to it and sends
 * nothing. A used, replaced, expired or unknown link shows the expired state. "Join with Google"
 * (identity-and-access/sign-in-with-google, L2-052) joins with the Google account that carries the
 * invited address instead of a password. An address that already has an account (L2-058) joins with it instead:
 * signed out with its password or Google, signed in as it with one button; signed in as someone else, the page says
 * the invitation is for someone else and attaches nothing.
 */
@Component({
  selector: 'app-accept-invite-page',
  imports: [
    AuthCard,
    AuthDivider,
    TextField,
    FormSummary,
    Button,
    GoogleButton,
    Alert,
    Skeleton,
    RouterLink,
  ],
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
        <gl-auth-card [title]="'Welcome, ' + joinedName()" [lead]="joinedLead()">
          <gl-alert tone="success" title="You’re in">
            Welcome to {{ joinedTeam() }}. Your row is on the calendar.
          </gl-alert>
          <gl-button link="/" variant="primary" [block]="true">Open the calendar</gl-button>
        </gl-auth-card>
      }
      @default {
        @if (invitation(); as inv) {
          @switch (mode()) {
            @case ('other') {
              <gl-auth-card
                title="This invitation is for someone else"
                [lead]="
                  'It was sent to ' +
                  inv.email +
                  ', and you’re signed in as ' +
                  signedInAs() +
                  '. Sign out, then open the link again to join as ' +
                  inv.email +
                  '.'
                "
              >
                <gl-button variant="primary" [block]="true" (click)="signOut()">Sign out</gl-button>
                <gl-button link="/" [block]="true">Go to the calendar</gl-button>
              </gl-auth-card>
            }
            @case ('signed-in') {
              <gl-auth-card
                [title]="'Join ' + inv.teamName"
                [lead]="inv.managerName + ' invited you to share the team’s time off.'"
              >
                @if (joinFailure() === 'failed') {
                  <gl-alert tone="danger" [title]="'We couldn’t add you to ' + inv.teamName">
                    Something went wrong on our side. Nothing was changed. Try again in a moment.
                  </gl-alert>
                }
                <p>You’re signed in as {{ signedInAs() }}.</p>
                <gl-button
                  variant="primary"
                  [block]="true"
                  [busy]="busy()"
                  [disabled]="busy()"
                  (click)="joinSignedIn()"
                >
                  {{
                    busy() ? 'Joining…' : joinFailure() === 'failed' ? 'Try again' : 'Join the team'
                  }}
                </gl-button>
              </gl-auth-card>
            }
            @case ('account') {
              <gl-auth-card
                [title]="'Join ' + inv.teamName"
                [lead]="inv.managerName + ' invited you to share the team’s time off.'"
              >
                @if (joinFailure() === 'wrong') {
                  <gl-alert tone="danger" title="Email or password doesn’t match">
                    Check your password and try again. If you’ve forgotten it, you can reset it.
                  </gl-alert>
                } @else if (joinFailure() === 'failed' || failure() === 'failed') {
                  <gl-alert tone="danger" [title]="'We couldn’t add you to ' + inv.teamName">
                    Something went wrong on our side. Nothing was changed. Try again in a moment.
                  </gl-alert>
                } @else if (failure() === 'mismatch') {
                  <gl-alert tone="danger" title="That Google account doesn’t match your invitation">
                    Choose the Google account for {{ inv.email }}, or sign in with your password
                    instead.
                  </gl-alert>
                } @else {
                  <gl-alert tone="info">
                    {{ inv.email }} already has a Greenlit account. Sign in to add
                    {{ inv.teamName }} to your teams.
                  </gl-alert>
                }
                <gl-google-button
                  [busy]="googleBusy()"
                  [disabled]="busy()"
                  (pressed)="joinWithGoogle()"
                >
                  Join with Google
                </gl-google-button>
                <gl-auth-divider />
                <form class="stack" novalidate (submit)="signInAndJoin($event)">
                  <gl-text-field
                    label="Email"
                    inputId="aj-email"
                    type="email"
                    help="This is where your invitation was sent."
                    [value]="inv.email"
                    [readonly]="true"
                  />
                  <gl-text-field
                    label="Password"
                    [inputId]="accountPasswordId"
                    type="password"
                    autocomplete="current-password"
                    [(value)]="accountPassword"
                    [error]="joinFailure() === 'wrong' ? 'Check your password and try again.' : ''"
                    [readonly]="locked()"
                  />
                  <gl-button
                    type="submit"
                    variant="primary"
                    [block]="true"
                    [busy]="busy()"
                    [disabled]="locked()"
                  >
                    {{ busy() ? 'Joining…' : 'Sign in and join' }}
                  </gl-button>
                </form>
                <p class="auth-links"><a routerLink="/forgot-password">Forgot your password?</a></p>
              </gl-auth-card>
            }
            @default {
              <gl-auth-card
                [title]="'Join ' + inv.teamName"
                [lead]="inv.managerName + ' invited you to share the team’s time off.'"
              >
                <gl-google-button
                  [busy]="googleBusy()"
                  [disabled]="busy()"
                  (pressed)="joinWithGoogle()"
                >
                  Join with Google
                </gl-google-button>
                <gl-auth-divider />
                <form class="stack" novalidate (submit)="submit($event)">
                  @if (submitted() && summaryItems().length) {
                    <gl-form-summary [items]="summaryItems()" />
                  } @else if (failure() === 'mismatch') {
                    <gl-alert
                      tone="danger"
                      title="That Google account doesn’t match your invitation"
                    >
                      Choose the Google account for {{ inv.email }}, or join with a password
                      instead.
                    </gl-alert>
                  } @else if (failure() === 'unverified') {
                    <gl-alert
                      tone="danger"
                      title="That Google account doesn’t match your invitation"
                    >
                      Google hasn’t verified that email address. Verify it with Google, or join with
                      a password instead.
                    </gl-alert>
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
                    [readonly]="locked()"
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
                    [readonly]="locked()"
                    (blurred)="touch('password')"
                  />
                  <gl-text-field
                    label="Confirm password"
                    [inputId]="confirmId"
                    type="password"
                    autocomplete="new-password"
                    [(value)]="confirm"
                    [error]="shown('confirm') ? confirmError() : ''"
                    [readonly]="locked()"
                    (blurred)="touch('confirm')"
                  />
                  <gl-button
                    type="submit"
                    variant="primary"
                    [block]="true"
                    [busy]="busy()"
                    [disabled]="locked()"
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
  private readonly accounts = inject(ACCOUNT_SERVICE);
  private readonly session = inject(SESSION_STORE);
  private readonly dialogs = inject(AppDialogs);
  private readonly google = inject(GOOGLE_IDENTITY);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly token = inject(ActivatedRoute).snapshot.paramMap.get('token') ?? '';
  private readonly summary = viewChild(FormSummary);

  protected readonly nameId = NAME_ID;
  protected readonly emailId = EMAIL_ID;
  protected readonly passwordId = PASSWORD_ID;
  protected readonly confirmId = CONFIRM_ID;
  protected readonly accountPasswordId = ACCOUNT_PASSWORD_ID;
  /** The existing account's password (L2-058 AC2). */
  protected readonly accountPassword = signal('');
  /** Why the last join with an existing account failed; null before one has. */
  protected readonly joinFailure = signal<'wrong' | 'failed' | null>(null);

  protected readonly view = signal<View>({ kind: 'loading' });
  protected readonly name = signal('');
  protected readonly password = signal('');
  protected readonly confirm = signal('');
  protected readonly submitted = signal(false);
  /** True while the accept request runs (pages/accept-invite/submitting). */
  protected readonly busy = signal(false);
  /** True while Google's window is open or the Google join runs (pages/accept-invite/google-busy). */
  protected readonly googleBusy = signal(false);
  /** Why the last attempt failed (pages/accept-invite/failed, google-mismatch, google-error); null before one has. */
  protected readonly failure = signal<'exists' | 'failed' | 'mismatch' | 'unverified' | null>(null);
  /** Fields and buttons are locked while either way in is running, so two joins never race. */
  protected readonly locked = computed(() => this.busy() || this.googleBusy());
  private readonly touched = signal<ReadonlySet<Field>>(new Set());

  /** The invitation while the form shows (also while it is being submitted). */
  protected readonly invitation = computed(() => {
    const view = this.view();
    return view.kind === 'open' ? view.invitation : null;
  });
  /** The signed-in account's email while the invitation shows; null when signed out. */
  protected readonly signedInAs = computed(() => {
    const view = this.view();
    return view.kind === 'open' ? view.signedInAs : null;
  });
  /**
   * Which card the invitation shows (L2-058): `create` the name and password form (L2-004), `account` sign in and join
   * with the address's account, `signed-in` join with the signed-in account, `other` someone else is signed in.
   */
  protected readonly mode = computed<'create' | 'account' | 'signed-in' | 'other'>(() => {
    const invitation = this.invitation();
    const signedInAs = this.signedInAs();
    if (!invitation) return 'create';
    if (signedInAs !== null) {
      return signedInAs.trim().toLowerCase() === invitation.email.trim().toLowerCase()
        ? 'signed-in'
        : 'other';
    }
    return invitation.accountExists ? 'account' : 'create';
  });
  protected readonly joinedLead = computed(() => {
    const view = this.view();
    return view.kind === 'joined' && view.existing
      ? `${view.teamName} is now one of your teams.`
      : 'Your account is ready.';
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
        case 'open': {
          const invitation = result.invitation;
          this.name.set(invitation.memberName);
          if (!this.session.isSignedIn()) {
            this.view.set({ kind: 'open', invitation, signedInAs: null });
            break;
          }
          // Signed in: who is it? A session that cannot be read counts as signed out (L2-058 AC4, AC5).
          this.accounts.get().subscribe({
            next: (account) =>
              this.view.set({ kind: 'open', invitation, signedInAs: account?.email ?? null }),
            error: () => this.view.set({ kind: 'open', invitation, signedInAs: null }),
          });
          break;
        }
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
    if (this.locked() || !invitation) return;
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
        case 'joined':
          this.joined(result.session.displayName, invitation.teamName);
          break;
        case 'expired':
          this.view.set({ kind: 'expired', managerName: result.managerName });
          break;
        default:
          this.failure.set(result.outcome);
      }
    });
  }

  /** Join with Google (L2-052): Google's window, then the join; a closed window changes nothing. */
  protected joinWithGoogle(): void {
    const invitation = this.invitation();
    if (this.locked() || !invitation) return;
    this.failure.set(null);
    this.googleBusy.set(true);
    this.google.requestAccessToken().subscribe((token) => {
      if (token.outcome === 'dismissed') {
        this.googleBusy.set(false);
        return;
      }
      if (token.outcome === 'failed') {
        this.googleBusy.set(false);
        this.failure.set('failed');
        return;
      }
      this.invitations.acceptWithGoogle(this.token, token.accessToken).subscribe((result) => {
        this.googleBusy.set(false);
        switch (result.outcome) {
          case 'joined':
            this.joined(result.session.displayName, invitation.teamName, invitation.accountExists);
            break;
          case 'expired':
            this.view.set({ kind: 'expired', managerName: result.managerName });
            break;
          default:
            this.failure.set(result.outcome);
        }
      });
    });
  }

  /** Signed out: joins with the address's account and its password (L2-058 AC2, AC3). */
  protected signInAndJoin(event: Event): void {
    event.preventDefault();
    const invitation = this.invitation();
    if (this.locked() || !invitation) return;
    this.joinFailure.set(null);
    this.failure.set(null);
    this.busy.set(true);
    this.invitations
      .signInAndJoin(this.token, this.accountPassword())
      .subscribe((result) => this.afterJoin(result, invitation));
  }

  /** Signed in as the invited address: joins with that account (L2-058 AC4). */
  protected joinSignedIn(): void {
    const invitation = this.invitation();
    if (this.busy() || !invitation) return;
    this.joinFailure.set(null);
    this.busy.set(true);
    this.invitations.join(this.token).subscribe((result) => this.afterJoin(result, invitation));
  }

  /** Someone else is signed in: sign out first (L2-058 AC5). */
  protected signOut(): void {
    this.dialogs.open<boolean>(SignOutDialog, '.dialog__footer .btn');
  }

  private afterJoin(result: JoinWithAccountResult, invitation: Invitation): void {
    this.busy.set(false);
    switch (result.outcome) {
      case 'joined':
        this.joined(result.session.displayName, invitation.teamName, true);
        break;
      case 'expired':
        this.view.set({ kind: 'expired', managerName: result.managerName });
        break;
      case 'wrong':
        this.joinFailure.set('wrong');
        break;
      default:
        this.joinFailure.set('failed');
    }
  }

  /** Shows "You're in", then opens the calendar. */
  private joined(displayName: string, teamName: string, existing = false): void {
    this.view.set({ kind: 'joined', firstName: displayName.split(' ')[0], teamName, existing });
    const timer = setTimeout(() => this.router.navigateByUrl('/'), SIGNED_IN_PAUSE_MS);
    this.destroyRef.onDestroy(() => clearTimeout(timer));
  }
}
