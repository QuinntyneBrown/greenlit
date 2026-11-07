// Acceptance Test
// Traces to: L2-007 (Session expiry) AC1, AC2
// Description: A session that has run out sends the person to a page that says so and offers to sign in again;
//              signing in returns them to the page they were on.
// Data: the demo seed. Maya Chen manages the team.

import { test, expect } from "../fixtures/gl-test.js";
import { DEMO_PASSWORD, PEOPLE } from "../fixtures/session.js";

const HEADING = "Your session has expired";
const LEAD = "For your security you were signed out after a while away. Sign in again to pick up where you left off.";

test.describe("An expired session", () => {
  test("a browser that kept a token past its time opens the session-expired page (AC1)", async ({ goto, page, pages }) => {
    await goto("calendar", { expiredSession: true, month: "2026-12" });

    await pages.sessionExpired.waitForReady();
    await expect(pages.sessionExpired.heading()).toHaveText(HEADING);
    await expect(pages.sessionExpired.lead()).toHaveText(LEAD);
    await expect(pages.sessionExpired.signIn()).toBeVisible();
    const url = new URL(page.url());
    expect(url.pathname).toBe("/session-expired");
    expect(url.searchParams.get("returnUrl")).toBe("/?month=2026-12");
    expect(await pages.sessionExpired.storedSession()).toBeNull();
  });

  test("a call the API refuses as expired opens the session-expired page on any screen (AC1)", async ({ authApi, goto, page, pages }) => {
    await goto("calendar", { month: "2026-12" });
    await pages.calendar.waitForReady();
    await authApi.expireSession();

    await pages.calendar.nextMonth().click();

    await pages.sessionExpired.waitForReady();
    await expect(pages.sessionExpired.heading()).toHaveText(HEADING);
    expect(new URL(page.url()).searchParams.get("returnUrl")).toBe("/?month=2027-01");
    expect(await pages.sessionExpired.storedSession()).toBeNull();
  });

  test("a call refused for any other reason does not say the session expired", async ({ authApi, goto, pages }) => {
    await authApi.rejectSession();

    await goto("calendar");

    await pages.calendar.waitForReady();
    await expect(pages.calendar.body).toHaveAttribute("data-page", "calendar");
    expect(await pages.calendar.storedSession()).not.toBeNull();
  });

  test("Sign in returns the person to the page they were on (AC2)", async ({ authApi, goto, page, pages }) => {
    await goto("calendar", { month: "2026-12" });
    await pages.calendar.waitForReady();
    await authApi.expireSession();
    await pages.calendar.nextMonth().click();
    await pages.sessionExpired.waitForReady();
    await authApi.restoreSession();

    await pages.sessionExpired.signIn().click();
    await pages.signIn.waitForReady();
    await pages.signIn.signIn(PEOPLE.manager.email, DEMO_PASSWORD);

    await pages.calendar.waitForReady();
    expect(new URL(page.url()).pathname).toBe("/");
    await expect(pages.calendar.title()).toHaveText("January 2027");
  });

  test("opened with no page to return to, Sign in leads to the calendar", async ({ goto, pages }) => {
    await goto("sessionExpired");
    await pages.sessionExpired.waitForReady();

    await pages.sessionExpired.signIn().click();
    await pages.signIn.waitForReady();
    await pages.signIn.signIn(PEOPLE.manager.email, DEMO_PASSWORD);

    await pages.calendar.waitForReady();
  });
});
