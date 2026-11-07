import { ApprovalResult, SentRequest } from 'api';
import { ToastRequest } from '../../toasts/toast.service';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function part(iso: string): { day: number; month: string } {
  return { day: Number(iso.slice(8, 10)), month: MONTHS[Number(iso.slice(5, 7)) - 1] };
}

/** "7–11 Dec", "30 Nov–4 Dec" or "7 Dec" (the mocks' range style). */
export function rangeLabel(firstDay: string, lastDay: string): string {
  const a = part(firstDay);
  const b = part(lastDay);
  if (firstDay === lastDay) return `${a.day} ${a.month}`;
  return a.month === b.month
    ? `${a.day}–${b.day} ${b.month}`
    : `${a.day} ${a.month}–${b.day} ${b.month}`;
}

/** A sent request (notifications/request-toast/success, L2-019 AC5). */
export function requestSentToast(
  request: SentRequest,
  managerName: string,
): Pick<ToastRequest, 'tone' | 'title' | 'body'> {
  return {
    tone: 'success',
    title: 'Request sent',
    body: `${managerName} will be asked to approve ${rangeLabel(request.firstDay, request.lastDay)}.`,
  };
}

/** "18 Nov" */
export function dayLabel(iso: string): string {
  const p = part(iso);
  return `${p.day} ${p.month}`;
}

/** "3 Nov 2026", the day a request was sent (an ISO 8601 instant, read in the browser's zone). */
export function sentLabel(iso: string): string {
  const date = new Date(iso);
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0];
}

/**
 * An approval (notifications/request-toast/success and warning, L2-024 AC2, L2-042 AC2). When the
 * approval leaves too few people in on a day it says so in place of the plain confirmation; the
 * approval stands either way.
 */
export function approvedToast(
  result: ApprovalResult,
  undo: () => void,
): Pick<ToastRequest, 'tone' | 'title' | 'body' | 'action'> {
  const action = { label: 'Undo', run: undo };
  if (result.firstShortDate && result.inOnShortDate !== null) {
    const people =
      result.inOnShortDate === 1 ? '1 person will be' : `${result.inOnShortDate} people will be`;
    return {
      tone: 'warning',
      title: `Approved, but only ${people} in on ${dayLabel(result.firstShortDate)}`,
      body: `That’s below your minimum of ${result.coverageMinimum}.`,
      action,
    };
  }
  const name = firstName(result.memberName);
  const range = rangeLabel(result.firstDay, result.lastDay);
  return {
    tone: 'success',
    title: `Approved ${name}’s time off`,
    body: result.emailed
      ? `${range} is green on the calendar and ${name} has been emailed.`
      : `${range} is green on the calendar.`,
    action,
  };
}

/** The approval did not go through (notifications/request-toast/danger, L2-024 AC4). */
export function approveFailedToast(
  memberName: string,
  retry: () => void,
): Pick<ToastRequest, 'tone' | 'title' | 'body' | 'action'> {
  return {
    tone: 'danger',
    title: `We couldn’t approve ${firstName(memberName)}’s request`,
    body: 'It’s still pending. Check your connection and try again.',
    action: { label: 'Try again', run: retry },
  };
}

/** Undo did not go through; the approval stands. */
export function undoFailedToast(
  memberName: string,
  retry: () => void,
): Pick<ToastRequest, 'tone' | 'title' | 'body' | 'action'> {
  return {
    tone: 'danger',
    title: 'We couldn’t undo that',
    body: `${firstName(memberName)}’s time off is still approved. Check your connection and try again.`,
    action: { label: 'Try again', run: retry },
  };
}

/**
 * Several requests approved together (notifications/request-toast/bulk, L2-026 AC3): one summary in
 * place of one toast each. As with a single approval, a day left short is said in its place (L2-042 AC2).
 */
export function bulkApprovedToast(
  results: readonly ApprovalResult[],
  undo: () => void,
): Pick<ToastRequest, 'tone' | 'title' | 'body' | 'action'> {
  const action = { label: 'Undo', run: undo };
  const count = results.length;
  const short = results
    .filter((r) => r.firstShortDate !== null && r.inOnShortDate !== null)
    .sort((a, b) => (a.firstShortDate ?? '').localeCompare(b.firstShortDate ?? ''))[0];
  if (short?.firstShortDate && short.inOnShortDate !== null) {
    const people =
      short.inOnShortDate === 1 ? '1 person will be' : `${short.inOnShortDate} people will be`;
    return {
      tone: 'warning',
      title: `Approved ${count} requests, but only ${people} in on ${dayLabel(short.firstShortDate)}`,
      body: `That’s below your minimum of ${short.coverageMinimum}.`,
      action,
    };
  }
  return {
    tone: 'success',
    title: `Approved ${count} requests`,
    body: results.every((r) => r.emailed)
      ? 'Their days are green on the calendar and everyone has been emailed.'
      : 'Their days are green on the calendar.',
    action,
  };
}

/** None of the ticked requests was approved (all or nothing). */
export function bulkApproveFailedToast(
  count: number,
  retry: () => void,
): Pick<ToastRequest, 'tone' | 'title' | 'body' | 'action'> {
  return {
    tone: 'danger',
    title: `We couldn’t approve ${count} requests`,
    body: 'They’re still pending. Check your connection and try again.',
    action: { label: 'Try again', run: retry },
  };
}

/** Undo of a bulk approval stopped part-way; the ones not yet reopened stay approved. */
export function bulkUndoFailedToast(
  retry: () => void,
): Pick<ToastRequest, 'tone' | 'title' | 'body' | 'action'> {
  return {
    tone: 'danger',
    title: 'We couldn’t undo that',
    body: 'Some of that time off is still approved. Check your connection and try again.',
    action: { label: 'Try again', run: retry },
  };
}
