// Acceptance Test
// Traces to: L2-005 (Account page) AC2, AC3, AC7
// Description: A person changes their password from Account: the page checks the new password first, the current
//              password must be right, and the new password is the one that signs in afterwards.
// Data: a fresh member of the viewport's inviter team (fixtures/account.ts); a password change never touches a seeded person.

import { test, expect } from "../fixtures/gl-test.js";
import { freshAccount } from "../fixtures/account.js";
import { NEW_PASSWORD, OLD_PASSWORD, signInStatus } from "../fixtures/password-reset.js";
import { inviterFor } from "../fixtures/session.js";
import { ensureOwnTeam } from "../fixtures/team.js";

test.describe("Account: change the password", () => {
  test.beforeEach(async ({ request }, testInfo) => {
    await ensureOwnTeam(request, inviterFor(testInfo.project.name), "Invite team");
  });

  test("a short new password and a confirmation that differs are listed and nothing is sent (AC2)", async ({ accountApi, goto, pages, request }, testInfo) => {
    const account = await freshAccount(request, inviterFor(testInfo.project.name));
    await goto("account", { session: account.token });
    await pages.account.waitForReady();

    await pages.account.fillPasswords({ current: OLD_PASSWORD, next: "short", confirm: "different" });
    await pages.account.updatePassword().click();

    const page = pages.account;
    await expect(page.summaryTitle()).toHaveText("Fix 2 things to continue");
    await expect(page.summaryLinks()).toHaveText(["New password must be at least 10 characters", "Passwords don't match"]);
    await expect(page.passwordError("new")).toHaveText("Use at least 10 characters.");
    await expect(page.passwordError("confirm")).toHaveText("This doesn’t match the new password.");
    await expect(page.newPassword()).toHaveAttribute("aria-invalid", "true");
    await expect(page.summary()).toBeFocused();
    expect(accountApi.passwordChanges()).toBe(0);
    expect(await signInStatus(request, account.email, OLD_PASSWORD)).toBe(200);
  });

  test("the right current password changes it, says so, and the new password signs in (AC3)", async ({ goto, pages, request }, testInfo) => {
    const account = await freshAccount(request, inviterFor(testInfo.project.name));
    await goto("account", { session: account.token });
    await pages.account.waitForReady();

    await pages.account.fillPasswords({ current: OLD_PASSWORD, next: NEW_PASSWORD, confirm: NEW_PASSWORD });
    await pages.account.updatePassword().click();

    await expect(pages.account.passwordStatus()).toHaveText("Password updated");
    await expect(pages.account.currentPassword()).toHaveValue("");
    await expect(pages.account.newPassword()).toHaveValue("");
    await expect(pages.account.confirmPassword()).toHaveValue("");
    expect(await signInStatus(request, account.email, NEW_PASSWORD)).toBe(200);
    expect(await signInStatus(request, account.email, OLD_PASSWORD)).toBe(401);
  });

  test("a wrong current password shows the field error and changes nothing (AC7)", async ({ goto, pages, request }, testInfo) => {
    const account = await freshAccount(request, inviterFor(testInfo.project.name));
    await goto("account", { session: account.token });
    await pages.account.waitForReady();

    await pages.account.fillPasswords({ current: "not-my-password", next: NEW_PASSWORD, confirm: NEW_PASSWORD });
    await pages.account.updatePassword().click();

    await expect(pages.account.passwordError("current")).toHaveText("That isn’t your current password.");
    await expect(pages.account.currentPassword()).toHaveAttribute("aria-invalid", "true");
    await expect(pages.account.passwordStatus()).toHaveText("");
    expect(await signInStatus(request, account.email, OLD_PASSWORD)).toBe(200);
    expect(await signInStatus(request, account.email, NEW_PASSWORD)).toBe(401);
  });

  test("the button says Saving… and the fields are read-only while the change is sent, and it is sent once", async ({ accountApi, goto, pages, request }, testInfo) => {
    const account = await freshAccount(request, inviterFor(testInfo.project.name));
    await goto("account", { session: account.token });
    await pages.account.waitForReady();
    const release = await accountApi.holdPassword();

    await pages.account.fillPasswords({ current: OLD_PASSWORD, next: NEW_PASSWORD, confirm: NEW_PASSWORD });
    await pages.account.updatePassword().click();

    await expect(pages.account.updatePassword()).toHaveText("Saving…");
    await expect(pages.account.updatePassword()).toHaveAttribute("aria-busy", "true");
    await expect(pages.account.updatePassword()).toBeDisabled();
    await expect(pages.account.newPassword()).toHaveAttribute("readonly", "");
    release();
    await expect(pages.account.passwordStatus()).toHaveText("Password updated");
    await expect(pages.account.updatePassword()).toHaveText("Update password");
    expect(accountApi.passwordChanges()).toBe(1);
  });

  test("a change that fails says nothing was changed, and trying again works", async ({ accountApi, goto, pages, request }, testInfo) => {
    const account = await freshAccount(request, inviterFor(testInfo.project.name));
    await goto("account", { session: account.token });
    await pages.account.waitForReady();
    await accountApi.failPassword();

    await pages.account.fillPasswords({ current: OLD_PASSWORD, next: NEW_PASSWORD, confirm: NEW_PASSWORD });
    await pages.account.updatePassword().click();

    await expect(pages.account.passwordStatus()).toHaveText("We couldn’t update your password. Nothing was changed.");
    await expect(pages.account.newPassword()).toHaveValue(NEW_PASSWORD);
    expect(await signInStatus(request, account.email, OLD_PASSWORD)).toBe(200);
    await accountApi.recoverPassword();
    await pages.account.updatePassword().click();
    await expect(pages.account.passwordStatus()).toHaveText("Password updated");
    expect(await signInStatus(request, account.email, NEW_PASSWORD)).toBe(200);
  });
});
