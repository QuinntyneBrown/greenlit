// Acceptance Test
// Traces to: L2-055, L2-056, L2-057, L2-058, L2-059, L2-060, L2-061, L2-062
// Description: a household from start to finish through the UI: Maya creates Chen family and invites Sam, who already
//              uses Greenlit on Product team; she turns on the school calendar, adds Leo as a child, adds a PA day and
//              imports Leo's school calendar; Sam joins with his own account, sees the closures and switches teams.
// Data: fresh accounts from fixtures/households.ts (Sam is a member of Omar's Product team).

import { test, expect } from "../fixtures/gl-test.js";
import { invitationToken } from "../fixtures/invitation.js";
import { pathFor } from "../fixtures/routes.js";
import { AcceptInvitePage } from "../pages/accept-invite.page.js";
import { CalendarPage } from "../pages/calendar.page.js";
import { TeamSwitcher } from "../pages/team-switcher.js";
import { MEMBER_PASSWORD, createTeam, freshMemberOf, freshPerson, icsFile } from "../fixtures/households.js";

test("a household sets up its sheet and a partner on another team joins it (household flow)", async ({
  browser,
  goto,
  page,
  pages,
}, testInfo) => {
  test.setTimeout(90_000);
  const omar = await freshPerson(page.request, "Omar Haddad");
  await createTeam(page.request, omar, "Product team");
  const sam = await freshMemberOf(page.request, omar, "Sam Chen");
  const maya = await freshPerson(page.request, "Maya Chen");

  // Maya creates the household and invites Sam by the address he already uses.
  await goto("createTeam", { session: maya.token });
  await pages.createTeam.waitForReady();
  await pages.createTeam.fill({ name: "Chen family", members: [{ name: "Sam Chen", email: sam.email }] });
  await pages.createTeam.submit().click();
  await expect(pages.createTeam.readyTitle()).toHaveText("Chen family is ready");
  await pages.createTeam.openCalendar().click();
  await pages.calendar.waitForReady();

  // She turns the school calendar on and adds Leo as a child.
  await pages.calendar.openFromMainNav("Settings");
  await pages.settings.waitForReady();
  await pages.settings.schoolSwitch().check();
  await pages.settings.saveSchoolButton().click();
  await expect(pages.settings.saveSchoolStatus()).toHaveText("Saved");
  await pages.settings.addChildButton().click();
  await pages.addChild.name().fill("Leo Chen");
  await pages.addChild.add().click();
  await pages.addChild.done().click();
  await expect(pages.settings.childCheckbox("Leo Chen")).toBeChecked();

  // A PA day for all children, then Leo's school calendar.
  await pages.settings.addClosureButton().click();
  await pages.schoolClosure.fill({ label: "PA day", first: "2026-11-20", last: "2026-11-20" });
  await pages.schoolClosure.submit().click();
  await expect(pages.settings.toast("Closure added")).toBeVisible();
  await pages.settings.importCalendarButton().click();
  await pages.importCalendar.choose("maple-grove.ics", icsFile([["Parent-teacher day", "2026-11-26"]]));
  await pages.importCalendar.importButton().click();
  await expect(pages.importCalendar.successTitle()).toHaveText("Imported 1 closure for Leo");
  await pages.importCalendar.done().click();
  await expect(pages.settings.closureLabels()).toHaveText(["PA day", "Parent-teacher day"]);

  // Sam joins with his own account, signed out, from the emailed link, in a browser of his own.
  const token = await invitationToken(sam.email);
  const samContext = await browser.newContext(testInfo.project.use);
  const samPage = await samContext.newPage();
  const accept = new AcceptInvitePage(samPage);
  await samPage.goto(pathFor("acceptInvite").replace(":token", token));
  await accept.waitForReady();
  await accept.accountPassword().fill(MEMBER_PASSWORD);
  await accept.signInAndJoin().click();
  await expect(accept.lead()).toHaveText("Chen family is now one of your teams.");

  // On Chen family he sees Leo's closures; then he switches to Product team.
  const calendar = new CalendarPage(samPage);
  const switcher = new TeamSwitcher(samPage);
  await samPage.goto(`${pathFor("calendar")}?month=2026-11`);
  await calendar.waitForReady();
  await expect(switcher.buttonName()).toHaveText("Chen family");
  await expect(calendar.cell("Leo Chen", "Fri 20 Nov")).toHaveAccessibleName(/school closed: PA day$/);
  await expect(calendar.cell("Leo Chen", "Thu 26 Nov")).toHaveAccessibleName(/school closed: Parent-teacher day$/);
  await switcher.choose("Product team");
  await expect(switcher.buttonName()).toHaveText("Product team");
  await expect(calendar.memberNames()).toHaveText(["Sam Chen", "Omar Haddad"]);
  await samContext.close();
});
