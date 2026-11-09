// Acceptance Test
// Traces to: L2-063 AC7, AC12 (and the AC6/AC7 rule that an open day and a selection close each other)
// Description: On a phone, time off is marked by tapping a first day; a panel at the foot says what comes next.
// Data: the demo seed, November 2026. Nothing is saved.
//
// Given nothing is selected, when the calendar renders, then a hint at the foot says how to mark days (for a member,
//   "your row"; for the manager, "someone’s row") and "Tap a date to see who is out."; a member still has
//   "Request time off".
// Given the manager, when they tap Ana's Mon 23 Nov, then that cell is selected and a panel "Selected days" shows
//   "Ana Ruiz", "From Mon 23 Nov", "Now tap the last day. You can change week first.", "Just this day" and "Cancel";
//   the hint is gone.
// Given a member, when the week renders, then only their own row's cells are buttons; the others are images that
//   take no tap.
// Given a day is open, when the person taps a cell, then the day closes; given a first day is picked, when the person
//   opens a date, then the selection clears without a toast.

import { test, expect } from "../fixtures/gl-test.js";

test.describe("Picking a first day on a phone", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "Tapping a first and last day is the phone's (L2-063).");
  });

  test("the hint tells the manager and a member how to mark days (L2-063 AC12)", async ({ goto, pages }) => {
    await goto("calendar", { month: "2026-11" });
    await pages.calendar.waitForReady();
    await expect(pages.calendar.phoneHint()).toHaveText("Tap a day in someone’s row to mark time off.Tap a date to see who is out.");
    await expect(pages.calendar.requestTimeOff()).toHaveCount(0);

    await goto("calendar", { month: "2026-11", as: "member" });
    await pages.calendar.waitForReady();
    await expect(pages.calendar.phoneHint()).toHaveText("Tap a day in your row to mark time off.Tap a date to see who is out.");
    await expect(pages.calendar.requestTimeOff()).toBeVisible();
  });

  test("tapping a cell selects it and opens the panel for the last day (L2-063 AC7)", async ({ goto, pages }) => {
    await goto("calendar", { month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.showWeek("23–29");

    await pages.calendar.tapCell("Ana Ruiz", "Mon 23 Nov");

    await expect(pages.calendar.weekCell("Ana Ruiz", "Mon 23 Nov")).toHaveAttribute("aria-pressed", "true");
    await expect(pages.calendar.weekSelectedCells()).toHaveCount(1);
    await expect(pages.calendar.markSheetWho()).toHaveText("Ana Ruiz");
    await expect(pages.calendar.markSheetRange()).toHaveText("From Mon 23 Nov");
    await expect(pages.calendar.markSheetMeta()).toHaveText("Now tap the last day. You can change week first.");
    await expect(pages.calendar.markSheetActions()).toHaveText(["Just this day"]);
    await expect(pages.calendar.markSheetAction("Cancel")).toBeVisible();
    await expect(pages.calendar.phoneHint()).toHaveCount(0);
  });

  test("a member may tap only their own row (L2-063 AC7, L2-017 AC1)", async ({ goto, pages }) => {
    await goto("calendar", { month: "2026-11", as: "member" });
    await pages.calendar.waitForReady();
    await pages.calendar.showWeek("23–29");

    await expect(pages.calendar.weekCell("Maya Chen", "Mon 23 Nov")).toHaveRole("img");
    await expect(pages.calendar.weekCell("Ana Ruiz", "Mon 23 Nov")).toHaveRole("button");
    await pages.calendar.weekCell("Maya Chen", "Mon 23 Nov").click();
    await expect(pages.calendar.markSheet()).toHaveCount(0);

    await pages.calendar.tapCell("Ana Ruiz", "Tue 24 Nov");
    await expect(pages.calendar.markSheetRange()).toHaveText("From Tue 24 Nov");
  });

  test("an open day and a picked day close each other (L2-063 AC6, AC7)", async ({ goto, pages }) => {
    await goto("calendar", { month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.showWeek("23–29");
    await pages.calendar.openDay("Thu 26 Nov");

    await pages.calendar.tapCell("Ben Okafor", "Mon 23 Nov");
    await expect(pages.calendar.dayPanel()).toHaveCount(0);
    await expect(pages.calendar.markSheet()).toBeVisible();

    await pages.calendar.openDay("Thu 26 Nov");
    await expect(pages.calendar.markSheet()).toHaveCount(0);
    await expect(pages.calendar.weekSelectedCells()).toHaveCount(0);
    await expect(pages.calendar.toast("Selection cleared")).toHaveCount(0);
    await expect(pages.calendar.dayPanel()).toBeVisible();
  });
});
