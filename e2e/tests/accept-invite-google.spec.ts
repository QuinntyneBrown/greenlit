// Acceptance Test
// Traces to: L2-052, L2-058 AC3
// Description: Join with Google on the accept-invitation page: the invited Google account joins the team; another
//              address, an unverified one, an existing account, a dead link and a failure are reported in place.
// Data: every test invites a fresh address through the real API as the viewport's inviter (see accept-invite.spec);
//       Google is a stand-in (fixtures/google.ts) read by the e2e API's fake accounts reader (ADR-012).

import { createTeam, freshMemberOf, freshPerson, inviteTo } from "../fixtures/households.js";
import { test, expect } from "../fixtures/gl-test.js";
import { freshEmail, invite, join, paintDays } from "../fixtures/invitation.js";
import { API_BASE_URL, PEOPLE, SESSION_KEY, inviterFor } from "../fixtures/session.js";
import { ensureOwnTeam } from "../fixtures/team.js";

const TEAM = "Invite team";

function nextWeekday(daysAhead: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  while (date.getDay() === 0 || date.getDay() === 6) date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

test.describe("Joining with Google", () => {
  test.beforeEach(async ({ request }, testInfo) => {
    await ensureOwnTeam(request, inviterFor(testInfo.project.name), TEAM);
  });

  test("the card offers Google, with its G mark, above the form (L2-052 AC1)", async ({ goto, pages, request }, testInfo) => {
    const invitation = await invite(request, inviterFor(testInfo.project.name), "Finn Murphy", freshEmail("finn"));

    await goto("acceptInvite", { token: invitation.token });
    await pages.acceptInvite.waitForReady();

    const accept = pages.acceptInvite;
    await expect(accept.joinWithGoogle()).toBeEnabled();
    await expect(accept.googleMark()).toBeVisible();
    await expect(accept.divider()).toHaveText("or");
    await expect(accept.name()).toHaveValue("Finn Murphy");
    await expect(accept.email()).toHaveValue(invitation.email);
    await expect(accept.join()).toBeVisible();
  });

  test("while Google asks, the form is read-only; closing Google's window changes nothing (L2-052 AC2)", async ({
    goto,
    google,
    invitationsApi,
    pages,
    request,
  }, testInfo) => {
    const invitation = await invite(request, inviterFor(testInfo.project.name), "Finn Murphy", freshEmail("finn"));
    await goto("acceptInvite", { token: invitation.token });
    await pages.acceptInvite.waitForReady();
    const accept = pages.acceptInvite;
    await google.willDismiss();
    const release = await google.hold();

    await accept.joinWithGoogle().click();

    await expect(accept.joinWithGoogle()).toBeDisabled();
    await expect(accept.joinWithGoogle()).toHaveAttribute("aria-busy", "true");
    await expect(accept.name()).toHaveAttribute("readonly", "");
    await expect(accept.password()).toHaveAttribute("readonly", "");
    await expect(accept.join()).toBeDisabled();
    await release();

    await expect(accept.joinWithGoogle()).toBeEnabled();
    await expect(accept.name()).not.toHaveAttribute("readonly", "");
    await expect(accept.failure()).toHaveCount(0);
    expect(invitationsApi.acceptGoogleRequests()).toBe(0);
  });

  test("the invited Google account joins the team, keeps the row's days and lands on the calendar (L2-052 AC3)", async ({
    goto,
    google,
    invitationsApi,
    page,
    pages,
    request,
  }, testInfo) => {
    const inviter = inviterFor(testInfo.project.name);
    const invitation = await invite(request, inviter, "Finn M", freshEmail("finn"));
    const day = nextWeekday(3);
    await paintDays(request, inviter, invitation.memberId, [day]);
    await goto("acceptInvite", { token: invitation.token });
    await pages.acceptInvite.waitForReady();
    const accept = pages.acceptInvite;
    await google.willChoose({ email: invitation.email, name: "Finn Murphy" });
    const release = await invitationsApi.holdAcceptGoogle();

    await accept.joinWithGoogle().click();

    await expect(accept.joinWithGoogle()).toHaveAttribute("aria-busy", "true");
    release();
    await expect(accept.heading()).toHaveText("Welcome, Finn");
    await expect(accept.lead()).toHaveText("Your account is ready.");
    await expect(accept.welcomeTitle()).toHaveText("You’re in");
    await expect(accept.welcomeText()).toHaveText(`Welcome to ${TEAM}. Your row is on the calendar.`);
    await expect(accept.openCalendar()).toBeVisible();

    await pages.calendar.waitForReady();
    expect(new URL(page.url()).pathname).toBe("/");
    await expect(pages.calendar.youRow()).toContainText("Finn Murphy");
    expect(invitationsApi.acceptRequests()).toBe(0);

    const token = await page.evaluate((key) => window.localStorage.getItem(key), SESSION_KEY);
    const month = (await (
      await request.get(`${API_BASE_URL}/api/sheet?month=${day.slice(0, 7)}`, { headers: { Authorization: `Bearer ${token}` } })
    ).json()) as { members: { name: string; isYou: boolean; cells: { date: string; kind: string }[] }[] };
    const me = month.members.find((m) => m.isYou);
    expect(me?.name).toBe("Finn Murphy");
    expect(me?.cells.find((c) => c.date === day)?.kind).toBe("Tentative");
  });

  test("a Google account with another address is refused and the invitation stays open (L2-052 AC4)", async ({
    goto,
    google,
    pages,
    request,
  }, testInfo) => {
    const invitation = await invite(request, inviterFor(testInfo.project.name), "Finn Murphy", freshEmail("finn"));
    await goto("acceptInvite", { token: invitation.token });
    await pages.acceptInvite.waitForReady();
    const accept = pages.acceptInvite;
    await google.willChoose({ email: freshEmail("someone-else"), name: "Someone Else" });

    await accept.joinWithGoogle().click();

    await expect(accept.failureTitle()).toHaveText("That Google account doesn’t match your invitation");
    await expect(accept.failureText()).toHaveText(
      `Choose the Google account for ${invitation.email}, or join with a password instead.`,
    );
    await expect(accept.name()).toHaveValue("Finn Murphy");
    await expect(accept.joinWithGoogle()).toBeEnabled();
    // The invitation still works, with a password.
    await expect(await join(request, invitation, "new-secret-1234")).toBeTruthy();
  });

  test("a Google account whose email is not verified is refused (L2-052 AC5)", async ({
    goto,
    google,
    pages,
    request,
  }, testInfo) => {
    const invitation = await invite(request, inviterFor(testInfo.project.name), "Finn Murphy", freshEmail("finn"));
    await goto("acceptInvite", { token: invitation.token });
    await pages.acceptInvite.waitForReady();
    const accept = pages.acceptInvite;
    await google.willChoose({ email: invitation.email, name: "Finn Murphy", email_verified: false });

    await accept.joinWithGoogle().click();

    await expect(accept.failureTitle()).toHaveText("That Google account doesn’t match your invitation");
    await expect(accept.failureText()).toHaveText(
      "Google hasn’t verified that email address. Verify it with Google, or join with a password instead.",
    );
  });

  test("an address that already has an account joins with that account (L2-052 AC6, L2-058 AC3)", async ({
    goto,
    google,
    page,
    pages,
  }) => {
    const omar = await freshPerson(page.request, "Omar Haddad");
    await createTeam(page.request, omar, "Product team");
    const sam = await freshMemberOf(page.request, omar, "Sam Chen");
    const maya = await freshPerson(page.request, "Maya Chen");
    await createTeam(page.request, maya, "Chen family");
    const token = await inviteTo(page.request, maya, "Sam Chen", sam.email);
    await goto("acceptInvite", { token });
    await pages.acceptInvite.waitForReady();
    await google.willChoose({ email: sam.email, name: sam.name });

    await pages.acceptInvite.joinWithGoogle().click();

    await expect(pages.acceptInvite.lead()).toHaveText("Chen family is now one of your teams.");
    await expect(pages.acceptInvite.welcomeText()).toHaveText("Welcome to Chen family. Your row is on the calendar.");
  });

  test("a link that was already used shows the expired state (L2-052 AC7)", async ({
    goto,
    google,
    pages,
    request,
  }, testInfo) => {
    const inviter = inviterFor(testInfo.project.name);
    const invitation = await invite(request, inviter, "Finn Murphy", freshEmail("finn"));
    await goto("acceptInvite", { token: invitation.token });
    await pages.acceptInvite.waitForReady();
    await join(request, invitation, "new-secret-1234");
    const accept = pages.acceptInvite;
    await google.willChoose({ email: invitation.email, name: "Finn Murphy" });

    await accept.joinWithGoogle().click();

    await expect(accept.failureTitle()).toHaveText("This invitation has expired");
    await expect(accept.failureText()).toHaveText(
      `Invitations work for seven days. Ask ${PEOPLE[inviter].name} to send you a new one.`,
    );
    await expect(accept.goToSignIn()).toBeVisible();
  });

  test("a failure on Greenlit's side keeps the form and creates nothing (L2-052 AC8)", async ({
    goto,
    google,
    invitationsApi,
    pages,
    request,
  }, testInfo) => {
    const invitation = await invite(request, inviterFor(testInfo.project.name), "Finn Murphy", freshEmail("finn"));
    await goto("acceptInvite", { token: invitation.token });
    await pages.acceptInvite.waitForReady();
    const accept = pages.acceptInvite;
    await google.willChoose({ email: invitation.email, name: "Finn Murphy" });
    await invitationsApi.failAcceptGoogle();

    await accept.joinWithGoogle().click();

    await expect(accept.failureTitle()).toHaveText("We couldn’t create your account");
    await expect(accept.failureText()).toHaveText(
      "Something went wrong on our side. Nothing was changed. Try again in a moment.",
    );
    await expect(accept.name()).toHaveValue("Finn Murphy");
    await expect(accept.joinWithGoogle()).toBeEnabled();
    await expect(await join(request, invitation, "new-secret-1234")).toBeTruthy();
  });
});
