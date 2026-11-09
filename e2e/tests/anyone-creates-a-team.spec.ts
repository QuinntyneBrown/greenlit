// Acceptance Test
// Traces to: L2-008 AC8, L2-055 AC1
// Description: A person who is only a member of a team can set up another team and becomes its manager.
// Data: fresh accounts from fixtures/households.ts.

import { test, expect, GRID_ONLY } from "../fixtures/gl-test.js";
import { createTeam, freshMemberOf, freshPerson } from "../fixtures/households.js";

test("a member of another team sets up a team of their own and manages it (L2-008 AC8, L2-055 AC1)", async ({
  goto,
  page,
  pages,
  isMobile,
}) => {
  test.skip(isMobile, GRID_ONLY);
  const omar = await freshPerson(page.request, "Omar Haddad");
  await createTeam(page.request, omar, "Product team");
  const sam = await freshMemberOf(page.request, omar, "Sam Chen");

  await goto("createTeam", { session: sam.token });
  await pages.createTeam.waitForReady();
  await expect(pages.createTeam.heading()).toHaveText("Set up another team");

  await pages.createTeam.fill({ name: "Chen family", members: [] });
  await pages.createTeam.submit().click();
  await expect(pages.createTeam.readyTitle()).toHaveText("Chen family is ready");
  await pages.createTeam.openCalendar().click();

  await pages.calendar.waitForReady();
  await expect(pages.calendar.memberNames()).toHaveText(["Sam Chen"]);
  await expect(pages.calendar.paintOptions()).toHaveText([/Select/, /Confirmed/, /Requested/, /Tentative/, /Clear/]);
});
