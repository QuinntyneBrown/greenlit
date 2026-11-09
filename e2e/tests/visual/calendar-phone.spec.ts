// Visual parity
// Traces to: L2-063 (the calendar on a phone), mocks pages/calendar/phone, phone-picking, phone-range and phone-day
// Description: the phone's week matches its mocks region by region, in the mobile project. Baselines are captured from
//              the mocks (GL_BASELINE=1, `npm run baseline`) and the app is compared against them.
// Data: in the app, the demo seed with Dev on Monday to Thursday, as the mocks' cast. phone-range and phone-day add the
//       mocks' illustrative run: Ana, Cleo, Elif and Finn confirmed on 24–26 Nov (Ben's tentative 23–27 is seeded).
//       The days-left figures are illustrative in the mocks (docs/mocks/README.md, note 11), so both captures hide them;
//       the mock marks Fri 6 Nov as today, so that date is masked in the week of 2–8.
// Each test puts back what it painted.

import type { APIRequestContext } from "@playwright/test";
import { test, expect } from "../../fixtures/gl-test.js";
import { isBaseline } from "../../fixtures/routes.js";
import { clearDays, paintDays, weekdays } from "../../fixtures/days.js";
import { MON_TO_FRI, MON_TO_THU, setMemberDays } from "../../fixtures/working-days.js";

const RUN = weekdays("2026-11-24", "2026-11-26");
const OUT_TOGETHER = ["Ana Ruiz", "Cleo Park", "Elif Yılmaz", "Finn Murphy"];

/** Arranges the app's data as the mocks show it, and returns how to put it back. Nothing in a baseline run. */
async function arrange(request: APIRequestContext, run: boolean): Promise<() => Promise<void>> {
  if (isBaseline) return async () => {};
  await setMemberDays(request, "manager", "Dev Patel", MON_TO_THU);
  if (run) for (const member of OUT_TOGETHER) await paintDays(request, member, RUN, "Confirmed");
  return async () => {
    if (run) for (const member of OUT_TOGETHER) await clearDays(request, member, RUN);
    await setMemberDays(request, "manager", "Dev Patel", MON_TO_FRI);
  };
}

test.describe("The calendar on a phone matches its mocks", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "The week layout is the phone's (L2-063).");
  });

  test("the week matches pages/calendar/phone", async ({ goto, pages, request, settle }) => {
    const restore = await arrange(request, false);
    try {
      await goto("calendarPhone", { month: "2026-11" });
      await pages.calendar.waitForWeek();
      if (!isBaseline) await pages.calendar.showWeek("2–8");
      await settle();
      await pages.calendar.scrollToTop();
      await pages.calendar.hideLeftFigures();

      for (const region of [
        pages.calendar.shortDaysCard(),
        pages.calendar.weekTabList(),
        pages.calendar.weekCard(),
        pages.calendar.phoneLegend(),
      ]) {
        await pages.calendar.alignToPixelGrid(region);
      }
      await expect.soft(pages.calendar.phoneHint()).toHaveScreenshot("phone-hint.png");
      await pages.calendar.hidePhoneHint();
      await expect.soft(pages.calendar.shortDaysCard()).toHaveScreenshot("phone-short-days.png");
      await expect.soft(pages.calendar.weekTabList()).toHaveScreenshot("phone-week-tabs.png");
      await expect.soft(pages.calendar.weekCard()).toHaveScreenshot("phone-week.png", {
        mask: [pages.calendar.weekDate("Fri 6 Nov")],
      });
      await expect.soft(pages.calendar.phoneLegend()).toHaveScreenshot("phone-legend.png");
    } finally {
      await restore();
    }
  });

  test("a first day picked matches pages/calendar/phone-picking", async ({ goto, pages, request, settle }) => {
    const restore = await arrange(request, false);
    try {
      await goto("calendarPhonePicking", { month: "2026-11", as: "member" });
      await pages.calendar.waitForWeek();
      if (!isBaseline) {
        await pages.calendar.showWeek("23–29");
        await pages.calendar.tapCell("Ana Ruiz", "Mon 23 Nov");
      }
      await settle();
      await pages.calendar.scrollToTop();
      await pages.calendar.hideLeftFigures();

      await pages.calendar.alignToPixelGrid(pages.calendar.weekCard());
      await expect.soft(pages.calendar.weekCard()).toHaveScreenshot("phone-picking-week.png");
      await expect.soft(pages.calendar.markSheetPanel()).toHaveScreenshot("phone-picking-sheet.png");
    } finally {
      await restore();
    }
  });

  test("a range matches pages/calendar/phone-range", async ({ goto, pages, request, settle }) => {
    const restore = await arrange(request, true);
    try {
      await goto("calendarPhoneRange", { month: "2026-11" });
      await pages.calendar.waitForWeek();
      if (!isBaseline) {
        await pages.calendar.showWeek("23–29");
        await pages.calendar.tapCell("Ben Okafor", "Mon 23 Nov");
        await pages.calendar.tapCell("Ben Okafor", "Thu 26 Nov");
      }
      await settle();
      await pages.calendar.scrollToTop();
      await pages.calendar.hideLeftFigures();

      await pages.calendar.alignToPixelGrid(pages.calendar.shortDaysCard());
      await pages.calendar.alignToPixelGrid(pages.calendar.weekCard());
      await expect.soft(pages.calendar.shortDaysCard()).toHaveScreenshot("phone-range-short-days.png");
      await expect.soft(pages.calendar.weekCard()).toHaveScreenshot("phone-range-week.png");
      await expect.soft(pages.calendar.markSheetPanel()).toHaveScreenshot("phone-range-sheet.png");
    } finally {
      await restore();
    }
  });

  test("an open day matches pages/calendar/phone-day", async ({ goto, pages, request, settle }) => {
    const restore = await arrange(request, true);
    try {
      await goto("calendarPhoneDay", { month: "2026-11" });
      await pages.calendar.waitForWeek();
      if (!isBaseline) {
        await pages.calendar.showWeek("23–29");
        await pages.calendar.openDay("Thu 26 Nov");
      }
      await settle();
      await pages.calendar.scrollToTop();
      await pages.calendar.hideLeftFigures();

      await pages.calendar.alignToPixelGrid(pages.calendar.weekCard());
      await pages.calendar.alignToPixelGrid(pages.calendar.dayPanel());
      await pages.calendar.hidePhoneHint();
      await expect.soft(pages.calendar.weekCard()).toHaveScreenshot("phone-day-week.png");
      await expect.soft(pages.calendar.dayPanel()).toHaveScreenshot("phone-day-panel.png");
    } finally {
      await restore();
    }
  });
});
