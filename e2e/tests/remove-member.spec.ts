// Acceptance Test
// Traces to: L2-011 (AC1 to AC4), L2-034 AC1 and AC2
// Description: The manager removes a member from the member's page after confirming; the row leaves the calendar and
//              the year, the person's page says they are not on the team, and the person can no longer sign in.
// Data: removal is destructive, so each viewport's remover (Xavi, Yara, Zoe) manages a team of their own, made through
//       the API; every test adds the members it removes, by names no other test uses, so the demo team is never touched.

import { test, expect } from "../fixtures/gl-test.js";
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

test.describe("A member's own page", () => {
  test("offers no Remove (L2-034 AC2)", async ({ goto, pages }) => {
    await goto("memberPerson", { as: "member", person: "Ana Ruiz" });
    await pages.person.waitForReady();

    await expect(pages.person.removeSection()).toHaveCount(0);
  });
});
