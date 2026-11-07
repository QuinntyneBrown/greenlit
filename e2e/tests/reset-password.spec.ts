// Acceptance Test
// Traces to: L2-003
// Description: A person follows the emailed link, chooses a new password once, and signs in with it.
// Data: every test makes a fresh account through the real API (fixtures/password-reset.ts) so no seeded password changes,
//       and reads the link from the e2e API's log (ADR-010).

import { test, expect } from "../fixtures/gl-test.js";
import { inviterFor } from "../fixtures/session.js";
import { ensureOwnTeam } from "../fixtures/team.js";
import { NEW_PASSWORD, OLD_PASSWORD, newAccount, requestResetLink, resetToken, signInStatus, useLink } from "../fixtures/password-reset.js";

test.describe("Reset password page", () => {
  test.beforeEach(async ({ request }, testInfo) => {
    await ensureOwnTeam(request, inviterFor(testInfo.project.name), "Invite team");
  });

  test("a valid link asks for a new password and its confirmation (L2-003 AC1)", async ({ goto, pages, request }, testInfo) => {
    const account = await newAccount(request, inviterFor(testInfo.project.name));
    const token = await requestResetLink(request, account.email);

    await goto("resetPassword", { token });
    await pages.resetPassword.waitForReady();

    const reset = pages.resetPassword;
    await expect(reset.body).toHaveAttribute("data-page", "reset-password");
    await expect(reset.heading()).toHaveText("Choose a new password");
    await expect(reset.lead()).toHaveText("Pick something you haven’t used here before.");
    await expect(reset.newPassword()).toHaveAttribute("type", "password");
    await expect(reset.newPassword()).toHaveAttribute("autocomplete", "new-password");
    await expect(reset.newPasswordHelp()).toHaveText("Use at least 10 characters.");
    await expect(reset.confirm()).toHaveAttribute("type", "password");
    await expect(reset.update()).toBeEnabled();
  });

  test("the page says it is checking the link while it loads", async ({ goto, pages, passwordResetApi, request }, testInfo) => {
    const account = await newAccount(request, inviterFor(testInfo.project.name));
    const token = await requestResetLink(request, account.email);
    const release = await passwordResetApi.holdCheck();

    await goto("resetPassword", { token });

    await pages.resetPassword.waitForReady();
    await expect(pages.resetPassword.lead()).toHaveText("Checking your link…");
    await expect(pages.resetPassword.loading()).toBeVisible();
    release();
    await expect(pages.resetPassword.lead()).toHaveText("Pick something you haven’t used here before.");
  });

  test("a link that was already used says it has expired and offers a new one (L2-003 AC4)", async ({ goto, page, pages, request }, testInfo) => {
    const account = await newAccount(request, inviterFor(testInfo.project.name));
    const token = await requestResetLink(request, account.email);
    await useLink(request, token, NEW_PASSWORD);

    await goto("resetPassword", { token });
    await pages.resetPassword.waitForReady();

    const reset = pages.resetPassword;
    await expect(reset.lead()).toHaveText("We couldn’t use that link.");
    await expect(reset.failureTitle()).toHaveText("This link has expired");
    await expect(reset.failureText()).toHaveText("Reset links work for one hour and only once. Request a new one to continue.");
    await expect(reset.newPassword()).toHaveCount(0);
    await reset.requestNewLink().click();
    await expect(page).toHaveURL(/\/forgot-password$/);
  });

  test("a link nobody issued says the same thing (L2-003 AC4)", async ({ goto, pages }) => {
    await goto("resetPassword", { token: "not-a-real-token" });
    await pages.resetPassword.waitForReady();

    await expect(pages.resetPassword.failureTitle()).toHaveText("This link has expired");
  });

  test("the form shows when the check itself cannot be made, and the submit decides", async ({
    goto,
    pages,
    passwordResetApi,
    request,
  }, testInfo) => {
    const account = await newAccount(request, inviterFor(testInfo.project.name));
    const token = await requestResetLink(request, account.email);
    await passwordResetApi.failCheck();

    await goto("resetPassword", { token });
    await pages.resetPassword.waitForReady();

    await expect(pages.resetPassword.newPassword()).toBeVisible();
  });

  test("a short password is named and the password does not change (L2-003 AC2)", async ({ goto, pages, passwordResetApi, request }, testInfo) => {
    const account = await newAccount(request, inviterFor(testInfo.project.name));
    const token = await requestResetLink(request, account.email);
    await goto("resetPassword", { token });
    await pages.resetPassword.waitForReady();
    const reset = pages.resetPassword;
    await reset.fill({ password: "short", confirm: "short" });

    await reset.update().click();

    await expect(reset.summaryTitle()).toHaveText("Fix 1 thing to continue");
    await expect(reset.summaryLinks()).toHaveText(["New password must be at least 10 characters"]);
    await expect(reset.summary()).toBeFocused();
    await expect(reset.fieldError("new")).toHaveText("Use at least 10 characters.");
    await expect(reset.newPassword()).toHaveAttribute("aria-invalid", "true");
    expect(passwordResetApi.confirms()).toBe(0);
    expect(await signInStatus(request, account.email, OLD_PASSWORD)).toBe(200);
  });

  test("a different confirmation is named in the summary and on the field (L2-003 AC3)", async ({ goto, pages, passwordResetApi, request }, testInfo) => {
    const account = await newAccount(request, inviterFor(testInfo.project.name));
    const token = await requestResetLink(request, account.email);
    await goto("resetPassword", { token });
    await pages.resetPassword.waitForReady();
    const reset = pages.resetPassword;
    await reset.fill({ password: NEW_PASSWORD, confirm: "something-else-entirely" });

    await reset.update().click();

    await expect(reset.summaryTitle()).toHaveText("Fix 1 thing to continue");
    await expect(reset.summaryLinks()).toHaveText(["Passwords don’t match"]);
    await expect(reset.fieldError("confirm")).toHaveText("This doesn’t match the new password.");
    await expect(reset.confirm()).toHaveAttribute("aria-invalid", "true");
    await reset.summaryLinks().first().click();
    await expect(reset.confirm()).toBeFocused();
    expect(passwordResetApi.confirms()).toBe(0);
  });

  test("both problems are listed together as the mock shows", async ({ goto, pages, request }, testInfo) => {
    const account = await newAccount(request, inviterFor(testInfo.project.name));
    const token = await requestResetLink(request, account.email);
    await goto("resetPassword", { token });
    await pages.resetPassword.waitForReady();
    const reset = pages.resetPassword;
    await reset.fill({ password: "short", confirm: "different" });

    await reset.update().click();

    await expect(reset.summaryTitle()).toHaveText("Fix 2 things to continue");
    await expect(reset.summaryLinks()).toHaveText(["New password must be at least 10 characters", "Passwords don’t match"]);
  });

  test("the button is busy and the fields read-only while the password is updated", async ({ goto, pages, passwordResetApi, request }, testInfo) => {
    const account = await newAccount(request, inviterFor(testInfo.project.name));
    const token = await requestResetLink(request, account.email);
    await goto("resetPassword", { token });
    await pages.resetPassword.waitForReady();
    const reset = pages.resetPassword;
    await reset.fill({ password: NEW_PASSWORD, confirm: NEW_PASSWORD });
    const release = await passwordResetApi.holdConfirm();

    await reset.update().click();

    await expect(reset.update()).toHaveAttribute("aria-busy", "true");
    await expect(reset.update()).toBeDisabled();
    await expect(reset.newPassword()).toHaveAttribute("readonly", "");
    await expect(reset.confirm()).toHaveAttribute("readonly", "");
    expect(passwordResetApi.confirms()).toBe(1);
    release();
    await expect(reset.heading()).toHaveText("All done");
  });

  test("a valid link and matching passwords change the password, once (L2-003 AC5, AC4)", async ({ goto, page, pages, request }, testInfo) => {
    const account = await newAccount(request, inviterFor(testInfo.project.name));
    const token = await requestResetLink(request, account.email);
    await goto("resetPassword", { token });
    await pages.resetPassword.waitForReady();
    const reset = pages.resetPassword;
    await reset.fill({ password: NEW_PASSWORD, confirm: NEW_PASSWORD });

    await reset.update().click();

    await expect(reset.heading()).toHaveText("All done");
    await expect(reset.lead()).toHaveText("Your password has been changed.");
    await expect(reset.doneTitle()).toHaveText("Password updated");
    await expect(reset.doneText()).toHaveText("You can sign in with your new password.");
    await expect(reset.signIn()).toHaveAttribute("href", "/sign-in");
    expect(await signInStatus(request, account.email, NEW_PASSWORD)).toBe(200);
    expect(await signInStatus(request, account.email, OLD_PASSWORD)).toBe(401);

    await page.goto(`/reset-password/${token}`);
    await pages.resetPassword.waitForReady();
    await expect(reset.failureTitle()).toHaveText("This link has expired");
  });

  test("after the update the person signs in with the new password", async ({ goto, pages, request }, testInfo) => {
    const account = await newAccount(request, inviterFor(testInfo.project.name));
    const token = await requestResetLink(request, account.email);
    await goto("resetPassword", { token });
    await pages.resetPassword.waitForReady();
    await pages.resetPassword.fill({ password: NEW_PASSWORD, confirm: NEW_PASSWORD });
    await pages.resetPassword.update().click();
    await pages.resetPassword.signIn().click();

    await pages.signIn.waitForReady();
    await pages.signIn.signIn(account.email, NEW_PASSWORD);

    await expect(pages.signIn.welcomeTitle()).toHaveText(`Welcome back, ${account.name.split(" ")[0]}`);
  });

  test("a person who forgot asks for a link, follows it, sets a new password and signs in; the link then fails", async ({
    goto,
    page,
    pages,
    request,
  }, testInfo) => {
    const account = await newAccount(request, inviterFor(testInfo.project.name));
    await goto("forgotPassword");
    await pages.forgotPassword.waitForReady();
    await pages.forgotPassword.requestLink(account.email);
    await expect(pages.forgotPassword.heading()).toHaveText("Check your email");
    const token = await resetToken(account.email);

    await goto("resetPassword", { token });
    await pages.resetPassword.waitForReady();
    await pages.resetPassword.fill({ password: NEW_PASSWORD, confirm: NEW_PASSWORD });
    await pages.resetPassword.update().click();
    await expect(pages.resetPassword.doneTitle()).toHaveText("Password updated");
    await pages.resetPassword.signIn().click();
    await pages.signIn.waitForReady();
    await pages.signIn.signIn(account.email, NEW_PASSWORD);
    await expect(pages.signIn.welcomeTitle()).toHaveText(`Welcome back, ${account.name.split(" ")[0]}`);

    await page.goto(`/reset-password/${token}`);
    await pages.resetPassword.waitForReady();
    await expect(pages.resetPassword.failureTitle()).toHaveText("This link has expired");
  });

  test("a link used elsewhere while the page was open says it has expired on submit (L2-003 AC4)", async ({ goto, pages, request }, testInfo) => {
    const account = await newAccount(request, inviterFor(testInfo.project.name));
    const token = await requestResetLink(request, account.email);
    await goto("resetPassword", { token });
    await pages.resetPassword.waitForReady();
    const reset = pages.resetPassword;
    await reset.fill({ password: NEW_PASSWORD, confirm: NEW_PASSWORD });
    await useLink(request, token, "elsewhere-secret-9");

    await reset.update().click();

    await expect(reset.failureTitle()).toHaveText("This link has expired");
    await expect(reset.requestNewLink()).toBeVisible();
    expect(await signInStatus(request, account.email, NEW_PASSWORD)).toBe(401);
  });

  test("when the update fails nothing changes, the fields stay filled and the person can try again (L2-003 AC6)", async ({
    goto,
    pages,
    passwordResetApi,
    request,
  }, testInfo) => {
    const account = await newAccount(request, inviterFor(testInfo.project.name));
    const token = await requestResetLink(request, account.email);
    await goto("resetPassword", { token });
    await pages.resetPassword.waitForReady();
    const reset = pages.resetPassword;
    await reset.fill({ password: NEW_PASSWORD, confirm: NEW_PASSWORD });
    await passwordResetApi.failConfirm();

    await reset.update().click();

    await expect(reset.failureTitle()).toHaveText("We couldn’t update your password");
    await expect(reset.failureText()).toHaveText("Something went wrong on our side. Nothing was changed. Try again in a moment.");
    await expect(reset.newPassword()).toHaveValue(NEW_PASSWORD);
    await expect(reset.update()).toBeEnabled();
    expect(await signInStatus(request, account.email, OLD_PASSWORD)).toBe(200);

    await passwordResetApi.recoverConfirm();
    await reset.update().click();
    await expect(reset.heading()).toHaveText("All done");
  });
});
