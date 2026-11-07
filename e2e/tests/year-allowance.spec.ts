// Acceptance Test
// Traces to: L2-032 AC1-AC3
// Description: Below the grid, a table gives each person's allowance for the year with a usage bar, and
//              "Most days left first" orders it by days left, highest first.
// Data: the demo seed, "today" being the real clock in November 2026. Left: Ben 29 (nothing taken), Maya 25, Elif 25, Cleo 20,
//       Finn 18, Dev 16, Ana 11 (28 allowance, 17 used, none booked, 5 requested on 16-20 Nov).

import { test, expect } from "../fixtures/gl-test.js";

const TEAM_ORDER = ["Maya Chen", "Ana Ruiz", "Ben Okafor", "Cleo Park", "Dev Patel", "Elif Yılmaz", "Finn Murphy"];
const MOST_LEFT_FIRST = ["Ben Okafor", "Maya Chen", "Elif Yılmaz", "Cleo Park", "Finn Murphy", "Dev Patel", "Ana Ruiz"];

test.describe("The allowance table", () => {
  test("shows the year's allowance with a column for each figure (L2-032 AC1)", async ({ goto, pages }) => {
    await goto("year", { year: "2026" });
    await pages.year.waitForReady();

    await expect(pages.year.summaryHeading()).toHaveText("Allowance in 2026");
    await expect(pages.year.tableHeaders()).toHaveText(["Person", "Allowance", "Used", "Booked", "Requested", "Left", "Usage"]);
    await expect(pages.year.tablePeople()).toHaveText(TEAM_ORDER);
  });

  test("gives each person's figures as the calendar does (L2-032 AC1)", async ({ goto, pages }) => {
    await goto("year", { year: "2026" });
    await pages.year.waitForReady();

    await expect(pages.year.figures("Ana Ruiz")).toHaveText(["28", "17", "0", "5", "11"]);
    await expect(pages.year.figures("Ben Okafor")).toHaveText(["29", "0", "0", "0", "29"]);
  });

  test("a member sees the same table, their own row first (L2-032 AC1)", async ({ goto, pages }) => {
    await goto("memberYear", { as: "member", year: "2026" });
    await pages.year.waitForReady();

    await expect(pages.year.tablePeople().first()).toHaveText("Ana Ruiz");
    await expect(pages.year.figures("Ben Okafor")).toHaveText(["29", "0", "0", "0", "29"]);
  });

  test("names each usage bar for the days taken or booked and requested (L2-032 AC2)", async ({ goto, pages }) => {
    await goto("year", { year: "2026" });
    await pages.year.waitForReady();

    await expect(pages.year.usageBar("Ana Ruiz")).toHaveAccessibleName("17 of 28 days taken or booked, 5 requested");
    await expect(pages.year.usageBar("Maya Chen")).toHaveAccessibleName("0 of 25 days taken or booked, 0 requested");
  });

  test("offers to sort by days left, with a hint (L2-032 AC3)", async ({ goto, pages }) => {
    await goto("year", { year: "2026" });
    await pages.year.waitForReady();

    await expect(pages.year.summaryHint()).toBeVisible();
    await expect(pages.year.sortByDaysLeft()).toHaveAttribute("aria-pressed", "false");
  });

  test("sorting orders the rows by days left, highest first, and again returns to the team's order (L2-032 AC3)", async ({ goto, pages }) => {
    await goto("year", { year: "2026" });
    await pages.year.waitForReady();

    await pages.year.sortByDaysLeft().click();

    await expect(pages.year.sortByDaysLeft()).toHaveAttribute("aria-pressed", "true");
    await expect(pages.year.tablePeople()).toHaveText(MOST_LEFT_FIRST);

    await pages.year.sortByDaysLeft().click();

    await expect(pages.year.sortByDaysLeft()).toHaveAttribute("aria-pressed", "false");
    await expect(pages.year.tablePeople()).toHaveText(TEAM_ORDER);
  });

  test("sorting leaves the grid as it was (L2-032 AC3)", async ({ goto, pages }) => {
    await goto("year", { year: "2026" });
    await pages.year.waitForReady();

    await pages.year.sortByDaysLeft().click();

    await expect(pages.year.memberNames()).toHaveText(TEAM_ORDER);
  });
});
