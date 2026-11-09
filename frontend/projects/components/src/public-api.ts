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
export * from './lib/user-menu/user-menu';
export * from './lib/team-switcher/team-switcher';

// actions
export * from './lib/button/button';
export * from './lib/switch/switch';

// forms and account pages
export * from './lib/auth-card/auth-card';
export * from './lib/auth-divider/auth-divider';
export * from './lib/google-button/google-button';
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
export * from './lib/settings-nav/settings-nav';

// requests
export * from './lib/tabs/tabs';
export * from './lib/request-list/request-list';
export * from './lib/request-status/request-status';
export * from './lib/drawer/drawer';

// the sheet
export * from './lib/segmented-control/segmented-control';
export * from './lib/team-grid/team-grid';
export * from './lib/year-grid/year-grid';
export * from './lib/allowance-table/allowance-table';
export * from './lib/selection-bar/selection-bar';
export * from './lib/period-nav/period-nav';
export * from './lib/legend/legend';
export * from './lib/stat/stat';
export * from './lib/month-mini/month-mini';
export * from './lib/run-list/run-list';
export * from './lib/week-tabs/week-tabs';
export * from './lib/week-strip/week-strip';
export * from './lib/mark-sheet/mark-sheet';

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
export * from './lib/counter/counter';
