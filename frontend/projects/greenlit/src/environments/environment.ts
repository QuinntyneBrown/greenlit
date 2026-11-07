/**
 * Runtime environment for the Angular app.
 *
 * `apiBaseUrl` points at the Greenlit API. Override per environment via
 * `fileReplacements` in `angular.json`. In development the default is the
 * locally running API process (`dotnet run --project backend/src/Greenlit.Api`
 * or `eng/Start-E2eApi.ps1`, both on :5100).
 */
export const environment = {
  apiBaseUrl: 'http://localhost:5100',
  /** The Google OAuth 2.0 web client id (public; the API checks tokens against the same value, ADR-012). */
  googleClientId: '1011940213681-6jtgouf5971gknkdaf7amgl9rlf2a1ef.apps.googleusercontent.com',
  /** Dev-only `?state=` overrides and galleries; compile-time false in production. */
  galleryRoutes: true,
};
