// Acceptance Test
// Traces to: L2-022 (Requests ledger for the manager), L2-023 (Request detail), L2-026 (Approve requests in bulk)
// Description: The manager reads the team's requests by status with their overlaps, opens one to see the
//              team around it, and approves several at once.
// Data: the demo seed. Pending: Cleo Park 12-13 Nov, Ana Ruiz 16-20 Nov (Dev is also out 18-19 Nov),
//       Dev Patel 18-19 Nov and Elif Yilmaz 29-31 Dec. Approved: Finn, Dev, Cleo. Declined: Ben with a
//       reason; Ana's cancelled request is listed with them. Specs that approve put everything back.

import { test, expect } from "../fixtures/gl-test.js";
import { clearDays } from "../fixtures/days.js";
import { confirmDays, memberId, reopenApproved } from "../fixtures/requests.js";

const LONG_NOTE =
  "A week in Lisbon for a friend's wedding and a few days either side to see the coast, which we have been planning since spring";

test.describe("The requests ledger", () => {
  test("the manager sees the Pending, Approved and Declined tabs with their counts, Pending selected (L2-022 AC1)", async ({ goto, pages }) => {
    await goto("requests");
    await pages.requests.waitForReady();

    await expect(pages.requests.tabs()).toHaveText([/^\s*Pending 4$/, /^\s*Approved 3$/, /^\s*Declined \d+$/]);
    await expect(pages.requests.tab("Pending")).toHaveAttribute("aria-selected", "true");
    await expect(pages.requests.tab("Approved")).toHaveAttribute("aria-selected", "false");
    await expect(pages.requests.rows()).toHaveCount(4);
  });

  test("a pending request shows who asked, the days, the note, who else is out and how to decide (L2-022 AC2)", async ({ goto, pages }) => {
    await goto("requests");
    await pages.requests.waitForReady();

    await expect(pages.requests.summary("Ana Ruiz")).toHaveText("16–20 Nov · 5 days");
    await expect(pages.requests.note("Ana Ruiz")).toHaveText("“Visiting family in Seville”");
    await expect(pages.requests.meta("Ana Ruiz")).toHaveText("Dev also out 18–19 Nov");
    await expect(pages.requests.meta("Dev Patel")).toHaveText("Ana also out 18–19 Nov");
    await expect(pages.requests.meta("Cleo Park")).toHaveText("No overlaps");
    await expect(pages.requests.meta("Elif Yılmaz")).toHaveText("No overlaps");
    await expect(pages.requests.summary("Elif Yılmaz")).toHaveText("29–31 Dec · 3 days");
    await expect(pages.requests.approve("Ana Ruiz")).toBeEnabled();
  });

  test("the Requests link counts the pending requests for the manager and shows nothing for a member (L2-022 AC8)", async ({ goto, pages }) => {
    await goto("calendar");
    await pages.calendar.waitForReady();
    await expect(pages.calendar.pendingPill()).toHaveText("4 pending");

    await goto("calendar", { as: "member" });
    await pages.calendar.waitForReady();
    await expect(pages.calendar.mainNavLink("Requests")).toBeVisible();
    await expect(pages.calendar.pendingPill()).toHaveCount(0);
  });

  test("the Approved tab shows when each request was sent and decided, and its status (L2-022 AC3)", async ({ goto, pages }) => {
    await goto("requests");
    await pages.requests.waitForReady();

    await pages.requests.openTab("Approved");

    await expect(pages.requests.tab("Approved")).toHaveAttribute("aria-selected", "true");
    await expect(pages.requests.rows()).toHaveCount(3);
    await expect(pages.requests.summary("Finn Murphy")).toHaveText("19–23 Oct · 5 days");
    await expect(pages.requests.meta("Finn Murphy")).toHaveText("Sent 28 Sep · decided 29 Sep");
    await expect(pages.requests.status("Finn Murphy")).toHaveText("Approved");
    await expect(pages.requests.note("Dev Patel")).toHaveText("No note");
    await expect(pages.requests.approve("Finn Murphy")).toHaveCount(0);
    await expect(pages.requests.select("Finn Murphy")).toHaveCount(0);
  });

  test("the Declined tab shows the reason, and cancelled requests with their own status (L2-022 AC4)", async ({ goto, pages }) => {
    await goto("requests");
    await pages.requests.waitForReady();

    await pages.requests.openTab("Declined");

    // Ana's cancel spec leaves cancelled requests of its own here, so the seeded two are found by what they say.
    await expect(pages.requests.row("Ben Okafor")).toHaveCount(1);
    await expect(pages.requests.meta("Ben Okafor")).toHaveText("Reason: Three people are already out that week. Could you take the 29th onward instead?");
    await expect(pages.requests.status("Ben Okafor")).toHaveText("Declined");
    const seeded = pages.requests.rows().filter({ hasText: "Sent 20 Sep · decided 25 Sep" });
    await expect(seeded).toHaveCount(1);
    await expect(seeded.locator(".req-status")).toHaveText("Cancelled");
  });

  test("with nothing pending the Pending tab says everyone is greenlit (L2-022 AC5)", async ({ goto, pages, requestsApi }) => {
    await requestsApi.stubPending([]);
    await goto("requests");
    await pages.requests.waitForReady();

    await expect(pages.requests.tab("Pending")).toHaveText("Pending 0");
    await expect(pages.requests.empty()).toContainText("Nothing waiting. Everyone's greenlit.");
    await expect(pages.requests.empty()).toContainText("New requests from your team will show up here.");
    await expect(pages.requests.rows()).toHaveCount(0);
    await expect(pages.requests.pendingPill()).toHaveCount(0);
  });

  test("a long note keeps the row to one line and is in full as its tooltip (L2-022 AC6)", async ({ goto, pages, requestsApi }) => {
    await requestsApi.stubPending([
      {
        id: "11111111-1111-1111-1111-111111111111",
        memberId: "22222222-2222-2222-2222-222222222222",
        memberName: "Ben Okafor",
        firstDay: "2026-12-07",
        lastDay: "2026-12-11",
        days: 5,
        note: LONG_NOTE,
        status: "Pending",
        sentUtc: "2026-11-03T09:00:00Z",
        decidedUtc: null,
        declineReason: null,
        overlaps: [],
      },
    ]);
    await goto("requests");
    await pages.requests.waitForReady();

    await expect(pages.requests.note("Ben Okafor")).toHaveText(`“${LONG_NOTE}”`);
    await expect(pages.requests.note("Ben Okafor")).toHaveAttribute("title", LONG_NOTE);
    const oneLine = await pages.requests.note("Ben Okafor").evaluate((p) => getComputedStyle(p).whiteSpace);
    expect(oneLine).toBe("nowrap");
  });

  test("when the requests cannot be loaded the page says so and Try again loads them (L2-022 AC7)", async ({ goto, pages, requestsApi }) => {
    await requestsApi.failList();
    await goto("requests");
    await pages.requests.waitForReady();

    await expect(pages.requests.loadError()).toContainText("We couldn't load requests");
    await expect(pages.requests.loadError()).toContainText("Something went wrong on our side. Nothing was changed.");

    await requestsApi.recoverList();
    await pages.requests.loadError().getByRole("button", { name: "Try again", exact: true }).click();

    await expect(pages.requests.rows()).toHaveCount(4);
  });

  test("while the requests load the list is busy and shows no rows", async ({ goto, page, pages, requestsApi }) => {
    const release = await requestsApi.holdList();
    await goto("requests");
    await page.waitForSelector('body[data-page="requests"]', { state: "attached" });

    await expect(pages.requests.loading()).toBeVisible();
    await expect(pages.requests.rows()).toHaveCount(0);

    release();
    await expect(pages.requests.rows()).toHaveCount(4);
  });

  test("the arrow keys move between the tabs and open them", async ({ goto, page, pages }) => {
    await goto("requests");
    await pages.requests.waitForReady();
    await pages.requests.tab("Pending").focus();

    await page.keyboard.press("ArrowRight");

    await expect(pages.requests.tab("Approved")).toBeFocused();
    await expect(pages.requests.tab("Approved")).toHaveAttribute("aria-selected", "true");
    await expect(pages.requests.summary("Finn Murphy")).toBeVisible();

    await page.keyboard.press("End");
    await expect(pages.requests.tab("Declined")).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(pages.requests.tab("Pending")).toBeFocused();
    await expect(pages.requests.rows()).toHaveCount(4);
  });
});

