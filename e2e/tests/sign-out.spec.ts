// Acceptance Test
// Traces to: L2-006 (User menu and sign out) AC3, AC4
// Description: Sign out in the account menu asks first; confirming ends the session and opens sign-in,
//              "Stay signed in" keeps it, and a failed call never leaves the person signed in.
// Data: the demo seed. Maya Chen manages the team.

import { test, expect } from "../fixtures/gl-test.js";

test.describe("Signing out", () => {
  test.beforeEach(async ({ goto, pages }) => {
    await goto("calendar");
    await pages.calendar.waitForReady();
    await pages.accountMenu.open();
    await pages.accountMenu.item("Sign out").click();
  });

  test("Sign out in the menu opens a dialog that asks first (AC3)", async ({ pages }) => {
    const dialog = pages.signOutDialog;
    await expect(dialog.dialog()).toBeVisible();
    await expect(dialog.title()).toHaveText("Sign out of Greenlit?");
    await expect(dialog.description()).toHaveCount(0);
    await expect(dialog.body()).toHaveText("Anything you’ve already saved stays saved.");
    await expect(dialog.stay()).toBeEnabled();
    await expect(dialog.signOut()).toHaveText("Sign out");
    await expect(dialog.stay()).toBeFocused();
  });

  test("Stay signed in closes the dialog and the session remains (AC4)", async ({ authApi, pages }) => {
    await pages.signOutDialog.stay().click();

    await expect(pages.signOutDialog.dialog()).toBeHidden();
    await expect(pages.calendar.title()).toBeVisible();
    expect(await pages.calendar.storedSession()).not.toBeNull();
    expect(authApi.signOuts()).toBe(0);
  });

  test("Esc also keeps the session (AC4)", async ({ page, pages }) => {
    await expect(pages.signOutDialog.dialog()).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(pages.signOutDialog.dialog()).toBeHidden();
    expect(await pages.calendar.storedSession()).not.toBeNull();
  });

  test("Sign out ends the session and shows the sign-in page (AC4)", async ({ authApi, page, pages }) => {
    await pages.signOutDialog.signOut().click();

    await pages.signIn.waitForReady();
    expect(new URL(page.url()).pathname).toBe("/sign-in");
    expect(await pages.signIn.storedSession()).toBeNull();
    expect(authApi.signOuts()).toBe(1);
  });

  test("while it signs out the button says Signing out… and every way out is off (AC4)", async ({ authApi, page, pages }) => {
    const release = await authApi.holdSignOut();

    await pages.signOutDialog.signOut().click();

    await expect(pages.signOutDialog.signOut()).toHaveText("Signing out…");
    await expect(pages.signOutDialog.signOut()).toHaveAttribute("aria-busy", "true");
    await expect(pages.signOutDialog.signOut()).toBeDisabled();
    await expect(pages.signOutDialog.stay()).toBeDisabled();
    await expect(pages.signOutDialog.close()).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(pages.signOutDialog.dialog()).toBeVisible();

    release();
    await pages.signIn.waitForReady();
  });

  test("when the server cannot be told, the person is still signed out (AC4)", async ({ authApi, pages }) => {
    await authApi.failSignOut();

    await pages.signOutDialog.signOut().click();

    await pages.signIn.waitForReady();
    expect(await pages.signIn.storedSession()).toBeNull();
  });
});
