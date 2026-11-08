// Visual parity
// Traces to: L2-054 AC2 (Your teams), mock pages/settings/your-teams
// Description: the "Your teams" region of Settings matches the mock, region by region. Baselines are captured from the
//              mock (GL_BASELINE=1, `npm run baseline`) and the app is compared against them.
// Data: in the app, each viewport's juggler (Design team active and default, Product team) — the mock's two teams.

import { test, expect } from "../../fixtures/gl-test.js";
import { isBaseline } from "../../fixtures/routes.js";
import { jugglerFor } from "../../fixtures/session.js";
import { resetTeams } from "../../fixtures/teams.js";

test("Your teams matches pages/settings/your-teams", async ({ goto, pages, request, settle }, testInfo) => {
  const juggler = jugglerFor(testInfo.project.name);
  if (!isBaseline) await resetTeams(request, juggler);
  await goto("yourTeams", { as: juggler });
  await pages.settings.waitForTeams();
  await settle();

  // Region by region: the Settings sections keep their own spacing, so the list and its action row are compared,
  // each on whole pixels in both captures.
  await pages.settings.alignToPixelGrid(pages.settings.teamList());
  await pages.settings.alignToPixelGrid(pages.settings.yourTeamsActions());
  await expect(pages.settings.teamList()).toHaveScreenshot("your-teams-list.png");
  await expect(pages.settings.yourTeamsActions()).toHaveScreenshot("your-teams-actions.png");
});
