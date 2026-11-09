// Acceptance Test
// Traces to: L2-005 (Account page) AC5, AC6
// Description: A person changes their display name and email from Account: the name shows on the calendar and in the
//              account menu, the new email is the one to sign in with, and an email another account uses is refused.
// Data: fresh members of the viewport's inviter team (fixtures/account.ts); a profile change never touches a seeded person.

import { test, expect, GRID_ONLY } from "../fixtures/gl-test.js";
import { freshAccount } from "../fixtures/account.js";
import { OLD_PASSWORD, signInStatus } from "../fixtures/password-reset.js";
import { freshEmail } from "../fixtures/invitation.js";
import { inviterFor } from "../fixtures/session.js";
import { ensureOwnTeam } from "../fixtures/team.js";

test.describe("Account: edit the profile", () => {
  test.beforeEach(async ({ request }, testInfo) => {
    await ensureOwnTeam(request, inviterFor(testInfo.project.name), "Invite team");
  });

  test("Save changes stays off until something changes", async ({ goto, pages, request }, testInfo) => {
    const account = await freshAccount(request, inviterFor(testInfo.project.name));
    await goto("account", { session: account.token });
    await pages.account.waitForReady();
    await expect(pages.account.saveChanges()).toBeDisabled();

    await pages.account.displayName().fill("Someone New");
    await expect(pages.account.saveChanges()).toBeEnabled();
    await pages.account.displayName().fill(account.name);

    await expect(pages.account.saveChanges()).toBeDisabled();
  });

  test("a new display name is saved and appears in the account menu and on the calendar (AC5)", async ({ goto, pages, request, isMobile }, testInfo) => {
    test.skip(isMobile, GRID_ONLY);
    const tag = Date.now().toString(36);
    const account = await freshAccount(request, inviterFor(testInfo.project.name), `Before ${tag}`);
    await goto("account", { session: account.token });
    await pages.account.waitForReady();

    await pages.account.displayName().fill(`After ${tag}`);
    await pages.account.saveChanges().click();

    await expect(pages.account.profileStatus()).toHaveText("Saved");
    await expect(pages.account.saveChanges()).toBeDisabled();
    await expect(pages.accountMenu.avatar()).toHaveAccessibleName(`Account menu for After ${tag}`);
    await goto("calendar", { session: account.token });
    await pages.calendar.waitForReady();
    await expect(pages.calendar.memberNames().filter({ hasText: `After ${tag}` })).toHaveCount(1);
    await expect(pages.calendar.memberNames().filter({ hasText: `Before ${tag}` })).toHaveCount(0);
  });

  test("a new email is saved and is the one to sign in with (AC6)", async ({ goto, pages, request }, testInfo) => {
    const account = await freshAccount(request, inviterFor(testInfo.project.name));
    const email = freshEmail("renamed");
    await goto("account", { session: account.token });
    await pages.account.waitForReady();

    await pages.account.email().fill(email);
    await pages.account.saveChanges().click();

    await expect(pages.account.profileStatus()).toHaveText("Saved");
    expect(await signInStatus(request, email, OLD_PASSWORD)).toBe(200);
    expect(await signInStatus(request, account.email, OLD_PASSWORD)).toBe(401);
  });

  test("an email another account uses is refused on the field and nothing changes (AC6)", async ({ goto, pages, request }, testInfo) => {
    const account = await freshAccount(request, inviterFor(testInfo.project.name), "Email Seeker");
    const other = await freshAccount(request, inviterFor(testInfo.project.name), "Email Holder");
    await goto("account", { session: account.token });
    await pages.account.waitForReady();

    await pages.account.displayName().fill("Email Seeker Renamed");
    await pages.account.email().fill(other.email);
    await pages.account.saveChanges().click();

    await expect(pages.account.emailError()).toHaveText("That email is already in use.");
    await expect(pages.account.email()).toHaveAttribute("aria-invalid", "true");
    await expect(pages.account.profileStatus()).toHaveText("");
    expect(await signInStatus(request, account.email, OLD_PASSWORD)).toBe(200);
    await pages.account.email().fill(account.email);
    await expect(pages.account.emailError()).toHaveCount(0);
    await pages.account.displayName().fill(account.name);
    await expect(pages.account.saveChanges()).toBeDisabled();
  });

  test("an empty name or a malformed email is refused before anything is sent", async ({ accountApi, goto, pages, request }, testInfo) => {
    const account = await freshAccount(request, inviterFor(testInfo.project.name));
    await goto("account", { session: account.token });
    await pages.account.waitForReady();

    await pages.account.displayName().fill("   ");
    await pages.account.email().fill("not-an-email");
    await pages.account.saveChanges().click();

    await expect(pages.account.nameError()).toHaveText("Enter your name.");
    await expect(pages.account.emailError()).toHaveText("Enter a valid email address.");
    expect(accountApi.profileSaves()).toBe(0);
  });

  test("the button says Saving… and the fields are read-only while the profile is sent, and it is sent once", async ({ accountApi, goto, pages, request }, testInfo) => {
    const account = await freshAccount(request, inviterFor(testInfo.project.name));
    await goto("account", { session: account.token });
    await pages.account.waitForReady();
    const release = await accountApi.holdProfile();

    await pages.account.displayName().fill("Held Name");
    await pages.account.saveChanges().click();

    await expect(pages.account.saveChanges()).toHaveText("Saving…");
    await expect(pages.account.saveChanges()).toHaveAttribute("aria-busy", "true");
    await expect(pages.account.saveChanges()).toBeDisabled();
    await expect(pages.account.displayName()).toHaveAttribute("readonly", "");
    release();
    await expect(pages.account.profileStatus()).toHaveText("Saved");
    await expect(pages.account.saveChanges()).toHaveText("Save changes");
    expect(accountApi.profileSaves()).toBe(1);
  });

  test("a save that fails says nothing was changed, and trying again works", async ({ accountApi, goto, pages, request }, testInfo) => {
    const account = await freshAccount(request, inviterFor(testInfo.project.name));
    await goto("account", { session: account.token });
    await pages.account.waitForReady();
    await accountApi.failProfile();

    await pages.account.displayName().fill("Retry Name");
    await pages.account.saveChanges().click();

    await expect(pages.account.profileStatus()).toHaveText("We couldn’t save your changes. Nothing was changed.");
    await expect(pages.account.displayName()).toHaveValue("Retry Name");
    await expect(pages.account.saveChanges()).toBeEnabled();
    await accountApi.recoverProfile();
    await pages.account.saveChanges().click();
    await expect(pages.account.profileStatus()).toHaveText("Saved");
  });
});
