# Design system

Extracted from `docs/mocks/` once the first screens exist: tokens (colour with light and dark
themes, typography, spacing, radius, elevation, motion), foundations, one page per component with
anatomy, variants, states, responsive behaviour and accessibility. The `components` library in
`frontend/` implements it; the `--gl-` prefix is reserved for component-scoped knobs.

The sheet's four cell colours are the brand's semantic palette: red (closed), blue (tentative),
yellow (requested), green (confirmed). Each needs a non-colour carrier (text, icon or accessible
name) in every component that shows it.
