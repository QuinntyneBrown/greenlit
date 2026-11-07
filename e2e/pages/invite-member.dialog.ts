import { Locator, Page } from "@playwright/test";

/**
 * The "Invite a member" dialog: opened from Settings in the app, dialogs/invite-member/*.html in the
 * mocks (docs/detailed-designs/teams/invite-member). Not a screen, so it has no `data-page`.
 */
export class InviteMemberDialog {
  constructor(private readonly page: Page) {}

  dialog(): Locator {
    return this.page.getByRole("dialog", { name: "Invite a member", exact: true });
  }

  title(): Locator {
    return this.dialog().getByRole("heading", { name: "Invite a member", exact: true });
  }

  description(): Locator {
    return this.dialog().locator("#dlg-title-desc");
  }

  name(): Locator {
    return this.dialog().getByLabel("Name", { exact: true });
  }

  email(): Locator {
    return this.dialog().getByLabel("Email", { exact: true });
  }

  role(): Locator {
    return this.dialog().getByLabel("Role", { exact: true });
  }

  roleHelp(): Locator {
    return this.dialog().locator("#im-role-help");
  }

  async roleOptions(): Promise<string[]> {
    return (await this.role().locator("option").allTextContents()).map((t) => t.trim());
  }

  /** The "Send invite" button; it reads "Sending…" while busy and "Try again" after a failure. */
  send(): Locator {
    return this.dialog().locator(".dialog__footer .btn--primary");
  }

  cancel(): Locator {
    return this.dialog().getByRole("button", { name: "Cancel", exact: true });
  }

  close(): Locator {
    return this.dialog().getByRole("button", { name: "Close", exact: true });
  }

  inviteAnother(): Locator {
    return this.dialog().getByRole("button", { name: "Invite another", exact: true });
  }

  done(): Locator {
    return this.dialog().getByRole("button", { name: "Done", exact: true });
  }

  /** The error summary after a send with problems: "Fix 2 things to continue". */
  summary(): Locator {
    return this.dialog().locator(".form-summary");
  }

  summaryLinks(): Locator {
    return this.summary().getByRole("link");
  }

  nameError(): Locator {
    return this.dialog().locator("#im-name-err");
  }

  emailError(): Locator {
    return this.dialog().locator("#im-email-err");
  }

  /** The danger alert after a failed send. */
  failure(): Locator {
    return this.dialog().locator(".alert--danger:not(.form-summary)");
  }

  /** The success alert after a send. */
  success(): Locator {
    return this.dialog().locator(".alert--success");
  }

  async fill(person: { name?: string; email?: string; role?: "Member" | "Manager" }): Promise<void> {
    if (person.name !== undefined) await this.name().fill(person.name);
    if (person.email !== undefined) await this.email().fill(person.email);
    if (person.role !== undefined) await this.role().selectOption({ label: person.role });
  }
}
