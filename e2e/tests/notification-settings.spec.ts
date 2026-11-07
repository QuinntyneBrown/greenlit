// Acceptance Test
// Traces to: L2-043 (Email notifications)
// Description: The manager turns the new-request and decision emails on or off in Settings and saves them; the
//              emails follow the switches.
// Data: the Settings tests use each viewport's inviter (Uma, Vic, Wren), who manages a team of their own, and put
//       both switches back on. The email tests use the demo team: Ana's request for 18-19 Jan 2027 is sent and
//       cleared again, and both switches are put back on, so the other specs never see a change.

import { test, expect } from "../fixtures/gl-test.js";
import { clearDays } from "../fixtures/days.js";
import { setNotifications } from "../fixtures/notifications.js";
import { emailsTo, logMark, reopenApproved, sendOwnRequest } from "../fixtures/requests.js";
import { PEOPLE, inviterFor } from "../fixtures/session.js";
import { ensureMember, ensureOwnTeam } from "../fixtures/team.js";

test.describe("The notification switches", () => {
  test.beforeEach(async ({ goto, pages, request }, testInfo) => {
    const manager = inviterFor(testInfo.project.name);
    await ensureOwnTeam(request, manager, "Holiday team");
    await ensureMember(request, manager, "Teammate Holiday");
    await setNotifications(request, manager, { newRequests: true, decisions: true });
    await goto("settings", { as: manager });
    await pages.settings.waitForReady();
    await pages.settings.waitForNotifications();
  });

  test.afterEach(async ({ request }, testInfo) => {
    await setNotifications(request, inviterFor(testInfo.project.name), { newRequests: true, decisions: true });
  });

  test("Notifications explains email only and shows both switches on with Save changes (L2-043 AC1)", async ({ pages }, testInfo) => {
    const settings = pages.settings;
    const manager = PEOPLE[inviterFor(testInfo.project.name)].name;

    await expect(settings.notificationsIntro()).toHaveText("Email only. Greenlit never sends daily digests.");
    await expect(settings.newRequestsSwitch()).toBeChecked();
    await expect(settings.switchDescription("New requests")).toHaveText(`Email ${manager} when someone requests time off.`);
    await expect(settings.decisionsSwitch()).toBeChecked();
    await expect(settings.switchDescription("Decisions")).toHaveText(
      "Email team members when their request is approved or declined.",
    );
    await expect(settings.saveNotificationsButton()).toHaveText("Save changes");
    await expect(settings.saveNotificationsButton()).toBeDisabled();
  });

  test("a switch flips with the keyboard and Save changes saves both, and Settings shows them next time", async ({
    goto,
    pages,
    notificationsApi,
  }, testInfo) => {
    const settings = pages.settings;
    await settings.toggleNewRequestsWithKeyboard();
    await expect(settings.newRequestsSwitch()).not.toBeChecked();
    await expect(settings.saveNotificationsButton()).toBeEnabled();

    await settings.saveNotificationsButton().click();

    await expect(settings.saveNotificationsStatus()).toHaveText("Saved");
    await expect(settings.saveNotificationsButton()).toBeDisabled();
    expect(notificationsApi.saves()).toBe(1);
    await goto("settings", { as: inviterFor(testInfo.project.name) });
    await settings.waitForReady();
    await settings.waitForNotifications();
    await expect(settings.newRequestsSwitch()).not.toBeChecked();
    await expect(settings.decisionsSwitch()).toBeChecked();
  });

  test("flipping a switch back to the saved value leaves nothing to save", async ({ pages }) => {
    const settings = pages.settings;
    await settings.decisionsSwitch().click();
    await settings.decisionsSwitch().click();

    await expect(settings.saveNotificationsButton()).toBeDisabled();
  });

  test("saving shows Saving… and keeps the switches still (busy)", async ({ pages, notificationsApi }) => {
    const settings = pages.settings;
    const release = await notificationsApi.holdSave();
    await settings.decisionsSwitch().click();

    await settings.saveNotificationsButton().click();

    await expect(settings.saveNotificationsButton()).toHaveText("Saving…");
    await expect(settings.saveNotificationsButton()).toBeDisabled();
    await expect(settings.newRequestsSwitch()).toBeDisabled();
    await expect(settings.decisionsSwitch()).toBeDisabled();
    release();
    await expect(settings.saveNotificationsStatus()).toHaveText("Saved");
    await expect(settings.decisionsSwitch()).toBeEnabled();
    await expect(settings.decisionsSwitch()).not.toBeChecked();
  });

  test("a failed save keeps the switches as set and a toast offers Try again (failed)", async ({ pages, notificationsApi }) => {
    const settings = pages.settings;
    await notificationsApi.failSave();
    await settings.decisionsSwitch().click();

    await settings.saveNotificationsButton().click();

    await expect(settings.toast("We couldn’t save your changes")).toBeVisible();
    await expect(settings.toastText("We couldn’t save your changes")).toHaveText(
      "Nothing was changed. Check your connection and try again.",
    );
    await expect(settings.decisionsSwitch()).not.toBeChecked();
    await expect(settings.saveNotificationsButton()).toBeEnabled();

    await notificationsApi.recoverSave();
    await settings.toastAction("We couldn’t save your changes", "Try again").click();
    await expect(settings.saveNotificationsStatus()).toHaveText("Saved");
  });

  test("a member does not see Notifications", async ({ goto, pages }) => {
    await goto("settings", { as: "member" });
    await pages.settings.waitForReady();

    await expect(pages.settings.notificationsSection()).toHaveCount(0);
  });
});

