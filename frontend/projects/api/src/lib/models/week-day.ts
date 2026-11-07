/** A weekday as the API spells it (teams/working-days). */
export type WeekDay = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export const WEEK_DAYS: readonly WeekDay[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Day numbers, Monday as 1 to Sunday as 7, for the weekday names. */
export function weekDayNumbers(days: readonly WeekDay[]): number[] {
  return days.map((d) => WEEK_DAYS.indexOf(d) + 1).sort((a, b) => a - b);
}

/** The weekday names for day numbers, in week order. */
export function weekDayNames(numbers: readonly number[]): WeekDay[] {
  return WEEK_DAYS.filter((_, i) => numbers.includes(i + 1));
}
