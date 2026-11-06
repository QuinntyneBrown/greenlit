import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * The team's time-off sheet: one month at a time, members down the side,
 * weekday initials and day numbers across the top. Lands with its
 * requirement, detailed design and mock (see AGENTS.md).
 */
@Component({
  selector: 'app-sheet-page',
  templateUrl: './sheet.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetPage {}
