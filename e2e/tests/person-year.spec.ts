// Acceptance Test
// Traces to: L2-033 AC2
// Description: "{year} at a glance" shows twelve month calendars (M T W T F S S) coloured by day status, with the
//              legend; every day is named by its date and status so the colour is never the only carrier.
// Data: the demo seed. Ana Ruiz: 2 Jan, 7-10 Apr, 13-24 Jul and 4-5 Nov confirmed; 16-20 Nov requested;
//       29-31 Dec tentative. 1 Jan is New Year's Day.

import { test, expect } from "../fixtures/gl-test.js";

test.describe("A person's year at a glance", () => {
  test.beforeEach(async ({ goto, pages }) => {
    await goto("person", { person: "Ana Ruiz" });
    await pages.person.waitForReady();
  });

  test("is headed with the year and the legend (L2-033 AC2)", async ({ pages }) => {
    await expect(pages.person.yearHeading()).toHaveText("2026 at a glance");
    await expect(pages.person.legendItems()).toHaveText(["Confirmed", "Requested", "Tentative", "Weekend / holiday"]);
  });

  test("shows twelve months with Monday-first weekday initials (L2-033 AC2)", async ({ pages }) => {
    await expect(pages.person.monthTitles()).toHaveText([
      "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December",
    ]);
    await expect(pages.person.weekdayInitials()).toHaveText(["M", "T", "W", "T", "F", "S", "S"]);
  });

  test("colours each day by its status and names it (L2-033 AC2)", async ({ pages }) => {
    await expect(pages.person.day("January", 2)).toHaveAttribute("data-status", "confirmed");
    await expect(pages.person.day("January", 2)).toHaveAccessibleName("2 January: Confirmed");
    await expect(pages.person.day("November", 16)).toHaveAttribute("data-status", "requested");
    await expect(pages.person.day("November", 16)).toHaveAccessibleName("16 November: Requested");
    await expect(pages.person.day("December", 29)).toHaveAttribute("data-status", "tentative");
    await expect(pages.person.day("December", 29)).toHaveAccessibleName("29 December: Tentative");
    await expect(pages.person.day("January", 5)).toHaveAttribute("data-status", "empty");
    await expect(pages.person.day("January", 5)).toHaveAccessibleName("5 January: Working");
  });

  test("shows weekends and holidays as off, a holiday named for what it is (L2-033 AC2)", async ({ pages }) => {
    await expect(pages.person.day("January", 3)).toHaveAttribute("data-status", "off");
    await expect(pages.person.day("January", 3)).toHaveAccessibleName("3 January: Not working");
    await expect(pages.person.day("January", 1)).toHaveAttribute("data-status", "off");
    await expect(pages.person.day("January", 1)).toHaveAccessibleName("1 January: New Year's Day");
  });
});
