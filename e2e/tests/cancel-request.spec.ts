// Acceptance Test
// Traces to: L2-021 (Cancel a request)
// Description: A member withdraws a request the manager has not decided: a dialog asks first, the request
//              moves to Past as Cancelled and its days go back to tentative; a failure keeps it pending.
// Data: the demo seed, December 2026. Each test sends its own request for Ana, 21-22 Dec ("Winter break"),
//       so the seeded 16-20 Nov request stays pending; Ana's 21-22 Dec days are cleared after each test.

import { test, expect } from "../fixtures/gl-test.js";
import { clearDays } from "../fixtures/days.js";
import { sendOwnRequest } from "../fixtures/requests.js";

const DAYS = ["2026-12-21", "2026-12-22"];
const RANGE = "21–22 Dec · 2 days";

test.describe("Cancelling a request", () => {
  test.beforeEach(async ({ request }) => {
    await clearDays(request, "Ana Ruiz", DAYS);
    await sendOwnRequest(request, DAYS[0], DAYS[1], "Winter break");
  });
  test.afterEach(async ({ request }) => {
    await clearDays(request, "Ana Ruiz", DAYS);
  });

  test("Cancel request opens a dialog that names the request and asks first (AC1)", async ({ goto, pages }) => {
    await goto("myRequests", { as: "member" });
    await pages.requests.waitForReady();

    await pages.requests.cancelRequest(pages.requests.myRequest("Upcoming", RANGE)).click();

    const dialog = pages.cancelRequest;
    await expect(dialog.dialog()).toBeVisible();
    await expect(dialog.title()).toHaveText("Cancel this request?");
    await expect(dialog.description()).toHaveText("21–22 Dec · 2 days · “Winter break”");
    await expect(dialog.body()).toHaveText(
      "Maya Chen hasn’t decided yet. Cancelling removes the request and clears the yellow days from your row.",
    );
    await expect(dialog.keep()).toBeEnabled();
    await expect(dialog.cancel()).toHaveText("Cancel request");
    await expect(dialog.keep()).toBeFocused();
  });

  test("Keep request closes the dialog and the request stays pending", async ({ goto, pages, requestsApi }) => {
    await goto("myRequests", { as: "member" });
    await pages.requests.waitForReady();
    await pages.requests.cancelRequest(pages.requests.myRequest("Upcoming", RANGE)).click();

    await pages.cancelRequest.keep().click();

    await expect(pages.cancelRequest.dialog()).toBeHidden();
    await expect(pages.requests.myRequest("Upcoming", RANGE)).toHaveCount(1);
    expect(requestsApi.cancels()).toBe(0);
  });

  test("Esc closes the dialog and focus returns to the button that opened it (keyboard)", async ({ goto, page, pages }) => {
    await goto("myRequests", { as: "member" });
    await pages.requests.waitForReady();
    const button = pages.requests.cancelRequest(pages.requests.myRequest("Upcoming", RANGE));
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(pages.cancelRequest.dialog()).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(pages.cancelRequest.dialog()).toBeHidden();
    await expect(button).toBeFocused();
  });

  test("confirming cancels it: the request moves to Past as Cancelled and its days turn blue (AC2)", async ({ goto, pages }) => {
    await goto("myRequests", { as: "member" });
    await pages.requests.waitForReady();
    await pages.requests.cancelRequest(pages.requests.myRequest("Upcoming", RANGE)).click();

    await pages.cancelRequest.cancel().click();

    await expect(pages.cancelRequest.dialog()).toBeHidden();
    await expect(pages.requests.myRequest("Upcoming", RANGE)).toHaveCount(0);
    const cancelled = pages.requests.myRequest("Past", RANGE);
    await expect(cancelled.first()).toBeVisible();
    await expect(cancelled.first().locator(".req-status")).toHaveText("Cancelled");
    await expect(pages.requests.cancelRequest(cancelled.first())).toHaveCount(0);
    // Ana's other pending request is untouched.
    await expect(pages.requests.myRequest("Upcoming", "16–20 Nov · 5 days")).toHaveCount(1);

    await goto("calendar", { as: "member", month: "2026-12" });
    await pages.calendar.waitForReady();
    await expect(pages.calendar.cell("Ana Ruiz", "Mon 21 Dec")).toHaveAttribute("data-status", "tentative");
    await expect(pages.calendar.cell("Ana Ruiz", "Tue 22 Dec")).toHaveAttribute("data-status", "tentative");
  });

  test("while it is being withdrawn the button says Cancelling… and every way out is off (AC2)", async ({ goto, page, pages, requestsApi }) => {
    const release = await requestsApi.holdCancel();
    await goto("myRequests", { as: "member" });
    await pages.requests.waitForReady();
    await pages.requests.cancelRequest(pages.requests.myRequest("Upcoming", RANGE)).click();

    await pages.cancelRequest.cancel().click();

    await expect(pages.cancelRequest.cancel()).toHaveText("Cancelling…");
    await expect(pages.cancelRequest.cancel()).toHaveAttribute("aria-busy", "true");
    await expect(pages.cancelRequest.cancel()).toBeDisabled();
    await expect(pages.cancelRequest.keep()).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(pages.cancelRequest.dialog()).toBeVisible();
    expect(requestsApi.cancels()).toBe(1);

    release();
    await expect(pages.cancelRequest.dialog()).toBeHidden();
  });

  test("when it fails the dialog says the request is still pending and Cancel request tries again (AC3)", async ({ goto, pages, requestsApi }) => {
    await requestsApi.failCancel();
    await goto("myRequests", { as: "member" });
    await pages.requests.waitForReady();
    await pages.requests.cancelRequest(pages.requests.myRequest("Upcoming", RANGE)).click();

    await pages.cancelRequest.cancel().click();

    await expect(pages.cancelRequest.failure()).toBeVisible();
    await expect(pages.cancelRequest.failure()).toContainText("We couldn’t cancel the request");
    await expect(pages.cancelRequest.failure()).toContainText("Check your connection and try again. Your request is still pending.");
    await expect(pages.cancelRequest.cancel()).toBeEnabled();
    await expect(pages.cancelRequest.keep()).toBeEnabled();
    await pages.cancelRequest.keep().click();
    await expect(pages.requests.myRequest("Upcoming", RANGE)).toHaveCount(1);

    await requestsApi.recoverCancel();
    await pages.requests.cancelRequest(pages.requests.myRequest("Upcoming", RANGE)).click();
    await expect(pages.cancelRequest.failure()).toHaveCount(0);
    await pages.cancelRequest.cancel().click();
    await expect(pages.cancelRequest.dialog()).toBeHidden();
    await expect(pages.requests.myRequest("Upcoming", RANGE)).toHaveCount(0);
  });

  test("a member sees no Cancel request on a request that is no longer pending (AC4)", async ({ goto, pages }) => {
    await goto("myRequests", { as: "member" });
    await pages.requests.waitForReady();

    await expect(pages.requests.mine("Past").locator(".req-status", { hasText: "Cancelled" }).first()).toBeVisible();
    await expect(pages.requests.group("Past").getByRole("button", { name: "Cancel request" })).toHaveCount(0);
  });
});
