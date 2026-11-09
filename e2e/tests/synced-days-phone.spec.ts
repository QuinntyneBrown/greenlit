// Acceptance Test
// Traces to: L2-064 AC11, AC12; L2-063 AC2, AC6, AC10
// Description: on a phone, the week shows Sam's synced day with its glyph and name; it takes no tap, the day panel says
//              "Booked in another team", and a range across it leaves it as it is.
// Data: fresh accounts from fixtures/households.ts: Omar manages Product team with Sam; Maya invites Sam to Chen
//       family and he joins with the same account. Sam books Tue 17 Nov in Product team.

import { test, expect } from "../fixtures/gl-test.js";
import { markOwnDays, samOnTwoTeams } from "../fixtures/households.js";

test.describe("A synced day on the phone's week", () => {
  test.beforeEach(async ({ goto, page, pages }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "The week is the phone's (L2-063).");
    const sam = await samOnTwoTeams(page.request);
    await markOwnDays(page.request, sam.productToken, ["2026-11-17"], "Requested");
    await goto("calendar", { session: sam.familyToken, month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.showWeek("16–22");
  });

  test("the cell shows its glyph and name and takes no tap (L2-064 AC11, AC12)", async ({ pages }) => {
    const cell = pages.calendar.weekCell("Sam Chen", "Tue 17 Nov");
    await expect(cell).toHaveAccessibleName("Sam Chen, Tue 17 Nov: Booked in another team");
    await expect(cell).toHaveAttribute("data-synced", "");
    await expect(cell).toHaveRole("img");
    expect(await pages.calendar.glyphOf(cell)).toBe("⇄");

    await pages.calendar.tapCell("Sam Chen", "Tue 17 Nov");

    await expect(pages.calendar.markSheet()).toHaveCount(0);
  });

  test("the day panel says the day was booked in another team (L2-064 AC11)", async ({ pages }) => {
    await pages.calendar.openDay("Tue 17 Nov");

    await expect(pages.calendar.dayPanelState("Sam Chen")).toHaveText("Booked in another team");
  });

  test("a range across the synced day leaves it as it is (L2-064 AC11)", async ({ pages }) => {
    await pages.calendar.tapCell("Sam Chen", "Mon 16 Nov");
    await pages.calendar.tapCell("Sam Chen", "Wed 18 Nov");
    await pages.calendar.markSheetAction("Tentative").click();

    await expect(pages.calendar.weekCell("Sam Chen", "Mon 16 Nov")).toHaveAccessibleName("Sam Chen, Mon 16 Nov: Tentative");
    await expect(pages.calendar.weekCell("Sam Chen", "Tue 17 Nov")).toHaveAccessibleName("Sam Chen, Tue 17 Nov: Booked in another team");
    await expect(pages.calendar.weekCell("Sam Chen", "Wed 18 Nov")).toHaveAccessibleName("Sam Chen, Wed 18 Nov: Tentative");
  });
});
