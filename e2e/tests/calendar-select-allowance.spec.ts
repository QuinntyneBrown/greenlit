// Acceptance Test
// Traces to: L2-016 AC5, L2-030 AC2, L2-030 AC4
// Description: The selection bar warns, without blocking, when a selection goes over the member's allowance.
// Data: the demo seed. Ana has 11 days left and 5 requested (16-20 Nov). Each test first requests her 7-11 Dec
//       through the API (10 requested), so one more working day fits and the next goes over; 7-18 Dec is cleared after.

import { test, expect } from "../fixtures/gl-test.js";
import { clearDays, paintDays, weekdays } from "../fixtures/days.js";

const ANA_DECEMBER = weekdays("2026-12-07", "2026-12-18");

test.describe("The selection bar and the allowance", () => {
  test.beforeEach(async ({ request }) => {
    await clearDays(request, "Ana Ruiz", ANA_DECEMBER);
    await paintDays(request, "Ana Ruiz", weekdays("2026-12-07", "2026-12-11"), "Requested");
  });
  test.afterEach(async ({ request }) => {
    await clearDays(request, "Ana Ruiz", ANA_DECEMBER);
  });

  test("shows how many days a selection takes over the allowance (L2-016 AC5, L2-030 AC2)", async ({ goto, pages }) => {
    await goto("calendar", { month: "2026-12" });
    await pages.calendar.waitForReady();

    await pages.calendar.select("Ana Ruiz", "Mon 14 Dec", "Wed 16 Dec");

    await expect(pages.calendar.selectionTitle()).toHaveText("Ana Ruiz · 14–16 Dec");
    await expect(pages.calendar.selectionMeta()).toContainText("3 days working");
    await expect(pages.calendar.selectionMeta()).toContainText("2 days over allowance");
  });

  test("shows no warning while the selection fits (L2-016 AC5)", async ({ goto, pages }) => {
    await goto("calendar", { month: "2026-12" });
    await pages.calendar.waitForReady();

    await pages.calendar.select("Ana Ruiz", "Mon 14 Dec");

    await expect(pages.calendar.selectionMeta()).toHaveText("1 day working");
  });

  test("a day already requested is not counted twice", async ({ goto, pages }) => {
    await goto("calendar", { month: "2026-12" });
    await pages.calendar.waitForReady();

    await pages.calendar.select("Ana Ruiz", "Mon 7 Dec", "Wed 9 Dec");

    await expect(pages.calendar.selectionMeta()).toHaveText("3 days working");
  });

  test("the warning never blocks: the days are still requested (L2-030 AC4)", async ({ goto, pages }) => {
    await goto("calendar", { as: "member", month: "2026-12" });
    await pages.calendar.waitForReady();
    await pages.calendar.select("Ana Ruiz", "Mon 14 Dec", "Wed 16 Dec");
    await expect(pages.calendar.selectionMeta()).toContainText("2 days over allowance");

    await pages.calendar.selectionAction("Request").click();

    await expect(pages.calendar.cell("Ana Ruiz", "Tue 15 Dec")).toHaveAttribute("data-status", "requested");
    await expect(pages.calendar.toast("Requested 3 days")).toContainText("That’s 2 days over your allowance.");
  });
});
