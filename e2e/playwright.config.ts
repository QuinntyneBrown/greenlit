import { defineConfig, devices } from "@playwright/test";

/**
 * Two-server configuration:
 *
 *   - The Angular dev server (the implementation under test) runs on
 *     http://localhost:4200. Behaviour specs and visual verification target
 *     it; guarded routes need the API on :5100 with the seeded demo team:
 *     `pwsh eng/Start-E2eApi.ps1` starts it on a fresh, seeded SQLite file with
 *     no database server.
 *
 *   - The mocks (docs/mocks) are served on http://localhost:5173 by
 *     `http-server` when GL_BASELINE=1. Visual baselines are captured from
 *     them once with `npm run baseline` and committed. Subsequent runs
 *     compare the Angular implementation against those baselines
 *     pixel-by-pixel.
 *
 * Snapshot path convention: tests under `tests/visual/` use
 * `toHaveScreenshot()` whose baselines live in
 * `tests/visual/<spec>.spec.ts-snapshots/<name>-<project>-<platform>.png` (the
 * committed baselines are `linux`, as captured in CI-like containers). The
 * baseline capture shares the same project names as the verify run so they
 * read/write the same files.
 *
 * Parity policy: baselines are only taken of regions whose copy is fixed or
 * seed-derived; dated regions are masked. Failures are fixed in the
 * components, never by loosening the ratio below.
 *
 * Chromium only: no Firefox or WebKit projects, by decision (AGENTS.md).
 */

const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 820, height: 1180 },
  desktop: { width: 1440, height: 900 },
} as const;

const isBaselineCapture = process.env.GL_BASELINE === "1";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  forbidOnly: !!process.env.CI,
  timeout: 30_000,
  expect: {
    timeout: 8_000,
    toHaveScreenshot: {
      // Greenlit targets pixel-perfect parity with the mocks. A handful of
      // sub-pixel rasterisation diffs (font hinting, anti-aliasing) are
      // unavoidable across runs, so we allow a tiny ratio but no per-pixel
      // colour drift.
      maxDiffPixelRatio: 0.005,
      threshold: 0.05,
      animations: "disabled",
      caret: "hide",
    },
  },
  use: {
    baseURL: isBaselineCapture
      ? "http://localhost:5173"
      : "http://localhost:4200",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  webServer: isBaselineCapture
    ? {
        // The mocks import ../design-system, so the docs folder is the root.
        command: "npx http-server ../docs -p 5173 -c-1 --cors --silent",
        url: "http://localhost:5173/mocks/index.html",
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
        cwd: __dirname,
      }
    : [
        {
          command: "npm run start -- --port 4200",
          url: "http://localhost:4200",
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
          cwd: `${__dirname}/../frontend`,
        },
        {
          // The marketing site is a second application (L2-050); specs reach it by its origin in routes.ts.
          command: "npm run start:marketing -- --port 4300",
          url: "http://localhost:4300",
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
          cwd: `${__dirname}/../frontend`,
        },
      ],
  projects: [
    {
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: VIEWPORTS.mobile,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "tablet",
      use: { ...devices["Desktop Chrome"], viewport: VIEWPORTS.tablet },
    },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: VIEWPORTS.desktop },
    },
  ],
});
