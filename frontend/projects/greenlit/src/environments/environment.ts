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
  /** Dev-only `?state=` overrides and galleries; compile-time false in production. */
  galleryRoutes: true,
};
