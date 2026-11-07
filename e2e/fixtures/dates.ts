/**
 * Calendar dates for specs that add holidays. The e2e API reads "this year" from the real clock, so these are
 * worked out from it; a spec never hard-codes a year.
 */

export interface Day {
  /** `yyyy-MM-dd`. */
  iso: string;
  /** "Fri 27 Nov", as the calendar and the holiday list write it. */
  label: string;
  /** `yyyy-MM`, the calendar month it is in. */
  month: string;
  year: number;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The current year, as the API reads it. */
export function thisYear(): number {
  return new Date().getFullYear();
}

/** The first `weekday` (0 Sunday to 6 Saturday) on or after `month` (1-12) / `day` of `year`. */
export function onOrAfter(year: number, month: number, day: number, weekday: number): Day {
  const date = new Date(Date.UTC(year, month - 1, day));
  while (date.getUTCDay() !== weekday) date.setUTCDate(date.getUTCDate() + 1);
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  const iso = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return { iso, label: `${WEEKDAYS[date.getUTCDay()]} ${d} ${MONTHS[m]}`, month: iso.slice(0, 7), year: y };
}

/** A Friday for the viewport project, in its own month so projects never meet on a date (Fri 27 Nov for desktop). */
export function offsiteFor(project: string): Day {
  const month = { mobile: 9, tablet: 10, desktop: 11 }[project as "mobile"] ?? 9;
  return onOrAfter(thisYear(), month, 27, 5);
}

/** A Saturday in the project's own month. */
export function weekendFor(project: string): Day {
  const month = { mobile: 3, tablet: 4, desktop: 5 }[project as "mobile"] ?? 3;
  return onOrAfter(thisYear(), month, 1, 6);
}

/** A Wednesday in the project's own month (June, July, August), one per `slot` (0 to 3) so specs never meet on a date. */
export function wednesdayFor(project: string, slot: number): Day {
  const month = { mobile: 6, tablet: 7, desktop: 8 }[project as "mobile"] ?? 6;
  return onOrAfter(thisYear(), month, 1 + 7 * slot, 3);
}

/** The first Friday of February this year: a day working-days specs turn red, in a month no other spec paints. */
export function februaryFriday(): Day {
  return onOrAfter(thisYear(), 2, 1, 5);
}

/** Christmas Day of this year: a holiday every United Kingdom team made through the API holds. */
export function christmas(): Day {
  return onOrAfter(thisYear(), 12, 25, new Date(Date.UTC(thisYear(), 11, 25)).getUTCDay());
}
