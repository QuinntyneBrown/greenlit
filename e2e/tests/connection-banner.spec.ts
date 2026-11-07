// Acceptance Test
// Traces to: L2-045
// Description: The banner that reports the connection and the read-only calendar while offline.
// Data: the demo seed, November 2026. Nothing is saved, so no data is changed.

import { test, expect } from "../fixtures/gl-test.js";
import { clearDays, paintDays } from "../fixtures/days.js";

test.describe("Connection banners", () => {
  test("going offline shows a banner with no dismiss button and makes the calendar read-only (L2-045 AC1)", async ({
    goto,
    pages,
  }) => {
    await goto("calendar", { as: "member", month: "2026-11" });
    await pages.calendar.waitForReady();
    await expect(pages.connection.banner()).toHaveCount(0);

    await pages.connection.goOffline();

    await expect(pages.connection.title()).toHaveText("You’re offline");
    await expect(pages.connection.text()).toHaveText(
      "You can look at the calendar, but changes can’t be saved until you’re back.",
    );
    await expect(pages.connection.dismissButton()).toHaveCount(0);
    // Still readable.
    await expect(pages.calendar.cell("Ana Ruiz", "Mon 23 Nov")).toBeVisible();
    // Painting is off: every way to choose a paint colour is disabled.
    await expect(pages.calendar.paintOptions().first()).toBeDisabled();
    await expect(pages.calendar.paintOption("Tentative")).toBeDisabled();
    await expect(pages.calendar.paintOption("Clear")).toBeDisabled();
  });

  test("selecting days does nothing while offline (L2-045 AC1)", async ({ goto, pages }) => {
    await goto("calendar", { as: "member", month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.connection.goOffline();
    await expect(pages.connection.title()).toHaveText("You’re offline");

    await pages.calendar.select("Ana Ruiz", "Mon 23 Nov", "Wed 25 Nov");

    await expect(pages.calendar.selectionBar()).toHaveCount(0);
    await expect(pages.calendar.selectedCells()).toHaveCount(0);
  });

  test("while the connection is checked the banner says Reconnecting… (L2-045 AC2)", async ({
    goto,
    pages,
    connectionApi,
  }) => {
    await goto("calendar", { as: "member", month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.connection.goOffline();
    await expect(pages.connection.title()).toHaveText("You’re offline");
    const release = await connectionApi.holdProbe();

    await pages.connection.goOnline();

    await expect(pages.connection.title()).toHaveText("Reconnecting…");
    await expect(pages.connection.text()).toHaveText("Hang on while we check your connection.");
    await expect(pages.connection.dismissButton()).toHaveCount(0);
    await expect(pages.calendar.paintOption("Tentative")).toBeDisabled();
    release();
  });

  test("a check that cannot reach Greenlit leaves the banner offline", async ({ goto, pages, connectionApi }) => {
    await goto("calendar", { as: "member", month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.connection.goOffline();
    await connectionApi.failProbe();

    await pages.connection.goOnline();

    await expect(pages.connection.title()).toHaveText("You’re offline");
    await expect(pages.calendar.paintOption("Tentative")).toBeDisabled();
  });

  test.describe("when the connection returns", () => {
    const PAINTED = ["2026-11-23"];
    test.beforeEach(async ({ request }) => {
      await clearDays(request, "Ana Ruiz", PAINTED);
    });
    test.afterEach(async ({ request }) => {
      await clearDays(request, "Ana Ruiz", PAINTED);
    });

    test("the banner says back online, leaves after 5 s, and painting works again (L2-045 AC3)", async ({
      goto,
      pages,
    }) => {
      await goto("calendar", { as: "member", month: "2026-11" });
      await pages.calendar.waitForReady();
      await pages.connection.goOffline();
      await expect(pages.connection.title()).toHaveText("You’re offline");

      await pages.connection.goOnline();

      await expect(pages.connection.title()).toHaveText("You’re back online");
      await expect(pages.connection.text()).toHaveText("Everything is up to date.");
      await expect(pages.connection.banner()).toHaveCount(0, { timeout: 9000 });

      await pages.calendar.choosePaint("Tentative");
      await pages.calendar.paint("Ana Ruiz", "Mon 23 Nov");
      await expect(pages.calendar.cell("Ana Ruiz", "Mon 23 Nov")).toHaveAttribute("data-status", "tentative");
    });

    test("back online, the calendar shows what changed while it was away (L2-045 AC3)", async ({
      goto,
      pages,
      request,
    }) => {
      await goto("calendar", { as: "member", month: "2026-11" });
      await pages.calendar.waitForReady();
      await expect(pages.calendar.cell("Ana Ruiz", "Mon 23 Nov")).toHaveAttribute("data-status", "empty");
      await pages.connection.goOffline();
      await expect(pages.connection.title()).toHaveText("You’re offline");
      await paintDays(request, "Ana Ruiz", PAINTED, "Tentative");

      await pages.connection.goOnline();

      await expect(pages.connection.title()).toHaveText("You’re back online");
      await expect(pages.calendar.cell("Ana Ruiz", "Mon 23 Nov")).toHaveAttribute("data-status", "tentative");
    });

    test("the back online banner can be dismissed before the 5 s are up", async ({ goto, pages }) => {
      await goto("calendar", { as: "member", month: "2026-11" });
      await pages.calendar.waitForReady();
      await pages.connection.goOffline();
      await pages.connection.goOnline();
      await expect(pages.connection.title()).toHaveText("You’re back online");

      await pages.connection.dismissButton().click();

      await expect(pages.connection.banner()).toHaveCount(0);
    });
  });

  test.describe("when requests fail while the browser is online", () => {
    test("a request that gets no answer shows an unstable banner that can be dismissed (L2-045 AC4)", async ({
      goto,
      pages,
      connectionApi,
    }) => {
      await goto("calendar", { as: "member", month: "2026-11" });
      await pages.calendar.waitForReady();
      await connectionApi.dropMonth();

      await pages.calendar.nextMonth().click();

      await expect(pages.connection.title()).toHaveText("Your connection is unstable");
      await expect(pages.connection.text()).toHaveText("Changes may take a moment to save.");
      await pages.connection.dismissButton().click();
      await expect(pages.connection.banner()).toHaveCount(0);
    });

    test("the unstable banner leaves when a request gets through again", async ({ goto, pages, connectionApi }) => {
      await goto("calendar", { as: "member", month: "2026-11" });
      await pages.calendar.waitForReady();
      await connectionApi.dropMonth();
      await pages.calendar.nextMonth().click();
      await expect(pages.connection.title()).toHaveText("Your connection is unstable");

      await connectionApi.recoverMonth();
      await pages.calendar.stateAction("Try again").click();

      await expect(pages.calendar.title()).toHaveText("December 2026");
      await expect(pages.connection.banner()).toHaveCount(0);
    });

    test("a request answered with a failure shows the sync banner with the last sync time and Retry (L2-045 AC5)", async ({
      goto,
      pages,
      connectionApi,
    }) => {
      await goto("calendar", { as: "member", month: "2026-11" });
      await pages.calendar.waitForReady();
      const syncedAt = clock();
      await connectionApi.failMonth();

      await pages.calendar.nextMonth().click();

      await expect(pages.connection.title()).toHaveText("We couldn’t sync the latest changes");
      const text = (await pages.connection.text().innerText()).trim();
      expect([`You’re looking at the calendar as of ${syncedAt}.`, `You’re looking at the calendar as of ${clock()}.`]).toContain(text);
      await expect(pages.connection.retryButton()).toBeVisible();
      await expect(pages.connection.dismissButton()).toHaveCount(0);
    });

    test("Retry brings the data back and says back online (L2-045 AC5)", async ({ goto, pages, connectionApi }) => {
      await goto("calendar", { as: "member", month: "2026-11" });
      await pages.calendar.waitForReady();
      await connectionApi.failMonth();
      await pages.calendar.nextMonth().click();
      await expect(pages.connection.title()).toHaveText("We couldn’t sync the latest changes");

      await connectionApi.recoverMonth();
      await pages.connection.retryButton().click();

      await expect(pages.connection.title()).toHaveText("You’re back online");
      await expect(pages.calendar.title()).toHaveText("December 2026");
      await expect(pages.calendar.errorState()).toHaveCount(0);
    });

    test("Retry while the failure goes on shows the sync banner again", async ({ goto, pages, connectionApi }) => {
      await goto("calendar", { as: "member", month: "2026-11" });
      await pages.calendar.waitForReady();
      await connectionApi.failMonth();
      await pages.calendar.nextMonth().click();
      await expect(pages.connection.retryButton()).toBeVisible();

      await pages.connection.retryButton().click();

      await expect(pages.connection.title()).toHaveText("We couldn’t sync the latest changes");
      await expect(pages.connection.retryButton()).toBeVisible();
    });
  });
});

/** The time as the banner writes it: 24-hour hours and minutes in the browser's time zone. */
function clock(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}
