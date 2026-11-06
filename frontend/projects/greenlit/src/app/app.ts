import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  computed,
  effect,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

import { SkipLink } from 'components';

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

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SkipLink],
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

  constructor() {
    effect(() => {
      const data = this.shellData();
      const body = this.document.body;
      body.dataset['shell'] = data.shell;
      if (data.page) body.dataset['page'] = data.page;
      else delete body.dataset['page'];
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
