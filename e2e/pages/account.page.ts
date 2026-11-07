import { Locator, Page } from "@playwright/test";
import { BasePage, control } from "./base.page.js";
import { PageSlug } from "../fixtures/routes.js";

type Section = "Profile" | "Password" | "Sign out";

/**
 * Account: `/account` in the app, pages/account/*.html in the mocks
 * (docs/detailed-designs/identity-and-access/manage-account).
 */
export class AccountPage extends BasePage {
  readonly slug: PageSlug = "account";

  constructor(page: Page) {
    super(page);
  }

  protected readyAnchor(): Locator {
    return this.main.locator("section.settings-section, .alert--danger");
  }

  heading(): Locator {
    return this.main.getByRole("heading", { level: 1, name: "Account", exact: true });
  }

  /** The three sections' headings, in order: Profile, Password, Sign out. */
  sectionTitles(): Locator {
    return this.main.locator("h2.section-title");
  }

  /** The sentence under a section's heading. */
  sectionIntro(name: Section): Locator {
    return this.section(name).locator("> p");
  }

  private section(name: Section): Locator {
    return this.main.locator("section.settings-section").filter({ has: this.page.getByRole("heading", { name, exact: true }) });
  }

  // --- Profile ------------------------------------------------------------------------------------

  displayName(): Locator {
    return this.main.getByLabel("Display name", { exact: true });
  }

  email(): Locator {
    return this.main.getByLabel("Email", { exact: true });
  }

  emailHelp(): Locator {
    return this.main.locator("#acc-email-help");
  }

  emailError(): Locator {
    return this.main.locator("#acc-email-err");
  }

  nameError(): Locator {
    return this.main.locator("#acc-name-err");
  }

  /** "Save changes", "Saving…" (`aria-busy`) while the request is in flight. */
  saveChanges(): Locator {
    return this.section("Profile").locator(".settings-actions .btn--primary");
  }

  /** The polite status next to "Save changes": "Saved", or the failure. */
  profileStatus(): Locator {
    return this.section("Profile").locator(".settings-actions [aria-live='polite']");
  }

  // --- Password -----------------------------------------------------------------------------------

  currentPassword(): Locator {
    return this.main.getByLabel("Current password", { exact: true });
  }

  newPassword(): Locator {
    return this.main.getByLabel("New password", { exact: true });
  }

  confirmPassword(): Locator {
    return this.main.getByLabel("Confirm new password", { exact: true });
  }

  /** "Update password", "Saving…" (`aria-busy`) while the request is in flight. */
  updatePassword(): Locator {
    return this.section("Password").locator(".settings-actions .btn--primary");
  }

  /** The polite status next to "Update password": "Password updated", or the failure. */
  passwordStatus(): Locator {
    return this.section("Password").locator(".settings-actions [aria-live='polite']");
  }

  /** The "Fix 2 things to continue" summary of the Password section. */
  summary(): Locator {
    return this.main.locator(".form-summary");
  }

  summaryTitle(): Locator {
    return this.summary().locator(".alert__title");
  }

  summaryLinks(): Locator {
    return this.summary().getByRole("link");
  }

  /** The sentence under a password field: "current", "new" or "confirm". */
  passwordError(field: "current" | "new" | "confirm"): Locator {
    return this.main.locator(`#pw-${field}-err`);
  }

  async fillPasswords(fields: { current?: string; next?: string; confirm?: string }): Promise<void> {
    if (fields.current !== undefined) await this.currentPassword().fill(fields.current);
    if (fields.next !== undefined) await this.newPassword().fill(fields.next);
    if (fields.confirm !== undefined) await this.confirmPassword().fill(fields.confirm);
  }

  // --- Sign out -----------------------------------------------------------------------------------

  signOut(): Locator {
    return this.section("Sign out").getByRole("button", { name: "Sign out", exact: true });
  }

  // --- States -------------------------------------------------------------------------------------

  /** The placeholder sections shown while the account loads. */
  loading(): Locator {
    return this.main.locator('section.settings-section[aria-busy="true"]');
  }

  /** "We couldn't load your account" */
  loadErrorTitle(): Locator {
    return this.main.locator(".alert--danger .alert__title");
  }

  loadErrorText(): Locator {
    return this.main.locator(".alert--danger .alert__body > div:not(.alert__title):not(.alert__actions)");
  }

  tryAgain(): Locator {
    return control(this.main, "Try again");
  }
}
