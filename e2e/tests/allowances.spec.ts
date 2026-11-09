// Acceptance Test
// Traces to: L2-014 AC1, L2-019 AC1-AC3, L2-023 AC1, L2-029, L2-030 AC2-AC4
// Description: The Left column shows each member's days left for the leave year; the request dialog says how
//              many days are left to request and warns, without blocking, when a request goes over; painting
//              requested days past the allowance says so; the manager sees days left after a request.
// Data: the demo seed, "today" being the real clock in November 2026. Ana has 25 + 3 carried over = 28, 17 used,
//       none booked, 5 requested (16-20 Nov), so 11 left and 6 she can still request. Ben has 27 + 2 and nothing confirmed, so 29;
//       Cleo 25 less her 5 approved September days, 20; Dev 20 less 4 in October, 16; Finn 22 + 1 less 5 in October, 18.
//       Specs that add days to Ana or Cleo clear them again.

import { test, expect, GRID_ONLY } from "../fixtures/gl-test.js";
import { clearDays, paintDays, weekdays } from "../fixtures/days.js";

const CLEO_FEB_TO_MARCH = weekdays("2026-02-02", "2026-03-03");
const ANA_MARCH = weekdays("2026-03-03", "2026-03-06");
const ANA_DECEMBER = weekdays("2026-12-07", "2026-12-18");
const ANA_LATE_NOVEMBER = weekdays("2026-11-23", "2026-11-30");

test.describe("The Left column", () => {
  test("shows each member's allowance minus their used and booked days (L2-014 AC1, L2-029 AC4)", async ({ goto, pages, isMobile }) => {
    test.skip(isMobile, GRID_ONLY);
    await goto("calendar", { month: "2026-11" });
    await pages.calendar.waitForReady();

    // Ana: 28 - 17 used - 0 booked. Requested days (16-20 Nov) do not reduce it.
    await expect(pages.calendar.daysLeft("Ana Ruiz")).toHaveText("11");
    await expect(pages.calendar.daysLeft("Ana Ruiz")).toHaveAccessibleName("11 days left");
    await expect(pages.calendar.daysLeft("Ben Okafor")).toHaveText("29");
    await expect(pages.calendar.daysLeft("Cleo Park")).toHaveText("20");
    await expect(pages.calendar.daysLeft("Dev Patel")).toHaveText("16");
    await expect(pages.calendar.daysLeft("Finn Murphy")).toHaveText("18");
  });

  test("a member sees the same figures as the manager (L2-014 AC1)", async ({ goto, pages, isMobile }) => {
    test.skip(isMobile, GRID_ONLY);
    await goto("calendar", { as: "member", month: "2026-11" });
    await pages.calendar.waitForReady();

    await expect(pages.calendar.daysLeft("Ana Ruiz")).toHaveText("11");
    await expect(pages.calendar.daysLeft("Ben Okafor")).toHaveText("29");
  });

  test.describe("past the allowance", () => {
    test.beforeEach(async ({ request }) => {
      await clearDays(request, "Cleo Park", CLEO_FEB_TO_MARCH);
      await paintDays(request, "Cleo Park", CLEO_FEB_TO_MARCH, "Confirmed");
    });
    test.afterEach(async ({ request }) => {
      await clearDays(request, "Cleo Park", CLEO_FEB_TO_MARCH);
    });

    test("a negative figure shows with a minus sign and is marked over (L2-014 AC1)", async ({ goto, pages, isMobile }) => {
      test.skip(isMobile, GRID_ONLY);
      await goto("calendar", { month: "2026-11" });
      await pages.calendar.waitForReady();

      // 5 used in September plus 22 confirmed in February and March: 27 against 25.
      await expect(pages.calendar.daysLeft("Cleo Park")).toHaveText("-2");
      await expect(pages.calendar.daysLeft("Cleo Park")).toHaveAccessibleName("-2 days left");
      await expect(pages.calendar.daysLeft("Cleo Park")).toHaveAttribute("data-over", "");
      await expect(pages.calendar.daysLeft("Ana Ruiz")).not.toHaveAttribute("data-over");
    });
  });
});

