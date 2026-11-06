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

// Models
export * from './lib/models/day-status';

// Service contracts (interface + InjectionToken)

// Concrete implementations (imported only by composition roots)
