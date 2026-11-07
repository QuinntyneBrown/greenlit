// Acceptance Test
// Traces to: L2-033 AC3, L2-034 AC1-AC2 (adjustments list)
// Description: "Upcoming" lists future runs with their range, days and status; "Taken in {year}" lists past
//              confirmed runs, newest first; "Allowance adjustments" lists each adjustment.
// Data: the demo seed, "today" being the real clock in November 2026. Ana Ruiz: confirmed 2 Jan, 7-10 Apr,
//       13-24 Jul and 4-5 Nov; requested 16-20 Nov; tentative 29-31 Dec; +3 carried over from 2025 on 1 Jan 2026.

import { test, expect } from "../fixtures/gl-test.js";

test.describe("A person's time off", () => {
  test("lists the upcoming runs with range, days and status (L2-033 AC3)", async ({ goto, pages }) => {
    await goto("person", { person: "Ana Ruiz" });
    await pages.person.waitForReady();

    await expect(pages.person.rows("Upcoming")).toHaveText(["16–20 Nov5 daysRequested", "29–31 Dec3 daysTentative"]);
  });

  test("lists the taken runs, newest first, a single day with its weekday (L2-033 AC3)", async ({ goto, pages }) => {
    await goto("person", { person: "Ana Ruiz" });
    await pages.person.waitForReady();

    await expect(pages.person.rows("Taken in 2026")).toHaveText([
      "4–5 Nov2 daysConfirmed",
      "13–24 Jul10 daysConfirmed",
      "7–10 Apr4 daysConfirmed",
      "Fri 2 Jan1 dayConfirmed",
    ]);
  });

  test("lists the allowance adjustments with their reason and date (L2-034 AC1)", async ({ goto, pages }) => {
    await goto("person", { person: "Ana Ruiz" });
    await pages.person.waitForReady();

    await expect(pages.person.rows("Allowance adjustments")).toHaveText(["+3Carried over from 20251 Jan 2026"]);
  });

  test("says so when nothing is planned, taken or adjusted (L2-033 AC3)", async ({ goto, pages, personApi }) => {
    await personApi.change((person) => {
      person.upcoming = [];
      person.taken = [];
      person.adjustments = [];
    });
    await goto("person", { person: "Ana Ruiz" });
    await pages.person.waitForReady();

    await expect(pages.person.emptyNote("Upcoming")).toHaveText("Nothing planned for the rest of the year.");
    await expect(pages.person.emptyNote("Taken in 2026")).toHaveText("No time off taken yet this year.");
    await expect(pages.person.emptyNote("Allowance adjustments")).toHaveText("No adjustments.");
  });

  test("shows a negative adjustment with its minus sign (L2-034 AC1)", async ({ goto, pages, personApi }) => {
    await personApi.change((person) => {
      person.adjustments = [{ id: "a", days: -2, reason: "Unpaid leave taken in March", effectiveDate: "2026-03-31" }];
    });
    await goto("person", { person: "Ana Ruiz" });
    await pages.person.waitForReady();

    await expect(pages.person.rows("Allowance adjustments")).toHaveText(["-2Unpaid leave taken in March31 Mar 2026"]);
  });
});
