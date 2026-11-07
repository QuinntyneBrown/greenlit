# ADR-010: Host both Angular applications on Azure Static Web Apps, deployed from main

## Status

Accepted (2026-11-07)

## Context

Greenlit has two browser applications in one workspace: the marketing site (`frontend/projects/marketing`) and
the app (`frontend/projects/greenlit`). Both are static builds. The domain `greenlit.rocks` will point
`www` at the marketing site and `app` at the app. Nothing was hosted and `ci.yml` only verified builds.

## Decision

- Each application is its own Azure Static Web App in the resource group `rg-greenlit-prod` (East US 2):
  `swa-greenlit-www-prod` for the marketing site and `swa-greenlit-app-prod` for the app.
- `.github/workflows/deploy.yml` runs on every push to `main` (and by hand): it runs the frontend format,
  lint and production builds once, then uploads each `dist/<app>/browser` with `Azure/static-web-apps-deploy`
  using that site's deployment token (`AZURE_SWA_TOKEN_WWW`, `AZURE_SWA_TOKEN_APP` repository secrets).
- Each app ships a `staticwebapp.config.json` from its `public/` folder: the SPA fallback to `index.html`,
  security headers and cache rules.
- The marketing site's production `appUrl` is the app site's address; it changes to `https://app.greenlit.rocks`
  when the custom domains are attached (`az staticwebapp hostname set`).

## Consequences

- The subscription already holds ten Free static sites, so `swa-greenlit-app-prod` is on the Standard tier
  (about US$9 a month). `az staticwebapp update -g rg-greenlit-prod -n swa-greenlit-app-prod --sku Free`
  moves it down once a Free slot is free.
- The app's `apiBaseUrl` is still a placeholder: the API is not hosted yet, so the deployed app renders but
  cannot sign in until ADR-011 (API hosting) lands.
- Deployment tokens, not an OIDC identity: simpler, no app registration; rotating a token means
  re-running `az staticwebapp secrets list` and `gh secret set`.