test.describe("The request detail", () => {
  test("opening a pending request shows its facts, the note and the team for its week with the Out row (L2-023 AC1, AC2)", async ({
    goto,
    pages,
  }) => {
    await goto("requests");
    await pages.requests.waitForReady();

    await pages.requests.open("Ana Ruiz").click();

    const detail = pages.requestDetail;
    await expect(detail.title()).toHaveText("Ana Ruiz");
    await expect(detail.description()).toHaveText("16–20 Nov · 5 days");
    await expect(detail.status()).toHaveText("Pending");
    await expect(detail.note()).toHaveText("“Visiting family in Seville”");

    await expect(detail.days()).toHaveCount(7);
    await expect(detail.days().first()).toHaveAttribute("aria-label", "Mon 16 Nov");
    await expect(detail.days().last()).toHaveAttribute("aria-label", "Sun 22 Nov");
    await expect(detail.members()).toHaveText(["Maya Chen", "Ana Ruiz", "Ben Okafor", "Cleo Park", "Dev Patel", "Elif Yılmaz", "Finn Murphy"]);
    await expect(detail.cell("Ana Ruiz", "Mon 16 Nov")).toHaveAttribute("data-status", "requested");
    await expect(detail.cell("Ana Ruiz", "Fri 20 Nov")).toHaveAttribute("data-status", "requested");
    await expect(detail.cell("Ana Ruiz", "Sat 21 Nov")).toHaveAttribute("data-status", "off");
    await expect(detail.cell("Dev Patel", "Tue 17 Nov")).toHaveAttribute("data-status", "empty");
    await expect(detail.cell("Dev Patel", "Wed 18 Nov")).toHaveAttribute("data-status", "requested");
    await expect(detail.cell("Dev Patel", "Thu 19 Nov")).toHaveAttribute("data-status", "requested");
    await expect(detail.out(0)).toHaveAttribute("aria-label", "1 out, 6 in");
    await expect(detail.out(2)).toHaveAttribute("aria-label", "2 out, 5 in");
    await expect(detail.actions()).toHaveText(["Decline", "Approve"]);
  });

  test("an approved request shows its status and offers no decision (L2-023 AC3)", async ({ goto, pages }) => {
    await goto("requests");
    await pages.requests.waitForReady();
    await pages.requests.openTab("Approved");

    await pages.requests.open("Finn Murphy").click();

    const detail = pages.requestDetail;
    await expect(detail.title()).toHaveText("Finn Murphy");
    await expect(detail.status()).toHaveText("Approved");
    await expect(detail.note()).toHaveText("“Half-term with my niece”");
    await expect(detail.cell("Finn Murphy", "Mon 19 Oct")).toHaveAttribute("data-status", "confirmed");
    await expect(detail.actions()).toHaveCount(0);
    await expect(detail.declineReason()).toHaveCount(0);
  });

  test("a declined request shows the reason and offers no decision (L2-023 AC3)", async ({ goto, pages }) => {
    await goto("requests");
    await pages.requests.waitForReady();
    await pages.requests.openTab("Declined");

    await pages.requests.open("Ben Okafor").click();

    const detail = pages.requestDetail;
    await expect(detail.status()).toHaveText("Declined");
    await expect(detail.declineReason()).toHaveText("Decline reason: Three people are already out that week. Could you take the 29th onward instead?");
    await expect(detail.cell("Ben Okafor", "Mon 21 Dec")).toHaveAttribute("data-status", "tentative");
    await expect(detail.actions()).toHaveCount(0);
  });

  test("a long note shows in full and the body scrolls while the actions stay in view (L2-023 AC4)", async ({ goto, pages, requestsApi }) => {
    await requestsApi.changeDetail((detail) => {
      detail.request.note = LONG_NOTE.repeat(3);
      // Many more people than a phone or a laptop screen has room for.
      detail.members = Array.from({ length: 5 }, (_, i) => detail.members.map((m: { name: string }) => ({ ...m, name: `${m.name} ${i}` }))).flat();
    });

    await goto("requests");
    await pages.requests.waitForReady();

    await pages.requests.open("Elif Yılmaz").click();

    const detail = pages.requestDetail;
    await expect(detail.note()).toHaveText(`“${LONG_NOTE.repeat(3)}”`);
    const scrolls = await detail.body().evaluate((body) => body.scrollHeight > body.clientHeight);
    expect(scrolls).toBe(true);
    await expect(detail.approve()).toBeInViewport();
    await detail.body().evaluate((body) => body.scrollTo(0, body.scrollHeight));
    await expect(detail.approve()).toBeInViewport();
  });
});

