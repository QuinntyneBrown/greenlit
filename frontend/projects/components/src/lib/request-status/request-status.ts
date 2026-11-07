import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type RequestState = 'pending' | 'approved' | 'declined' | 'cancelled';

const LABELS: Record<RequestState, string> = {
  pending: 'Pending',
  approved: 'Approved',
  declined: 'Declined',
  cancelled: 'Cancelled',
};

/**
 * Where a request stands (docs/design-system/components/request-row.html): a dot in the
 * request's colour and its name. The word carries the meaning; the dot only reinforces it.
 */
@Component({
  selector: 'gl-request-status',
  host: { style: 'display: contents' },
  template: `<span class="req-status" [attr.data-request]="state()">{{ label() }}</span>`,
  styles: `
    .req-status {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      font: var(--text-caption);
      font-weight: var(--font-weight-medium);
      color: var(--color-fg-muted);
      white-space: nowrap;
    }
    .req-status::before {
      content: '';
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 50%;
      background: var(--dot, var(--color-border-strong));
    }
    .req-status[data-request='pending'] {
      --dot: var(--color-status-requested);
    }
    .req-status[data-request='approved'] {
      --dot: var(--color-status-confirmed);
    }
    .req-status[data-request='declined'] {
      --dot: var(--color-status-off);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequestStatus {
  readonly state = input.required<RequestState>();

  protected readonly label = computed(() => LABELS[this.state()]);
}
