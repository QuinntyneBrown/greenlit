import { Injectable } from '@angular/core';

/** A week of a month on the phone calendar: the month (`yyyy-MM`) and the index of its week. */
export interface WeekPlace {
  readonly month: string;
  readonly week: number;
}

/**
 * The week the phone calendar last showed (docs/detailed-designs/sheet/phone-week). A team switch builds the
 * calendar again for the new team; it opens this week instead of today's when the month is the same (L2-063 AC16).
 */
@Injectable({ providedIn: 'root' })
export class PhoneWeekPlace {
  private place: WeekPlace | null = null;

  remember(place: WeekPlace): void {
    this.place = place;
  }

  last(): WeekPlace | null {
    return this.place;
  }
}
