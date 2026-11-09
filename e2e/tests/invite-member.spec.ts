// Acceptance Test
// Traces to: L2-010 (and L2-009 AC3 for the read-only note)
// Description: The manager invites a person from Settings; the person appears on the calendar.
// Data: Maya's demo team already has Finn Murphy, and nobody can be removed from a team yet, so each
//       viewport's inviter (Uma, Vic, Wren) manages a team of their own, made through the API. Inviting
//       the same address again sends a new link, so a second run on the same database passes too.

import { test, expect, GRID_ONLY } from "../fixtures/gl-test.js";
import { inviterFor } from "../fixtures/session.js";
import { ensureOwnTeam } from "../fixtures/team.js";

test.describe("Inviting a member", () => {
  test.beforeEach(async ({ request, goto }, testInfo) => {
    const inviter = inviterFor(testInfo.project.name);
    await ensureOwnTeam(request, inviter, "Invite team");
    await goto("settings", { as: inviter });
  });

  test("Invite a member opens a dialog with name, email and role (L2-010 AC1)", async ({ pages }) => {
    await pages.settings.waitForReady();
    await pages.settings.openInviteDialog();

    const dialog = pages.inviteMember;
    await expect(dialog.dialog()).toBeVisible();
    await expect(dialog.title()).toBeVisible();
    await expect(dialog.description()).toHaveText("They’ll get an email with a link to set a password.");
    await expect(dialog.name()).toBeFocused();
    await expect(dialog.email()).toHaveValue("");
    expect(await dialog.roleOptions()).toEqual(["Member", "Manager"]);
    await expect(dialog.roleHelp()).toHaveText("Managers confirm requests and edit any row.");
    await expect(dialog.cancel()).toBeVisible();
    await expect(dialog.send()).toHaveText("Send invite");
  });

  test("Esc closes the dialog and focus returns to the button that opened it (keyboard)", async ({ page, pages }) => {
    await pages.settings.waitForReady();
    await pages.settings.inviteButton().focus();
    await page.keyboard.press("Enter");
    await expect(pages.inviteMember.dialog()).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(pages.inviteMember.dialog()).toBeHidden();
    await expect(pages.settings.inviteButton()).toBeFocused();
  });

  test("an empty name and an invalid email are named, and nothing is sent (L2-010 AC2)", async ({
    membersApi,
    pages,
  }) => {
    await pages.settings.waitForReady();
    await pages.settings.openInviteDialog();
    const dialog = pages.inviteMember;
    await dialog.fill({ email: "finn@northwind" });

    await dialog.send().click();

    await expect(dialog.summary()).toContainText("Fix 2 things to continue");
    await expect(dialog.summaryLinks()).toHaveText(["Enter a name", "Enter a valid email address"]);
    await expect(dialog.nameError()).toHaveText("Enter a name.");
    await expect(dialog.emailError()).toHaveText("Enter a valid email address, like name@company.com.");
    await expect(dialog.name()).toHaveAttribute("aria-invalid", "true");
    await expect(dialog.email()).toHaveAttribute("aria-invalid", "true");
    expect(membersApi.requests()).toBe(0);
  });

  test("sending shows Sending…, then the invite is sent and the person is on the calendar (L2-010 AC3)", async ({
    membersApi,
    pages,
    isMobile,
  }) => {
    test.skip(isMobile, GRID_ONLY);
    await pages.settings.waitForReady();
    await pages.settings.openInviteDialog();
    const dialog = pages.inviteMember;
    await dialog.fill({ name: "Finn Murphy", email: "finn@northwind.studio", role: "Member" });
    const release = await membersApi.hold();

    await dialog.send().click();

    await expect(dialog.send()).toHaveText("Sending…");
    await expect(dialog.send()).toBeDisabled();
    await expect(dialog.send()).toHaveAttribute("aria-busy", "true");
    await expect(dialog.name()).toHaveAttribute("readonly", "");
    await expect(dialog.email()).toHaveAttribute("readonly", "");
    await expect(dialog.cancel()).toBeDisabled();

    release();

    await expect(dialog.success()).toContainText("Invite sent to finn@northwind.studio");
    await expect(dialog.success()).toContainText(
      "Finn Murphy is on the calendar now. The link in the email works for seven days.",
    );
    await expect(dialog.inviteAnother()).toBeVisible();
    await dialog.done().click();
    await expect(dialog.dialog()).toBeHidden();
    await expect(pages.settings.memberNames()).toContainText(["Finn Murphy"]);

    await pages.settings.openFromMainNav("Calendar");
    await pages.calendar.waitForReady();
    await expect(pages.calendar.memberNames()).toContainText(["Finn Murphy"]);
  });

  test("Enter in a field sends the invite (keyboard)", async ({ page, pages }) => {
    await pages.settings.waitForReady();
    await pages.settings.openInviteDialog();
    await pages.inviteMember.fill({ name: "Finn Murphy", email: "finn@northwind.studio" });

    await page.keyboard.press("Enter");

    await expect(pages.inviteMember.success()).toContainText("Invite sent to finn@northwind.studio");
  });

  test("Invite another starts over with an empty form (L2-010 AC3)", async ({ pages }) => {
    await pages.settings.waitForReady();
    await pages.settings.openInviteDialog();
    const dialog = pages.inviteMember;
    await dialog.fill({ name: "Finn Murphy", email: "finn@northwind.studio" });
    await dialog.send().click();
    await expect(dialog.success()).toBeVisible();

    await dialog.inviteAnother().click();

    await expect(dialog.name()).toHaveValue("");
    await expect(dialog.email()).toHaveValue("");
    await expect(dialog.name()).toBeFocused();
    await expect(dialog.send()).toHaveText("Send invite");
  });

  test("when sending fails nothing is added and the values stay (L2-010 AC4)", async ({
    membersApi,
    pages,
  }) => {
    await pages.settings.waitForReady();
    const before = await pages.settings.memberNames().allTextContents();
    await pages.settings.openInviteDialog();
    const dialog = pages.inviteMember;
    await dialog.fill({ name: "Gus Hartmann", email: "gus@northwind.studio" });
    await membersApi.fail();

    await dialog.send().click();

    await expect(dialog.failure()).toContainText("We couldn’t send the invite");
    await expect(dialog.failure()).toContainText("Check your connection and try again. Nothing was added to the team.");
    await expect(dialog.send()).toHaveText("Try again");
    await expect(dialog.name()).toHaveValue("Gus Hartmann");
    await expect(dialog.email()).toHaveValue("gus@northwind.studio");
    await dialog.close().click();
    await expect(dialog.dialog()).toBeHidden();
    await expect(pages.settings.memberNames()).toHaveText(before);
  });
});

test.describe("Settings for a member", () => {
  test("a member sees who is on the team but cannot invite (L2-009 AC3)", async ({ goto, pages }) => {
    await goto("settings", { as: "member" });
    await pages.settings.waitForReady();

    await expect(pages.settings.readOnlyTitle()).toHaveText("Only managers can change team settings.");
    await expect(pages.settings.readOnlyBody()).toHaveText("Ask Maya Chen if something needs updating.");
    await expect(pages.settings.inviteButton()).toHaveCount(0);
    await expect(pages.settings.memberNames().first()).toBeVisible();
  });
});