test.describe("The request dialog and the allowance", () => {
  test.beforeEach(async ({ request }) => {
    await clearDays(request, "Ana Ruiz", ANA_DECEMBER);
  });
  test.afterEach(async ({ request }) => {
    await clearDays(request, "Ana Ruiz", ANA_DECEMBER);
  });

  test("before any dates it says how many days are left to request (L2-019 AC1)", async ({ goto, pages }) => {
    await goto("calendar", { as: "member", month: "2026-12" });
    await pages.calendar.waitForReady();

    await pages.calendar.requestTimeOff().click();

    await expect(pages.newRequest.count()).toHaveText("You have 6 days left to request. Weekends and holidays aren’t counted.");
  });

  test("picking dates says how many days are left after the request (L2-019 AC2)", async ({ goto, pages }) => {
    await goto("calendar", { as: "member", month: "2026-12" });
    await pages.calendar.waitForReady();
    await pages.calendar.requestTimeOff().click();

    await pages.newRequest.fill({ first: "2026-12-07", last: "2026-12-08" });

    await expect(pages.newRequest.count()).toHaveText("2 days from your allowance. 4 days left after this.");
    await expect(pages.newRequest.overage()).toHaveCount(0);
  });

  test("a request past what is left says how many days over and can still be sent (L2-019 AC3, L2-030 AC3-AC4)", async ({
    goto,
    pages,
    isMobile,
  }) => {
    test.skip(isMobile, GRID_ONLY);
    await goto("calendar", { as: "member", month: "2026-12" });
    await pages.calendar.waitForReady();
    await pages.calendar.requestTimeOff().click();

    await pages.newRequest.fill({ first: "2026-12-07", last: "2026-12-18" });

    await expect(pages.newRequest.count()).toHaveText("10 days from your allowance. That’s 4 days over.");
    await expect(pages.newRequest.overage()).toHaveText("That’s 4 days over.");
    await expect(pages.newRequest.send()).toBeEnabled();

    await pages.newRequest.send().click();

    await expect(pages.newRequest.dialog()).toBeHidden();
    await expect(pages.calendar.cell("Ana Ruiz", "Mon 7 Dec")).toHaveAttribute("data-status", "requested");
    await expect(pages.calendar.toast("Request sent")).toBeVisible();
  });
});

test.describe("Painting requested days", () => {
  test.beforeEach(async ({ request }) => {
    await clearDays(request, "Ana Ruiz", [...ANA_MARCH, ...ANA_LATE_NOVEMBER]);
  });
  test.afterEach(async ({ request }) => {
    await clearDays(request, "Ana Ruiz", [...ANA_MARCH, ...ANA_LATE_NOVEMBER]);
  });

  test("the toast says how many days over the allowance the request is (L2-030 AC5)", async ({ request, goto, pages, isMobile }) => {
    test.skip(isMobile, GRID_ONLY);
    // Four confirmed days in March leave Ana 7 days; she has 5 requested, so 3 more is 8 against 7.
    await paintDays(request, "Ana Ruiz", ANA_MARCH, "Confirmed");
    await goto("calendar", { as: "member", month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.choosePaint("Requested");

    await pages.calendar.paint("Ana Ruiz", "Mon 23 Nov", "Wed 25 Nov");

    const toast = pages.calendar.toast("Requested 3 days");
    await expect(toast).toBeVisible();
    await expect(toast).toContainText("Maya Chen will be notified.");
    await expect(toast).toContainText("That’s 1 day over your allowance.");
    await expect(pages.calendar.toastAction("Requested 3 days", "Undo")).toBeVisible();
  });

  test("days within the allowance get the plain toast (L2-030)", async ({ goto, pages, isMobile }) => {
    test.skip(isMobile, GRID_ONLY);
    // Ana has 11 left and 5 requested: 3 more is 8.
    await goto("calendar", { as: "member", month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.choosePaint("Requested");

    await pages.calendar.paint("Ana Ruiz", "Mon 23 Nov", "Wed 25 Nov");

    const toast = pages.calendar.toast("Requested 3 days");
    await expect(toast).toBeVisible();
    await expect(toast).not.toContainText("over your allowance");
  });
});

test.describe("The request detail", () => {
  test("shows the days left once the request is approved (L2-023 AC1)", async ({ goto, pages }) => {
    await goto("requests");
    await pages.requests.waitForReady();

    await pages.requests.open("Ana Ruiz").click();

    // 11 left - 5 requested.
    await expect(pages.requestDetail.daysLeftAfter()).toHaveText("6");
  });
});
