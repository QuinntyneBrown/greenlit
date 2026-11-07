// Acceptance Test
// Traces to: L2-033 AC4, L2-006 AC5
// Description: A member opens their own page from the account menu's "My time off" and can request time off from
//              it; nobody else is offered "Request time off" there.
// Data: the demo seed. Ana Ruiz is the signed-in member and Maya Chen the manager.

import { test, expect } from "../fixtures/gl-test.js";

test.describe("My time off", () => {
  test("opens the signed-in member's own page from the account menu (L2-006 AC5)", async ({ goto, page, pages }) => {
    await goto("calendar", { as: "member" });
    await pages.calendar.waitForReady();

    await pages.accountMenu.open();
    await pages.accountMenu.item("My time off").click();

    await pages.person.waitForReady();
    await expect(pages.person.name()).toHaveText("Ana Ruiz");
    await expect(page).toHaveURL(/\/person$/);
  });

  test("opens the manager's own page from the account menu (L2-006 AC5)", async ({ goto, pages }) => {
    await goto("calendar");
    await pages.calendar.waitForReady();

    await pages.accountMenu.open();
    await pages.accountMenu.item("My time off").click();

    await pages.person.waitForReady();
    await expect(pages.person.name()).toHaveText("Maya Chen");
    await expect(pages.person.subtitle()).toHaveText("Design Lead · Joined Jan 2021");
  });

  test("offers a member Request time off on their own page, which opens the request dialog (L2-033 AC4)", async ({ goto, pages }) => {
    await goto("myTimeOff", { as: "member" });
    await pages.person.waitForReady();

    await pages.person.requestTimeOff().click();

    await expect(pages.newRequest.dialog()).toBeVisible();
    await expect(pages.newRequest.title()).toHaveText("Request time off");
  });

  test("does not offer the manager Request time off on a member's page (L2-033 AC4)", async ({ goto, pages }) => {
    await goto("person", { person: "Ana Ruiz" });
    await pages.person.waitForReady();

    await expect(pages.person.requestTimeOff()).toHaveCount(0);
  });
});
