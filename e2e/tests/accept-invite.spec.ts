// Acceptance Test
// Traces to: L2-004, L2-058
// Description: A person opens their invitation link, sets a name and password, and lands signed in on the team's calendar.
// Data: every test invites a fresh address through the real API as the viewport's inviter (Uma, Vic or Wren, who each
//       manage a team of their own, see teams/invite-member), so a second run on the same database passes too. The
//       link is read from the e2e API's log (fixtures/invitation.ts, ADR-006).

import { createTeam, freshMemberOf, freshPerson, inviteTo } from "../fixtures/households.js";
import { test, expect } from "../fixtures/gl-test.js";
import { freshEmail, invite, paintDays } from "../fixtures/invitation.js";
import { API_BASE_URL, PEOPLE, SESSION_KEY, inviterFor } from "../fixtures/session.js";
import { ensureOwnTeam } from "../fixtures/team.js";

const TEAM = "Invite team";
const PASSWORD = "new-secret-1234";

test.describe("Accepting an invitation", () => {
  test.beforeEach(async ({ request }, testInfo) => {
    await ensureOwnTeam(request, inviterFor(testInfo.project.name), TEAM);
  });

  test("the link names the team and who invited you, with your name and the address it went to (L2-004 AC1, AC2)", async ({
    goto,
    pages,
    request,
  }, testInfo) => {
    const inviter = inviterFor(testInfo.project.name);
    const invitation = await invite(request, inviter, "Finn Murphy", freshEmail("finn"));

    await goto("acceptInvite", { token: invitation.token });
    await pages.acceptInvite.waitForReady();

    const accept = pages.acceptInvite;
    await expect(accept.heading()).toHaveText(`Join ${TEAM}`);
    await expect(accept.lead()).toHaveText(`${PEOPLE[inviter].name} invited you to share the team’s time off.`);
    await expect(accept.name()).toHaveValue("Finn Murphy");
    await expect(accept.email()).toHaveValue(invitation.email);
    await expect(accept.email()).toHaveAttribute("readonly", "");
    await expect(accept.emailHelp()).toHaveText("This is where your invitation was sent.");
    await expect(accept.password()).toBeVisible();
    await expect(accept.confirm()).toBeVisible();
    await expect(accept.join()).toBeVisible();
  });

  test("the page says it is checking the invitation while it loads", async ({ goto, invitationsApi, pages, request }, testInfo) => {
    const invitation = await invite(request, inviterFor(testInfo.project.name), "Finn Murphy", freshEmail("finn"));
    const release = await invitationsApi.holdRead();

    await goto("acceptInvite", { token: invitation.token });

    await pages.acceptInvite.waitForReady();
    await expect(pages.acceptInvite.heading()).toHaveText("Join your team");
    await expect(pages.acceptInvite.lead()).toHaveText("Checking your invitation…");
    await expect(pages.acceptInvite.loading()).toBeVisible();
    release();
    await expect(pages.acceptInvite.heading()).toHaveText(`Join ${TEAM}`);
  });

  test("a short password and a different confirmation are named, and no account is created (L2-004 AC3)", async ({
    goto,
    invitationsApi,
    pages,
    request,
  }, testInfo) => {
    const invitation = await invite(request, inviterFor(testInfo.project.name), "Finn Murphy", freshEmail("finn"));
    await goto("acceptInvite", { token: invitation.token });
    await pages.acceptInvite.waitForReady();
    const accept = pages.acceptInvite;
    await accept.fill({ password: "short", confirm: "different" });

    await accept.join().click();

    await expect(accept.summaryTitle()).toHaveText("Fix 2 things to continue");
    await expect(accept.summaryLinks()).toHaveText(["Password must be at least 10 characters", "Passwords don’t match"]);
    await expect(accept.fieldError("password")).toHaveText("Use at least 10 characters.");
    await expect(accept.fieldError("confirm")).toHaveText("This doesn’t match the password above.");
    await expect(accept.password()).toHaveAttribute("aria-invalid", "true");
    await expect(accept.confirm()).toHaveAttribute("aria-invalid", "true");
    expect(invitationsApi.acceptRequests()).toBe(0);
  });

  test("an empty name is named, and no account is created (L2-004 AC8)", async ({ goto, invitationsApi, pages, request }, testInfo) => {
    const invitation = await invite(request, inviterFor(testInfo.project.name), "Finn Murphy", freshEmail("finn"));
    await goto("acceptInvite", { token: invitation.token });
    await pages.acceptInvite.waitForReady();
    const accept = pages.acceptInvite;
    await accept.fill({ name: "", password: PASSWORD, confirm: PASSWORD });

    await accept.join().click();

    await expect(accept.summaryTitle()).toHaveText("Fix 1 thing to continue");
    await expect(accept.summaryLinks()).toHaveText(["Enter your name"]);
    await expect(accept.fieldError("name")).toHaveText("Enter your name.");
    await expect(accept.name()).toHaveAttribute("aria-invalid", "true");
    expect(invitationsApi.acceptRequests()).toBe(0);
  });

  test("joining shows the busy state, then welcomes you and opens the calendar with your row marked and your days kept (L2-004 AC5, AC9)", async ({
    goto,
    invitationsApi,
    page,
    pages,
    request,
  }, testInfo) => {
    const inviter = inviterFor(testInfo.project.name);
    const invitation = await invite(request, inviter, "Finn Murphy", freshEmail("finn"));
    const day = nextWeekday(3);
    await paintDays(request, inviter, invitation.memberId, [day]);
    await goto("acceptInvite", { token: invitation.token });
    await pages.acceptInvite.waitForReady();
    const accept = pages.acceptInvite;
    await accept.fill({ name: "Finn Murphy", password: PASSWORD, confirm: PASSWORD });
    const release = await invitationsApi.holdAccept();

    await accept.join().click();

    await expect(accept.join()).toBeDisabled();
    await expect(accept.join()).toHaveAttribute("aria-busy", "true");
    await expect(accept.name()).toHaveAttribute("readonly", "");
    await expect(accept.password()).toHaveAttribute("readonly", "");
    release();

    await expect(accept.heading()).toHaveText("Welcome, Finn");
    await expect(accept.lead()).toHaveText("Your account is ready.");
    await expect(accept.welcomeTitle()).toHaveText("You’re in");
    await expect(accept.welcomeText()).toHaveText(`Welcome to ${TEAM}. Your row is on the calendar.`);
    await expect(accept.openCalendar()).toBeVisible();

    await pages.calendar.waitForReady();
    expect(new URL(page.url()).pathname).toBe("/");
    await expect(pages.calendar.youRow()).toContainText("Finn Murphy");

    // The day the manager had already put on the row is still there, and the new session reads it.
    const token = await page.evaluate((key) => window.localStorage.getItem(key), SESSION_KEY);
    const month = (await (
      await request.get(`${API_BASE_URL}/api/sheet?month=${day.slice(0, 7)}`, { headers: { Authorization: `Bearer ${token}` } })
    ).json()) as { members: { name: string; isYou: boolean; cells: { date: string; kind: string }[] }[] };
    const me = month.members.find((m) => m.isYou);
    expect(me?.name).toBe("Finn Murphy");
    expect(me?.cells.find((c) => c.date === day)?.kind).toBe("Tentative");
  });

  test("pressing Enter in the last field joins, and the calendar opens by itself (keyboard)", async ({
    goto,
    page,
    pages,
    request,
  }, testInfo) => {
    const invitation = await invite(request, inviterFor(testInfo.project.name), "Finn Murphy", freshEmail("finn"));
    await goto("acceptInvite", { token: invitation.token });
    await pages.acceptInvite.waitForReady();
    await pages.acceptInvite.fill({ name: "Finn M", password: PASSWORD, confirm: PASSWORD });

    await pages.acceptInvite.confirm().press("Enter");

    await expect(pages.acceptInvite.heading()).toHaveText("Welcome, Finn");
    await expect(pages.acceptInvite.openCalendar()).toHaveAttribute("href", "/");
    await pages.calendar.waitForReady();
    expect(new URL(page.url()).pathname).toBe("/");
    await expect(pages.calendar.youRow()).toContainText("Finn M");
  });

  test("the person can sign in afterwards with the password they chose (L2-004 AC5)", async ({ goto, page, pages, request }, testInfo) => {
    const invitation = await invite(request, inviterFor(testInfo.project.name), "Finn Murphy", freshEmail("finn"));
    await goto("acceptInvite", { token: invitation.token });
    await pages.acceptInvite.waitForReady();
    await pages.acceptInvite.fill({ password: PASSWORD, confirm: PASSWORD });
    await pages.acceptInvite.join().click();
    await expect(pages.acceptInvite.heading()).toHaveText("Welcome, Finn");
    await pages.calendar.waitForReady();
    await page.evaluate(() => window.localStorage.clear());

    await goto("signIn");
    await pages.signIn.waitForReady();
    await pages.signIn.signIn(invitation.email, PASSWORD);

    await expect(pages.signIn.welcomeTitle()).toHaveText("Welcome back, Finn");
  });

  test("a link that was already used says the invitation has expired and who to ask (L2-004 AC4, AC6)", async ({
    goto,
    page,
    pages,
    request,
  }, testInfo) => {
    const inviter = inviterFor(testInfo.project.name);
    const invitation = await invite(request, inviter, "Finn Murphy", freshEmail("finn"));
    await goto("acceptInvite", { token: invitation.token });
    await pages.acceptInvite.waitForReady();
    await pages.acceptInvite.fill({ password: PASSWORD, confirm: PASSWORD });
    await pages.acceptInvite.join().click();
    await pages.calendar.waitForReady();
    await page.evaluate(() => window.localStorage.clear());

    await goto("acceptInvite", { token: invitation.token });

    await pages.acceptInvite.waitForReady();
    await expect(pages.acceptInvite.heading()).toHaveText("Join your team");
    await expect(pages.acceptInvite.lead()).toHaveText("We couldn’t use that link.");
    await expect(pages.acceptInvite.failureTitle()).toHaveText("This invitation has expired");
    await expect(pages.acceptInvite.failureText()).toHaveText(
      `Invitations work for seven days. Ask ${PEOPLE[inviter].name} to send you a new one.`,
    );
    await expect(pages.acceptInvite.goToSignIn()).toBeVisible();
    await expect(pages.acceptInvite.password()).toHaveCount(0);

    await pages.acceptInvite.goToSignIn().click();
    await pages.signIn.waitForReady();
  });

  test("a link that matches no invitation names no one (L2-004 AC6)", async ({ goto, pages }) => {
    await goto("acceptInvite", { token: "this-is-not-a-real-invitation" });

    await pages.acceptInvite.waitForReady();
    await expect(pages.acceptInvite.failureTitle()).toHaveText("This invitation has expired");
    await expect(pages.acceptInvite.failureText()).toHaveText(
      "Invitations work for seven days. Ask whoever invited you to send you a new one.",
    );
    await expect(pages.acceptInvite.goToSignIn()).toBeVisible();
  });

  test("when the invitation cannot be loaded the page says so and Try again loads it (L2-004 AC7)", async ({
    goto,
    invitationsApi,
    pages,
    request,
  }, testInfo) => {
    const invitation = await invite(request, inviterFor(testInfo.project.name), "Finn Murphy", freshEmail("finn"));
    await invitationsApi.failRead();

    await goto("acceptInvite", { token: invitation.token });

    await pages.acceptInvite.waitForReady();
    await expect(pages.acceptInvite.heading()).toHaveText("Join your team");
    await expect(pages.acceptInvite.lead()).toHaveText("We couldn’t open your invitation.");
    await expect(pages.acceptInvite.failureTitle()).toHaveText("We couldn’t load your invitation");
    await expect(pages.acceptInvite.failureText()).toHaveText("Something went wrong on our side. Nothing was changed. Try again in a moment.");

    await invitationsApi.recoverRead();
    await pages.acceptInvite.tryAgain().click();

    await expect(pages.acceptInvite.heading()).toHaveText(`Join ${TEAM}`);
    await expect(pages.acceptInvite.email()).toHaveValue(invitation.email);
  });

  test("when the account cannot be created the page says so, keeps the fields and creates nothing (L2-004 AC7)", async ({
    goto,
    invitationsApi,
    pages,
    request,
  }, testInfo) => {
    const invitation = await invite(request, inviterFor(testInfo.project.name), "Finn Murphy", freshEmail("finn"));
    await goto("acceptInvite", { token: invitation.token });
    await pages.acceptInvite.waitForReady();
    await pages.acceptInvite.fill({ name: "Finn Murphy", password: PASSWORD, confirm: PASSWORD });
    await invitationsApi.failAccept();

    await pages.acceptInvite.join().click();

    await expect(pages.acceptInvite.failureTitle()).toHaveText("We couldn’t create your account");
    await expect(pages.acceptInvite.failureText()).toHaveText("Something went wrong on our side. Nothing was changed. Try again in a moment.");
    await expect(pages.acceptInvite.password()).toHaveValue(PASSWORD);
    await expect(pages.acceptInvite.join()).toBeEnabled();
  });

  test("an address that already has an account is asked to sign in and join, not to choose a password (L2-004 AC8, L2-058)", async ({
    goto,
    page,
    pages,
  }) => {
    const omar = await freshPerson(page.request, "Omar Haddad");
    await createTeam(page.request, omar, "Product team");
    const sam = await freshMemberOf(page.request, omar, "Sam Chen");
    const maya = await freshPerson(page.request, "Maya Chen");
    await createTeam(page.request, maya, "Chen family");
    const invitation = await inviteTo(page.request, maya, "Sam Chen", sam.email);
    await goto("acceptInvite", { token: invitation });
    await pages.acceptInvite.waitForReady();

    await expect(pages.acceptInvite.signInAndJoin()).toBeVisible();
    await expect(pages.acceptInvite.password()).toHaveCount(0);
    await expect(pages.acceptInvite.confirm()).toHaveCount(0);
  });
});

/** The first weekday at least `daysAhead` days from today, as `yyyy-MM-dd`. */
function nextWeekday(daysAhead: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  while ([0, 6].includes(date.getDay())) date.setDate(date.getDate() + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
