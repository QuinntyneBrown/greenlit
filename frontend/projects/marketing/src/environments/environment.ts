/**
 * Runtime environment for the marketing site.
 *
 * `appUrl` is the origin of the Greenlit app the site links into ("Create your
 * team", "Open the app", "Sign in"). In development it is the app's dev server.
 * Production swaps this file through `fileReplacements` in `angular.json`.
 */
export const environment = {
  appUrl: 'http://localhost:4200',
};
