import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { CONNECTIVITY_SERVICE } from 'api';
import { Alert, Button } from 'components';

/**
 * The connection banner at the top of every page (L2-045): the shell renders it once. It says what the
 * connection is doing; the banner for "online" is no banner at all.
 */
@Component({
  selector: 'app-connection-banner',
  imports: [Alert, Button],
  template: `
    @switch (state()) {
      @case ('offline') {
        <gl-alert [banner]="true" tone="warning" glyph="offline" title="You’re offline">
          You can look at the calendar, but changes can’t be saved until you’re back.
        </gl-alert>
      }
      @case ('reconnecting') {
        <gl-alert [banner]="true" tone="info" glyph="reconnecting" title="Reconnecting…">
          Hang on while we check your connection.
        </gl-alert>
      }
      @case ('unstable') {
        <gl-alert
          [banner]="true"
          tone="warning"
          title="Your connection is unstable"
          [dismissible]="true"
          (dismissed)="connectivity.dismiss()"
        >
          Changes may take a moment to save.
        </gl-alert>
      }
      @case ('sync-failed') {
        <gl-alert [banner]="true" tone="danger" title="We couldn’t sync the latest changes">
          You’re looking at the calendar as of {{ lastSync() }}.
          <gl-button slot="actions" size="sm" (click)="connectivity.retry()">
            <svg class="icon" aria-hidden="true" viewBox="0 0 24 24">
              <path d="M20 11a8 8 0 0 0-14-4L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4l2-2M20 20v-5h-5" />
            </svg>
            Retry
          </gl-button>
        </gl-alert>
      }
      @case ('back-online') {
        <gl-alert
          [banner]="true"
          tone="success"
          title="You’re back online"
          [dismissible]="true"
          (dismissed)="connectivity.dismiss()"
        >
          Everything is up to date.
        </gl-alert>
      }
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
  protected readonly connectivity = inject(CONNECTIVITY_SERVICE);
  protected readonly state = computed(() => this.connectivity.state());

  /** The last good answer as "10:42": 24-hour hours and minutes in the browser's time zone. */
  protected readonly lastSync = computed(() => {
    const at = this.connectivity.lastSync();
    return `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
  });
}