test.describe("Approving several requests at once", () => {
  // Every test approves some of Cleo's (12-13 Nov), Ana's (16-20 Nov), Dev's (18-19 Nov) and Elif's (29-31 Dec) requests and puts them back.
  test.afterEach(async ({ request }) => {
    for (const [member, first] of [
      ["Cleo Park", "2026-11-12"],
      ["Ana Ruiz", "2026-11-16"],
      ["Dev Patel", "2026-11-18"],
      ["Elif Yılmaz", "2026-12-29"],
    ])
      await reopenApproved(request, member, first);
    await clearDays(request, "Ben Okafor", ["2026-11-18"]);
    await clearDays(request, "Cleo Park", ["2026-11-18"]);
  });

  test("ticking requests shows how many the bulk button approves (L2-026 AC1)", async ({ goto, pages }) => {
    test.skip(test.info().project.name === "mobile", "The mock shows a tick on each row from tablet width up; on a phone Select all is the way (L2-026 AC2).");
    await goto("requests");
    await pages.requests.waitForReady();
    await expect(pages.requests.approveSelected()).toHaveText("Approve");
    await expect(pages.requests.approveSelected()).toBeDisabled();

    await pages.requests.select("Ana Ruiz").check();
    await pages.requests.select("Dev Patel").check();

    await expect(pages.requests.approveSelected()).toHaveText("Approve 2");
    await expect(pages.requests.approveSelected()).toBeEnabled();
    await expect(pages.requests.row("Ana Ruiz")).toHaveAttribute("data-selected", "");
    await expect(pages.requests.row("Cleo Park")).not.toHaveAttribute("data-selected", "");

    await pages.requests.select("Ana Ruiz").uncheck();

    await expect(pages.requests.approveSelected()).toHaveText("Approve 1");
  });

  test("Select all ticks every pending request, and ticking them one by one ticks it (L2-026 AC2)", async ({ goto, pages }) => {
    test.skip(test.info().project.name === "mobile", "The mock shows a tick on each row from tablet width up; on a phone Select all is the way (L2-026 AC2).");
    await goto("requests");
    await pages.requests.waitForReady();

    await pages.requests.selectAll().check();

    for (const member of ["Cleo Park", "Ana Ruiz", "Dev Patel", "Elif Yılmaz"]) await expect(pages.requests.select(member)).toBeChecked();
    await expect(pages.requests.approveSelected()).toHaveText("Approve 4");

    await pages.requests.selectAll().uncheck();

    await expect(pages.requests.select("Ana Ruiz")).not.toBeChecked();
    await expect(pages.requests.approveSelected()).toHaveText("Approve");

    for (const member of ["Cleo Park", "Ana Ruiz", "Dev Patel", "Elif Yılmaz"]) await pages.requests.select(member).check();
    await expect(pages.requests.selectAll()).toBeChecked();
  });

  test("Approve 3 approves the three together, as one approval each, and says so once (L2-026 AC3)", async ({ goto, pages, requestsApi }) => {
    test.skip(test.info().project.name === "mobile", "The mock shows a tick on each row from tablet width up; on a phone Select all is the way (L2-026 AC2).");
    await goto("requests");
    await pages.requests.waitForReady();
    for (const member of ["Cleo Park", "Ana Ruiz", "Dev Patel"]) await pages.requests.select(member).check();

    await pages.requests.approveSelected().click();

    const toast = "Approved 3 requests";
    await expect(pages.requests.toast(toast)).toBeVisible();
    await expect(pages.requests.toastText(toast)).toHaveText("Their days are green on the calendar and everyone has been emailed.");
    await expect(pages.requests.toastAction(toast, "Undo")).toBeVisible();
    expect(requestsApi.approvals()).toBe(1);
    expect(requestsApi.lastApproved()).toHaveLength(3);
    await expect(pages.requests.rows()).toHaveCount(1);
    await expect(pages.requests.row("Elif Yılmaz")).toBeVisible();
    await expect(pages.requests.tabs()).toHaveText([/^\s*Pending 1$/, /^\s*Approved 6$/, /^\s*Declined \d+$/]);
    await expect(pages.requests.pendingPill()).toHaveText("1 pending");
    await expect(pages.requests.approveSelected()).toBeDisabled();

    await goto("calendar", { month: "2026-11" });
    await pages.calendar.waitForReady();
    await expect(pages.calendar.cell("Cleo Park", "Thu 12 Nov")).toHaveAttribute("data-status", "confirmed");
    await expect(pages.calendar.cell("Ana Ruiz", "Mon 16 Nov")).toHaveAttribute("data-status", "confirmed");
    await expect(pages.calendar.cell("Dev Patel", "Wed 18 Nov")).toHaveAttribute("data-status", "confirmed");
  });

  test("Undo on the summary toast puts all of them back to pending", async ({ goto, pages }) => {
    await goto("requests");
    await pages.requests.waitForReady();
    await pages.requests.selectAll().check();
    await pages.requests.approveSelected().click();
    await expect(pages.requests.toast("Approved 4 requests")).toBeVisible();
    await expect(pages.requests.rows()).toHaveCount(0);

    await pages.requests.toastAction("Approved 4 requests", "Undo").click();

    await expect(pages.requests.toast("Approved 4 requests")).toHaveCount(0);
    await expect(pages.requests.rows()).toHaveCount(4);
    await expect(pages.requests.tabs()).toHaveText([/^\s*Pending 4$/, /^\s*Approved 3$/, /^\s*Declined \d+$/]);
  });

  test("while they are approved the button says Approving… and cannot be pressed twice", async ({ goto, pages, requestsApi }) => {
    test.skip(test.info().project.name === "mobile", "The mock shows a tick on each row from tablet width up; on a phone Select all is the way (L2-026 AC2).");
    const release = await requestsApi.holdApprove();
    await goto("requests");
    await pages.requests.waitForReady();
    await pages.requests.select("Ana Ruiz").check();
    await pages.requests.select("Dev Patel").check();

    await pages.requests.approveSelected().click();

    await expect(pages.requests.approveSelected()).toHaveText("Approving…");
    await expect(pages.requests.approveSelected()).toHaveAttribute("aria-busy", "true");
    await expect(pages.requests.approveSelected()).toBeDisabled();
    expect(requestsApi.approvals()).toBe(1);

    release();
    await expect(pages.requests.toast("Approved 2 requests")).toBeVisible();
    expect(requestsApi.approvals()).toBe(1);
  });

  test("when it fails nothing is approved, the ticks stay and Try again approves them", async ({ goto, pages, requestsApi }) => {
    test.skip(test.info().project.name === "mobile", "The mock shows a tick on each row from tablet width up; on a phone Select all is the way (L2-026 AC2).");
    await requestsApi.failApprove();
    await goto("requests");
    await pages.requests.waitForReady();
    await pages.requests.select("Ana Ruiz").check();
    await pages.requests.select("Dev Patel").check();

    await pages.requests.approveSelected().click();

    const failed = "We couldn’t approve 2 requests";
    await expect(pages.requests.toast(failed)).toBeVisible();
    await expect(pages.requests.toastText(failed)).toHaveText("They’re still pending. Check your connection and try again.");
    await expect(pages.requests.select("Ana Ruiz")).toBeChecked();
    await expect(pages.requests.approveSelected()).toHaveText("Approve 2");

    await requestsApi.recoverApprove();
    await pages.requests.toastAction(failed, "Try again").click();

    await expect(pages.requests.toast("Approved 2 requests")).toBeVisible();
  });

  test("approving two that leave the team short warns the manager and still approves both (L2-042 AC2)", async ({ goto, pages, request }) => {
    test.skip(test.info().project.name === "mobile", "The mock shows a tick on each row from tablet width up; on a phone Select all is the way (L2-026 AC2).");
    // Ben and Cleo confirmed on 18 Nov, with Ana and Dev: 4 out and 3 in against a minimum of 4.
    await confirmDays(request, await memberId(request, "Ben Okafor"), ["2026-11-18"]);
    await confirmDays(request, await memberId(request, "Cleo Park"), ["2026-11-18"]);
    await goto("requests");
    await pages.requests.waitForReady();
    await pages.requests.select("Ana Ruiz").check();
    await pages.requests.select("Dev Patel").check();

    await pages.requests.approveSelected().click();

    const toast = "Approved 2 requests, but only 3 people will be in on 18 Nov";
    await expect(pages.requests.toast(toast)).toBeVisible();
    await expect(pages.requests.toastText(toast)).toHaveText("That’s below your minimum of 4.");
    await expect(pages.requests.toastAction(toast, "Undo")).toBeVisible();
  });

  test("one ticked request is approved like any single approval", async ({ goto, pages }) => {
    test.skip(test.info().project.name === "mobile", "The mock shows a tick on each row from tablet width up; on a phone Select all is the way (L2-026 AC2).");
    await goto("requests");
    await pages.requests.waitForReady();
    await pages.requests.select("Ana Ruiz").check();

    await pages.requests.approveSelected().click();

    await expect(pages.requests.toast("Approved Ana’s time off")).toBeVisible();
  });

  test("the ticks do not follow the manager to another tab", async ({ goto, pages }) => {
    test.skip(test.info().project.name === "mobile", "The mock shows a tick on each row from tablet width up; on a phone Select all is the way (L2-026 AC2).");
    await goto("requests");
    await pages.requests.waitForReady();
    await pages.requests.select("Ana Ruiz").check();

    await pages.requests.openTab("Approved");
    await pages.requests.openTab("Pending");

    await expect(pages.requests.select("Ana Ruiz")).not.toBeChecked();
    await expect(pages.requests.approveSelected()).toHaveText("Approve");
  });

  test("the keyboard ticks and approves: Space on a checkbox, then Enter on the button", async ({ goto, page, pages }) => {
    test.skip(test.info().project.name === "mobile", "The mock shows a tick on each row from tablet width up; on a phone Select all is the way (L2-026 AC2).");
    await goto("requests");
    await pages.requests.waitForReady();
    await pages.requests.select("Dev Patel").focus();

    await page.keyboard.press("Space");
    await expect(pages.requests.approveSelected()).toHaveText("Approve 1");
    await pages.requests.approveSelected().focus();
    await page.keyboard.press("Enter");

    await expect(pages.requests.toast("Approved Dev’s time off")).toBeVisible();
  });
});
