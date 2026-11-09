// Acceptance Test
// Traces to: L2-060 AC1, AC2, AC3, AC4; L2-059 AC1, AC3
// Description: with the school calendar on, the manager adds a child by name, marks a member as a child, sees no
//              allowance for children on the calendar, the year and their page, and marks a login-less child's days,
//              which are confirmed. With it off, nothing about children shows.
// Data: fresh accounts from fixtures/households.ts: Maya manages Chen family.

import { test, expect, GRID_ONLY } from "../fixtures/gl-test.js";
import {
  addChild,
  createTeam,
  freshMemberOf,
  freshPerson,
  turnOnSchoolCalendar,
  type FreshPerson,
} from "../fixtures/households.js";

async function chenFamily(request: Parameters<typeof freshPerson>[0], on = true): Promise<FreshPerson> {
  const maya = await freshPerson(request, "Maya Chen");
  await createTeam(request, maya, "Chen family");
  if (on) await turnOnSchoolCalendar(request, maya);
  return maya;
}

test.describe("Children on the sheet", () => {
  test("the manager adds a child by name, and the row has no allowance (L2-060 AC2, AC3)", async ({ goto, page, pages }) => {
    const maya = await chenFamily(page.request);
    await goto("settings", { session: maya.token });
    await pages.settings.waitForReady();

    await pages.settings.addChildButton().click();
    const dialog = pages.addChild;
    await expect(dialog.description()).toHaveText("Children are on the calendar with no allowance.");
    await expect(dialog.emailHelp()).toHaveText(
      "Add an email only if they’ll sign in. Without one, you mark their days and they’re confirmed straight away.",
    );
    await dialog.add().click();
    await expect(dialog.nameError()).toHaveText("Enter a name.");

    await dialog.name().fill("Leo Chen");
    await dialog.add().click();

    await expect(dialog.successTitle()).toHaveText("Leo Chen is on the calendar");
    await expect(dialog.successText()).toHaveText("You can mark Leo’s days and add school closures.");
    await dialog.done().click();
    await expect(pages.settings.childCheckbox("Leo Chen")).toBeChecked();
    await expect(pages.settings.noAllowance("Leo Chen")).toHaveText("No allowance");
  });

  test("the manager marks a member as a child; the manager's own row has no Child mark (L2-060 AC1)", async ({ goto, page, pages }) => {
    const maya = await chenFamily(page.request);
    await freshMemberOf(page.request, maya, "Ivy Chen");
    await goto("settings", { session: maya.token });
    await pages.settings.waitForReady();

    await expect(pages.settings.childCheckbox("Maya Chen")).toHaveCount(0);
    await pages.settings.childCheckbox("Ivy Chen").check();
    await pages.settings.saveTeamButton().click();

    await expect(pages.settings.saveTeamStatus()).toHaveText("Saved");
    await page.reload();
    await pages.settings.waitForReady();
    await expect(pages.settings.childCheckbox("Ivy Chen")).toBeChecked();
    await expect(pages.settings.noAllowance("Ivy Chen")).toHaveText("No allowance");
  });

  test("a child's Left shows a dash named No allowance; the year and the child's page say No allowance (L2-060 AC3)", async ({
    goto,
    page,
    pages,
    isMobile,
  }) => {
    test.skip(isMobile, GRID_ONLY);
    const maya = await chenFamily(page.request);
    const leo = await addChild(page.request, maya, "Leo Chen");

    await goto("calendar", { session: maya.token, month: "2026-11" });
    await pages.calendar.waitForReady();
    await expect(pages.calendar.daysLeft("Leo Chen")).toHaveText("—");
    await expect(pages.calendar.daysLeft("Leo Chen")).toHaveAccessibleName("No allowance");

    await goto("year", { session: maya.token, year: "2026" });
    await pages.year.waitForReady();
    await expect(pages.year.tableRow("Leo Chen")).toContainText("No allowance");

    await goto("person", { session: maya.token, personId: leo });
    await pages.person.waitForReady();
    await expect(pages.person.daysLeftCaption()).toHaveText("No allowance");
    await expect(pages.person.noAllowanceNote()).toHaveText("Children have no yearly allowance.");
  });

  test("the manager's paint on a login-less child is confirmed (L2-060 AC4)", async ({ goto, page, pages, isMobile }) => {
    test.skip(isMobile, GRID_ONLY);
    const maya = await chenFamily(page.request);
    await addChild(page.request, maya, "Leo Chen");
    await goto("calendar", { session: maya.token, month: "2026-11" });
    await pages.calendar.waitForReady();

    await pages.calendar.choosePaint("Tentative");
    await pages.calendar.paint("Leo Chen", "Mon 23 Nov", "Tue 24 Nov");

    await expect(pages.calendar.cell("Leo Chen", "Mon 23 Nov")).toHaveAttribute("data-status", "confirmed");
    await expect(pages.calendar.cell("Leo Chen", "Tue 24 Nov")).toHaveAccessibleName(/^Leo Chen, Tue 24 Nov: Confirmed/);
  });

  test("with the school calendar off there is no Child mark and no Add a child (L2-059 AC1)", async ({ goto, page, pages }) => {
    const maya = await chenFamily(page.request, false);
    await freshMemberOf(page.request, maya, "Ivy Chen");
    await goto("settings", { session: maya.token });
    await pages.settings.waitForReady();

    await expect(pages.settings.childCheckbox("Ivy Chen")).toHaveCount(0);
    await expect(pages.settings.addChildButton()).toHaveCount(0);
  });
});
