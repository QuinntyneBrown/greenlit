import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { Toast } from 'components';

import { ActiveToast, ToastService } from './toast.service';

/**
 * Where toasts appear (docs/design-system/components/toast.html): one live
 * region at the foot of the viewport, rendered once by the app shell. Calm
 * messages are announced politely; a danger toast announces itself as an alert.
 */
@Component({
  selector: 'app-toast-outlet',
  imports: [Toast],
  template: `
    <div class="toast-region" role="status" aria-live="polite">
      @for (toast of toasts.toasts(); track toast.id) {
        <div
          (mouseenter)="toasts.pause(toast.id)"
          (mouseleave)="toasts.resume(toast.id)"
          (focusin)="toasts.pause(toast.id)"
          (focusout)="toasts.resume(toast.id)"
        >
          <gl-toast
            [tone]="toast.tone"
            [title]="toast.title"
            [text]="toast.body ?? ''"
            [action]="toast.action?.label ?? ''"
            [timed]="toast.timed"
            [paused]="toast.paused"
            (acted)="act(toast)"
            (dismissed)="toasts.dismiss(toast.id)"
          />
        </div>
      }
    </div>
  `,
  styles: `
    .toast-region {
      position: fixed;
      z-index: var(--z-toast);
      bottom: var(--space-4);
      left: var(--space-4);
      right: var(--space-4);
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      pointer-events: none;
    }
    @media (min-width: 40rem) {
      .toast-region {
        left: auto;
        width: 24rem;
        bottom: var(--space-6);
        right: var(--space-6);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastOutlet {
  protected readonly toasts = inject(ToastService);

  /** The action closes the toast first, then runs. */
  protected act(toast: ActiveToast): void {
    this.toasts.dismiss(toast.id);
    toast.action?.run();
  }
}
