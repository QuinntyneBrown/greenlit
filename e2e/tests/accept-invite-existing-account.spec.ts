// Acceptance Test
// Traces to: L2-058 AC2, AC3, AC4, AC5, AC6, AC9; L2-004 AC8; L2-052 AC6; L2-056 AC2
// Description: An invitation to an address that already has an account adds the inviting team to that account: signed
//              out with its password or Google, or signed in as it with one button. Signed in as someone else, the
//              page says the invitation is for someone else and attaches nothing. Afterwards the person, who manages
//              no team, switches between their teams from the header without Add another team.
// Data: fresh accounts from fixtures/households.ts: Omar manages Product team with Sam as a member; Maya manages
//       Chen family and invites Sam's address.

import { test, expect } from "../fixtures/gl-test.js";
import {
  MEMBER_PASSWORD,
  createTeam,
  freshMemberOf,
  freshPerson,
  inviteTo,
  type FreshPerson,
} from "../fixtures/households.js";

interface Setup {
  sam: FreshPerson;
  maya: FreshPerson;
  token: string;
}

async function samInvitedToChenFamily(request: Parameters<typeof freshPerson>[0]): Promise<Setup> {
  const omar = await freshPerson(request, "Omar Haddad");
  await createTeam(request, omar, "Product team");
  const sam = await freshMemberOf(request, omar, "Sam Chen");
  const maya = await freshPerson(request, "Maya Chen");
  await createTeam(request, maya, "Chen family");
  const token = await inviteTo(request, maya, "Sam Chen", sam.email);
  return { sam, maya, token };
}

test.describe("Accepting an invitation with an account one already has", () => {
  test("signed out, the page asks for the account's password instead of a new one (L2-058 AC2)", async ({ goto, page, pages }) => {
    const { sam, token } = await samInvitedToChenFamily(page.request);
    await goto("acceptInvite", { token });
    const accept = pages.acceptInvite;
    await accept.waitForReady();

    await expect(accept.heading()).toHaveText("Join Chen family");
    await expect(accept.lead()).toHaveText("Maya Chen invited you to share the team’s time off.");
    await expect(accept.accountNote()).toHaveText(
      `${sam.email} already has a Greenlit account. Sign in to add Chen family to your teams.`,
    );
    await expect(accept.joinWithGoogle()).toBeVisible();
    await expect(accept.email()).toHaveValue(sam.email);
    await expect(accept.email()).toHaveAttribute("readonly", "");
    await expect(accept.name()).toHaveCount(0);
    await expect(accept.confirm()).toHaveCount(0);
    await expect(accept.forgotPassword()).toBeVisible();
  });

  test("signed out, the right password joins the team and the page welcomes him (L2-058 AC2)", async ({ goto, page, pages }) => {
    const { token } = await samInvitedToChenFamily(page.request);
    await goto("acceptInvite", { token });
    const accept = pages.acceptInvite;
    await accept.waitForReady();

    await accept.accountPassword().fill(MEMBER_PASSWORD);
    await accept.signInAndJoin().click();

    await expect(accept.heading()).toHaveText("Welcome, Sam");
    await expect(accept.lead()).toHaveText("Chen family is now one of your teams.");
    await expect(accept.welcomeTitle()).toHaveText("You’re in");
    await expect(accept.welcomeText()).toHaveText("Welcome to Chen family. Your row is on the calendar.");
    await accept.openCalendar().click();
    await pages.calendar.waitForReady();
    await expect(pages.teamSwitcher.buttonName()).toHaveText("Chen family");
  });

  test("a wrong password says so and keeps the invitation open (L2-058 AC3)", async ({ goto, page, pages }) => {
    const { token } = await samInvitedToChenFamily(page.request);
    await goto("acceptInvite", { token });
    const accept = pages.acceptInvite;
    await accept.waitForReady();

    await accept.accountPassword().fill("not-his-password");
    await accept.signInAndJoin().click();

    await expect(accept.failureTitle()).toHaveText("Email or password doesn’t match");
    await expect(accept.failureText()).toHaveText("Check your password and try again. If you’ve forgotten it, you can reset it.");
    await accept.accountPassword().fill(MEMBER_PASSWORD);
    await accept.signInAndJoin().click();
    await expect(accept.heading()).toHaveText("Welcome, Sam");
  });

  test("signed in as the invited address, one button joins (L2-058 AC4)", async ({ goto, page, pages }) => {
    const { sam, token } = await samInvitedToChenFamily(page.request);
    await goto("acceptInvite", { token, session: sam.token });
    const accept = pages.acceptInvite;
    await accept.waitForReady();

    await expect(accept.heading()).toHaveText("Join Chen family");
    await expect(accept.signedInAs()).toHaveText(`You’re signed in as ${sam.email}.`);
    await expect(accept.accountPassword()).toHaveCount(0);
    await accept.join().click();

    await expect(accept.welcomeText()).toHaveText("Welcome to Chen family. Your row is on the calendar.");
  });

  test("signed in as someone else, nothing is attached (L2-058 AC5)", async ({ goto, page, pages }) => {
    const { sam, maya, token } = await samInvitedToChenFamily(page.request);
    await goto("acceptInvite", { token, session: maya.token });
    const accept = pages.acceptInvite;
    await accept.waitForReady();

    await expect(accept.heading()).toHaveText("This invitation is for someone else");
    await expect(accept.lead()).toHaveText(
      `It was sent to ${sam.email}, and you’re signed in as ${maya.email}. Sign out, then open the link again to join as ${sam.email}.`,
    );
    await expect(accept.signOut()).toBeVisible();
    await expect(accept.join()).toHaveCount(0);
    await accept.goToCalendar().click();
    await pages.calendar.waitForReady();
  });

  test("after joining, a member of two teams switches from the header with no team to add or manage (L2-056 AC2)", async ({
    goto,
    page,
    pages,
  }) => {
    const { sam, token } = await samInvitedToChenFamily(page.request);
    await goto("acceptInvite", { token, session: sam.token });
    await pages.acceptInvite.waitForReady();
    await pages.acceptInvite.join().click();
    await pages.acceptInvite.openCalendar().click();
    await pages.calendar.waitForReady();

    await pages.teamSwitcher.open();
    await expect(pages.teamSwitcher.teams()).toHaveText([/Product team/, /Chen family/]);
    await expect(pages.teamSwitcher.item("Add another team")).toHaveCount(0);
    await expect(pages.teamSwitcher.item("Manage your teams")).toHaveCount(0);
    await pages.teamSwitcher.team("Product team").click();
    await expect(pages.teamSwitcher.buttonName()).toHaveText("Product team");
  });
});
