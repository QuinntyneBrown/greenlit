import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { CONNECTIVITY_SERVICE } from 'api';
import { Alert } from 'components';

/**
 * The connection banner at the top of every page (L2-045): the shell renders it once. It says what the
 * connection is doing; the banner for "online" is no banner at all.
 */
@Component({
  selector: 'app-connection-banner',
  imports: [Alert],
  template: `
    @if (state() === 'offline') {
      <gl-alert [banner]="true" tone="warning" glyph="offline" title="You’re offline">
        You can look at the calendar, but changes can’t be saved until you’re back.
      </gl-alert>
    }
  `,
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectionBanner {
  private readonly connectivity = inject(CONNECTIVITY_SERVICE);
  protected readonly state = computed(() => this.connectivity.state());
}
