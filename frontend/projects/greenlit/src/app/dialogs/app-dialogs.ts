import { Dialog as CdkDialog, DialogRef } from '@angular/cdk/dialog';
import { Overlay } from '@angular/cdk/overlay';
import { ComponentType } from '@angular/cdk/portal';
import { Injectable, DOCUMENT, inject } from '@angular/core';

/** Below this width a dialog is a sheet from the bottom edge (the mocks' `.dialog` at 40rem). */
const SHEET_QUERY = '(max-width: 39.99rem)';

/**
 * Opens the app's dialogs on the CDK Dialog (docs/design-system/components/dialog.html): the
 * `role="dialog"` container with `aria-modal`, the backdrop, the focus trap, Esc, and focus back
 * on the button that opened it. Every dialog titles itself `dlg-title` and describes itself
 * `dlg-title-desc`, as the mocks do. On a phone it sits at the bottom edge, elsewhere in the middle.
 */
@Injectable({ providedIn: 'root' })
export class AppDialogs {
  private readonly dialog = inject(CdkDialog);
  private readonly overlay = inject(Overlay);
  private readonly document = inject(DOCUMENT);

  /**
   * Opens `component`; the result is what the dialog passes to `close`.
   * `autoFocus` is a CSS selector for the control that takes focus first.
   */
  open<R>(component: ComponentType<unknown>, autoFocus: string): DialogRef<R> {
    const sheet = this.document.defaultView?.matchMedia(SHEET_QUERY).matches ?? false;
    const position = this.overlay.position().global().centerHorizontally();
    return this.dialog.open<R>(component, {
      ariaLabelledBy: 'dlg-title',
      ariaDescribedBy: 'dlg-title-desc',
      autoFocus,
      restoreFocus: true,
      panelClass: 'gl-dialog-pane',
      backdropClass: 'gl-backdrop',
      width: sheet ? '100%' : '32rem',
      maxWidth: '100vw',
      positionStrategy: sheet ? position.bottom() : position.centerVertically(),
    });
  }
}
