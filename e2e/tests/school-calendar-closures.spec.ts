// Acceptance Test
// Traces to: L2-061 AC1, AC2, AC3, AC4, AC6, AC7, AC9; L2-059 AC1
// Description: the manager adds, edits and deletes school closures in Settings, each in a dialog; a closure shows on
//              the children's rows with the school icon and its name, not in colour, and a parent's cell is unchanged;
//              a member sees closures read-only.
// Data: fresh accounts from fixtures/households.ts: Maya manages Chen family with the school calendar on, Sam is a
//       member, Leo is a child with no email.

import { test, expect, GRID_ONLY } from "../fixtures/gl-test.js";
import {
  addChild,
  addClosure,
  createTeam,
  freshMemberOf,
  freshPerson,
  turnOnSchoolCalendar,
} from "../fixtures/households.js";

async function chenFamily(request: Parameters<typeof freshPerson>[0]) {
  const maya = await freshPerson(request, "Maya Chen");
  await createTeam(request, maya, "Chen family");
  await turnOnSchoolCalendar(request, maya);
  const sam = await freshMemberOf(request, maya, "Sam Chen");
  const leo = await addChild(request, maya, "Leo Chen");
  return { maya, sam, leo };
}

test.describe("School closures", () => {
  test("with no children the section says to mark one first; with children, No closures yet (L2-061 AC9)", async ({
    goto,
    page,
    pages,
  }) => {
    const maya = await freshPerson(page.request, "Maya Chen");
    await createTeam(page.request, maya, "Chen family");
    await turnOnSchoolCalendar(page.request, maya);
    await goto("settings", { session: maya.token });
    await pages.settings.waitForReady();
    await expect(pages.settings.closuresNote()).toHaveText("Mark someone as a child in Team to add closures.");
    await expect(pages.settings.addClosureButton()).toHaveCount(0);

    await addChild(page.request, maya, "Leo Chen");
    await page.reload();
    await pages.settings.waitForReady();
    await expect(pages.settings.closuresNote()).toContainText("No closures yet");
    await expect(pages.settings.closuresNote()).toContainText(
      "Add PA days and school vacations, or import a school’s calendar file.",
    );
  });

  test("the manager adds a closure for all children in a dialog (L2-061 AC1, AC2)", async ({ goto, page, pages }) => {
    const { maya } = await chenFamily(page.request);
    await goto("settings", { session: maya.token });
    await pages.settings.waitForReady();

    await pages.settings.addClosureButton().click();
    const dialog = pages.schoolClosure;
    await expect(dialog.title()).toHaveText("Add a school closure");
    await expect(dialog.description()).toHaveText("It shows on the children’s rows and never counts as time off.");
    expect(await dialog.whoseOptions()).toEqual(["All children", "Leo Chen"]);
    await dialog.fill({ first: "2026-11-20", last: "2026-11-19" });
    await dialog.submit().click();
    await expect(dialog.summaryTitle()).toHaveText("Fix 2 things to continue");
    await expect(dialog.summaryLinks()).toHaveText(["Enter a name for the closure.", "The last day can’t be before the first."]);

    await dialog.fill({ label: "PA day", last: "2026-11-20" });
    await dialog.submit().click();

    await expect(pages.settings.toast("Closure added")).toBeVisible();
    await expect(pages.settings.toastText("Closure added")).toHaveText("PA day is on the children’s rows.");
    await expect(pages.settings.closureLabels()).toHaveText(["PA day"]);
    await expect(pages.settings.closureMeta("PA day")).toHaveText("Fri 20 Nov 2026 · All children");
  });

  test("a closure shows on the child's row with its name and icon, and the parent's cell is unchanged (L2-061 AC3, AC4, AC7)", async ({
    goto,
    page,
    pages,
    isMobile,
  }) => {
    test.skip(isMobile, GRID_ONLY);
    const { maya, leo } = await chenFamily(page.request);
    await addClosure(page.request, maya, "PA day", "2026-11-20", "2026-11-20");
    await addClosure(page.request, maya, "Fall break", "2026-11-23", "2026-11-23", leo);
    await page.request.put("http://localhost:5100/api/sheet/days", {
      headers: { Authorization: `Bearer ${maya.token}` },
      data: { memberId: leo, dates: ["2026-11-23"], status: "Confirmed" },
    });

    await goto("calendar", { session: maya.token, month: "2026-11" });
    await pages.calendar.waitForReady();

    await expect(pages.calendar.cell("Leo Chen", "Fri 20 Nov")).toHaveAccessibleName("Leo Chen, Fri 20 Nov: Working, school closed: PA day");
    await expect(pages.calendar.cell("Leo Chen", "Fri 20 Nov")).toHaveAttribute("data-closure", "true");
    await expect(pages.calendar.cell("Leo Chen", "Fri 20 Nov")).toHaveAttribute("data-status", "empty");
    await expect(pages.calendar.cell("Maya Chen", "Fri 20 Nov")).toHaveAccessibleName("Maya Chen, Fri 20 Nov: Working");
    await expect(pages.calendar.cell("Leo Chen", "Mon 23 Nov")).toHaveAccessibleName(
      "Leo Chen, Mon 23 Nov: Confirmed, school closed: Fall break",
    );
    await expect(pages.calendar.cell("Leo Chen", "Mon 23 Nov")).toHaveAttribute("data-status", "confirmed");
    await expect(await pages.calendar.outCell("Fri 20 Nov")).toHaveAccessibleName("0 out, 3 in");
    await expect(pages.calendar.legendItems()).toHaveText(["Confirmed", "Requested", "Tentative", "Weekend / holiday", "School closed"]);
  });

  test("the manager edits and deletes a closure in dialogs (L2-061 AC6)", async ({ goto, page, pages }) => {
    const { maya } = await chenFamily(page.request);
    await addClosure(page.request, maya, "PA day", "2026-11-20", "2026-11-20");
    await goto("settings", { session: maya.token });
    await pages.settings.waitForReady();

    await pages.settings.editClosure("PA day").click();
    await expect(pages.schoolClosure.title()).toHaveText("Edit school closure");
    await expect(pages.schoolClosure.label()).toHaveValue("PA day");
    await pages.schoolClosure.fill({ label: "Fall break", whose: "Leo Chen" });
    await pages.schoolClosure.submit().click();
    await expect(pages.settings.toast("Closure saved")).toBeVisible();
    await expect(pages.settings.closureMeta("Fall break")).toHaveText("Fri 20 Nov 2026 · Leo Chen");

    await pages.settings.deleteClosure("Fall break").click();
    await expect(pages.deleteClosure.title()).toHaveText("Delete Fall break?");
    await expect(pages.deleteClosure.description()).toHaveText("It comes off the children’s rows. Nothing else changes.");
    await pages.deleteClosure.confirm().click();
    await expect(pages.settings.toast("Closure deleted")).toBeVisible();
    await expect(pages.settings.closuresNote()).toContainText("No closures yet");
  });

  test("a member sees closures but cannot change them (L2-061 AC5)", async ({ goto, page, pages, isMobile }) => {
    test.skip(isMobile, GRID_ONLY);
    const { maya, sam } = await chenFamily(page.request);
    await addClosure(page.request, maya, "PA day", "2026-11-20", "2026-11-20");
    await goto("settings", { session: sam.token });
    await pages.settings.waitForReady();

    await expect(pages.settings.closureLabels()).toHaveText(["PA day"]);
    await expect(pages.settings.editClosure("PA day")).toHaveCount(0);
    await expect(pages.settings.deleteClosure("PA day")).toHaveCount(0);
    await expect(pages.settings.addClosureButton()).toHaveCount(0);
    await expect(pages.settings.importCalendarButton()).toHaveCount(0);

    await goto("calendar", { session: sam.token, month: "2026-11" });
    await pages.calendar.waitForReady();
    await expect(pages.calendar.cell("Leo Chen", "Fri 20 Nov")).toHaveAccessibleName("Leo Chen, Fri 20 Nov: Working, school closed: PA day");
  });
});
