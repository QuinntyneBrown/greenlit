// Acceptance Test
// Traces to: L2-008
// Description: A signed-in person on no team sets up a team in one form and lands on its calendar.

import { test, expect } from "../fixtures/gl-test.js";
import { creatorFor, DEMO_PASSWORD, PEOPLE } from "../fixtures/session.js";

test.describe("Creating a team, the form", () => {
  test.beforeEach(async ({ goto, pages }) => {
    await goto("createTeam", { as: "newcomer" });
    await pages.createTeam.waitForReady();
  });

  test("the page says what to set up, field by field (L2-008 AC1)", async ({ pages }) => {
    const form = pages.createTeam;
    await expect(form.heading()).toHaveText("Set up your team");
    await expect(form.lead()).toHaveText("Name it, pick a time zone and add the people who’ll share the sheet.");
    await expect(form.teamName()).toBeVisible();
    await expect(await form.helpOf(form.timeZone())).toHaveText(
      "Weekends and holidays are worked out in this time zone.",
    );
    await expect(await form.helpOf(form.publicHolidays())).toHaveText("You can add or remove holidays at any time.");
    await expect(form.members()).toBeVisible();
    await expect(form.membersNote()).toHaveText(
      "Add a name for every row on your sheet. Add an email to send an invitation.",
    );
    await expect(form.memberNames()).toHaveCount(3);
    await expect(form.memberEmail(1)).toBeVisible();
    await expect(form.submit()).toBeVisible();
  });

  test("time zones and holiday calendars are the offered ones, London and the UK first (L2-008 AC2)", async ({
    pages,
  }) => {
    const form = pages.createTeam;
    expect(await form.optionLabels(form.timeZone())).toEqual([
      "London (GMT+0 / BST)",
      "Dublin",
      "Paris, Berlin (CET)",
      "Rome (CET)",
      "New York (ET)",
      "Toronto (ET)",
    ]);
    await expect(form.timeZone()).toHaveValue("Europe/London");
    expect(await form.optionLabels(form.publicHolidays())).toEqual([
      "United Kingdom",
      "Ireland",
      "United States",
      "Canada",
      "Italy",
      "None, I’ll add my own",
    ]);
    await expect(form.publicHolidays()).toHaveValue("GB");
  });

  test("Add another member adds a numbered row and moves to its name (L2-008 AC3)", async ({ pages }) => {
    const form = pages.createTeam;
    await form.addMember().click();

    await expect(form.memberNames()).toHaveCount(4);
    await expect(form.memberName(4)).toBeFocused();
    await expect(form.memberEmail(4)).toBeVisible();
  });

  test("an empty team name is named on its field, and nothing is sent (L2-008 AC4)", async ({ pages, teamApi }) => {
    const form = pages.createTeam;
    await form.fill({ name: "", members: [{ name: "Ana Ruiz", email: "ana@northwind.studio" }] });
    await form.submit().click();

    await expect(form.summaryTitle()).toHaveText("Fix 1 thing to continue");
    await expect(form.summaryLinks()).toHaveText(["Give your team a name"]);
    await expect(form.summary()).toBeFocused();
    await expect(form.teamName()).toHaveAttribute("aria-invalid", "true");
    await expect(await form.errorOf(form.teamName())).toHaveText("Give your team a name.");
    expect(teamApi.requests()).toBe(0);

    await form.summaryLinks().first().click();
    await expect(form.teamName()).toBeFocused();
  });

  test("members are optional: with no rows filled in, the team is sent with none (L2-008 AC4)", async ({
    pages,
    teamApi,
  }) => {
    const form = pages.createTeam;
    await teamApi.hold();
    await form.fill({ name: "Design team", members: [] });
    await form.submit().click();

    await expect(form.submit()).toHaveAttribute("aria-busy", "true");
    await expect(form.summary()).toHaveCount(0);
    expect(teamApi.requests()).toBe(1);
    expect(teamApi.sentMembers()).toEqual([]);
  });

  test("a row with only an email is not an error and is left out of the team (L2-008 AC4)", async ({
    pages,
    teamApi,
  }) => {
    const form = pages.createTeam;
    await teamApi.hold();
    await form.fill({
      name: "Design team",
      members: [{ name: "Ana Ruiz" }, { name: "", email: "cleo@northwind.studio" }],
    });
    await form.submit().click();

    await expect(form.submit()).toHaveAttribute("aria-busy", "true");
    await expect(form.summary()).toHaveCount(0);
    await expect(form.memberName(2)).not.toHaveAttribute("aria-invalid", /.*/);
    expect(teamApi.requests()).toBe(1);
    expect(teamApi.sentMembers()).toEqual([{ name: "Ana Ruiz", email: null }]);
  });

  test("the button is busy and the fields read-only while the team is created", async ({ pages, teamApi }) => {
    const form = pages.createTeam;
    await teamApi.hold();
    await form.fill({ name: "Design team", members: [{ name: "Ana Ruiz" }] });
    await form.submit().click();

    await expect(form.submit()).toHaveAttribute("aria-busy", "true");
    await expect(form.submit()).toBeDisabled();
    await expect(form.teamName()).toHaveAttribute("readonly", "");
    await expect(form.memberName(1)).toHaveAttribute("readonly", "");
  });

  test("a failure says nothing was saved and keeps every value (L2-008 AC6)", async ({ pages, teamApi }) => {
    const form = pages.createTeam;
    await teamApi.fail();
    await form.fill({
      name: "Design team",
      holidays: "Ireland",
      members: [{ name: "Ana Ruiz", email: "ana@northwind.studio" }],
    });
    await form.submit().click();

    await expect(form.failureTitle()).toHaveText("We couldn’t create your team");
    await expect(form.failureText()).toHaveText(
      "Something went wrong on our side. Nothing was saved, so you can try again.",
    );
    await expect(form.teamName()).toHaveValue("Design team");
    await expect(form.publicHolidays()).toHaveValue("IE");
    await expect(form.memberName(1)).toHaveValue("Ana Ruiz");
    await expect(form.memberEmail(1)).toHaveValue("ana@northwind.studio");
    await expect(form.submit()).toBeEnabled();
    await expect(form.teamName()).not.toHaveAttribute("readonly", /.*/);
  });
});

