// Acceptance Test
// Traces to: L2-011 (AC1 to AC4), L2-034 AC1 and AC2
// Description: The manager removes a member from the member's page after confirming; the row leaves the calendar and
//              the year, the person's page says they are not on the team, and the person can no longer sign in.
// Data: removal is destructive, so each viewport's remover (Xavi, Yara, Zoe) manages a team of their own, made through
//       the API; every test adds the members it removes, by names no other test uses, so the demo team is never touched.

import { test, expect, GRID_ONLY } from "../fixtures/gl-test.js";
import { freshEmail, invite, join, trySignIn, tryWithSession } from "../fixtures/invitation.js";
import { removerFor } from "../fixtures/session.js";
import { ensureMember, ensureOwnTeam } from "../fixtures/team.js";

test.describe("Removing a member", () => {
  test.beforeEach(async ({ request }, testInfo) => {
    await ensureOwnTeam(request, removerFor(testInfo.project.name), "Removal team");
  });

  test("Remove Ben opens a dialog that says what changes (L2-011 AC1, L2-034 AC1)", async ({ goto, pages, request }, testInfo) => {
    const manager = removerFor(testInfo.project.name);
    await ensureMember(request, manager, "Ben Okafor");
    await goto("person", { as: manager, person: "Ben Okafor" });
    await pages.person.waitForReady();
    await expect(pages.person.removeSection().getByText("Their history is kept, but they won't appear on the calendar.")).toBeVisible();

    await pages.person.remove("Ben").click();

    const dialog = pages.removeMember;
    await expect(dialog.dialog()).toBeVisible();
    await expect(dialog.title()).toHaveText("Remove Ben from the team?");
    await expect(dialog.description()).toHaveText("Their history is kept, but they won’t appear on the calendar.");
    await expect(dialog.consequences()).toHaveText([
      "Ben’s days stay in the history.",
      "Ben won’t appear on the calendar or sign in.",
      "You can invite Ben back from Settings at any time.",
    ]);
    await expect(dialog.cancel()).toBeVisible();
    await expect(dialog.confirm()).toHaveText("Yes, remove Ben");
  });

  test("Cancel and Esc close the dialog, change nothing, and focus returns to the button (keyboard)", async ({
    goto,
    page,
    pages,
    removeMemberApi,
    request,
  }, testInfo) => {
    const manager = removerFor(testInfo.project.name);
    await ensureMember(request, manager, "Cara Webb");
    await goto("person", { as: manager, person: "Cara Webb" });
    await pages.person.waitForReady();
    await pages.person.remove("Cara").focus();
    await page.keyboard.press("Enter");
    await expect(pages.removeMember.dialog()).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(pages.removeMember.dialog()).toBeHidden();
    await expect(pages.person.remove("Cara")).toBeFocused();
    await pages.person.remove("Cara").click();
    await pages.removeMember.cancel().click();
    await expect(pages.removeMember.dialog()).toBeHidden();
    expect(removeMemberApi.removes()).toBe(0);
    await expect(pages.person.name()).toHaveText("Cara Webb");
  });
});

test.describe("Confirming a removal", () => {
  test.beforeEach(async ({ request }, testInfo) => {
    await ensureOwnTeam(request, removerFor(testInfo.project.name), "Removal team");
  });

  test("Yes, remove Finn shows Removing…, takes his row off the calendar and the year, and Finn cannot sign in (L2-011 AC2, AC4)", async ({
    goto,
    pages,
    removeMemberApi,
    request,
    isMobile,
  }, testInfo) => {
    test.skip(isMobile, GRID_ONLY);
    const manager = removerFor(testInfo.project.name);
    const email = freshEmail("finn");
    const invitation = await invite(request, manager, "Finn Murphy", email);
    const finnsSession = await join(request, invitation, "finn-secret-1234");
    await goto("person", { as: manager, person: "Finn Murphy" });
    await pages.person.waitForReady();
    const release = await removeMemberApi.hold();
    await pages.person.remove("Finn").click();

    await pages.removeMember.confirm().click();

    await expect(pages.removeMember.confirm()).toHaveText("Removing…");
    await expect(pages.removeMember.confirm()).toHaveAttribute("aria-busy", "true");
    await expect(pages.removeMember.cancel()).toBeDisabled();
    await expect(pages.removeMember.close()).toBeDisabled();
    release();
    await expect(pages.removeMember.dialog()).toBeHidden();
    expect(removeMemberApi.removes()).toBe(1);

    await pages.calendar.waitForReady();
    await expect(pages.calendar.memberNames()).not.toContainText(["Finn Murphy"]);
    await goto("year", { as: manager });
    await pages.year.waitForReady();
    await expect(pages.year.memberNames()).not.toContainText(["Finn Murphy"]);

    await goto("person", { as: manager, personId: invitation.memberId });
    await pages.person.waitForReady();
    await expect(pages.person.pageHeading()).toHaveText("Person not found");
    await expect(pages.person.noticeTitle()).toHaveText("This person isn't on the team");
    await expect(pages.person.noticeText()).toHaveText("They may have been removed.");
    await expect(pages.person.noticeAction("Back to calendar")).toBeVisible();

    expect(await trySignIn(request, email, "finn-secret-1234")).toEqual({ status: 401, code: "member_removed" });
    expect(await tryWithSession(request, finnsSession)).toEqual({ status: 401, code: "member_removed" });
  });
});

test.describe("A removal that fails", () => {
  test.beforeEach(async ({ request }, testInfo) => {
    await ensureOwnTeam(request, removerFor(testInfo.project.name), "Removal team");
  });

  test("says nothing was changed, keeps Dina on the calendar, and Yes, remove Dina tries again (L2-011 AC3)", async ({
    goto,
    pages,
    removeMemberApi,
    request,
    isMobile,
  }, testInfo) => {
    test.skip(isMobile, GRID_ONLY);
    const manager = removerFor(testInfo.project.name);
    await ensureMember(request, manager, "Dina Brandt");
    await goto("person", { as: manager, person: "Dina Brandt" });
    await pages.person.waitForReady();
    await removeMemberApi.fail();
    await pages.person.remove("Dina").click();

    await pages.removeMember.confirm().click();

    const dialog = pages.removeMember;
    await expect(dialog.failure()).toContainText("We couldn’t remove Dina");
    await expect(dialog.failure()).toContainText("Check your connection and try again. Nothing was changed.");
    await expect(dialog.confirm()).toHaveText("Yes, remove Dina");
    await expect(dialog.confirm()).toBeEnabled();
    await expect(dialog.cancel()).toBeEnabled();
    await dialog.cancel().click();
    await goto("calendar", { as: manager });
    await pages.calendar.waitForReady();
    await expect(pages.calendar.memberNames()).toContainText(["Dina Brandt"]);

    await goto("person", { as: manager, person: "Dina Brandt" });
    await pages.person.waitForReady();
    await pages.person.remove("Dina").click();
    await dialog.confirm().click();
    await expect(dialog.failure()).toBeVisible();
    await removeMemberApi.recover();
    await dialog.confirm().click();
    await expect(dialog.dialog()).toBeHidden();
    await pages.calendar.waitForReady();
    await expect(pages.calendar.memberNames()).not.toContainText(["Dina Brandt"]);
  });
});

test.describe("A member's own page", () => {
  test("offers no Remove (L2-034 AC2)", async ({ goto, pages }) => {
    await goto("memberPerson", { as: "member", person: "Ana Ruiz" });
    await pages.person.waitForReady();

    await expect(pages.person.removeSection()).toHaveCount(0);
  });
});
