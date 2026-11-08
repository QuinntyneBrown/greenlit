import { Injectable, computed, inject, signal } from '@angular/core';

import { ManagedTeam, SESSION_STORE, TEAM_SERVICE } from 'api';

export type ManagedTeamsLoad =
  | { readonly state: 'loading' }
  | { readonly state: 'ready'; readonly teams: readonly ManagedTeam[] }
  | { readonly state: 'error' };

/**
 * The teams the signed-in manager manages (docs/detailed-designs/teams/switch-team, L2-054), shared by Settings →
 * Your teams and the header team switcher. Read again on demand; a member's session never asks.
 */
@Injectable({ providedIn: 'root' })
export class ManagedTeamsState {
  private readonly teamService = inject(TEAM_SERVICE);
  private readonly session = inject(SESSION_STORE);

  readonly load = signal<ManagedTeamsLoad>({ state: 'loading' });

  /** The teams once read; empty while loading, after a failure and for anyone who manages none. */
  readonly teams = computed(() => {
    const load = this.load();
    return load.state === 'ready' ? load.teams : [];
  });

  readonly active = computed(() => this.teams().find((t) => t.active) ?? null);

  private loadedFor: string | null = null;

  /**
   * Reads the teams. `quiet` keeps what is on screen while it reads again (after a navigation or a change); without
   * it the reader sees the loading state, as on a first visit or after "Try again".
   */
  refresh(quiet = false): void {
    const token =
      this.session.isSignedIn() && this.session.isManager() ? this.session.token() : null;
    if (token === null) {
      this.loadedFor = null;
      this.load.set({ state: 'ready', teams: [] });
      return;
    }
    if (!quiet || token !== this.loadedFor) this.load.set({ state: 'loading' });
    this.loadedFor = token;
    this.teamService.mine().subscribe({
      next: (teams) => {
        if (this.loadedFor === token) this.load.set({ state: 'ready', teams });
      },
      error: () => {
        if (this.loadedFor === token) this.load.set({ state: 'error' });
      },
    });
  }
}
