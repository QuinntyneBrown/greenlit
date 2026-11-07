// Acceptance Test
// Traces to: L2-046
// Description: A page opened while Greenlit is offline, with nothing loaded, shows the offline page.
// Data: the demo seed. Nothing is saved, so no data is changed.

import { test, expect } from "../fixtures/gl-test.js";

test.describe("Offline", () => {
  test("opening a page while offline shows the offline page (L2-046 AC4)", async ({ goto, pages }) => {
    await goto("calendar", { as: "member" });
    await pages.calendar.waitForReady();
    await pages.connection.goOffline();
    await expect(pages.connection.title()).toHaveText("You’re offline");

    await pages.calendar.openFromMainNav("Year");

    await pages.offline.waitForReady();
    await expect(pages.offline.title()).toHaveText("You’re offline");
    await expect(pages.offline.message()).toHaveText(
      "Check your connection. Greenlit will pick up where you left off, and nothing you’ve seen has changed.",
    );
    await expect(pages.offline.tryAgain()).toBeVisible();
  });

  test("Try again while still offline stays on the offline page (L2-046 AC4)", async ({ goto, pages }) => {
    await goto("calendar", { as: "member" });
    await pages.calendar.waitForReady();
    await pages.connection.goOffline();
    await pages.calendar.openFromMainNav("Year");
    await pages.offline.waitForReady();

    await pages.offline.tryAgain().click();

    await expect(pages.offline.title()).toHaveText("You’re offline");
  });

  test("Try again once back online opens the page that was wanted (L2-046 AC4)", async ({ goto, pages }) => {
    await goto("calendar", { as: "member" });
    await pages.calendar.waitForReady();
    await pages.connection.goOffline();
    await pages.calendar.openFromMainNav("Year");
    await pages.offline.waitForReady();

    await pages.connection.goOnline();
    await pages.offline.tryAgain().click();

    await pages.year.waitForReady();
  });
});
