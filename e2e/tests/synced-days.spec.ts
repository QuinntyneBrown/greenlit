// Acceptance Test
// Traces to: L2-064 AC1, AC2, AC3, AC9, AC12; L2-048 AC1
// Description: a day Sam books on his row in Product team shows on his row in Chen family as a synced day: striped
//              blue with "⇄", named "Booked in another team", for him and for Maya, with nothing else of Product team;
//              painting or pressing it from the mouse or the keyboard changes nothing and says where to change it.
// Data: the demo seed's Chen family (Lin Chen, Sam Chen; Sam requested Tue 17 Nov on Product team) for the first test;
//       fresh accounts from fixtures/households.ts: Omar manages Product team with Sam; Maya invites Sam to Chen
//       family and he joins with the same account.

import { test, expect, GRID_ONLY } from "../fixtures/gl-test.js";
import { markOwnDays, samOnTwoTeams } from "../fixtures/households.js";

test.skip(({ isMobile }) => isMobile, GRID_ONLY);

test.describe("Days synced across a person's teams", () => {
  test("the demo's Chen family shows Sam's Product team day as a synced day (L2-064 AC1, AC9)", async ({ goto, pages }) => {
    await goto("calendar", { as: "household-manager", month: "2026-11" });
    await pages.calendar.waitForReady();

    await expect(pages.calendar.cell("Sam Chen", "Tue 17 Nov")).toHaveAccessibleName("Sam Chen, Tue 17 Nov: Booked in another team");
  });

  test("a day booked in another team shows on his row with its marker and name (L2-064 AC1, AC2)", async ({ goto, page, pages }) => {
    const sam = await samOnTwoTeams(page.request);
    await markOwnDays(page.request, sam.productToken, ["2026-11-17"], "Requested");

    await goto("calendar", { session: sam.familyToken, month: "2026-11" });
    await pages.calendar.waitForReady();

    const cell = pages.calendar.cell("Sam Chen", "Tue 17 Nov");
    await expect(cell).toHaveAccessibleName("Sam Chen, Tue 17 Nov: Booked in another team");
    await expect(cell).toHaveAttribute("data-status", "tentative");
    await expect(cell).toHaveAttribute("data-synced", "");
    expect(await pages.calendar.glyphOf(cell)).toBe("⇄");
    await expect(pages.calendar.legendItems()).toHaveText([
      "Confirmed",
      "Requested",
      "Tentative",
      "Booked in another team",
      "Weekend / holiday",
    ]);
  });

  test("the other team's manager sees the date and nothing else of the other team (L2-064 AC9)", async ({ goto, page, pages }) => {
    const sam = await samOnTwoTeams(page.request);
    await markOwnDays(page.request, sam.productToken, ["2026-11-17"], "Requested");

    await goto("calendar", { session: sam.maya.token, month: "2026-11" });
    await pages.calendar.waitForReady();

    await expect(pages.calendar.cell("Sam Chen", "Tue 17 Nov")).toHaveAccessibleName("Sam Chen, Tue 17 Nov: Booked in another team");
    await expect(pages.calendar.memberNames()).toHaveText(["Maya Chen", "Sam Chen"]);
    await expect(page.getByText("Product team")).toHaveCount(0);
    await expect(page.getByText("Omar Diaz")).toHaveCount(0);
  });

  test("painting over a synced day changes nothing and says where to change it (L2-064 AC3)", async ({ goto, page, pages }) => {
    const sam = await samOnTwoTeams(page.request);
    await markOwnDays(page.request, sam.productToken, ["2026-11-17"], "Tentative");
    await goto("calendar", { session: sam.familyToken, month: "2026-11" });
    await pages.calendar.waitForReady();

    await pages.calendar.choosePaint("Requested");
    await pages.calendar.paint("Sam Chen", "Tue 17 Nov");

    await expect(pages.calendar.toast("That day was booked in another team")).toBeVisible();
    await expect(pages.calendar.toastText("That day was booked in another team")).toHaveText("Change it in the team where it was booked.");
    await expect(pages.calendar.cell("Sam Chen", "Tue 17 Nov")).toHaveAccessibleName("Sam Chen, Tue 17 Nov: Booked in another team");
  });

  test("a stroke across a synced day changes only the other days (L2-064 AC3)", async ({ goto, page, pages }) => {
    const sam = await samOnTwoTeams(page.request);
    await markOwnDays(page.request, sam.productToken, ["2026-11-17"], "Tentative");
    await goto("calendar", { session: sam.familyToken, month: "2026-11" });
    await pages.calendar.waitForReady();

    await pages.calendar.choosePaint("Requested");
    await pages.calendar.paint("Sam Chen", "Mon 16 Nov", "Wed 18 Nov");

    await expect(pages.calendar.toast("Requested 2 days")).toBeVisible();
    await expect(pages.calendar.cell("Sam Chen", "Mon 16 Nov")).toHaveAccessibleName("Sam Chen, Mon 16 Nov: Requested");
    await expect(pages.calendar.cell("Sam Chen", "Tue 17 Nov")).toHaveAccessibleName("Sam Chen, Tue 17 Nov: Booked in another team");
    await expect(pages.calendar.cell("Sam Chen", "Wed 18 Nov")).toHaveAccessibleName("Sam Chen, Wed 18 Nov: Requested");
  });

  test("Enter on a synced day from the keyboard shows the same toast (L2-064 AC12)", async ({ goto, page, pages }) => {
    const sam = await samOnTwoTeams(page.request);
    await markOwnDays(page.request, sam.productToken, ["2026-11-17"], "Tentative");
    await goto("calendar", { session: sam.familyToken, month: "2026-11" });
    await pages.calendar.waitForReady();

    await pages.calendar.choosePaint("Tentative");
    await pages.calendar.keyboardTo("Sam Chen", "Tue 17 Nov");
    await pages.calendar.press("Enter");

    await expect(pages.calendar.toast("That day was booked in another team")).toBeVisible();
    await expect(pages.calendar.focusedCell()).toHaveAccessibleName("Sam Chen, Tue 17 Nov: Booked in another team");
  });
});
