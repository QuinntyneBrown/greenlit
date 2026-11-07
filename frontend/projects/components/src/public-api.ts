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

// feedback
export * from './lib/empty-state/empty-state';
export * from './lib/error-page/error-page';
