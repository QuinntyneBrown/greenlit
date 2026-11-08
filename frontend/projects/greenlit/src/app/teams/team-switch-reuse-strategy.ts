import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, BaseRouteReuseStrategy } from '@angular/router';

/**
 * Angular's default route reuse, except for the one navigation after a team switch (teams/switch-team): then no
 * route is reused, so the screen is built again and reads its data under the new session. The old team's data is
 * never shown under the new team's name.
 */
@Injectable({ providedIn: 'root' })
export class TeamSwitchReuseStrategy extends BaseRouteReuseStrategy {
  private remount = false;

  /** The next navigation builds every screen again; `done()` returns to normal reuse. */
  remountNext(): void {
    this.remount = true;
  }

  done(): void {
    this.remount = false;
  }

  /** The router's root (no route config) is always kept: the app shell reads the route tree from it. */
  override shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    if (this.remount && future.routeConfig !== null) return false;
    return super.shouldReuseRoute(future, curr);
  }
}
