// Acceptance Test
// Traces to: L2-034 AC1-AC2, L2-033 AC1 and AC5
// Description: The manager sees the member's working days on their page and edits them there; a member's own page
//              has no manager sections; a part-timer's days and an over-allowance warning are said in words; long
//              names wrap.
// Data: the demo seed (Ana Ruiz works Mon to Fri) and, for editing, each viewport's inviter team with Dev Patel,
//       who is put back on the team's work week when the test is done.

import { test, expect } from "../fixtures/gl-test.js";
import { inviterFor } from "../fixtures/session.js";
import { ensureMember, ensureOwnTeam } from "../fixtures/team.js";
import { MON_TO_FRI, MON_TO_THU, setMemberDays } from "../fixtures/working-days.js";

test.describe("The manager's sections", () => {
  test("shows the member's working days and Edit working days (L2-034 AC1)", async ({ goto, pages }) => {
    await goto("person", { person: "Ana Ruiz" });
    await pages.person.waitForReady();

    await expect(pages.person.workingDaysSection().getByText("For part-timers. Days they don't work show red on their row.")).toBeVisible();
    await expect(pages.person.workingDays()).toHaveText("Mon, Tue, Wed, Thu, Fri");
    await expect(pages.person.editWorkingDays()).toBeVisible();
  });

  test("a member's own page has no working days to edit (L2-034 AC2)", async ({ goto, pages }) => {
    await goto("memberPerson", { as: "member", person: "Ana Ruiz" });
    await pages.person.waitForReady();

    await expect(pages.person.workingDaysSection()).toHaveCount(0);
    await expect(pages.person.editWorkingDays()).toHaveCount(0);
    await expect(pages.person.rows("Allowance adjustments")).toHaveText(["+3Carried over from 20251 Jan 2026"]);
  });
});

test.describe("A part-timer's page", () => {
  test.beforeEach(async ({ request }, testInfo) => {
    const manager = inviterFor(testInfo.project.name);
    await ensureOwnTeam(request, manager, "Holiday team");
    await ensureMember(request, manager, "Dev Patel");
    await setMemberDays(request, manager, "Dev Patel", MON_TO_THU);
  });

  test.afterEach(async ({ request }, testInfo) => {
    await setMemberDays(request, inviterFor(testInfo.project.name), "Dev Patel", MON_TO_FRI);
  });

  test("says which days they work when it is not Monday to Friday (L2-033 AC1)", async ({ goto, pages }, testInfo) => {
    await goto("person", { as: inviterFor(testInfo.project.name), person: "Dev Patel" });
    await pages.person.waitForReady();

    await expect(pages.person.subtitle()).toHaveText("Works Mon, Tue, Wed, Thu");
    await expect(pages.person.workingDays()).toHaveText("Mon, Tue, Wed, Thu");
  });

  test("Edit working days saves the days and the page shows them (L2-034 AC1)", async ({ goto, pages }, testInfo) => {
    await goto("person", { as: inviterFor(testInfo.project.name), person: "Dev Patel" });
    await pages.person.waitForReady();

    await pages.person.editWorkingDays().click();
    await pages.editWorkingDays.day("Fri").click();
    await pages.editWorkingDays.day("Thu").click();
    await pages.editWorkingDays.save().click();

    await expect(pages.editWorkingDays.anyDialog()).toHaveCount(0);
    await expect(pages.person.workingDays()).toHaveText("Mon, Tue, Wed, Fri");
    await expect(pages.person.subtitle()).toHaveText("Works Mon, Tue, Wed, Fri");
  });
});

test.describe("Words for what the colours say", () => {
  test("says how far over the allowance the requests would take them (ADR-007)", async ({ goto, pages, personApi }) => {
    await personApi.change((person) => {
      person.allowance.left = 4;
      person.allowance.requested = 6;
      person.daysOver = 2;
    });
    await goto("person", { person: "Ana Ruiz" });
    await pages.person.waitForReady();

    await expect(pages.person.daysLeft()).toHaveText("4");
    await expect(pages.person.daysLeft()).toHaveAttribute("data-over", "");
    await expect(pages.person.daysLeftCaption()).toHaveText("days left in 2026 · 2 days over once requests are approved");
  });

  test("wraps a very long name and job title without overlapping or sideways scrolling (L2-033 AC5)", async ({ goto, pages, personApi }) => {
    await personApi.change((person) => {
      person.name = "Alessandra Montgomery-Featherstonehaugh";
      person.jobTitle = "Principal Content Strategist and Accessibility Lead";
    });
    await goto("person", { person: "Ana Ruiz" });
    await pages.person.waitForReady();

    await expect(pages.person.name()).toHaveText("Alessandra Montgomery-Featherstonehaugh");
    await expect(pages.person.subtitle()).toContainText("Principal Content Strategist and Accessibility Lead");
    expect(await pages.person.scrollsSideways()).toBe(false);
    const name = (await pages.person.name().boundingBox())!;
    const figure = (await pages.person.daysLeft().boundingBox())!;
    const overlaps = name.x < figure.x + figure.width && figure.x < name.x + name.width && name.y < figure.y + figure.height && figure.y < name.y + name.height;
    expect(overlaps).toBe(false);
  });
});
