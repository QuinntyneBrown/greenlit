// Visual parity
// Traces to: L2-061 AC3 (closure cells, legend), L2-061 AC1, L2-062 AC1 (closure list); mocks
//            pages/settings/school-calendar and pages/calendar/school-calendar
// Description: the closure list in Settings, a child's closure cell and the legend with "School closed" match the
//              mocks, region by region. Baselines are captured from the mocks (GL_BASELINE=1) and the app compared.
// Data: in the app, a fresh Chen family arranged through the API as the mocks show it: Maya, Sam, and the children
//       Leo and Ivy; "PA day" on 20 Nov for all children, "Parent-teacher day" on 26 Nov and "Winter break"
//       (imported) for Leo.

import { test, expect, GRID_ONLY } from "../../fixtures/gl-test.js";
import {
  addChild,
  addClosure,
  createTeam,
  freshPerson,
  icsFile,
  importCalendar,
  inviteTo,
  turnOnSchoolCalendar,
  type FreshPerson,
} from "../../fixtures/households.js";
import { freshEmail } from "../../fixtures/invitation.js";
import { isBaseline } from "../../fixtures/routes.js";

async function chenFamilyAsInTheMocks(request: Parameters<typeof freshPerson>[0]): Promise<FreshPerson> {
  const maya = await freshPerson(request, "Maya Chen");
  await createTeam(request, maya, "Chen family");
  await turnOnSchoolCalendar(request, maya);
  await inviteTo(request, maya, "Sam Chen", freshEmail("sam"));
  const leo = await addChild(request, maya, "Leo Chen");
  await addChild(request, maya, "Ivy Chen");
  await addClosure(request, maya, "PA day", "2026-11-20", "2026-11-20");
  await addClosure(request, maya, "Parent-teacher day", "2026-11-26", "2026-11-26", leo);
  // "Winter break" runs 21 Dec 2026 to 1 Jan 2027, imported from the school's file (DTEND is the day after).
  const file = icsFile([["Winter break", "2026-12-21"]]).replace("DTEND;VALUE=DATE:20261222", "DTEND;VALUE=DATE:20270102");
  await importCalendar(request, maya, leo, file);
  return maya;
}

test("the closure list matches pages/settings/school-calendar", async ({ goto, page, pages, settle }) => {
  const maya = isBaseline ? null : await chenFamilyAsInTheMocks(page.request);
  await goto("schoolCalendarSettings", maya ? { session: maya.token } : {});
  await pages.settings.closureList().waitFor();
  await settle();

  await pages.settings.alignToPixelGrid(pages.settings.closureList());
  await expect(pages.settings.closureList()).toHaveScreenshot("school-calendar-closures.png");
});

test("a closure cell and the legend match pages/calendar/school-calendar", async ({ goto, page, pages, settle, isMobile }) => {
  test.skip(isMobile, GRID_ONLY);
  const maya = isBaseline ? null : await chenFamilyAsInTheMocks(page.request);
  await goto("schoolCalendarSheet", maya ? { session: maya.token, month: "2026-11" } : {});
  const cell = pages.calendar.cell("Leo Chen", "Fri 20 Nov");
  await cell.waitFor();
  await settle();

  await pages.settings.alignToPixelGrid(pages.calendar.legend());
  await expect(pages.calendar.legend()).toHaveScreenshot("school-calendar-legend.png");
  await cell.scrollIntoViewIfNeeded();
  await expect(cell).toHaveScreenshot("school-calendar-closure-cell.png");
});
