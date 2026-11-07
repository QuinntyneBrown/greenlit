// Acceptance Test
// Traces to: L2-033 AC1
// Description: A person's page shows a back link, the avatar and name, job title and join month,
//              the days left and the allowance figures.
// Data: the demo seed, "today" being the real clock in November 2026. Ana Ruiz is a Product Designer who joined
//       in March 2022: 28 days (25 + 3 carried over), 17 used, none booked, 5 requested on 16-20 Nov,
//       3 tentative on 29-31 Dec, so 11 left.

import { test, expect } from "../fixtures/gl-test.js";

test.describe("A person's page", () => {
  test("opens from a name in the allowance table (L2-033)", async ({ goto, page, pages }) => {
    await goto("year", { year: "2026" });
    await pages.year.waitForReady();

    await pages.year.tablePerson("Ana Ruiz").click();

    await pages.person.waitForReady();
    await expect(pages.person.name()).toHaveText("Ana Ruiz");
    await expect(page).toHaveURL(/\/people\/[0-9a-f-]{36}$/);
  });

  test("has a Calendar link back to the sheet (L2-033 AC1)", async ({ goto, pages }) => {
    await goto("person", { person: "Ana Ruiz" });
    await pages.person.waitForReady();

    await expect(pages.person.backLink()).toHaveText("Calendar");
    await expect(pages.person.backLink()).toHaveAttribute("href", "/");
  });

  test("names the person with their job title and when they joined (L2-033 AC1)", async ({ goto, pages }) => {
    await goto("person", { person: "Ana Ruiz" });
    await pages.person.waitForReady();

    await expect(pages.person.name()).toHaveText("Ana Ruiz");
    await expect(pages.person.subtitle()).toHaveText("Product Designer · Joined Mar 2022");
  });

  test("shows the days left in the year (L2-033 AC1)", async ({ goto, pages }) => {
    await goto("person", { person: "Ana Ruiz" });
    await pages.person.waitForReady();

    await expect(pages.person.daysLeft()).toHaveText("11");
    await expect(pages.person.daysLeftCaption()).toHaveText("days left in 2026");
  });

  test("shows the allowance, used, booked, requested and tentative days (L2-033 AC1)", async ({ goto, pages }) => {
    await goto("person", { person: "Ana Ruiz" });
    await pages.person.waitForReady();

    await expect(pages.person.factLabels()).toHaveText(["Allowance", "Used", "Booked", "Requested", "Tentative"]);
    await expect(pages.person.fact("Allowance")).toHaveText(/^28\s*incl\. \+3 adj\.$/);
    await expect(pages.person.fact("Used")).toHaveText("17");
    await expect(pages.person.fact("Booked")).toHaveText("0");
    await expect(pages.person.fact("Requested")).toHaveText("5");
    await expect(pages.person.fact("Tentative")).toHaveText("3");
  });
});
