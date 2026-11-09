// Acceptance Test
// Traces to: L2-063 AC4, AC5
// Description: On a phone the calendar answers "who is out together?" first, with a card of the month's short days.
// Data: the demo seed, November 2026, minimum of 4 (seven people). Painting Ana, Cleo, Elif and Finn confirmed on
//       24–26 Nov leaves three in (Ben's tentative days do not count): one run, as pages/calendar/phone-range. Each
//       viewport's juggler manages a Design team of two with no minimum (Kit Brown is the other row); each viewport's
//       founder manages a Studio team of one. Every test puts back what it painted.
//
// Given a team of seven with a minimum of 4, when nobody is short, then the card says "Never below the minimum in
//   November" and lists nothing, and no week tab carries a marker.
// Given four of seven confirmed on 24–26 Nov, when the calendar opens, then the card says "Below the minimum of 4 once
//   in November", lists "Tue 24 – Thu 26 Nov" with who is out in words, the tab 23–29 carries the marker "Short of
//   people this week" and the columns of 24–26 are banded.
// Given that run, when the person presses it, then the week 23–29 shows and Tue 24 Nov is open.
// Given no minimum, when nobody is short, then the card says "Never everyone out in November".
// Given a team of two, when both are out (requested), then the card says "Both out once in November"; when they never
//   are, "You are never both out in November". Tentative days do not count.
// Given a team of one, when the calendar opens, then no card shows (the empty state of L2-012 AC6 shows instead).

import { test, expect } from "../fixtures/gl-test.js";
import { setCoverageMinimum } from "../fixtures/coverage.js";
import { clearDays, paintDays, weekdays } from "../fixtures/days.js";
import { founderFor, jugglerFor } from "../fixtures/session.js";
import { resetTeams } from "../fixtures/teams.js";

const RUN = weekdays("2026-11-24", "2026-11-26");
const OUT_TOGETHER = ["Ana Ruiz", "Cleo Park", "Elif Yılmaz", "Finn Murphy"];

test.describe("Days short of people on a phone", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "The short-days card is the phone's (L2-063).");
  });

  test("a month with no short day says so and marks no week (L2-063 AC4)", async ({ goto, pages }) => {
    await goto("calendar", { month: "2026-11" });
    await pages.calendar.waitForReady();

    await expect(pages.calendar.shortDaysHeading()).toHaveText("Never below the minimum in November");
    await expect(pages.calendar.shortRuns()).toHaveCount(0);
    await expect(pages.calendar.shortWeekMarker("23–29")).toHaveCount(0);
  });

  test.describe("with a run of short days", () => {
    test.beforeEach(async ({ request }) => {
      for (const member of OUT_TOGETHER) await paintDays(request, member, RUN, "Confirmed");
    });
    test.afterEach(async ({ request }) => {
      for (const member of OUT_TOGETHER) await clearDays(request, member, RUN);
    });

    test("the card lists the run with who is out, its week is marked and its days banded (L2-063 AC4)", async ({ goto, pages }) => {
      await goto("calendar", { month: "2026-11" });
      await pages.calendar.waitForReady();

      await expect(pages.calendar.shortDaysHeading()).toHaveText("Below the minimum of 4 once in November");
      await expect(pages.calendar.shortRuns()).toHaveCount(1);
      await expect(pages.calendar.shortRunWho("Tue 24 – Thu 26 Nov")).toHaveText([
        "Ana · confirmed",
        "Ben · tentative",
        "Cleo · confirmed",
        "Elif · confirmed",
        "Finn · confirmed",
      ]);
      await expect(pages.calendar.shortWeekMarker("23–29")).toBeVisible();
      await expect(pages.calendar.shortWeekMarker("16–22")).toHaveCount(0);

      await pages.calendar.showWeek("23–29");
      for (const day of ["Tue 24 Nov", "Wed 25 Nov", "Thu 26 Nov"]) {
        await expect(await pages.calendar.weekBand(day)).toHaveAttribute("data-short", "");
      }
      await expect(await pages.calendar.weekBand("Mon 23 Nov")).not.toHaveAttribute("data-short");
    });

    test("pressing a run shows its week and opens its first day (L2-063 AC4)", async ({ goto, pages }) => {
      await goto("calendar", { month: "2026-11" });
      await pages.calendar.waitForReady();
      await pages.calendar.showWeek("2–8");

      await pages.calendar.shortRun("Tue 24 – Thu 26 Nov").click();

      await expect(pages.calendar.selectedWeekTab()).toHaveAccessibleName(/^23–29/);
      await expect(pages.calendar.weekDate("Tue 24 Nov")).toHaveAttribute("aria-expanded", "true");
    });
  });

  test("with no minimum, a month where everyone is never out says so (L2-063 AC4)", async ({ goto, pages, request }) => {
    await setCoverageMinimum(request, "manager", 0);
    try {
      await goto("calendar", { month: "2026-11" });
      await pages.calendar.waitForReady();

      await expect(pages.calendar.shortDaysHeading()).toHaveText("Never everyone out in November");
      await expect(pages.calendar.shortRuns()).toHaveCount(0);
    } finally {
      await setCoverageMinimum(request, "manager", 4);
    }
  });

  test("a team of two is told when both are out, and tentative days do not count (L2-063 AC4)", async ({ goto, pages, request }, testInfo) => {
    const juggler = jugglerFor(testInfo.project.name);
    await resetTeams(request, juggler);
    const both = weekdays("2026-11-11", "2026-11-12");
    try {
      await paintDays(request, "Kit Brown", both, "Requested", juggler);
      await paintDays(request, "Hana Ito", both, "Tentative", juggler);
      await goto("calendar", { month: "2026-11", as: juggler });
      await pages.calendar.waitForReady();
      await expect(pages.calendar.shortDaysHeading()).toHaveText("You are never both out in November");

      await paintDays(request, "Hana Ito", both, "Requested", juggler);
      await goto("calendar", { month: "2026-11", as: juggler });
      await pages.calendar.waitForReady();
      await expect(pages.calendar.shortDaysHeading()).toHaveText("Both out once in November");
      await expect(pages.calendar.shortRunWho("Wed 11 – Thu 12 Nov")).toHaveText(["Hana · requested", "Kit · requested"]);
    } finally {
      await clearDays(request, "Kit Brown", both, juggler);
      await clearDays(request, "Hana Ito", both, juggler);
    }
  });

  test("a team of one has no card (L2-063 AC5)", async ({ goto, pages }, testInfo) => {
    await goto("calendar", { month: "2026-11", as: founderFor(testInfo.project.name) });
    await pages.calendar.waitForReady();

    await expect(pages.calendar.emptyState()).toBeVisible();
    await expect(pages.calendar.shortDaysCard()).toHaveCount(0);
  });
});
