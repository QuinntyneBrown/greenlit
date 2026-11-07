// Acceptance Test
// Traces to: L2-031 AC1-AC4
// Description: Everyone opens Year and sees twelve months per member as slivers of colour; selecting a
//              month opens the calendar on it, a member's own row comes first, and the year can be changed.
// Data: the demo seed. Ana Ruiz has 1 confirmed day in January, 4 in April, 10 in July and 2 in November
//       (4-5 Nov), and 5 requested days on 16-20 Nov.

import { test, expect } from "../fixtures/gl-test.js";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const TEAM = ["Maya Chen", "Ana Ruiz", "Ben Okafor", "Cleo Park", "Dev Patel", "Elif Yılmaz", "Finn Murphy"];

test.describe("The year grid", () => {
  test("shows the year, the legend and a row for every member with Jan to Dec (L2-031 AC1)", async ({ goto, pages }) => {
    await goto("year", { year: "2026" });
    await pages.year.waitForReady();

    await expect(pages.year.title()).toHaveText("2026");
    await expect(pages.year.previousYear()).toBeVisible();
    await expect(pages.year.nextYear()).toBeVisible();
    await expect(pages.year.legendItems()).toHaveText(["Confirmed", "Requested", "Tentative", "Weekend / holiday"]);
    await expect(pages.year.intro()).toBeVisible();
    await expect(pages.year.grid()).toBeVisible();
    await expect(pages.year.monthHeaders()).toHaveText(MONTHS);
    await expect(pages.year.memberNames()).toHaveText(TEAM);
  });

  test("names each month cell for the confirmed days off in it (L2-031 AC2)", async ({ goto, pages }) => {
    await goto("year", { year: "2026" });
    await pages.year.waitForReady();

    await expect(pages.year.month("Ana Ruiz", "July")).toHaveAccessibleName("Ana Ruiz, July: 10 confirmed days off");
    await expect(pages.year.month("Ana Ruiz", "November")).toHaveAccessibleName("Ana Ruiz, November: 2 confirmed days off");
    await expect(pages.year.month("Ben Okafor", "March")).toHaveAccessibleName("Ben Okafor, March: 0 confirmed days off");
  });

  test("draws a sliver for each day, coloured by its status (L2-031 AC1)", async ({ goto, pages }) => {
    await goto("year", { year: "2026" });
    await pages.year.waitForReady();

    const november = await pages.year.slivers("Ana Ruiz", "November");

    expect(november).toHaveLength(30);
    expect(november.slice(0, 7)).toEqual(["off", "empty", "empty", "confirmed", "confirmed", "empty", "off"]);
    expect(november.slice(15, 20)).toEqual(["requested", "requested", "requested", "requested", "requested"]);
  });

  test("selecting a month opens the calendar on it (L2-031 AC3)", async ({ goto, page, pages }) => {
    await goto("year", { year: "2026" });
    await pages.year.waitForReady();

    await pages.year.month("Ana Ruiz", "November").click();

    await pages.calendar.waitForReady();
    await expect(page).toHaveURL(/\?month=2026-11$/);
    await expect(pages.calendar.title()).toHaveText("November 2026");
  });

  test("a month header opens the calendar on it too (L2-031 AC3)", async ({ goto, page, pages }) => {
    await goto("year", { year: "2026" });
    await pages.year.waitForReady();

    await pages.year.monthHeader("Jul").click();

    await pages.calendar.waitForReady();
    await expect(page).toHaveURL(/\?month=2026-07$/);
  });

  test("a month cell opens from the keyboard (L2-031 AC3)", async ({ goto, page, pages }) => {
    await goto("year", { year: "2026" });
    await pages.year.waitForReady();

    await pages.year.month("Ana Ruiz", "December").focus();
    await page.keyboard.press("Enter");

    await pages.calendar.waitForReady();
    await expect(page).toHaveURL(/\?month=2026-12$/);
  });

  test("a member sees their own row first, marked You (L2-031 AC4)", async ({ goto, pages }) => {
    await goto("memberYear", { as: "member", year: "2026" });
    await pages.year.waitForReady();

    await expect(pages.year.memberNames().first()).toHaveText("Ana Ruiz");
    await expect(pages.year.you("Ana Ruiz")).toHaveText("You");
    await expect(pages.year.memberNames()).toHaveText(["Ana Ruiz", "Maya Chen", "Ben Okafor", "Cleo Park", "Dev Patel", "Elif Yılmaz", "Finn Murphy"]);
  });

  test("the manager's own row is marked You and no other is (L2-031 AC4)", async ({ goto, pages }) => {
    await goto("year", { year: "2026" });
    await pages.year.waitForReady();

    await expect(pages.year.you("Maya Chen")).toHaveText("You");
    await expect(pages.year.you("Ana Ruiz")).toHaveCount(0);
  });

  test("the arrows change the year (L2-031 AC1)", async ({ goto, page, pages }) => {
    await goto("year", { year: "2026" });
    await pages.year.waitForReady();

    await pages.year.nextYear().click();
    await expect(pages.year.title()).toHaveText("2027");
    await expect(page).toHaveURL(/\/year\?year=2027$/);
    await expect(pages.year.month("Ana Ruiz", "July")).toHaveAccessibleName("Ana Ruiz, July: 0 confirmed days off");

    await pages.year.previousYear().click();
    await pages.year.previousYear().click();
    await expect(pages.year.title()).toHaveText("2025");
  });

  test("the Year link in the main navigation opens the page", async ({ goto, pages }) => {
    await goto("calendar");
    await pages.calendar.waitForReady();

    await pages.calendar.openFromMainNav("Year");

    await pages.year.waitForReady();
    await expect(pages.year.grid()).toBeVisible();
  });
});
