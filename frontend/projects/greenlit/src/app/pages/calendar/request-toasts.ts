import { SentRequest } from 'api';
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
