// Acceptance Test
// Traces to: L2-005 (Account page) AC1, AC4
// Description: Account, from the account menu, shows the Profile, Password and Sign out sections, says so when it
//              cannot load, and offers Sign out.
// Data: a fresh member of the viewport's inviter team (fixtures/account.ts), so no seeded person changes.

import { test, expect } from "../fixtures/gl-test.js";
import { freshAccount } from "../fixtures/account.js";
import { inviterFor } from "../fixtures/session.js";
import { ensureOwnTeam } from "../fixtures/team.js";

test.describe("Account page", () => {
  test.beforeEach(async ({ request }, testInfo) => {
    await ensureOwnTeam(request, inviterFor(testInfo.project.name), "Invite team");
  });

  test("the account menu opens Account with Profile, Password and Sign out (AC1)", async ({ goto, pages, request }, testInfo) => {
    const account = await freshAccount(request, inviterFor(testInfo.project.name));
    await goto("calendar", { session: account.token });
    await pages.calendar.waitForReady();

    await pages.accountMenu.open();
    await pages.accountMenu.item("Account").click();
    await pages.account.waitForReady();

    const page = pages.account;
    await expect(page.body).toHaveAttribute("data-page", "account");
    await expect(page.heading()).toBeVisible();
    await expect(page.sectionTitles()).toHaveText(["Profile", "Password", "Sign out"]);
    await expect(page.sectionIntro("Profile")).toHaveText("How you appear to your team.");
    await expect(page.displayName()).toHaveValue(account.name);
    await expect(page.email()).toHaveValue(account.email);
    await expect(page.emailHelp()).toHaveText("This is how you sign in.");
    await expect(page.saveChanges()).toHaveText("Save changes");
    await expect(page.saveChanges()).toBeDisabled();
    await expect(page.sectionIntro("Password")).toHaveText("Use at least 10 characters.");
    await expect(page.currentPassword()).toHaveAttribute("type", "password");
    await expect(page.newPassword()).toHaveAttribute("autocomplete", "new-password");
    await expect(page.confirmPassword()).toHaveAttribute("type", "password");
    await expect(page.updatePassword()).toHaveText("Update password");
    await expect(page.sectionIntro("Sign out")).toHaveText("You'll need your email and password to get back in.");
    await expect(page.signOut()).toBeVisible();
  });

  test("the page shows placeholders while the account loads", async ({ accountApi, goto, pages, request }, testInfo) => {
    const account = await freshAccount(request, inviterFor(testInfo.project.name));
    const release = await accountApi.holdGet();

    await goto("account", { session: account.token });

    await pages.account.waitForReady();
    await expect(pages.account.loading()).toHaveCount(2);
    await expect(pages.account.displayName()).toHaveCount(0);
    release();
    await expect(pages.account.displayName()).toHaveValue(account.name);
    await expect(pages.account.loading()).toHaveCount(0);
  });

  test("an account that cannot be loaded says so and Try again loads it (AC4)", async ({ accountApi, goto, pages, request }, testInfo) => {
    const account = await freshAccount(request, inviterFor(testInfo.project.name));
    await accountApi.failGet();

    await goto("account", { session: account.token });
    await pages.account.waitForReady();

    await expect(pages.account.loadErrorTitle()).toHaveText("We couldn't load your account");
    await expect(pages.account.loadErrorText()).toHaveText("Something went wrong on our side. Nothing was changed.");
    await expect(pages.account.displayName()).toHaveCount(0);
    await accountApi.recoverGet();
    await pages.account.tryAgain().click();
    await expect(pages.account.displayName()).toHaveValue(account.name);
    await expect(pages.account.loadErrorTitle()).toHaveCount(0);
  });

  test("Sign out on the page asks first and ends the session", async ({ goto, pages, request }, testInfo) => {
    const account = await freshAccount(request, inviterFor(testInfo.project.name));
    await goto("account", { session: account.token });
    await pages.account.waitForReady();

    await pages.account.signOut().click();
    await expect(pages.signOutDialog.dialog()).toBeVisible();
    await pages.signOutDialog.signOut().click();

    await pages.signIn.waitForReady();
    expect(await pages.signIn.storedSession()).toBeNull();
  });
});
