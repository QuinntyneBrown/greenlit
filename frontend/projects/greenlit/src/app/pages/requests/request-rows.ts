import { RequestSummary } from 'api';
import { RequestListItem, RequestState } from 'components';

import { dayLabel, rangeLabel } from '../calendar/request-toasts';

/** The status a ledger entry is shown with. */
export function stateOf(request: RequestSummary): RequestState {
  return request.status.toLowerCase() as RequestState;
}

/** "28 Sep", the day an instant falls on in the browser's zone. */
function instantDay(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return dayLabel(`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`);
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0];
}

/**
 * What the ledger shows for one request (pages/requests/default, approved and declined): who else is out
 * while it is pending, "Sent … · decided …" once it is decided, and the reason when the manager gave one.
 */
export function requestRow(request: RequestSummary): RequestListItem {
  const state = stateOf(request);
  const base = {
    id: request.id,
    name: request.memberName,
    summary: `${rangeLabel(request.firstDay, request.lastDay)} · ${request.days} ${request.days === 1 ? 'day' : 'days'}`,
    note: request.note,
    state,
  };
  if (state === 'pending') {
    return request.overlaps.length
      ? {
          ...base,
          metaIcon: true,
          meta: request.overlaps.map(
            (o) => `${firstName(o.memberName)} also out ${rangeLabel(o.firstDay, o.lastDay)}`,
          ),
        }
      : { ...base, meta: ['No overlaps'] };
  }
  if (state === 'declined' && request.declineReason) {
    return { ...base, meta: [`Reason: ${request.declineReason}`] };
  }
  const decided = request.decidedUtc ? ` · decided ${instantDay(request.decidedUtc)}` : '';
  return { ...base, meta: [`Sent ${instantDay(request.sentUtc)}${decided}`] };
}
