// Acceptance Test
// Traces to: L2-015, L2-017, L2-018
// Description: Paint days on the calendar; who may change which days; Undo and failed saves.
// Data: the demo seed, November and December 2026. Ana's 23-30 Nov is blank and cleared after each test;
//       Ana has confirmed 4-5 Nov, Ben tentative 23-27 Nov, Christmas Day is a holiday.

import { test, expect, GRID_ONLY } from "../fixtures/gl-test.js";
import { clearDays } from "../fixtures/days.js";


test.skip(({ isMobile }) => isMobile, GRID_ONLY);
const ANA_PAINTED = ["2026-11-23", "2026-11-24", "2026-11-25", "2026-11-26", "2026-11-27", "2026-11-30"];

test.describe("Painting days", () => {
  test.beforeEach(async ({ request }) => {
    await clearDays(request, "Ana Ruiz", ANA_PAINTED);
  });
  test.afterEach(async ({ request }) => {
    await clearDays(request, "Ana Ruiz", ANA_PAINTED);
  });

  test("the manager can paint Confirmed, Requested, Tentative and Clear (L2-015 AC1)", async ({ goto, pages }) => {
    await goto("calendar", { month: "2026-11" });
    await pages.calendar.waitForReady();
    await expect(pages.calendar.paintOptions()).toHaveText([/Select/, /Confirmed/, /Requested/, /Tentative/, /Clear/]);
    await expect(pages.calendar.hint()).toHaveText("Click or drag across days to set time off.");
  });

  test("a member can paint Requested, Tentative and Clear, not Confirmed (L2-015 AC2)", async ({ goto, pages }) => {
    await goto("calendar", { as: "member", month: "2026-11" });
    await pages.calendar.waitForReady();
    await expect(pages.calendar.paintOptions()).toHaveText([/Select/, /Requested/, /Tentative/, /Clear/]);
    await expect(pages.calendar.hint()).toHaveText("Click or drag across your own row to request time off.");
  });

  test("dragging across days applies the colour on release and offers Undo (L2-015 AC3)", async ({ goto, pages }) => {
    await goto("calendar", { as: "member", month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.choosePaint("Tentative");

    await pages.calendar.paint("Ana Ruiz", "Mon 23 Nov", "Wed 25 Nov");

    for (const day of ["Mon 23 Nov", "Tue 24 Nov", "Wed 25 Nov"]) {
      await expect(pages.calendar.cell("Ana Ruiz", day)).toHaveAccessibleName(`Ana Ruiz, ${day}: Tentative`);
      await expect(pages.calendar.cell("Ana Ruiz", day)).toHaveAttribute("data-status", "tentative");
    }
    await expect(pages.calendar.cell("Ana Ruiz", "Thu 26 Nov")).toHaveAccessibleName("Ana Ruiz, Thu 26 Nov: Working");
    await expect(pages.calendar.toast("Marked 3 days tentative")).toBeVisible();
    await expect(pages.calendar.toastAction("Marked 3 days tentative", "Undo")).toBeVisible();
  });

  test("a saved stroke is still there after a reload", async ({ goto, pages, page }) => {
    await goto("calendar", { as: "member", month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.choosePaint("Tentative");
    await pages.calendar.paint("Ana Ruiz", "Mon 23 Nov", "Tue 24 Nov");
    await expect(pages.calendar.toast("Marked 2 days tentative")).toBeVisible();

    await page.reload();
    await pages.calendar.waitForReady();

    await expect(pages.calendar.cell("Ana Ruiz", "Tue 24 Nov")).toHaveAttribute("data-status", "tentative");
  });

  test("the manager confirms a member's days (L2-015 AC4, L2-017 AC5)", async ({ goto, pages }) => {
    await goto("calendar", { month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.choosePaint("Confirmed");

    await pages.calendar.paint("Ana Ruiz", "Mon 23 Nov", "Wed 25 Nov");

    await expect(pages.calendar.cell("Ana Ruiz", "Tue 24 Nov")).toHaveAttribute("data-status", "confirmed");
    const toast = pages.calendar.toast("3 days marked confirmed for Ana");
    await expect(toast).toBeVisible();
    await expect(toast).toContainText("They’re green on the calendar now.");
    await expect(pages.calendar.toastAction("3 days marked confirmed for Ana", "Undo")).toBeVisible();
  });

  test("a member requesting days is told the manager will be notified (L2-015 AC5)", async ({ goto, pages }) => {
    await goto("calendar", { as: "member", month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.choosePaint("Requested");

    await pages.calendar.paint("Ana Ruiz", "Mon 23 Nov", "Wed 25 Nov");

    await expect(pages.calendar.cell("Ana Ruiz", "Tue 24 Nov")).toHaveAttribute("data-status", "requested");
    const toast = pages.calendar.toast("Requested 3 days");
    await expect(toast).toContainText("Maya Chen will be notified.");
    await expect(pages.calendar.toastAction("Requested 3 days", "Undo")).toBeVisible();
  });

  test("Clear returns painted days to working days (L2-015 AC6)", async ({ goto, pages }) => {
    await goto("calendar", { as: "member", month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.choosePaint("Tentative");
    await pages.calendar.paint("Ana Ruiz", "Mon 23 Nov", "Wed 25 Nov");
    await expect(pages.calendar.toast("Marked 3 days tentative")).toBeVisible();

    await pages.calendar.choosePaint("Clear");
    await pages.calendar.paint("Ana Ruiz", "Tue 24 Nov", "Wed 25 Nov");

    await expect(pages.calendar.toast("Cleared 2 days")).toBeVisible();
    await expect(pages.calendar.cell("Ana Ruiz", "Tue 24 Nov")).toHaveAccessibleName("Ana Ruiz, Tue 24 Nov: Working");
    await expect(pages.calendar.cell("Ana Ruiz", "Mon 23 Nov")).toHaveAttribute("data-status", "tentative");
  });

  test("a member cannot paint another member's row (L2-017 AC1)", async ({ goto, pages }) => {
    await goto("calendar", { as: "member", month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.choosePaint("Clear");

    await pages.calendar.paint("Ben Okafor", "Mon 23 Nov", "Wed 25 Nov");

    await expect(pages.calendar.cell("Ben Okafor", "Tue 24 Nov")).toHaveAccessibleName(
      "Ben Okafor, Tue 24 Nov: Tentative",
    );
    await expect(pages.calendar.toasts()).toHaveCount(0);
  });

  test("a member cannot change their own confirmed days (L2-017 AC2)", async ({ goto, pages }) => {
    await goto("calendar", { as: "member", month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.choosePaint("Tentative");

    await pages.calendar.paint("Ana Ruiz", "Wed 4 Nov", "Thu 5 Nov");

    await expect(pages.calendar.toast("Confirmed days can only be changed by Maya")).toContainText(
      "Ask Maya Chen if one of these needs to move.",
    );
    await expect(pages.calendar.cell("Ana Ruiz", "Wed 4 Nov")).toHaveAttribute("data-status", "confirmed");
  });

  test("weekends and holidays are red by rule and nothing changes (L2-017 AC3)", async ({ goto, pages }) => {
    await goto("calendar", { as: "member", month: "2026-12" });
    await pages.calendar.waitForReady();
    await pages.calendar.choosePaint("Tentative");

    await pages.calendar.paint("Ana Ruiz", "Fri 25 Dec");

    const toast = pages.calendar.toast("Those are all non-working days");
    await expect(toast).toContainText("Weekends and holidays are red by rule, so nothing changed.");
    await expect(pages.calendar.cell("Ana Ruiz", "Fri 25 Dec")).toHaveAttribute("data-status", "off");
  });

  test("a stroke across a weekend changes only the working days (L2-017 AC4)", async ({ goto, pages }) => {
    await goto("calendar", { as: "member", month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.choosePaint("Tentative");

    await pages.calendar.paint("Ana Ruiz", "Fri 27 Nov", "Mon 30 Nov");

    await expect(pages.calendar.toast("Marked 2 days tentative")).toBeVisible();
    await expect(pages.calendar.cell("Ana Ruiz", "Fri 27 Nov")).toHaveAttribute("data-status", "tentative");
    await expect(pages.calendar.cell("Ana Ruiz", "Sat 28 Nov")).toHaveAttribute("data-status", "off");
    await expect(pages.calendar.cell("Ana Ruiz", "Mon 30 Nov")).toHaveAttribute("data-status", "tentative");
  });

  test("Undo puts the days back (L2-018 AC1)", async ({ goto, pages }) => {
    await goto("calendar", { as: "member", month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.choosePaint("Tentative");
    await pages.calendar.paint("Ana Ruiz", "Mon 23 Nov", "Wed 25 Nov");
    await expect(pages.calendar.cell("Ana Ruiz", "Tue 24 Nov")).toHaveAttribute("data-status", "tentative");

    await pages.calendar.toastAction("Marked 3 days tentative", "Undo").click();

    for (const day of ["Mon 23 Nov", "Tue 24 Nov", "Wed 25 Nov"]) {
      await expect(pages.calendar.cell("Ana Ruiz", day)).toHaveAccessibleName(`Ana Ruiz, ${day}: Working`);
    }
    await expect(pages.calendar.toast("Marked 3 days tentative")).toHaveCount(0);
  });

  test("a failed save puts the cells back and offers Try again (L2-018 AC2)", async ({ goto, pages, sheetApi }) => {
    await goto("calendar", { as: "member", month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.choosePaint("Tentative");
    await sheetApi.failSaves();

    await pages.calendar.paint("Ana Ruiz", "Mon 23 Nov", "Wed 25 Nov");

    const toast = pages.calendar.toast("We couldn’t save those days");
    await expect(toast).toContainText("Your selection is still there. Check your connection and try again.");
    await expect(pages.calendar.cell("Ana Ruiz", "Tue 24 Nov")).toHaveAccessibleName("Ana Ruiz, Tue 24 Nov: Working");

    await sheetApi.recoverSaves();
    await pages.calendar.toastAction("We couldn’t save those days", "Try again").click();

    await expect(pages.calendar.cell("Ana Ruiz", "Tue 24 Nov")).toHaveAttribute("data-status", "tentative");
    await expect(pages.calendar.toast("Marked 3 days tentative")).toBeVisible();
  });

  test("toasts stack, newest first (L2-018 AC3)", async ({ goto, pages }) => {
    await goto("calendar", { as: "member", month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.choosePaint("Tentative");
    await pages.calendar.paint("Ana Ruiz", "Mon 23 Nov");
    await expect(pages.calendar.toast("Marked 1 day tentative")).toBeVisible();

    await pages.calendar.paint("Ana Ruiz", "Tue 24 Nov", "Wed 25 Nov");

    await expect(pages.calendar.toasts()).toHaveCount(2);
    await expect(pages.calendar.toasts().first()).toContainText("Marked 2 days tentative");
    await expect(pages.calendar.toasts().last()).toContainText("Marked 1 day tentative");
  });

  test("a focused cell is painted with Enter", async ({ goto, pages }) => {
    await goto("calendar", { as: "member", month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.choosePaint("Tentative");

    const cell = pages.calendar.cell("Ana Ruiz", "Tue 24 Nov");
    await cell.focus();
    await cell.press("Enter");

    await expect(cell).toHaveAttribute("data-status", "tentative");
    await expect(pages.calendar.toast("Marked 1 day tentative")).toBeVisible();
  });
});
