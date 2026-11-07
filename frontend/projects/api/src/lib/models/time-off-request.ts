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
}

/** The working days a range would take (GET /api/requests/quote). */
export interface RequestQuote {
  readonly days: number;
}
