// Acceptance Test
// Traces to: L2-002
// Description: A person asks for a password reset link; the page says the same thing whether or not the address has an account.
// Data: the address is a fresh one no account uses, so the answer is the one a stranger would get (fixtures/invitation.ts).

import { test, expect } from "../fixtures/gl-test.js";
import { freshEmail } from "../fixtures/invitation.js";

test.describe("Forgot password page", () => {
  test.beforeEach(async ({ goto, pages }) => {
    await goto("forgotPassword");
    await pages.forgotPassword.waitForReady();
  });

  test("the page asks for an email and offers the way back (L2-002 AC1)", async ({ pages }) => {
    const forgot = pages.forgotPassword;
    await expect(forgot.body).toHaveAttribute("data-page", "forgot-password");
    await expect(forgot.heading()).toHaveText("Reset your password");
    await expect(forgot.lead()).toHaveText("Enter your email and we’ll send you a link.");
    await expect(forgot.email()).toHaveAttribute("type", "email");
    await expect(forgot.emailHelp()).toHaveText("We’ll send a link to reset your password.");
    await expect(forgot.send()).toBeEnabled();
    await expect(forgot.backToSignIn()).toHaveAttribute("href", "/sign-in");
  });

  test("asking for a link says to check the email, naming the address (L2-002 AC2)", async ({ passwordResetApi, pages }) => {
    const forgot = pages.forgotPassword;
    const email = freshEmail("stranger");

    await forgot.requestLink(email);

    await expect(forgot.heading()).toHaveText("Check your email");
    await expect(forgot.sentTitle()).toHaveText("Check your email");
    await expect(forgot.sentText()).toHaveText(`If ${email} has an account, a reset link is on its way. It works for one hour.`);
    await expect(forgot.backToSignIn()).toHaveAttribute("href", "/sign-in");
    expect(passwordResetApi.requests()).toBe(1);
  });

  test("an empty or malformed email is named and nothing is sent (L2-002 AC4)", async ({ passwordResetApi, pages }) => {
    const forgot = pages.forgotPassword;
    await forgot.send().click();

    await expect(forgot.summaryTitle()).toHaveText("Fix 1 thing to continue");
    await expect(forgot.summaryLinks()).toHaveText(["Enter a valid email address"]);
    await expect(forgot.summary()).toBeFocused();
    await expect(forgot.email()).toHaveAttribute("aria-invalid", "true");
    await expect(forgot.emailError()).toHaveText("Enter a valid email address, like name@company.com.");

    await forgot.email().fill("maya@northwind");
    await forgot.send().click();
    await expect(forgot.emailError()).toHaveText("Enter a valid email address, like name@company.com.");
    expect(passwordResetApi.requests()).toBe(0);
  });

  test("the button is busy and the field read-only while the link is requested", async ({ passwordResetApi, pages }) => {
    const forgot = pages.forgotPassword;
    const release = await passwordResetApi.holdRequest();

    await forgot.requestLink(freshEmail("stranger"));

    await expect(forgot.send()).toHaveAttribute("aria-busy", "true");
    await expect(forgot.send()).toBeDisabled();
    await expect(forgot.email()).toHaveAttribute("readonly", "");
    await forgot.send().click({ force: true }).catch(() => undefined);
    expect(passwordResetApi.requests()).toBe(1);
    release();
    await expect(forgot.heading()).toHaveText("Check your email");
  });

  test("when the email cannot be sent the page says so and the person can try again (L2-002 AC3)", async ({
    passwordResetApi,
    pages,
  }) => {
    const forgot = pages.forgotPassword;
    const email = freshEmail("stranger");
    await passwordResetApi.failRequest();

    await forgot.requestLink(email);

    await expect(forgot.failureTitle()).toHaveText("We couldn’t send the email");
    await expect(forgot.failureText()).toHaveText("Something went wrong on our side. Try again in a moment.");
    await expect(forgot.email()).toHaveValue(email);
    await expect(forgot.send()).toBeEnabled();
    await expect(forgot.heading()).toHaveText("Reset your password");

    await passwordResetApi.recoverRequest();
    await forgot.send().click();
    await expect(forgot.heading()).toHaveText("Check your email");
  });
});
