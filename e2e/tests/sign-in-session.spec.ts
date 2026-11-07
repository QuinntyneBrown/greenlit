// Acceptance Test
// Traces to: L2-001
// Description: Signing in opens the calendar, and guarded screens send a signed-out visitor to sign in and back.

import { test, expect } from "../fixtures/gl-test.js";
import { DEMO_PASSWORD, PEOPLE } from "../fixtures/session.js";

test.describe("Signing in", () => {
  test("valid credentials say Signed in and welcome the person, then open the calendar (L2-001 AC4)", async ({
    goto,
    page,
    pages,
  }) => {
    await goto("signIn");
    await pages.signIn.waitForReady();

    await pages.signIn.signIn(PEOPLE.manager.email, DEMO_PASSWORD);

    await expect(pages.signIn.heading()).toHaveText("Signed in");
    await expect(pages.signIn.lead()).toHaveText("You’re all set.");
    await expect(pages.signIn.welcomeTitle()).toHaveText("Welcome back, Maya");
    await expect(pages.signIn.welcomeText()).toHaveText("Taking you to your calendar…");
    await expect(pages.signIn.progress()).toBeVisible();
    await expect(pages.signIn.goToCalendarNow()).toBeVisible();

    await pages.calendar.waitForReady();
    expect(new URL(page.url()).pathname).toBe("/");
    await expect(pages.calendar.mainNavLink("Calendar")).toHaveAttribute("aria-current", "page");
  });

  test("Go to the calendar now opens it straight away (L2-001 AC4)", async ({ goto, pages }) => {
    await goto("signIn");
    await pages.signIn.waitForReady();
    await pages.signIn.signIn(PEOPLE.member.email, DEMO_PASSWORD);

    await expect(pages.signIn.welcomeTitle()).toHaveText("Welcome back, Ana");
    await pages.signIn.goToCalendarNow().click();

    await pages.calendar.waitForReady();
    await expect(pages.calendar.memberNames().first()).toHaveText("Ana Ruiz");
  });

  test("a signed-out visitor to the calendar signs in and comes back to the same month", async ({
    goto,
    page,
    pages,
  }) => {
    await goto("calendar", { signedOut: true, month: "2026-12" });
    await pages.signIn.waitForReady();
    const url = new URL(page.url());
    expect(url.pathname).toBe("/sign-in");
    expect(url.searchParams.get("returnUrl")).toBe("/?month=2026-12");

    await pages.signIn.signIn(PEOPLE.manager.email, DEMO_PASSWORD);

    await pages.calendar.waitForReady();
    await expect(pages.calendar.title()).toHaveText("December 2026");
  });

  test("a return address off the app is ignored", async ({ goto, page, pages }) => {
    await goto("signIn", { returnUrl: "//evil.example.com/steal" });
    await pages.signIn.waitForReady();

    await pages.signIn.signIn(PEOPLE.manager.email, DEMO_PASSWORD);

    await pages.calendar.waitForReady();
    const url = new URL(page.url());
    expect(url.origin).toBe("http://localhost:4200");
    expect(url.pathname).toBe("/");
  });

  test("a visitor who is already signed in goes from sign-in to the calendar", async ({ goto, page, pages }) => {
    await goto("calendar");
    await pages.calendar.waitForReady();

    await goto("signIn");

    await pages.calendar.waitForReady();
    expect(new URL(page.url()).pathname).toBe("/");
  });
});
