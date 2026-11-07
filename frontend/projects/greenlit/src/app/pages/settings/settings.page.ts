import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith, switchMap } from 'rxjs';

import { SHEET_SERVICE, SheetMonth } from 'api';
import { Button, EmptyState, MemberList, MemberListItem, Skeleton } from 'components';

import { AppDialogs } from '../../dialogs/app-dialogs';
import { InviteMemberDialog } from '../../dialogs/invite-member/invite-member.dialog';

type Load =
  | { readonly state: 'loading' }
  | { readonly state: 'ready'; readonly sheet: SheetMonth }
  | { readonly state: 'error' };

/**
 * Settings (pages/settings/default). Journey 5 builds the Team section far enough to invite
 * people from it (docs/detailed-designs/teams/invite-member): who is on the team, and for a
 * manager "Invite a member". Team name, time zone, roles, yearly days and "Save changes" are
 * journey 18 (L2-009), and the other four sections come with theirs.
 */
@Component({
  selector: 'app-settings-page',
  imports: [Button, EmptyState, MemberList, Skeleton],
  template: `
    <h1>Settings</h1>
    <section id="team" class="settings-section" aria-labelledby="team-title">
      <h2 id="team-title" class="section-title">Team</h2>
      @switch (load().state) {
        @case ('error') {
          <div class="card-plain">
            <gl-empty-state
              tone="error"
              title="We couldn’t load your settings"
              text="Something went wrong on our side. Nothing was changed."
            >
              <svg slot="icon" class="icon icon--lg" aria-hidden="true" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5M12 16h.01" />
              </svg>
              <gl-button slot="actions" (click)="retry()">Try again</gl-button>
            </gl-empty-state>
          </div>
        }
        @case ('ready') {
          <p>
            Everyone who appears on the calendar. Managers can approve requests and edit any row.
          </p>
          @if (!isManager()) {
            <p class="note">
              Only managers can change team settings. Ask {{ managerName() }} if something needs
              updating.
            </p>
          }
          <gl-member-list label="Team members" [members]="members()" />
          @if (isManager()) {
            <div class="actions">
              <gl-button (click)="invite()">
                <svg class="icon" aria-hidden="true" viewBox="0 0 24 24">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Invite a member
              </gl-button>
            </div>
          }
        }
        @default {
          <gl-skeleton />
        }
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    h1 {
      margin-bottom: var(--space-6);
    }
    .section-title {
      margin-bottom: var(--space-2);
    }
    section > p {
      margin-bottom: var(--space-4);
    }
    .note {
      color: var(--color-fg-muted);
    }
    .actions {
      margin-top: var(--space-4);
    }
    .card-plain {
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-md);
      background: var(--color-bg-surface);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {
  private readonly sheet = inject(SHEET_SERVICE);
  private readonly dialogs = inject(AppDialogs);
  private readonly attempt = signal(0);

  protected readonly load = toSignal(
    toObservable(this.attempt).pipe(
      switchMap((attempt) => {
        const month = this.sheet.month().pipe(
          map((sheet): Load => ({ state: 'ready', sheet })),
          catchError(() => of<Load>({ state: 'error' })),
        );
        // The first load shows the skeleton; a reload after inviting keeps the list on screen.
        return attempt === 0 ? month.pipe(startWith<Load>({ state: 'loading' })) : month;
      }),
    ),
    { initialValue: { state: 'loading' } as Load },
  );

  private readonly ready = computed(() => {
    const load = this.load();
    return load.state === 'ready' ? load.sheet : null;
  });

  protected readonly isManager = computed(() => this.ready()?.isManager ?? false);
  protected readonly managerName = computed(() => this.ready()?.managerName ?? '');

  /** Rows in the sheet's display order. */
  protected readonly members = computed<MemberListItem[]>(() =>
    (this.ready()?.members ?? []).map((m) => ({ name: m.name })),
  );

  protected retry(): void {
    this.attempt.update((n) => n + 1);
  }

  protected invite(): void {
    this.dialogs.open<boolean>(InviteMemberDialog, '#im-name').closed.subscribe((invited) => {
      if (invited) this.retry();
    });
  }
}
