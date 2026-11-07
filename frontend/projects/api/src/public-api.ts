/*
 * Public API Surface of api
 *
 * Two kinds of exports live here:
 *
 *   1. CONTRACTS: interfaces + injection tokens (one pair per service).
 *      Pages depend ONLY on these. They define WHAT a service does without
 *      committing to HOW.
 *
 *   2. IMPLEMENTATIONS: concrete classes that satisfy the contracts. The host
 *      application wires `{ provide: TOKEN, useExisting: ConcreteClass }` in
 *      its composition root; consumers never import the classes directly.
 *
 * View models live in `lib/models/` (one type per file). DTO files
 * (`*.dto.ts`) are service-internal and not re-exported. Pure helpers live in
 * `lib/api/` so pages share one implementation.
 */

export * from './lib/api/api-base-url';
export * from './lib/api/session-token';

// Models
export * from './lib/models/day-status';
export * from './lib/models/allowance-figures';
export * from './lib/models/sheet-month';
export * from './lib/models/change-set';
export * from './lib/models/session';
export * from './lib/models/account';
export * from './lib/models/new-team';
export * from './lib/models/invited-member';
export * from './lib/models/invitation';
export * from './lib/models/time-off-request';
export * from './lib/models/team-holidays';
export * from './lib/models/week-day';
export * from './lib/models/year';
export * from './lib/models/person';

// Service contracts (interface + InjectionToken)
export * from './lib/api/session-store';
export * from './lib/api/account.service';
export * from './lib/api/auth.service';
export * from './lib/api/sheet.service';
export * from './lib/api/team.service';
export * from './lib/api/invitation.service';
export * from './lib/api/request.service';
export * from './lib/api/holiday.service';
export * from './lib/api/working-days.service';
export * from './lib/api/team-settings.service';
export * from './lib/models/team-settings';
export * from './lib/api/coverage.service';
export * from './lib/api/notifications.service';
export * from './lib/api/year.service';
export * from './lib/api/person.service';
export * from './lib/api/connectivity.service';
export * from './lib/api/connectivity.interceptor';
export * from './lib/api/auth.interceptor';
export * from './lib/api/session-expired.interceptor';
export * from './lib/api/server-error.interceptor';

// Concrete implementations (imported only by composition roots)
export * from './lib/api/local-storage-session-store';
export * from './lib/api/http-sheet.service';
export * from './lib/api/browser-connectivity.service';
export * from './lib/api/http-account.service';
export * from './lib/api/http-auth.service';
export * from './lib/api/http-team.service';
export * from './lib/api/http-invitation.service';
export * from './lib/api/http-request.service';
export * from './lib/api/http-holiday.service';
export * from './lib/api/http-working-days.service';
export * from './lib/api/http-team-settings.service';
export * from './lib/api/http-coverage.service';
export * from './lib/api/http-notifications.service';
export * from './lib/api/http-year.service';
export * from './lib/api/http-person.service';
export * from './lib/api/problem';
export * from './lib/api/holiday-date';
