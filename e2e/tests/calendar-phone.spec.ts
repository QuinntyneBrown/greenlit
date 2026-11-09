// Acceptance Test
// Traces to: L2-063
// Description: On a phone the calendar shows one week of the team at full width instead of the month grid.
// Data: the demo seed is the mocks' cast (docs/mocks/README.md), November 2026 as pages/calendar/phone.

import { test, expect } from "../fixtures/gl-test.js";
import { MON_TO_FRI, MON_TO_THU, setMemberDays } from "../fixtures/working-days.js";

const CAST = ["Maya Chen", "Ana Ruiz", "Ben Okafor", "Cleo Park", "Dev Patel", "Elif Yılmaz", "Finn Murphy"];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

test.describe("The calendar on a phone", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "The week layout is the phone's (L2-063); wider screens keep the grid.");
  });

  test("one week shows instead of the month grid and the paint picker (L2-063 AC1)", async ({ goto, pages }) => {
    await goto("calendar", { month: "2026-11" });
    await pages.calendar.waitForReady();

    await expect(pages.calendar.title()).toHaveText("November 2026");
    await expect(pages.calendar.weekTabs()).toHaveText(["1", "2–8", "9–15", "16–22", "23–29", "30"]);
    await expect(pages.calendar.grid()).toHaveCount(0);
    await expect(pages.calendar.paintPicker()).toHaveCount(0);
    expect(await pages.calendar.scrollsSideways()).toBe(false);
  });

  test("the week that holds today opens; another month opens on its first week (L2-063 AC1)", async ({ goto, pages }) => {
    await goto("calendar");
    await pages.calendar.waitForReady();
    const today = Number(new Intl.DateTimeFormat("en-GB", { day: "numeric", timeZone: "Europe/London" }).format(new Date()));
    const [from, to] = (await pages.calendar.selectedWeekTab().innerText()).split("–").map(Number);
    expect(today).toBeGreaterThanOrEqual(from);
    expect(today).toBeLessThanOrEqual(to ?? from);

    await goto("calendar", { month: "2026-10" });
    await pages.calendar.waitForReady();
    await expect(pages.calendar.selectedWeekTab()).toHaveText("1–4");
    await expect(pages.calendar.weekCard()).toHaveAccessibleName("Week of 1–4 Oct");
  });

  test("the month controls change month, which opens on its first week (L2-063 AC1)", async ({ goto, pages }) => {
    await goto("calendar", { month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.showWeek("16–22");

    await pages.calendar.nextMonth().click();

    await expect(pages.calendar.title()).toHaveText("December 2026");
    await expect(pages.calendar.weekTabs()).toHaveText(["1–6", "7–13", "14–20", "21–27", "28–31"]);
    await expect(pages.calendar.selectedWeekTab()).toHaveText("1–6");
    await expect(pages.calendar.weekCard()).toHaveAccessibleName("Week of 1–6 Dec");
  });

  test("the week card shows its dates, every member and cells named as on the grid (L2-063 AC2)", async ({ goto, pages, request }) => {
    // Dev works Monday to Thursday, as in the mocks' cast; the seed starts everyone on Monday to Friday.
    await setMemberDays(request, "manager", "Dev Patel", MON_TO_THU);
    try {
      await goto("calendar", { month: "2026-11" });
      await pages.calendar.waitForReady();

      await pages.calendar.showWeek("16–22");
      await expect(pages.calendar.selectedWeekTab()).toHaveText("16–22");
      await expect(pages.calendar.weekCard()).toHaveAccessibleName("Week of 16–22 Nov");
      for (const [i, weekday] of WEEKDAYS.entries()) {
        await expect(pages.calendar.weekDate(`${weekday} ${16 + i} Nov`)).toBeVisible();
      }
      await expect(pages.calendar.weekMemberNames()).toHaveText(CAST);
      await expect(pages.calendar.weekYou()).toHaveCount(0);
      await expect(pages.calendar.weekDaysLeft("Ana Ruiz")).toHaveText("11 left");

      const requested = pages.calendar.weekCell("Ana Ruiz", "Mon 16 Nov");
      await expect(requested).toHaveAccessibleName("Ana Ruiz, Mon 16 Nov: Requested");
      await expect(requested).toHaveAttribute("data-status", "requested");
      expect(await pages.calendar.glyphOf(requested)).toBe("…");
      await expect(pages.calendar.weekCell("Maya Chen", "Sat 21 Nov")).toHaveAccessibleName("Maya Chen, Sat 21 Nov: Not working");
      await expect(pages.calendar.weekCell("Dev Patel", "Fri 20 Nov")).toHaveAccessibleName("Dev Patel, Fri 20 Nov: Not working");
    } finally {
      await setMemberDays(request, "manager", "Dev Patel", MON_TO_FRI);
    }
  });

  test("a member's own row comes first, marked You (L2-063 AC2)", async ({ goto, pages }) => {
    await goto("calendar", { month: "2026-11", as: "member" });
    await pages.calendar.waitForReady();

    await expect(pages.calendar.weekMemberNames()).toHaveText(["Ana Ruiz", ...CAST.filter((n) => n !== "Ana Ruiz")]);
    await expect(pages.calendar.weekYouOf("Ana Ruiz")).toHaveText("You");
  });

  test("days of the week outside the month are blank (L2-063 AC2)", async ({ goto, pages }) => {
    await goto("calendar", { month: "2026-11" });
    await pages.calendar.waitForReady();

    await pages.calendar.showWeek("1");
    await expect(pages.calendar.weekCard()).toHaveAccessibleName("Week of 1 Nov");
    await expect(pages.calendar.weekDate("Sun 1 Nov")).toBeVisible();
    await expect(pages.calendar.weekBlanks()).toHaveCount(6 * CAST.length);
  });

  test("the Out line counts who is out each working day (L2-063 AC3)", async ({ goto, pages }) => {
    await goto("calendar", { month: "2026-11" });
    await pages.calendar.waitForReady();

    await pages.calendar.showWeek("16–22");
    await expect(await pages.calendar.weekOutCell("Wed 18 Nov")).toHaveAccessibleName("2 out, 5 in");
    await expect(await pages.calendar.weekOutCell("Wed 18 Nov")).toHaveText("2");
    await expect(await pages.calendar.weekOutCell("Sat 21 Nov")).toHaveCount(0);
  });
});

test.describe("The calendar on wider screens", () => {
  test("a tablet or a desktop keeps the month grid and the paint picker (L2-063 AC1)", async ({ goto, pages }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "A phone shows the week (L2-063).");
    await goto("calendar", { month: "2026-11" });
    await pages.calendar.waitForReady();

    await expect(pages.calendar.grid()).toBeVisible();
    await expect(pages.calendar.paintPicker()).toBeVisible();
    await expect(pages.calendar.weekTabList()).toHaveCount(0);
    await expect(pages.calendar.weekCard()).toHaveCount(0);
  });
});
