// Acceptance Test
// Traces to: L2-036 (AC3)
// Description: When next year's public holidays are ready, Settings invites the manager to review them.
// Data: the demo team's seed holds this year's United Kingdom holidays only, so Maya is offered next year's (the
//       banner only reads, so the demo team is not changed); a team made through the API holds next year's
//       already and is offered nothing.

import { test, expect } from "../fixtures/gl-test.js";
import { thisYear } from "../fixtures/dates.js";
import { inviterFor } from "../fixtures/session.js";
import { ensureOwnTeam } from "../fixtures/team.js";

test.describe("Reviewing next year's holidays", () => {
  test("Settings says next year's holidays are ready and offers Review holidays (L2-036 AC3)", async ({ goto, pages }) => {
    await goto("settings");
    await pages.settings.waitForReady();
    await pages.settings.waitForHolidays();

    await expect(pages.settings.reviewBanner()).toBeVisible();
    await expect(pages.settings.reviewBannerTitle()).toHaveText(`${thisYear() + 1} UK bank holidays are ready`);
    await expect(pages.settings.reviewBannerText()).toHaveText("Review them and add the ones your team observes.");
    await expect(pages.settings.reviewHolidaysButton()).toBeVisible();
  });

  test("Review holidays takes the manager to the holidays (keyboard)", async ({ goto, page, pages }) => {
    await goto("settings");
    await pages.settings.waitForReady();
    await pages.settings.waitForHolidays();
    await pages.settings.reviewHolidaysButton().focus();

    await page.keyboard.press("Enter");

    await expect(pages.settings.workWeekHeading()).toBeFocused();
    await expect(pages.settings.workWeekHeading()).toBeInViewport();
  });

  test("Dismiss hides the banner", async ({ goto, pages }) => {
    await goto("settings");
    await pages.settings.waitForReady();
    await pages.settings.waitForHolidays();

    await pages.settings.dismissReviewBannerButton().click();

    await expect(pages.settings.reviewBanner()).toHaveCount(0);
  });

  test("a team that already holds next year's holidays is offered nothing", async ({ goto, pages, request }, testInfo) => {
    const manager = inviterFor(testInfo.project.name);
    await ensureOwnTeam(request, manager, "Holiday team");
    await goto("settings", { as: manager });
    await pages.settings.waitForReady();
    await pages.settings.waitForHolidays();

    await expect(pages.settings.reviewBanner()).toHaveCount(0);
  });

  test("a member is offered nothing", async ({ goto, pages }) => {
    await goto("settings", { as: "member" });
    await pages.settings.waitForReady();

    await expect(pages.settings.reviewBanner()).toHaveCount(0);
  });
});
