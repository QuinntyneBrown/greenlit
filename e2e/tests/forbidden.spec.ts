// Acceptance Test
// Traces to: L2-046
// Description: A member who opens a manager-only page sees the forbidden page and the manager's name.
// Data: the demo seed (manager Maya Chen). The refusal is staged in the browser; nothing is saved.

import { test, expect } from "../fixtures/gl-test.js";

test.describe("Forbidden", () => {
  test("a manager-only page the API refuses shows the forbidden page (L2-046 AC2)", async ({
    goto,
    pages,
    forbiddenApi,
  }) => {
    await forbiddenApi.denyRequests();

    await goto("requests", { as: "manager" });

    await pages.forbidden.waitForReady();
    await expect(pages.forbidden.title()).toHaveText("You don’t have access to this");
    await expect(pages.forbidden.message()).toHaveText(
      "Only managers can open this page. Ask Maya Chen if you need it.",
    );
    await expect(pages.forbidden.backToCalendar()).toBeVisible();
  });

  test("Back to calendar opens the calendar (L2-046 AC2)", async ({ goto, pages }) => {
    await goto("forbidden", { as: "member" });
    await pages.forbidden.waitForReady();

    await pages.forbidden.backToCalendar().click();

    await pages.calendar.waitForReady();
  });
});
