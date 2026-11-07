// Acceptance Test
// Traces to: L2-050
// Description: The public marketing page explains Greenlit and links into the app.

import { test, expect } from "../fixtures/gl-test.js";
import { MARKETING_ORIGIN, isBaseline } from "../fixtures/routes.js";

/** Where the site's app links point: the app dev server, or the sibling mock when capturing the mocks. */
const appLink = (appPath: string, mockFile: string): RegExp =>
  isBaseline
    ? new RegExp(`/${mockFile}/default\\.html$`)
    : new RegExp(`^http://localhost:4200${appPath}$`);

test.describe("Marketing page", () => {
  test.beforeEach(async ({ goto, pages }) => {
    await goto("marketing");
    await pages.marketing.waitForReady();
  });

  test("the hero introduces Greenlit (L2-050 AC1)", async ({ pages }) => {
    const m = pages.marketing;
    await expect(m.body).toHaveAttribute("data-page", "marketing");
    await expect(m.main).toBeVisible();
    await expect(m.heroTitle()).toHaveText("Every day off, greenlit.");
    await expect(m.heroLead()).toHaveText(
      "Greenlit is the vacation sheet your team already keeps, made simple. Members colour their own days, you confirm with a tap, and everyone sees the same month.",
    );
  });

  test("the header links the sections and the app (L2-050 AC2)", async ({
    pages,
  }, testInfo) => {
    const m = pages.marketing;
    await expect(m.logo()).toHaveAttribute("href", /#top$/);
    test.skip(
      testInfo.project.name !== "desktop",
      "the section navigation only shows at desktop width",
    );
    await expect(m.sectionNavLinks()).toHaveText([
      "Why Greenlit",
      "How it works",
      "Inside the app",
      "For managers",
    ]);
    for (const [i, anchor] of [
      "#why",
      "#how",
      "#screens",
      "#managers",
    ].entries()) {
      await expect(m.sectionNavLinks().nth(i)).toHaveAttribute(
        "href",
        new RegExp(`${anchor}$`),
      );
    }
    await expect(m.openApp()).toHaveAttribute(
      "href",
      appLink("/sign-in", "sign-in"),
    );
  });

  test("the hero's calls to action lead on (L2-050 AC3)", async ({ pages }) => {
    const m = pages.marketing;
    await expect(m.heroCreateTeam()).toHaveAttribute(
      "href",
      appLink("/create-team", "create-team"),
    );
    await expect(m.heroSeeHow()).toHaveAttribute("href", /#how$/);
    await expect(m.heroTrust()).toHaveText(
      "Built for teams of under ten · Invite-only",
    );
  });

  test("the hero sheet shows the team's fortnight (L2-050 AC4)", async ({
    pages,
  }) => {
    const m = pages.marketing;
    await expect(m.sheetRowNames()).toHaveText(["Maya", "Ana", "Ben", "Dev"]);
    await expect(m.sheetDayHeads()).toHaveCount(14);
    await expect(m.sheetDayHeads().first()).toContainText("16");
    await expect(m.sheetDayHeads().last()).toContainText("29");
    await expect(m.sheetOffDayHeads()).toHaveCount(4);
    await expect(m.sheetCells()).toHaveCount(56);
    await expect(m.sheetCellsWithStatus("requested")).toHaveCount(7);
    await expect(m.sheetCellsWithStatus("tentative")).toHaveCount(5);
    await expect(m.sheetCells().nth(14)).toHaveAttribute(
      "aria-label",
      "Ana, 16 November, requested",
    );
    await expect(m.sheetCells().nth(5)).toHaveAttribute(
      "aria-label",
      "Maya, 21 November, weekend",
    );
    await expect(m.sheetLegendItems()).toHaveText([
      "Confirmed ✓",
      "Requested …",
      "Tentative ?",
      "Weekend",
    ]);
  });

  test("the video plays the pitch with captions off by default (L2-050 AC5)", async ({
    pages,
  }) => {
    const m = pages.marketing;
    await expect(m.watchTitle()).toHaveText("Greenlit in twenty seconds.");
    await expect(m.video()).toHaveAttribute("controls", "");
    await expect(m.video()).toHaveAttribute("poster", /meet-greenlit\.jpg$/);
    await expect(m.video()).toHaveAttribute(
      "aria-label",
      "Meet Greenlit, a twenty-second tour",
    );
    await expect(m.captionTracks()).toHaveCount(1);
    await expect(m.captionTracks()).toHaveAttribute("srclang", "en");
    await expect(m.captionTracks()).toHaveAttribute("label", "English");
    await expect(m.captionTracks()).not.toHaveAttribute("default", /.*/);
    expect(await m.captionMode()).toBe("disabled");
  });
});
