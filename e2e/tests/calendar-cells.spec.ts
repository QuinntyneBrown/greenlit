// Acceptance Test
// Traces to: L2-013, L2-014, L2-048
// Description: Every cell says its state in colour, glyph and accessible name; the Out row counts who is out.
// Data: the demo seed (docs/mocks/README.md), November and December 2026.

import { test, expect } from "../fixtures/gl-test.js";

test.describe("Calendar cells", () => {
  test.beforeEach(async ({ goto, pages }) => {
    await goto("calendar", { month: "2026-11" });
    await pages.calendar.waitForReady();
  });

  test("a working day with nothing stored is empty and says Working (L2-013 AC1)", async ({ pages }) => {
    const cell = pages.calendar.cell("Maya Chen", "Mon 2 Nov");
    await expect(cell).toHaveAccessibleName("Maya Chen, Mon 2 Nov: Working");
    await expect(cell).toHaveText("");
  });

  test("a weekend is red and says Not working (L2-013 AC2)", async ({ pages }) => {
    const cell = pages.calendar.cell("Ana Ruiz", "Sat 7 Nov");
    await expect(cell).toHaveAccessibleName("Ana Ruiz, Sat 7 Nov: Not working");
    await expect(cell).toHaveAttribute("data-status", "off");
    await expect(pages.calendar.dayHeader("Sat 7 Nov")).toHaveAttribute("data-off", "");
  });

  test("time off shows its colour, glyph and name (L2-013 AC4, AC5; L2-048 AC1)", async ({ pages }) => {
    const cases = [
      { member: "Ana Ruiz", day: "Wed 4 Nov", state: "Confirmed", status: "confirmed", glyph: "✓" },
      { member: "Ana Ruiz", day: "Mon 16 Nov", state: "Requested", status: "requested", glyph: "…" },
      { member: "Ben Okafor", day: "Mon 23 Nov", state: "Tentative", status: "tentative", glyph: "?" },
    ];
    for (const c of cases) {
      const cell = pages.calendar.cell(c.member, c.day);
      await expect(cell).toHaveAccessibleName(`${c.member}, ${c.day}: ${c.state}`);
      await expect(cell).toHaveAttribute("data-status", c.status);
      expect(await pages.calendar.glyphOf(cell)).toBe(c.glyph);
    }
  });

  test("the Out row counts who is out and who is in (L2-014 AC2)", async ({ pages }) => {
    await expect(await pages.calendar.outCell("Wed 4 Nov")).toHaveAccessibleName("1 out, 6 in");
    await expect(await pages.calendar.outCell("Wed 4 Nov")).toHaveText("1");
    await expect(await pages.calendar.outCell("Wed 18 Nov")).toHaveAccessibleName("2 out, 5 in");
    await expect(await pages.calendar.outCell("Mon 2 Nov")).toHaveAccessibleName("0 out, 7 in");
    await expect(await pages.calendar.outCell("Mon 2 Nov")).toHaveText("·");
    // Tentative days are still in: Ben's tentative week leaves everyone in.
    await expect(await pages.calendar.outCell("Mon 23 Nov")).toHaveAccessibleName("0 out, 7 in");
  });


});

test("a team holiday is red for everyone and named (L2-013 AC3)", async ({ goto, pages }) => {
  await goto("calendar", { month: "2026-12" });
  await pages.calendar.waitForReady();

  for (const member of ["Maya Chen", "Finn Murphy"]) {
    const cell = pages.calendar.cell(member, "Fri 25 Dec");
    await expect(cell).toHaveAccessibleName(`${member}, Fri 25 Dec: Christmas Day`);
    await expect(cell).toHaveAttribute("data-status", "off");
  }
  await expect(pages.calendar.dayHeader("Fri 25 Dec")).toHaveAttribute("data-off", "");
  await expect(await pages.calendar.outCell("Fri 25 Dec")).toHaveCount(0);
});
