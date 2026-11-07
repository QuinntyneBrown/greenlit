import { ChangeDetectionStrategy, Component, DOCUMENT, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

import { SkipLink } from 'components';

/**
 * Marketing site shell: the skip link and one `main#main` around the router
 * outlet. `page` from the active route's data is stamped on `<body data-page>`,
 * the same contract the Greenlit app's shell keeps, so one e2e page object
 * serves the mock and the site. The site must not import the app project, so
 * the small stamping routine lives here.
 */
@Component({
  selector: 'mk-root',
  imports: [RouterOutlet, SkipLink],
  template: `
    <gl-skip-link />
    <main id="main" class="mk">
      <router-outlet />
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly document = inject(DOCUMENT);

  private readonly page = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => this.readPage()),
      startWith(''),
    ),
    { initialValue: '' },
  );

  constructor() {
    effect(() => {
      const page = this.page();
      const body = this.document.body;
      if (page) body.dataset['page'] = page;
      else delete body.dataset['page'];
    });
  }

  private readPage(): string {
    let route = this.activatedRoute;
    while (route.firstChild) route = route.firstChild;
    const merged = Object.assign({}, ...route.pathFromRoot.map((r) => r.snapshot.data)) as Record<
      string,
      unknown
    >;
    const page = merged['page'];
    return typeof page === 'string' ? page : '';
  }
}
