// Visual parity
// Traces to: L2-064 AC2, AC11; mocks pages/calendar/member-synced and pages/calendar/phone-synced
// Description: a synced cell and the legend with "Booked in another team" match the mocks, region by region, on the
//              month grid and on the phone's week. Baselines are captured from the mocks (GL_BASELINE=1) and the app
//              compared.
// Data: in the app, Sam Chen on Product team and Chen family (fixtures/households.ts); he books Mon 23 and Wed 25 Nov in
//       Chen family, which Product team shows as synced days, as the mocks do.

import { test, expect } from "../../fixtures/gl-test.js";
import { markOwnDays, samOnTwoTeams } from "../../fixtures/households.js";
import { isBaseline } from "../../fixtures/routes.js";

async function samsProductSession(request: Parameters<typeof samOnTwoTeams>[0]): Promise<string> {
  const sam = await samOnTwoTeams(request);
  await markOwnDays(request, sam.familyToken, ["2026-11-23", "2026-11-25"], "Tentative");
  return sam.productToken;
}

test("a synced cell and the legend match pages/calendar/member-synced", async ({ goto, page, pages, settle }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "The month grid is for tablets and desktops (L2-063).");
  const session = isBaseline ? null : await samsProductSession(page.request);
  await goto("syncedSheet", session ? { session, month: "2026-11" } : {});
  const cell = pages.calendar.cell("Sam Chen", "Wed 25 Nov");
  await cell.waitFor();
  await settle();

  await pages.settings.alignToPixelGrid(pages.calendar.legend());
  await expect(pages.calendar.legend()).toHaveScreenshot("synced-legend.png");
  await cell.scrollIntoViewIfNeeded();
  await expect(cell).toHaveScreenshot("synced-cell.png");
});

test("a synced cell on the phone's week matches pages/calendar/phone-synced", async ({ goto, page, pages, settle }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "The week is the phone's (L2-063).");
  const session = isBaseline ? null : await samsProductSession(page.request);
  await goto("syncedPhone", session ? { session, month: "2026-11" } : {});
  await pages.calendar.waitForWeek();
  if (!isBaseline) await pages.calendar.showWeek("23–29");
  const cell = pages.calendar.weekCell(isBaseline ? "Dev Patel" : "Sam Chen", "Mon 23 Nov");
  await cell.waitFor();
  await settle();

  await cell.scrollIntoViewIfNeeded();
  await expect(cell).toHaveScreenshot("phone-synced-cell.png");
});
