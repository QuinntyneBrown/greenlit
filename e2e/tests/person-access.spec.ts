// Acceptance Test
// Traces to: L2-035 AC1-AC3
// Description: A member opens only their own person page; another member's page, a person who is not on the team,
//              a failure and a slow answer each have their own state.
// Data: the demo seed. Ana Ruiz is the signed-in member; Ben Okafor is another member of the team.

import { test, expect } from "../fixtures/gl-test.js";

test.describe("Opening a person's page", () => {
  test("a member opens their own page (L2-035 AC1)", async ({ goto, pages }) => {
    await goto("memberPerson", { as: "member", person: "Ana Ruiz" });
    await pages.person.waitForReady();

    await expect(pages.person.name()).toHaveText("Ana Ruiz");
    await expect(pages.person.daysLeft()).toHaveText("11");
  });

  test("a member opening another member's page is told only their own details are visible (L2-035 AC1)", async ({ goto, pages }) => {
    await goto("person", { as: "member", person: "Ben Okafor" });
    await pages.person.waitForReady();

    await expect(pages.person.noticeTitle()).toHaveText("Only your own details are visible");
    await expect(pages.person.noticeText()).toHaveText("Managers can see everyone's allowance. You can still see the team on the calendar.");
    await expect(pages.person.noticeAction("View my time off")).toBeVisible();
    await expect(pages.person.name()).toHaveCount(0);
  });

  test("View my time off opens their own page (L2-035 AC1)", async ({ goto, pages }) => {
    await goto("person", { as: "member", person: "Ben Okafor" });
    await pages.person.waitForReady();

    await pages.person.noticeAction("View my time off").click();

    await expect(pages.person.name()).toHaveText("Ana Ruiz");
  });

  test("someone who is not on the team is not found (L2-035 AC2)", async ({ goto, pages }) => {
    await goto("person", { personId: "6f1b2f0e-0000-4000-8000-000000000000" });
    await pages.person.waitForReady();

    await expect(pages.person.pageHeading()).toHaveText("Person not found");
    await expect(pages.person.noticeTitle()).toHaveText("This person isn't on the team");
    await expect(pages.person.noticeText()).toHaveText("They may have been removed.");
    await expect(pages.person.noticeAction("Back to calendar")).toBeVisible();
  });

  test("a page that cannot be loaded says so and Try again loads it (L2-035 AC3)", async ({ goto, pages, personApi }) => {
    await personApi.fail();
    await goto("person", { person: "Ana Ruiz" });
    await pages.person.waitForReady();

    await expect(pages.person.noticeTitle()).toHaveText("We couldn't load this page");
    await expect(pages.person.noticeText()).toHaveText("Something went wrong on our side. Nothing was changed.");
    await expect(pages.person.backLink()).toBeVisible();

    await personApi.recover();
    await pages.person.noticeAction("Try again").click();

    await expect(pages.person.name()).toHaveText("Ana Ruiz");
  });

  test("shows placeholders and a Loading heading while the person loads", async ({ goto, pages, personApi }) => {
    const release = await personApi.hold();
    await goto("person", { person: "Ana Ruiz" });
    await expect(pages.person.body).toHaveAttribute("data-page", "person");

    await expect(pages.person.pageHeading()).toHaveText("Loading time off");
    await expect(pages.person.placeholders().first()).toBeVisible();
    await expect(pages.person.daysLeft()).toHaveCount(0);

    release();

    await expect(pages.person.name()).toHaveText("Ana Ruiz");
    await expect(pages.person.placeholders()).toHaveCount(0);
  });
});