test.describe("The emails follow the switches", () => {
  const DAYS = ["2027-01-18", "2027-01-19"];

  test.beforeEach(async ({ request }) => {
    await clearDays(request, "Ana Ruiz", DAYS);
    await reopenApproved(request, "Ana Ruiz", "2026-11-16");
    await setNotifications(request, "manager", { newRequests: true, decisions: true });
  });
  test.afterEach(async ({ request }) => {
    await clearDays(request, "Ana Ruiz", DAYS);
    await reopenApproved(request, "Ana Ruiz", "2026-11-16");
    await setNotifications(request, "manager", { newRequests: true, decisions: true });
  });

  test("with New requests on, Ana's request emails Maya (L2-043 AC2)", async ({ request }) => {
    const mark = await logMark();

    await sendOwnRequest(request, DAYS[0], DAYS[1], "Long weekend");

    const emails = await emailsTo("maya@northwind.studio", mark);
    expect(emails).toHaveLength(1);
    expect(emails[0]).toContain("Ana Ruiz asked for time off");
    expect(emails[0]).toContain("Ana Ruiz asked for 18–19 Jan (2 days).");
  });

  test("with New requests off, Ana's request emails nobody (L2-043 AC2)", async ({ request }) => {
    await setNotifications(request, "manager", { newRequests: false, decisions: true });
    const mark = await logMark();

    await sendOwnRequest(request, DAYS[0], DAYS[1], "Long weekend");

    expect(await emailsTo("maya@northwind.studio", mark)).toHaveLength(0);
  });

  test("with Decisions off, approving Ana's request sends no email and the toast does not say she was emailed (L2-043 AC3)", async ({
    goto,
    pages,
    request,
  }) => {
    await setNotifications(request, "manager", { newRequests: true, decisions: false });
    const mark = await logMark();
    await goto("requests");
    await pages.requests.waitForReady();

    await pages.requests.approve("Ana Ruiz").click();

    const toast = "Approved Ana’s time off";
    await expect(pages.requests.toast(toast)).toBeVisible();
    await expect(pages.requests.toastText(toast)).toHaveText("16–20 Nov is green on the calendar.");
    expect(await emailsTo("ana@northwind.studio", mark)).toHaveLength(0);
  });
});
