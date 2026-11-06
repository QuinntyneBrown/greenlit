/**
 * The colour a day carries in the sheet. Mirrors `Greenlit.Domain.Enums.DayStatus`
 * (serialised as strings by the API).
 *
 * - `tentative`: blue, pencilled in, not yet requested.
 * - `requested`: yellow, waiting on the manager.
 * - `confirmed`: green, confirmed time off.
 *
 * Weekends and holidays (red) are not member statuses: they belong to the team.
 */
export type DayStatus = 'Tentative' | 'Requested' | 'Confirmed';
