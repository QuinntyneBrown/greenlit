// Acceptance Test
// Traces to: L2-042 (Coverage flags: AC1 calendar, AC3 request detail; AC2 is approve-request.spec.ts)
// Description: A working day with fewer people in than the minimum is outlined on the calendar's Out row and
//              named so; the request dialog's "Team those weeks" flags the same days.
// Data: the demo seed, November 2026, minimum 4 of 7. Ana is out 16-20 Nov (requested), Dev 18-19 Nov; the
//       tests confirm Ben and Cleo on 18 Nov (4 out, 3 in) and clear them afterwards.

import { test, expect, GRID_ONLY } from "../fixtures/gl-test.js";
import { clearDays } from "../fixtures/days.js";
import { confirmDays, memberId } from "../fixtures/requests.js";

test.describe("Coverage flags", () => {
  test.beforeEach(async ({ request }) => {
    await confirmDays(request, await memberId(request, "Ben Okafor"), ["2026-11-18"]);
    await confirmDays(request, await memberId(request, "Cleo Park"), ["2026-11-18"]);
  });
  test.afterEach(async ({ request }) => {
    await clearDays(request, "Ben Okafor", ["2026-11-18"]);
    await clearDays(request, "Cleo Park", ["2026-11-18"]);
  });

  test("a day with fewer people in than the minimum is outlined and says so; a day with enough is not (L2-042 AC1)", async ({ goto, pages, isMobile }) => {
    test.skip(isMobile, GRID_ONLY);
    await goto("calendar", { month: "2026-11" });
    await pages.calendar.waitForReady();

    const short = await pages.calendar.outCell("Wed 18 Nov");
    await expect(short).toHaveAccessibleName("4 out, 3 in. Below the minimum of 4");
    await expect(short).toHaveAttribute("data-level", "short");
    const enough = await pages.calendar.outCell("Thu 19 Nov");
    await expect(enough).toHaveAccessibleName("2 out, 5 in");
    await expect(enough).not.toHaveAttribute("data-level", "short");
  });

  test("the request dialog's Team those weeks flags the same days (L2-042 AC3)", async ({ goto, pages }) => {
    await goto("requests");
    await pages.requests.waitForReady();

    await pages.requests.open("Ana Ruiz").click();

    const detail = pages.requestDetail;
    await expect(detail.out(2)).toHaveAttribute("aria-label", "4 out, 3 in. Below the minimum of 4");
    await expect(detail.out(2)).toHaveAttribute("data-level", "short");
    await expect(detail.out(3)).toHaveAttribute("aria-label", "2 out, 5 in");
    await expect(detail.out(3)).not.toHaveAttribute("data-level", "short");
  });
});
