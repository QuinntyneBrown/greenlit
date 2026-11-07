// Acceptance Test
// Traces to: L2-044 AC1-AC4, L2-018 AC1
// Description: How a toast lives: the 8 s timer and its pauses, error toasts that stay, Undo and Dismiss.
// Data: the demo seed, November 2026. Ana's 23-30 Nov is blank and cleared after each test. The page clock is
//       installed before the page loads so the 8 s lifetime can be fast-forwarded.

import { test, expect } from "../fixtures/gl-test.js";
import { clearDays } from "../fixtures/days.js";

const ANA_PAINTED = ["2026-11-23", "2026-11-24", "2026-11-25", "2026-11-26", "2026-11-27", "2026-11-30"];
const SAVED = "Marked 1 day tentative";

test.describe("Toast lifetime", () => {
  test.beforeEach(async ({ request, page, goto, pages }) => {
    await clearDays(request, "Ana Ruiz", ANA_PAINTED);
    await page.clock.install();
    await goto("calendar", { as: "member", month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.choosePaint("Tentative");
  });
  test.afterEach(async ({ request }) => {
    await clearDays(request, "Ana Ruiz", ANA_PAINTED);
  });

  test("a success toast leaves after 8 s (L2-044 AC1)", async ({ page, pages }) => {
    await pages.calendar.paint("Ana Ruiz", "Mon 23 Nov");
    await expect(pages.calendar.toast(SAVED)).toBeVisible();

    await page.clock.fastForward(7000);
    await expect(pages.calendar.toast(SAVED)).toBeVisible();

    await page.clock.fastForward(1500);
    await expect(pages.calendar.toast(SAVED)).toHaveCount(0);
  });

  test("hovering a toast pauses its timer (L2-044 AC1)", async ({ page, pages }) => {
    await pages.calendar.paint("Ana Ruiz", "Mon 23 Nov");
    await pages.calendar.hoverToast(SAVED);

    await page.clock.fastForward(30000);
    await expect(pages.calendar.toast(SAVED)).toBeVisible();

    await pages.calendar.leaveToasts();
    await page.clock.fastForward(8500);
    await expect(pages.calendar.toast(SAVED)).toHaveCount(0);
  });

  test("focusing a toast pauses its timer (L2-044 AC1)", async ({ page, pages }) => {
    await pages.calendar.paint("Ana Ruiz", "Mon 23 Nov");
    await pages.calendar.toastAction(SAVED, "Undo").focus();

    await page.clock.fastForward(30000);
    await expect(pages.calendar.toast(SAVED)).toBeVisible();

    await pages.calendar.blurToast();
    await page.clock.fastForward(8500);
    await expect(pages.calendar.toast(SAVED)).toHaveCount(0);
  });

  test("an error toast stays until it is dismissed (L2-044 AC2, AC4)", async ({ page, pages, sheetApi }) => {
    await sheetApi.failSaves();
    await pages.calendar.paint("Ana Ruiz", "Mon 23 Nov");
    const title = "We couldn’t save those days";
    await expect(pages.calendar.toast(title)).toBeVisible();

    await page.clock.fastForward(60000);
    await expect(pages.calendar.toast(title)).toBeVisible();

    await pages.calendar.toastDismiss(title).click();
    await expect(pages.calendar.toast(title)).toHaveCount(0);
  });

  test("Undo still works just before the toast leaves (L2-044 AC3, L2-018 AC1)", async ({ page, pages }) => {
    await pages.calendar.paint("Ana Ruiz", "Mon 23 Nov");
    await page.clock.fastForward(7500);

    await pages.calendar.toastAction(SAVED, "Undo").click();

    await expect(pages.calendar.cell("Ana Ruiz", "Mon 23 Nov")).toHaveAccessibleName("Ana Ruiz, Mon 23 Nov: Working");
  });

  test("Dismiss closes a success toast (L2-044 AC4)", async ({ pages }) => {
    await pages.calendar.paint("Ana Ruiz", "Mon 23 Nov");

    await pages.calendar.toastDismiss(SAVED).click();

    await expect(pages.calendar.toast(SAVED)).toHaveCount(0);
  });
});

test.describe("Toast announcements", () => {
  test.beforeEach(async ({ request }) => {
    await clearDays(request, "Ana Ruiz", ANA_PAINTED);
  });
  test.afterEach(async ({ request }) => {
    await clearDays(request, "Ana Ruiz", ANA_PAINTED);
  });

  test("info and success toasts are announced politely, warning and error toasts assertively (design: ToastOutlet)", async ({
    goto,
    pages,
    sheetApi,
  }) => {
    await goto("calendar", { as: "member", month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.choosePaint("Tentative");

    await pages.calendar.paint("Ana Ruiz", "Mon 23 Nov");
    await expect(pages.calendar.toastAnnouncedAs(SAVED)).toHaveAttribute("aria-live", "polite");

    await pages.calendar.paint("Ana Ruiz", "Wed 4 Nov");
    const warning = "Confirmed days can only be changed by Maya";
    await expect(pages.calendar.toast(warning)).toBeVisible();
    await expect(pages.calendar.toastAnnouncedAs(warning)).toHaveAttribute("aria-live", "assertive");

    await sheetApi.failSaves();
    await pages.calendar.paint("Ana Ruiz", "Tue 24 Nov");
    const error = "We couldn’t save those days";
    await expect(pages.calendar.toastAnnouncedAs(error)).toHaveAttribute("aria-live", "assertive");
  });
});

test.describe("Toast placement", () => {
  test.beforeEach(async ({ request }) => {
    await clearDays(request, "Ana Ruiz", ANA_PAINTED);
  });
  test.afterEach(async ({ request }) => {
    await clearDays(request, "Ana Ruiz", ANA_PAINTED);
  });

  test("a toast never covers the element that has focus", async ({ goto, pages }) => {
    await goto("calendar", { as: "member", month: "2026-11" });
    await pages.calendar.waitForReady();
    await pages.calendar.choosePaint("Tentative");
    await pages.calendar.paint("Ana Ruiz", "Mon 23 Nov");
    await pages.calendar.paint("Ana Ruiz", "Tue 24 Nov");
    await pages.calendar.paint("Ana Ruiz", "Wed 25 Nov");
    await expect(pages.calendar.toasts()).toHaveCount(3);

    const last = (await pages.calendar.memberNames().last().innerText()).trim();
    await pages.calendar.focusCellAtViewportFoot(last, "Fri 27 Nov");

    await expect.poll(() => pages.calendar.focusIsCoveredByToast()).toBe(false);
  });
});
