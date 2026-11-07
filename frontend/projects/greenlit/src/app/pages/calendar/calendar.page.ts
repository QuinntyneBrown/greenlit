import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * The team calendar, Greenlit's home screen (L2-049): one month for the whole
 * team. Its grid, toolbar and states arrive with journey 1
 * (docs/detailed-designs/sheet/view-month); until then the screen is the app
 * chrome around an empty frame.
 */
@Component({
  selector: 'app-calendar-page',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarPage {}
