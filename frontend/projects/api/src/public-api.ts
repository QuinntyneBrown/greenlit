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
export * from './lib/models/sheet-month';
export * from './lib/models/session';
export * from './lib/models/new-team';

// Service contracts (interface + InjectionToken)
export * from './lib/api/session-store';
export * from './lib/api/auth.service';
export * from './lib/api/sheet.service';
export * from './lib/api/team.service';
export * from './lib/api/auth.interceptor';

// Concrete implementations (imported only by composition roots)
export * from './lib/api/local-storage-session-store';
export * from './lib/api/http-sheet.service';
export * from './lib/api/http-auth.service';
export * from './lib/api/http-team.service';
