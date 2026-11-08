// Acceptance Test
// Traces to: L2-062 AC1, AC2, AC5, AC7
// Description: the manager imports a school's .ics file for one child in a dialog; it says how many closures it
//              added, warns what a re-import replaces, and refuses a file that is not a calendar.
// Data: fresh accounts from fixtures/households.ts: Maya manages Chen family with the school calendar on, with the
//       children Leo and Ivy (no email).

import { test, expect } from "../fixtures/gl-test.js";
import {
  addChild,
  createTeam,
  freshPerson,
  icsFile,
  importCalendar,
  turnOnSchoolCalendar,
} from "../fixtures/households.js";

async function chenFamily(request: Parameters<typeof freshPerson>[0]) {
  const maya = await freshPerson(request, "Maya Chen");
  await createTeam(request, maya, "Chen family");
  await turnOnSchoolCalendar(request, maya);
  const leo = await addChild(request, maya, "Leo Chen");
  await addChild(request, maya, "Ivy Chen");
  return { maya, leo };
}

test.describe("Importing a school calendar", () => {
  test("the manager imports a file for one child and the closures are listed as imported (L2-062 AC1)", async ({
    goto,
    page,
    pages,
  }) => {
    const { maya } = await chenFamily(page.request);
    await goto("settings", { session: maya.token });
    await pages.settings.waitForReady();

    await pages.settings.importCalendarButton().click();
    const dialog = pages.importCalendar;
    await expect(dialog.description()).toHaveText("Add a school’s closures from its calendar file (.ics) to one child’s row.");
    await expect(dialog.fileButton()).toHaveText("Choose an .ics file");
    await expect(dialog.fileHelp()).toHaveText("Up to 1 MB. All-day events become closures.");
    await dialog.child().selectOption({ label: "Leo Chen" });
    await dialog.choose("maple-grove-2026-27.ics", icsFile([["PA day", "2026-11-20"], ["Winter break", "2026-12-21"]]));
    await expect(dialog.fileName()).toHaveText("maple-grove-2026-27.ics");
    await dialog.importButton().click();

    await expect(dialog.successTitle()).toHaveText("Imported 2 closures for Leo");
    await expect(dialog.successText()).toHaveText("They’re on Leo’s row now.");
    await dialog.done().click();
    await expect(pages.settings.closureLabels()).toHaveText(["PA day", "Winter break"]);
    await expect(pages.settings.closureRow("PA day")).toContainText("Imported");
    await expect(pages.settings.closureMeta("PA day")).toHaveText("Fri 20 Nov 2026 · Leo Chen");
  });

  test("choosing a child with an earlier import says what a re-import replaces (L2-062 AC2)", async ({ goto, page, pages }) => {
    const { maya, leo } = await chenFamily(page.request);
    await importCalendar(page.request, maya, leo, icsFile([["PA day", "2026-11-20"], ["Winter break", "2026-12-21"]]));
    await goto("settings", { session: maya.token });
    await pages.settings.waitForReady();

    await pages.settings.importCalendarButton().click();
    await pages.importCalendar.child().selectOption({ label: "Ivy Chen" });
    await expect(pages.importCalendar.replaceNote()).toHaveCount(0);
    await pages.importCalendar.child().selectOption({ label: "Leo Chen" });

    await expect(pages.importCalendar.replaceNote()).toHaveText(
      "Importing again replaces the 2 closures from Leo’s last import. Closures you added yourself stay.",
    );
  });

  test("a file that is not a calendar is refused and nothing changes (L2-062 AC5)", async ({ goto, page, pages }) => {
    const { maya } = await chenFamily(page.request);
    await goto("settings", { session: maya.token });
    await pages.settings.waitForReady();

    await pages.settings.importCalendarButton().click();
    await pages.importCalendar.choose("newsletter.ics", "Dear parents, the fair is on Friday.");
    await pages.importCalendar.importButton().click();

    await expect(pages.importCalendar.failureTitle()).toHaveText("That file isn’t a calendar we can read");
    await expect(pages.importCalendar.failureText()).toHaveText(
      "Choose an .ics file of up to 1 MB exported from the school’s calendar. Nothing was changed.",
    );
  });
});
