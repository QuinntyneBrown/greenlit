/*
 * Public API Surface of components
 *
 * Greenlit UI atoms. Each component's Angular `selector` keeps the `gl-*`
 * namespace; the exported TypeScript identifier drops the `Gl` prefix since
 * the import path already says where it came from. Every host element carries
 * the mock's block class so one set of e2e locators serves the mocks and the
 * app.
 */

// shell
export * from './lib/skip-link/skip-link';
export * from './lib/logo-lockup/logo-lockup';
export * from './lib/app-nav/app-nav';
export * from './lib/top-bar/top-bar';

// actions
export * from './lib/button/button';

// forms and account pages
export * from './lib/auth-card/auth-card';
export * from './lib/text-field/text-field';
export * from './lib/textarea-field/textarea-field';
export * from './lib/select-field/select-field';
export * from './lib/form-summary/form-summary';
export * from './lib/well/well';

// dialogs and lists
export * from './lib/dialog/dialog';
export * from './lib/member-list/member-list';
export * from './lib/holiday-list/holiday-list';
export * from './lib/day-chips/day-chips';

// requests
export * from './lib/tabs/tabs';
export * from './lib/request-list/request-list';
export * from './lib/request-status/request-status';
export * from './lib/drawer/drawer';

// the sheet
export * from './lib/segmented-control/segmented-control';
export * from './lib/team-grid/team-grid';
export * from './lib/selection-bar/selection-bar';
export * from './lib/period-nav/period-nav';
export * from './lib/legend/legend';

// identity and status
export * from './lib/avatar/avatar';
export * from './lib/badge/badge';

// feedback
export * from './lib/toast/toast';
export * from './lib/alert/alert';
export * from './lib/inline-message/inline-message';
export * from './lib/skeleton/skeleton';
export * from './lib/progress-bar/progress-bar';
export * from './lib/empty-state/empty-state';
export * from './lib/error-page/error-page';
