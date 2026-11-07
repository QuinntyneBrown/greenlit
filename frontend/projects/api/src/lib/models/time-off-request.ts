import { SheetCoverage, SheetMember } from './sheet-month';

/** What the request dialog collects (requests/send-request, L2-019 AC1). */
export interface NewRequest {
  /** `yyyy-MM-dd` */
  readonly firstDay: string;
  /** `yyyy-MM-dd`, on or after the first day. */
  readonly lastDay: string;
  readonly note?: string;
}

/** A request the API stored (POST /api/requests). */
export interface SentRequest {
  readonly id: string;
  readonly memberId: string;
  readonly memberName: string;
  readonly firstDay: string;
  readonly lastDay: string;
  /** Working days only: weekends and holidays are not counted. */
  readonly days: number;
  readonly note: string | null;
  readonly status: 'Pending' | 'Approved' | 'Declined' | 'Cancelled';
  /** When the member sent it (ISO 8601). */
  readonly sentUtc: string;
}

/** Another member who is out on some of a pending request's days. */
export interface RequestOverlap {
  readonly memberName: string;
  /** The first of their days among the request's, `yyyy-MM-dd`. */
  readonly firstDay: string;
  readonly lastDay: string;
}

/** A request in the manager's ledger (GET /api/requests): the one just sent plus how it was decided. */
export interface RequestSummary extends SentRequest {
  /** When the manager decided it (ISO 8601); null while pending. */
  readonly decidedUtc: string | null;
  /** Why it was declined, when the manager said. */
  readonly declineReason: string | null;
  /** While pending, the other members who are out on its days; otherwise empty. */
  readonly overlaps: readonly RequestOverlap[];
}

/** How many requests each tab of the ledger holds (GET /api/requests/counts). Declined includes Cancelled. */
export interface RequestCounts {
  readonly pending: number;
  readonly approved: number;
  readonly declined: number;
}

/** A request with the team for the weeks around it (GET /api/requests/{id}). */
export interface RequestDetail {
  readonly request: RequestSummary;
  /** Every member, one cell per day from the Monday of the first week to the Sunday of the last. */
  readonly members: readonly SheetMember[];
  /** The Out row for the working days of those weeks. */
  readonly coverage: readonly SheetCoverage[];
  /** The requester's days left once their requests are approved; negative when that takes them over. */
  readonly daysLeftAfter: number;
}

/** What approving one request did (POST /api/requests/approve), for the toast. */
export interface ApprovalResult {
  readonly requestId: string;
  readonly memberName: string;
  readonly firstDay: string;
  readonly lastDay: string;
  readonly days: number;
  /** The member was emailed; false when they have no address or the mail could not be sent. */
  readonly emailed: boolean;
  /** The team's coverage minimum; 0 means none. */
  readonly coverageMinimum: number;
  /** The first day of the request with fewer people in than the minimum (`yyyy-MM-dd`), else null. */
  readonly firstShortDate: string | null;
  /** How many people are in on `firstShortDate`. */
  readonly inOnShortDate: number | null;
}

/** What declining one request did (POST /api/requests/{id}/decline), for the toast. */
export interface DeclineResult {
  readonly requestId: string;
  readonly memberName: string;
  readonly firstDay: string;
  readonly lastDay: string;
  readonly days: number;
  /** The reason the manager gave, else null. */
  readonly reason: string | null;
  /** The member was emailed; false when they have no address or the mail could not be sent. */
  readonly emailed: boolean;
}

/** The working days a range would take (GET /api/requests/quote). */
export interface RequestQuote {
  readonly days: number;
  /** Days the caller can still request: days left minus what is already requested, never below zero. */
  readonly daysAvailable: number;
  /** How many days over their days left the caller's requests would be with these days added; 0 when not over. */
  readonly daysOver: number;
}
