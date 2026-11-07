import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  computed,
  effect,
  inject,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

import { AppNav, AppNavItem, SkipLink, TopBar } from 'components';

import { RequestCountsState } from './requests/request-counts';
import { ToastOutlet } from './toasts/toast-outlet';

/**
 * Application shell.
 *
 * Renders the chrome once, driven by route data merged along the active
 * route's ancestry:
 *
 * - `shell: 'app'` (default): the signed-in app chrome around `<main>`.
 * - `shell: 'bare'`: auth pages own the whole viewport.
 *
 * `page` is the slug stamped on `<body data-page>` (the e2e anchor). The one
 * outlet stays mounted while the chrome toggles so routed components are never
 * constructed twice.
 */

export type AppShell = 'app' | 'bare';

interface ShellData {
  readonly shell: AppShell;
  readonly page: string;
}

const DEFAULT_SHELL: ShellData = { shell: 'app', page: '' };

/** The four destinations of the main navigation, in mock order (L2-049). */
export const MAIN_NAV: readonly AppNavItem[] = [
  { label: 'Calendar', link: '/', exact: true },
  { label: 'Year', link: '/year' },
  { label: 'Requests', link: '/requests' },
  { label: 'Settings', link: '/settings' },
];

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SkipLink, TopBar, AppNav, ToastOutlet],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly document = inject(DOCUMENT);

  private readonly shellData = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => this.readShellData()),
      startWith(DEFAULT_SHELL),
    ),
    { initialValue: DEFAULT_SHELL },
  );

  protected readonly shell = computed(() => this.shellData().shell);
  private readonly requestCounts = inject(RequestCountsState);

  /** The main navigation; Requests carries the manager's pending count (L2-022 AC8). */
  protected readonly mainNav = computed<readonly AppNavItem[]>(() =>
    MAIN_NAV.map((item) =>
      item.link === '/requests' ? { ...item, badge: this.requestCounts.pending() } : item,
    ),
  );

  constructor() {
    effect(() => {
      const data = this.shellData();
      const body = this.document.body;
      body.dataset['shell'] = data.shell;
      if (data.page) body.dataset['page'] = data.page;
      else delete body.dataset['page'];
    });
    // The pending count follows the person around: read again after every navigation inside the app.
    effect(() => {
      if (this.shellData().shell === 'app') untracked(() => this.requestCounts.refresh());
    });
  }

  private readShellData(): ShellData {
    let route = this.activatedRoute;
    while (route.firstChild) route = route.firstChild;
    const merged = Object.assign({}, ...route.pathFromRoot.map((r) => r.snapshot.data)) as Record<
      string,
      unknown
    >;
    const shell = merged['shell'];
    const page = merged['page'];
    return {
      shell: shell === 'bare' ? 'bare' : 'app',
      page: typeof page === 'string' ? page : '',
    };
  }
}
