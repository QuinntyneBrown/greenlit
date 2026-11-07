// Acceptance Test
// Traces to: L2-051
// Description: Continue with Google on the sign-in page: an existing account signs in, a newcomer gets a manager
//              account and goes to set up a team, and Google's refusals and failures are reported in place.
// Data: Google is a stand-in (fixtures/google.ts); the e2e API reads its tokens with the fake accounts reader
//       (ADR-012). Existing people are the seeded cast; a newcomer is a fresh address per test.

import { test, expect } from "../fixtures/gl-test.js";
import { freshEmail } from "../fixtures/invitation.js";
import { PEOPLE } from "../fixtures/session.js";

test.describe("Continue with Google", () => {
  test.beforeEach(async ({ goto, pages }) => {
    await goto("signIn");
    await pages.signIn.waitForReady();
  });

  test("the card offers Google below the password form (L2-051 AC1)", async ({ pages }) => {
    const signIn = pages.signIn;
    await expect(signIn.divider()).toHaveText("or");
    await expect(signIn.continueWithGoogle()).toBeEnabled();
    await expect(signIn.continueWithGoogle()).toHaveAttribute("type", "button");
    await expect(signIn.inviteNote()).toHaveText(
      "New here? Continue with Google to set up a team, or ask your manager to send you an invitation.",
    );
  });

  test("while Google asks, nothing else can be pressed; closing Google's window changes nothing (L2-051 AC2)", async ({
    authApi,
    google,
    pages,
  }) => {
    const signIn = pages.signIn;
    await signIn.fill("maya@northwind.studio", "");
    await google.willDismiss();
    const release = await google.hold();

    await signIn.continueWithGoogle().click();

    await expect(signIn.continueWithGoogle()).toBeDisabled();
    await expect(signIn.continueWithGoogle()).toHaveAttribute("aria-busy", "true");
    await expect(signIn.email()).toHaveAttribute("readonly", "");
    await expect(signIn.password()).toHaveAttribute("readonly", "");
    await expect(signIn.submit()).toBeDisabled();
    await release();

    await expect(signIn.continueWithGoogle()).toBeEnabled();
    await expect(signIn.email()).not.toHaveAttribute("readonly", "");
    await expect(signIn.email()).toHaveValue("maya@northwind.studio");
    await expect(signIn.failure()).toHaveCount(0);
    expect(authApi.googleRequests()).toBe(0);
  });

  test("a Google account with the email of an existing account signs that person in (L2-051 AC3)", async ({
    authApi,
    google,
    page,
    pages,
  }) => {
    const signIn = pages.signIn;
    await google.willChoose({ email: PEOPLE.manager.email, name: PEOPLE.manager.name });
    const release = await authApi.holdGoogle();

    await signIn.continueWithGoogle().click();

    await expect(signIn.continueWithGoogle()).toHaveAttribute("aria-busy", "true");
    release();
    await expect(signIn.heading()).toHaveText("Signed in");
    await expect(signIn.welcomeTitle()).toHaveText("Welcome back, Maya");
    await expect(signIn.welcomeText()).toHaveText("Taking you to your calendar…");
    await expect(signIn.goToCalendarNow()).toBeVisible();
    await pages.calendar.waitForReady();
    expect(new URL(page.url()).pathname).toBe("/");
    expect(authApi.requests()).toBe(0);
  });

  test("a Google account nobody has becomes a manager account that goes on to set up a team (L2-051 AC4)", async ({
    google,
    page,
    pages,
  }) => {
    const signIn = pages.signIn;
    await google.willChoose({ email: freshEmail("rosa"), name: "Rosa Marín" });

    await signIn.continueWithGoogle().click();

    await expect(signIn.heading()).toHaveText("Account created");
    await expect(signIn.lead()).toHaveText("You’re all set.");
    await expect(signIn.welcomeTitle()).toHaveText("Welcome, Rosa");
    await expect(signIn.welcomeText()).toHaveText("Taking you to set up your team…");
    await expect(signIn.progress()).toBeVisible();
    await expect(signIn.setUpTeamNow()).toBeVisible();
    await pages.createTeam.waitForReady();
    expect(new URL(page.url()).pathname).toBe("/create-team");
  });

  test("a Google account whose email is not verified is refused and the form stays (L2-051 AC5)", async ({
    google,
    pages,
  }) => {
    const signIn = pages.signIn;
    await signIn.fill("maya@northwind.studio", "");
    await google.willChoose({ email: PEOPLE.manager.email, name: PEOPLE.manager.name, email_verified: false });

    await signIn.continueWithGoogle().click();

    await expect(signIn.failureTitle()).toHaveText("We couldn’t sign you in with Google");
    await expect(signIn.failureText()).toHaveText(
      "Google hasn’t verified that email address. Verify it with Google, or sign in with your email and password.",
    );
    await expect(signIn.email()).toHaveValue("maya@northwind.studio");
    await expect(signIn.continueWithGoogle()).toBeEnabled();
    await expect(signIn.heading()).toHaveText("Sign in");
  });

  test("a failure on Greenlit's side is reported in place (L2-051 AC6)", async ({ authApi, google, pages }) => {
    const signIn = pages.signIn;
    await google.willChoose({ email: PEOPLE.manager.email, name: PEOPLE.manager.name });
    await authApi.failGoogle();

    await signIn.continueWithGoogle().click();

    await expect(signIn.failureTitle()).toHaveText("We couldn’t sign you in with Google");
    await expect(signIn.failureText()).toHaveText("Something went wrong on our side. Try again in a moment.");
    await expect(signIn.continueWithGoogle()).toBeEnabled();
  });

  test("a failure on Google's side is reported the same way and sends nothing (L2-051 AC6)", async ({
    authApi,
    google,
    pages,
  }) => {
    const signIn = pages.signIn;
    await google.willFail();

    await signIn.continueWithGoogle().click();

    await expect(signIn.failureTitle()).toHaveText("We couldn’t sign you in with Google");
    await expect(signIn.failureText()).toHaveText("Something went wrong on our side. Try again in a moment.");
    expect(authApi.googleRequests()).toBe(0);
  });

  test("a password error clears when Google is tried, and Google's error clears on a password attempt", async ({
    google,
    pages,
  }) => {
    const signIn = pages.signIn;
    await signIn.signIn("maya@northwind.studio", "not-the-password");
    await expect(signIn.failureTitle()).toHaveText("Email or password doesn’t match");
    await google.willFail();

    await signIn.continueWithGoogle().click();

    await expect(signIn.failureTitle()).toHaveText("We couldn’t sign you in with Google");
  });
});
