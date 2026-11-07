// Acceptance Test
// Traces to: L2-001
// Description: The sign-in page, its field validation and its error summary.

import { test, expect } from "../fixtures/gl-test.js";

test.describe("Sign in page", () => {
  test.beforeEach(async ({ goto, pages }) => {
    await goto("signIn");
    await pages.signIn.waitForReady();
  });

  test("a signed-out visitor sees the sign-in card (L2-001 AC1)", async ({ page, pages }) => {
    const signIn = pages.signIn;
    await expect(signIn.body).toHaveAttribute("data-page", "sign-in");
    await expect(page.locator("header.topbar")).toHaveCount(0);
    await expect(signIn.logoLink()).toBeVisible();
    await expect(signIn.heading()).toHaveText("Sign in");
    await expect(signIn.lead()).toHaveText("Welcome back. Your team’s time off is waiting.");
    await expect(signIn.email()).toHaveAttribute("type", "email");
    await expect(signIn.email()).toHaveAttribute("autocomplete", "username");
    await expect(signIn.password()).toHaveAttribute("type", "password");
    await expect(signIn.password()).toHaveAttribute("autocomplete", "current-password");
    await expect(signIn.submit()).toBeEnabled();
    await expect(signIn.forgotPassword()).toBeVisible();
    await expect(signIn.inviteNote()).toHaveText(
      "New here? Greenlit is invite-only. Ask your manager to send you an invitation.",
    );
  });

  test("empty fields show the summary and the field errors and send nothing (L2-001 AC2)", async ({
    authApi,
    pages,
  }) => {
    const signIn = pages.signIn;
    await signIn.submit().click();

    await expect(signIn.summaryTitle()).toHaveText("Fix 2 things to continue");
    await expect(signIn.summaryLinks()).toHaveText(["Enter your email address", "Enter your password"]);
    await expect(signIn.summary()).toBeFocused();
    await expect(signIn.email()).toHaveAttribute("aria-invalid", "true");
    await expect(signIn.email()).toHaveAccessibleDescription("Enter your email address.");
    await expect(signIn.password()).toHaveAttribute("aria-invalid", "true");
    await expect(signIn.password()).toHaveAccessibleDescription("Enter your password.");
    expect(authApi.requests()).toBe(0);
  });

  test("a summary link moves focus to its field (L2-001 AC2)", async ({ pages }) => {
    const signIn = pages.signIn;
    await signIn.submit().click();
    await signIn.summaryLinks().nth(1).click();
    await expect(signIn.password()).toBeFocused();
  });

  test("a field left empty shows its error on blur and clears it once filled", async ({ pages }) => {
    const signIn = pages.signIn;
    await signIn.email().focus();
    await signIn.password().focus();

    await expect(signIn.email()).toHaveAccessibleDescription("Enter your email address.");
    await expect(signIn.password()).not.toHaveAttribute("aria-invalid", /.*/);
    await expect(signIn.summary()).toHaveCount(0);

    await signIn.email().fill("maya@northwind.studio");
    await expect(signIn.email()).not.toHaveAttribute("aria-invalid", /.*/);
    await expect(signIn.email()).toHaveAccessibleDescription("");
  });
});
