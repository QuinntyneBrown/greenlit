# Frontend

Angular 21 workspace for Greenlit. Three projects under `projects/`:

| Project      | Kind        | Purpose                                                                          |
| ------------ | ----------- | -------------------------------------------------------------------------------- |
| `greenlit`   | application | The app: shell, routes, pages, dialogs                                           |
| `api`        | library     | Service contracts + injection tokens, implementations, view models, pure helpers |
| `components` | library     | `gl-*` UI atoms; the design system                                               |

## Commands

```bash
npm ci                 # also installs the husky pre-commit hook
npm start              # ng serve greenlit on http://localhost:4200
npm test -- --watch=false
npm run lint
npm run format:check
npx ng build api && npx ng build components
npx ng build greenlit --configuration production
```

The app expects the API on http://localhost:5100 (`projects/greenlit/src/environments/environment.ts`).

## Conventions

See `AGENTS.md` at the repository root: Prettier and angular-eslint are enforced in CI, component
selectors use `gl-*`, pages depend on service tokens rather than concrete classes, and
button-triggered editing opens a CDK Dialog rather than an inline form.