test.describe("Creating a team, getting there", () => {
  test("a signed-in person on no team who opens the calendar is sent to create a team (L2-008 AC8)", async ({
    goto,
    page,
    pages,
  }) => {
    await goto("calendar", { as: "newcomer" });

    await pages.createTeam.waitForReady();
    expect(new URL(page.url()).pathname).toBe("/create-team");
  });

  test("signing in on no team opens create-team (L2-008 AC8)", async ({ goto, page, pages }) => {
    await goto("signIn");
    await pages.signIn.waitForReady();

    await pages.signIn.signIn(PEOPLE.newcomer.email, DEMO_PASSWORD);

    await pages.createTeam.waitForReady();
    expect(new URL(page.url()).pathname).toBe("/create-team");
  });

  test("someone already on a team as a member opens create-team as Set up another team (L2-008 AC8, L2-055)", async ({
    goto,
    page,
    pages,
  }) => {
    await goto("createTeam", { as: "member" });

    await pages.createTeam.waitForReady();
    expect(new URL(page.url()).pathname).toBe("/create-team");
    await expect(pages.createTeam.heading()).toHaveText("Set up another team");
  });
});

test("a new manager creates Design team and finds its rows and UK holidays on the calendar (L2-008 AC5, AC7)", async ({
  goto,
  pages,
}, testInfo) => {
  const creator = PEOPLE[creatorFor(testInfo.project.name)];
  await goto("createTeam", { as: creatorFor(testInfo.project.name) });
  await pages.createTeam.waitForReady();

  await pages.createTeam.fill({
    name: "Design team",
    timeZone: "London (GMT+0 / BST)",
    holidays: "United Kingdom",
    members: [{ name: "Ana Ruiz", email: "ana.created@northwind.studio" }, { name: "Ben Okafor" }],
  });
  await pages.createTeam.submit().click();

  await expect(pages.createTeam.heading()).toHaveText("You’re all set");
  await expect(pages.createTeam.lead()).toHaveText("Your sheet is ready.");
  await expect(pages.createTeam.readyTitle()).toHaveText("Design team is ready");
  await expect(pages.createTeam.readyText()).toHaveText(
    "We’ve emailed invitations to 1 person. Anyone without an email is on the calendar now, and you can invite them later from Settings.",
  );

  await pages.createTeam.openCalendar().click();

  await pages.calendar.waitForReady();
  await expect(pages.calendar.memberNames()).toHaveText([creator.name, "Ana Ruiz", "Ben Okafor"]);
  await pages.calendar.nextMonth().click();
  await expect(pages.calendar.title()).toHaveText("December 2026");
  await expect(pages.calendar.cell("Ana Ruiz", "Fri 25 Dec")).toHaveAccessibleName(
    "Ana Ruiz, Fri 25 Dec: Christmas Day",
  );
  await expect(pages.calendar.cell("Ben Okafor", "Mon 28 Dec")).toHaveAccessibleName(
    "Ben Okafor, Mon 28 Dec: Boxing Day (substitute)",
  );
});
