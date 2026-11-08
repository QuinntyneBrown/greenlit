import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { ManagedTeam, SESSION_STORE, TEAM_SERVICE } from 'api';

import { ToastService } from '../toasts/toast.service';
import { TeamSwitchReuseStrategy } from './team-switch-reuse-strategy';

/** What is in flight: a switch or a default change for one team. */
export interface TeamsBusy {
  readonly teamId: string;
  readonly action: 'switch' | 'default';
}

/** Screens that belong to one team's person: after a switch they give way to the calendar (L2-054 AC11). */
const PER_PERSON = /^\/(people\/[^/?#]+|person)(?=$|[?#])/;

export type ManagedTeamsLoad =
  | { readonly state: 'loading' }
  | { readonly state: 'ready'; readonly teams: readonly ManagedTeam[] }
  | { readonly state: 'error' };

/**
 * The teams the signed-in person belongs to (docs/detailed-designs/teams/switch-team, L2-054, L2-056, ADR-015), shared
 * by Settings → Your teams (the managed ones) and the header team switcher (all of them). Read again on demand by any
 * session that names a team.
 */
@Injectable({ providedIn: 'root' })
export class ManagedTeamsState {
  private readonly teamService = inject(TEAM_SERVICE);
  private readonly session = inject(SESSION_STORE);
  private readonly router = inject(Router);
  private readonly reuse = inject(TeamSwitchReuseStrategy);
  private readonly toasts = inject(ToastService);

  readonly load = signal<ManagedTeamsLoad>({ state: 'loading' });
  /** The switch or default change in flight; null when none. */
  readonly busy = signal<TeamsBusy | null>(null);

  /** The teams once read; empty while loading, after a failure and for a person on no team. */
  readonly teams = computed(() => {
    const load = this.load();
    return load.state === 'ready' ? load.teams : [];
  });

  readonly active = computed(() => this.teams().find((t) => t.active) ?? null);

  /** The teams the person manages: what "Your teams" lists, and whether the switcher offers to add and manage teams. */
  readonly managed = computed(() => this.teams().filter((t) => t.manages));

  /** "Your teams" as a load of the managed teams only (L2-054 AC7). */
  readonly managedLoad = computed<ManagedTeamsLoad>(() => {
    const load = this.load();
    return load.state === 'ready'
      ? { state: 'ready', teams: load.teams.filter((t) => t.manages) }
      : load;
  });

  private loadedFor: string | null = null;

  /**
   * Reads the teams. `quiet` keeps what is on screen while it reads again (after a navigation or a change); without
   * it the reader sees the loading state, as on a first visit or after "Try again".
   */
  refresh(quiet = false): void {
    const token = this.session.isSignedIn() && this.session.teamId() ? this.session.token() : null;
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

  /**
   * Makes `team` the active team (L2-054 AC3): the session is replaced, the current screen is built again for the
   * new team (a person page gives way to the calendar) and a toast says so. A failure changes nothing and says so
   * with "Try again" (AC9).
   */
  switchTo(team: Pick<ManagedTeam, 'id' | 'name' | 'active'>): void {
    if (this.busy() !== null || team.active) return;
    const before = this.active();
    this.busy.set({ teamId: team.id, action: 'switch' });
    this.teamService.switchTo(team.id).subscribe(async (result) => {
      if (!result.ok) {
        this.busy.set(null);
        this.toasts.show({
          tone: 'danger',
          title: 'We couldn’t switch teams',
          body: before
            ? `You’re still on ${before.name}. Check your connection and try again.`
            : 'Nothing was changed. Check your connection and try again.',
          action: { label: 'Try again', run: () => this.switchTo(team) },
        });
        return;
      }
      this.markActive(team.id);
      const url = this.router.url;
      this.reuse.remountNext();
      try {
        await this.router.navigateByUrl(PER_PERSON.test(url) ? '/' : url, {
          onSameUrlNavigation: 'reload',
        });
      } finally {
        this.reuse.done();
        this.busy.set(null);
      }
      this.refresh(true);
      this.toasts.show({
        tone: 'success',
        title: `Switched to ${team.name}`,
        body: `The calendar, year, requests and settings now show ${team.name}.`,
      });
    });
  }

  /**
   * Makes `team` the one sign-in opens (L2-054 AC4): the Default mark moves and a toast says so; the active team does
   * not change. A failure keeps the mark where it was and says so with "Try again" (AC9).
   */
  makeDefault(team: ManagedTeam): void {
    if (this.busy() !== null || team.isDefault) return;
    const before = this.teams().find((t) => t.isDefault) ?? null;
    this.busy.set({ teamId: team.id, action: 'default' });
    this.teamService.makeDefault(team.id).subscribe((result) => {
      this.busy.set(null);
      if (!result.ok) {
        this.toasts.show({
          tone: 'danger',
          title: 'We couldn’t change your default',
          body: before
            ? `${before.name} is still your default. Check your connection and try again.`
            : 'Nothing was changed. Check your connection and try again.',
          action: { label: 'Try again', run: () => this.makeDefault(team) },
        });
        return;
      }
      const load = this.load();
      if (load.state === 'ready')
        this.load.set({
          state: 'ready',
          teams: load.teams.map((t) => ({ ...t, isDefault: t.id === team.id })),
        });
      this.toasts.show({
        tone: 'info',
        title: `${team.name} is now your default`,
        body: 'Greenlit opens it when you sign in.',
      });
    });
  }

  /** Shows `teamId` as the active team at once, before the list is read again. */
  private markActive(teamId: string): void {
    const load = this.load();
    if (load.state !== 'ready') return;
    this.load.set({
      state: 'ready',
      teams: load.teams.map((t) => ({ ...t, active: t.id === teamId })),
    });
  }
}
