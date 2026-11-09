// Acceptance Test
// Traces to: L2-063 AC6
// Description: On a phone, pressing a date opens a panel that says who is out that day.
// Data: the demo seed, November 2026: Ana and Dev requested 18 Nov, Ben tentative 23–27 Nov; Dev works Monday to
//       Thursday for one test, as the mocks' cast (put back after). Christmas Day (25 Dec) is a team holiday.
//
// Given the week 16–22 Nov, when the person presses Wed 18 Nov, then a panel labelled "Out on 18 Nov" shows
//   "Wed 18 Nov" and every member with their status in words, and the date shows as open.
// Given the panel is open, when the person presses the date again or "Close day", then it closes.
// Given Dev works Monday to Thursday, when Fri 20 Nov is open, then Dev is "Not working".
// Given a team holiday or a weekend, when its date is open, then the panel shows one line,
//   "Christmas Day · not a working day" or "Weekend · not a working day", instead of the members.
// Given a short day, when its date is open, then the heading adds "· short of people".

import { test, expect } from "../fixtures/gl-test.js";
import { clearDays, paintDays, weekdays } from "../fixtures/days.js";
import { MON_TO_FRI, MON_TO_THU, setMemberDays } from "../fixtures/working-days.js";

const CAST = ["Maya Chen", "Ana Ruiz", "Ben Okafor", "Cleo Park", "Dev Patel", "Elif Yılmaz", "Finn Murphy"];

test.describe("Who is out on a day, on a phone", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "The day panel is the phone's (L2-063).");
  });

  test("pressing a date lists every member with their status in words (L2-063 AC6)", async ({ goto, pages }) => {
    await goto("calendar", { month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.showWeek("16–22");

    await pages.calendar.openDay("Wed 18 Nov");

    await expect(pages.calendar.dayPanel()).toHaveAccessibleName("Out on 18 Nov");
    await expect(pages.calendar.dayPanelHeading()).toHaveText("Wed 18 Nov");
    await expect(pages.calendar.weekDate("Wed 18 Nov")).toHaveAttribute("aria-expanded", "true");
    await expect(pages.calendar.dayPanelNames()).toHaveText(CAST);
    await expect(pages.calendar.dayPanelState("Ana Ruiz")).toHaveText("Requested");
    await expect(pages.calendar.dayPanelState("Dev Patel")).toHaveText("Requested");
    await expect(pages.calendar.dayPanelState("Maya Chen")).toHaveText("Working");
  });

  test("pressing the date again or Close day closes the panel (L2-063 AC6)", async ({ goto, pages }) => {
    await goto("calendar", { month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.showWeek("23–29");

    await pages.calendar.openDay("Thu 26 Nov");
    await expect(pages.calendar.dayPanelState("Ben Okafor")).toHaveText("Tentative");
    await pages.calendar.openDay("Thu 26 Nov");
    await expect(pages.calendar.dayPanel()).toHaveCount(0);
    await expect(pages.calendar.weekDate("Thu 26 Nov")).toHaveAttribute("aria-expanded", "false");

    await pages.calendar.openDay("Thu 26 Nov");
    await pages.calendar.closeDay().click();
    await expect(pages.calendar.dayPanel()).toHaveCount(0);
  });

  test("a member who does not work that day is Not working (L2-063 AC6)", async ({ goto, pages, request }) => {
    await setMemberDays(request, "manager", "Dev Patel", MON_TO_THU);
    try {
      await goto("calendar", { month: "2026-11" });
      await pages.calendar.waitForReady();
      await pages.calendar.showWeek("16–22");

      await pages.calendar.openDay("Fri 20 Nov");

      await expect(pages.calendar.dayPanelState("Dev Patel")).toHaveText("Not working");
    } finally {
      await setMemberDays(request, "manager", "Dev Patel", MON_TO_FRI);
    }
  });

  test("a holiday or a weekend says it is not a working day (L2-063 AC6)", async ({ goto, pages }) => {
    await goto("calendar", { month: "2026-12" });
    await pages.calendar.waitForReady();
    await pages.calendar.showWeek("21–27");

    await pages.calendar.openDay("Fri 25 Dec");
    await expect(pages.calendar.dayPanel()).toHaveAccessibleName("Out on 25 Dec");
    await expect(pages.calendar.dayPanelNote()).toHaveText("Christmas Day · not a working day");
    await expect(pages.calendar.dayPanelNames()).toHaveCount(0);

    await pages.calendar.openDay("Sat 26 Dec");
    await expect(pages.calendar.dayPanelNote()).toHaveText("Weekend · not a working day");
  });

  test("a short day says so in its heading (L2-063 AC6)", async ({ goto, pages, request }) => {
    const run = weekdays("2026-11-24", "2026-11-26");
    const out = ["Ana Ruiz", "Cleo Park", "Elif Yılmaz", "Finn Murphy"];
    for (const member of out) await paintDays(request, member, run, "Confirmed");
    try {
      await goto("calendar", { month: "2026-11" });
      await pages.calendar.waitForReady();
      await pages.calendar.showWeek("23–29");

      await pages.calendar.openDay("Thu 26 Nov");

      await expect(pages.calendar.dayPanelHeading()).toHaveText(/^\s*Thu 26 Nov\s*· short of people\s*$/);
      await expect(pages.calendar.dayPanelState("Ana Ruiz")).toHaveText("Confirmed");
    } finally {
      for (const member of out) await clearDays(request, member, run);
    }
  });
});
