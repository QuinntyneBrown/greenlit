// Acceptance Test
// Traces to: L2-059 AC2; L2-009 AC8
// Description: Settings has a School calendar section after Notifications: the manager turns the school calendar on
//              with its own Save changes; a member sees it read-only.
// Data: fresh accounts from fixtures/households.ts: Maya manages Chen family, Sam is a member of it.

import { test, expect } from "../fixtures/gl-test.js";
import { createTeam, freshMemberOf, freshPerson } from "../fixtures/households.js";

test.describe("The school calendar setting", () => {
  test("the manager sees the section, off by default, and turns it on (L2-059 AC2, L2-009 AC8)", async ({ goto, page, pages }) => {
    const maya = await freshPerson(page.request, "Maya Chen");
    await createTeam(page.request, maya, "Chen family");
    await goto("settings", { session: maya.token });
    const settings = pages.settings;
    await settings.waitForReady();

    await expect(settings.schoolNavLink()).toHaveCount(1);
    await expect(settings.schoolIntro()).toHaveText("For a family: mark children, and add the days school is closed to their rows.");
    await expect(settings.schoolSwitchHelp()).toHaveText([
      "Children have no allowance. Closures show on their rows and never count as time off.",
      "Turning it off hides children and closures. Nothing is deleted.",
    ]);
    await expect(settings.schoolSwitch()).not.toBeChecked();

    await settings.schoolSwitch().check();
    await settings.saveSchoolButton().click();

    await expect(settings.saveSchoolStatus()).toHaveText("Saved");
    await page.reload();
    await settings.waitForReady();
    await expect(settings.schoolSwitch()).toBeChecked();
  });

  test("a member sees the setting read-only (L2-059 AC2)", async ({ goto, page, pages }) => {
    const maya = await freshPerson(page.request, "Maya Chen");
    await createTeam(page.request, maya, "Chen family");
    const sam = await freshMemberOf(page.request, maya, "Sam Chen");
    await goto("settings", { session: sam.token });
    await pages.settings.waitForReady();

    await expect(pages.settings.schoolSwitch()).toBeDisabled();
    await expect(pages.settings.saveSchoolButton()).toHaveCount(0);
  });
});
