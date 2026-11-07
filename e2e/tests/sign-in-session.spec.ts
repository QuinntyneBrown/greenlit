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

test.describe("Signing in, busy and failed", () => {
  test.beforeEach(async ({ goto, pages }) => {
    await goto("signIn");
    await pages.signIn.waitForReady();
  });

  test("the button is busy and the fields read-only while signing in (L2-001 AC4)", async ({ authApi, pages }) => {
    const release = await authApi.hold();
    await pages.signIn.signIn(PEOPLE.manager.email, DEMO_PASSWORD);

    await expect(pages.signIn.submit()).toHaveAttribute("aria-busy", "true");
    await expect(pages.signIn.submit()).toBeDisabled();
    await expect(pages.signIn.email()).toHaveAttribute("readonly", "");
    await expect(pages.signIn.password()).toHaveAttribute("readonly", "");

    release();
    await expect(pages.signIn.heading()).toHaveText("Signed in");
  });

  test("a wrong password says the email or password doesn't match, keeping both (L2-001 AC3)", async ({
    page,
    pages,
  }) => {
    await pages.signIn.signIn(PEOPLE.manager.email, "not-the-password");

    await expect(pages.signIn.failureTitle()).toHaveText("Email or password doesn’t match");
    await expect(pages.signIn.failureText()).toHaveText(
      "Check them and try again. If you’ve forgotten your password, you can reset it.",
    );
    await expect(pages.signIn.email()).toHaveValue(PEOPLE.manager.email);
    await expect(pages.signIn.password()).toHaveValue("not-the-password");
    await expect(pages.signIn.submit()).toBeEnabled();
    await expect(pages.signIn.email()).not.toHaveAttribute("readonly", /.*/);
    expect(new URL(page.url()).pathname).toBe("/sign-in");
  });

  test("an unknown email gets the same message (L2-001 AC3)", async ({ pages }) => {
    await pages.signIn.signIn("nobody@northwind.studio", DEMO_PASSWORD);

    await expect(pages.signIn.failureTitle()).toHaveText("Email or password doesn’t match");
  });

  test("a failing server says so, and trying again signs in", async ({ authApi, page, pages }) => {
    await authApi.fail();
    await pages.signIn.signIn(PEOPLE.manager.email, DEMO_PASSWORD);

    await expect(pages.signIn.failureTitle()).toHaveText("We couldn’t sign you in");
    await expect(pages.signIn.failureText()).toHaveText("Something went wrong on our side. Try again in a moment.");

    await page.unrouteAll();
    await pages.signIn.submit().click();
    await expect(pages.signIn.heading()).toHaveText("Signed in");
  });
});
