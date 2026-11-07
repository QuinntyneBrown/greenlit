// Acceptance Test
// Traces to: L2-046
// Description: A page that fails on the server shows the server-error page with an error reference.
// Data: the demo seed. The failure is staged in the browser; nothing is saved.

import { test, expect } from "../fixtures/gl-test.js";

test.describe("Server error", () => {
  test("a month that fails with a 500 shows the server-error page and its reference (L2-046 AC3)", async ({
    goto,
    pages,
    serverErrorApi,
  }) => {
    await serverErrorApi.failMonth("7F3A-91C2");

    await goto("calendar", { as: "member" });

    await pages.serverError.waitForReady();
    await expect(pages.serverError.title()).toHaveText("Something went wrong on our side");
    await expect(pages.serverError.message()).toHaveText(
      "We’ve been told and we’re looking into it. Your days are safe. Error reference 7F3A-91C2.",
    );
    await expect(pages.serverError.tryAgain()).toBeVisible();
    await expect(pages.serverError.backToCalendar()).toBeVisible();
  });

  test("Try again loads the page again once the server recovers (L2-046 AC3)", async ({
    goto,
    pages,
    serverErrorApi,
  }) => {
    await serverErrorApi.failMonth("7F3A-91C2");
    await goto("calendar", { as: "member" });
    await pages.serverError.waitForReady();

    await serverErrorApi.recover();
    await pages.serverError.tryAgain().click();

    await pages.calendar.waitForReady();
  });

  test("Back to calendar opens the calendar (L2-046 AC3)", async ({ goto, pages, serverErrorApi }) => {
    await serverErrorApi.failMonth("7F3A-91C2");
    await goto("calendar", { as: "member" });
    await pages.serverError.waitForReady();

    await serverErrorApi.recover();
    await pages.serverError.backToCalendar().click();

    await pages.calendar.waitForReady();
  });
});
