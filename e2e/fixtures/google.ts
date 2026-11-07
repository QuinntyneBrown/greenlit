/**
 * Google, stood in for (ADR-012).
 *
 * The app loads Google Identity Services from https://accounts.google.com/gsi/client and asks its
 * OAuth 2.0 token client for an access token. The suite serves a stub script in its place whose
 * token client answers the way the test arranged: with an access token for a made-up Google account
 * (a `fake-google.` token the e2e API's fake accounts reader decodes), with the popup closed, or
 * with an error. The page under test and the API are the real ones; only Google is a stand-in.
 */

import { Page } from "@playwright/test";

/** A Google account as the fake reader sees it. */
export interface GoogleAccount {
  /** Google's stable id; made up per test so accounts never collide. */
  sub?: string;
  email: string;
  name: string;
  /** Defaults to true; false is a Google account whose address Google has not verified. */
  email_verified?: boolean;
}

/** What the stubbed token client does when the page asks for an access token. */
export type GoogleAnswer =
  | { kind: "token"; account: GoogleAccount }
  | { kind: "dismissed" }
  | { kind: "error" };

export const GIS_SCRIPT = "https://accounts.google.com/gsi/client";

/** The stub served in place of the GIS script: the one API surface the app uses. */
const STUB = `
(() => {
  const encode = (text) => btoa(unescape(encodeURIComponent(text))).replace(/\\+/g, "-").replace(/\\//g, "_").replace(/=+$/, "");
  const next = () => window.__glGoogle || { kind: "dismissed" };
  window.google = { accounts: { oauth2: { initTokenClient(config) {
    return { requestAccessToken() {
      window.__glGoogleRequests = (window.__glGoogleRequests || 0) + 1;
      const answer = next();
      const deliver = () => {
        if (answer.kind === "token") {
          const account = Object.assign({ email_verified: true, sub: "stub-" + Math.random().toString(36).slice(2) }, answer.account);
          config.callback({ access_token: "fake-google." + encode(JSON.stringify(account)), token_type: "Bearer", expires_in: 3599, scope: config.scope });
        } else if (answer.kind === "error") {
          if (config.error_callback) config.error_callback({ type: "unknown", message: "stubbed failure" });
        } else {
          if (config.error_callback) config.error_callback({ type: "popup_closed", message: "stubbed dismissal" });
        }
      };
      if (window.__glGoogleHold) window.__glGoogleHold.then(deliver); else setTimeout(deliver, 0);
    } };
  } } } };
})();
`;

/** Steers the stubbed Google in one page. */
export class GoogleStub {
  constructor(private readonly page: Page) {}

  /** Serves the stub in place of the GIS script. Installed by the fixture before the test starts. */
  async install(): Promise<void> {
    await this.page.route(`${GIS_SCRIPT}*`, (route) =>
      route.fulfill({ status: 200, contentType: "application/javascript", body: STUB }),
    );
  }

  /** The next sign-in picks this Google account. */
  async willChoose(account: GoogleAccount): Promise<void> {
    await this.answer({ kind: "token", account });
  }

  /** The next sign-in closes Google's window without choosing. */
  async willDismiss(): Promise<void> {
    await this.answer({ kind: "dismissed" });
  }

  /** The next sign-in fails on Google's side. */
  async willFail(): Promise<void> {
    await this.answer({ kind: "error" });
  }

  /** Keeps Google's window open until the returned function is called. */
  async hold(): Promise<() => Promise<void>> {
    await this.page.evaluate(() => {
      const w = window as unknown as { __glGoogleHold?: Promise<void>; __glGoogleRelease?: () => void };
      w.__glGoogleHold = new Promise<void>((resolve) => (w.__glGoogleRelease = resolve));
    });
    return async () => {
      await this.page.evaluate(() => {
        const w = window as unknown as { __glGoogleHold?: Promise<void>; __glGoogleRelease?: () => void };
        w.__glGoogleRelease?.();
        delete w.__glGoogleHold;
      });
    };
  }

  /** How many times the page has asked Google for an access token. */
  requests(): Promise<number> {
    return this.page.evaluate(() => (window as unknown as { __glGoogleRequests?: number }).__glGoogleRequests ?? 0);
  }

  private async answer(answer: GoogleAnswer): Promise<void> {
    await this.page.evaluate((a) => ((window as unknown as { __glGoogle?: unknown }).__glGoogle = a), answer);
  }
}
