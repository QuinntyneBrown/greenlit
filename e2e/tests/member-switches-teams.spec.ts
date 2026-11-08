// Acceptance Test
// Traces to: L2-056 AC1, AC2, AC3, AC6; L2-055 AC2, AC4; L2-054 AC7
// Description: A person on two teams in different roles sees the header switcher on every screen, moves between the
//              teams, and sees each team as their role there allows: the manager's screens on the team they manage,
//              a member's screens on the team where they are a member. "Your teams" lists only the teams they manage.
// Data: fresh accounts from fixtures/households.ts: Omar manages Product team; Sam is a member of Product team and
//       creates Chen family, so he manages it.

import { test, expect, isPhone } from "../fixtures/gl-test.js";
import { createTeam, freshMemberOf, freshPerson, type FreshPerson } from "../fixtures/households.js";

async function samOnTwoTeams(request: Parameters<typeof freshPerson>[0]): Promise<FreshPerson> {
  const omar = await freshPerson(request, "Omar Haddad");
  await createTeam(request, omar, "Product team");
  const sam = await freshMemberOf(request, omar, "Sam Chen");
  await createTeam(request, sam, "Chen family");
  return sam;
}

test.describe("A person on two teams in different roles", () => {
  test("the switcher lists both teams with the active one checked (L2-056 AC1, AC2)", async ({ goto, page, pages }, testInfo) => {
    const sam = await samOnTwoTeams(page.request);
    await goto("calendar", { session: sam.token });
    await pages.calendar.waitForReady();
    const switcher = pages.teamSwitcher;

    await expect(switcher.button()).toHaveAccessibleName("Switch team, current team Chen family");
    if (isPhone(testInfo)) await switcher.button().tap();
    else await switcher.open();

    await expect(switcher.teams()).toHaveCount(2);
    await expect(switcher.team("Product team")).toHaveAttribute("aria-checked", "false");
    await expect(switcher.team("Chen family")).toHaveAttribute("aria-checked", "true");
    await expect(switcher.defaultMark("Chen family")).toHaveText("Default");
    await expect(switcher.item("Add another team")).toBeVisible();
    await expect(switcher.item("Manage your teams")).toBeVisible();
  });

  test("switching to the team where he is a member shows a member's screens there (L2-056 AC3, L2-055 AC4)", async ({
    goto,
    page,
    pages,
  }) => {
    const sam = await samOnTwoTeams(page.request);
    await goto("calendar", { session: sam.token, month: "2026-11" });
    await pages.calendar.waitForReady();

    await pages.teamSwitcher.choose("Product team");

    await expect(pages.calendar.toast("Switched to Product team")).toBeVisible();
    await expect(pages.teamSwitcher.buttonName()).toHaveText("Product team");
    await expect(pages.calendar.memberNames()).toHaveText(["Sam Chen", "Omar Haddad"]);
    await expect(pages.calendar.paintOptions()).toHaveText([/Select/, /Requested/, /Tentative/, /Clear/]);

    await pages.calendar.mainNavLink("Requests").click();
    await expect(pages.requests.mineHeading()).toBeVisible();
  });

  test("on the team where he is a member, Settings is read-only and Your teams lists only Chen family (L2-054 AC7, L2-055 AC4)", async ({
    goto,
    page,
    pages,
  }) => {
    const sam = await samOnTwoTeams(page.request);
    await goto("settings", { session: sam.token });
    await pages.settings.waitForReady();
    await pages.teamSwitcher.choose("Product team");
    await expect(pages.teamSwitcher.buttonName()).toHaveText("Product team");

    await expect(pages.settings.readOnlyTitle()).toHaveText("Only managers can change team settings.");
    await expect(pages.settings.teamNames()).toHaveText(["Chen family"]);
  });
});
