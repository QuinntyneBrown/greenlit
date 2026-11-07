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

/** A request in the manager's list (GET /api/requests): the same shape as the one just sent. */
export type RequestSummary = SentRequest;

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

/** The working days a range would take (GET /api/requests/quote). */
export interface RequestQuote {
  readonly days: number;
}
