import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type InlineMessageTone = 'neutral' | 'success' | 'danger';

/**
 * Inline message (docs/design-system/components/inline-message.html): a short
 * saved or failed status next to the thing it describes, such as "Password
 * updated". Announced politely through `role="status"`; the icon is
 * decorative and the text always says the outcome.
 *
 * Field help and field errors belong to the form field and arrive with it.
 */
@Component({
  selector: 'gl-inline-message',
  host: { style: 'display: contents' },
  template: `
    <span class="inline-status" [class]="'inline-status inline-status--' + tone()" role="status">
      @switch (tone()) {
        @case ('success') {
          <svg class="icon icon--sm" aria-hidden="true" viewBox="0 0 24 24">
            <path d="M4 12l6 6L20 6" />
          </svg>
        }
        @case ('danger') {
          <svg class="icon icon--sm" aria-hidden="true" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16h.01" />
          </svg>
        }
      }
      <ng-content />
    </span>
  `,
  styles: `
    .inline-status {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      font: var(--text-body-sm);
      color: var(--color-fg-muted);
    }
    .inline-status--success {
      color: var(--color-success-fg);
    }
    .inline-status--danger {
      color: var(--color-danger-fg);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InlineMessage {
  readonly tone = input<InlineMessageTone>('neutral');
}
