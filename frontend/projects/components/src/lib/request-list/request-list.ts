import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Avatar } from '../avatar/avatar';
import { Button } from '../button/button';
import { RequestState, RequestStatus } from '../request-status/request-status';

/** One request as the list shows it. */
export interface RequestListItem {
  readonly id: string;
  readonly name: string;
  /** "16–20 Nov · 5 days" */
  readonly summary: string;
  readonly note: string | null;
  /** Where the request stands: a pending one offers Approve and a tick, the others show their status. */
  readonly state: RequestState;
  /** Lines under the note: who else is out, "No overlaps", "Sent 28 Sep · decided 29 Sep" or "Reason: ...". */
  readonly meta: readonly string[];
  /** Draw the people icon before each line of `meta` (who else is out). */
  readonly metaIcon?: boolean;
  /** In a member's own list, the line under the summary: "Sent 3 Nov". */
  readonly sent?: string;
}

/** A row's checkbox was ticked or cleared. */
export interface RequestToggle {
  readonly id: string;
  readonly selected: boolean;
}

/**
 * The manager's requests (docs/design-system/components/request-row.html): one row per request with
 * who asked, for which days, the note, the lines under it and either Approve (a pending request) or its
 * status. The name opens the request's detail. The row's `request-row` classes are the mock's.
 * With `selectable`, a pending row has the checkbox "Select {name}'s request" and a ticked row is
 * highlighted (`data-selected`). While a request is being approved its button says "Approving…"
 * (`aria-busy`) and stays off; the other rows stay usable. A long note keeps to one line and carries
 * itself as its tooltip. A pending row also has Decline, before Approve, which asks the page to open the
 * Decline request dialog (`declined`); it goes off with Approve while that request is being approved.
 * With `mine` the list is a member's own (pages/requests/member): no avatar, no tick, the range and days
 * as each row's title with "Sent …" under it, the status on every row and, on a pending one, "Cancel
 * request" (`cancelled`), which goes off while that request is being cancelled.
 */
@Component({
  selector: 'gl-request-list',
  imports: [Avatar, Button, RequestStatus],
  template: `
    <ul class="request-list" [attr.aria-label]="label() || null">
      @for (item of items(); track item.id) {
        <li class="request-row" [attr.data-selected]="isSelected(item.id) ? '' : null">
          <span class="request-row__check">
            @if (selectable() && item.state === 'pending') {
              <input
                type="checkbox"
                [attr.aria-label]="checkLabel(item.name)"
                [checked]="isSelected(item.id)"
                (change)="toggle(item.id, $event)"
              />
            }
          </span>
          @if (mine()) {
            <div class="request-row__who">
              <span class="request-row__text">
                <span class="request-row__title">{{ item.summary }}</span>
                <span class="request-row__sub">{{ item.sent }}</span>
              </span>
            </div>
          } @else {
            <button class="request-row__who" type="button" (click)="opened.emit(item.id)">
              <gl-avatar [name]="item.name" />
              <span class="request-row__text">
                <span class="request-row__title">{{ item.name }}</span>
                <span class="request-row__sub">{{ item.summary }}</span>
              </span>
            </button>
          }
          <div class="request-text">
            @if (item.note) {
              <p class="request-row__note" [attr.title]="item.note">“{{ item.note }}”</p>
            } @else {
              <p class="request-row__note request-row__note--none">No note</p>
            }
            @for (line of item.meta; track $index) {
              <p class="request-row__meta">
                @if (item.metaIcon) {
                  <svg class="icon icon--sm" aria-hidden="true" viewBox="0 0 24 24">
                    <circle cx="9" cy="8" r="3.5" />
                    <path
                      d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"
                    />
                  </svg>
                }
                {{ line }}
              </p>
            }
          </div>
          <div class="request-row__actions">
            @if (mine()) {
              <gl-request-status [state]="item.state" />
              @if (item.state === 'pending') {
                <gl-button size="sm" [disabled]="isBusy(item.id)" (click)="cancelled.emit(item.id)">
                  Cancel request
                </gl-button>
              }
            } @else if (item.state === 'pending') {
              <gl-button size="sm" [disabled]="isBusy(item.id)" (click)="declined.emit(item.id)">
                <svg class="icon" aria-hidden="true" viewBox="0 0 24 24">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
                Decline
              </gl-button>
              <gl-button
                variant="approve"
                size="sm"
                [busy]="isBusy(item.id)"
                [disabled]="isBusy(item.id)"
                (click)="approved.emit(item.id)"
              >
                <svg class="icon" aria-hidden="true" viewBox="0 0 24 24">
                  <path d="M4 12l6 6L20 6" />
                </svg>
                {{ isBusy(item.id) ? 'Approving…' : 'Approve' }}
              </gl-button>
            } @else {
              <gl-request-status [state]="item.state" />
            }
          </div>
        </li>
      }
    </ul>
  `,
  styles: `
    :host {
      display: block;
    }
    .request-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .request-row {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      padding: var(--space-4);
      border-bottom: 1px solid var(--color-border-default);
    }
    .request-row:last-child {
      border-bottom: 0;
    }
    .request-row[data-selected] {
      background: var(--color-accent-subtle);
    }
    .request-row__check {
      display: none;
    }
    .request-row__check input {
      width: 1rem;
      height: 1rem;
      margin: 0;
      accent-color: var(--color-brand-strong);
    }
    @media (min-width: 48rem) {
      .request-row {
        display: grid;
        grid-template-columns: auto minmax(0, 1.1fr) minmax(0, 1.4fr) auto;
        align-items: center;
        gap: var(--space-5);
        padding-inline: var(--space-5);
      }
      .request-row__check {
        display: block;
        min-width: 1.25rem;
      }
      .request-row__actions {
        justify-content: flex-end;
      }
    }
    .request-row__who {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      min-width: 0;
      min-height: var(--target-min);
      padding: 0;
      border: 0;
      background: none;
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
      border-radius: var(--radius-md);
    }
    .request-row__who:focus-visible {
      outline: var(--focus-ring-width) solid var(--color-focus-ring);
      outline-offset: 2px;
    }
    .request-row__text,
    .request-text {
      min-width: 0;
    }
    .request-row__title {
      display: block;
      font: var(--text-label);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .request-row__sub {
      display: block;
      font: var(--text-body-sm);
      color: var(--color-fg-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .request-row__note {
      margin: 0;
      font: var(--text-body-sm);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .request-row__note--none {
      color: var(--color-fg-subtle);
    }
    .request-row__meta {
      display: flex;
      align-items: center;
      gap: var(--space-1);
      margin: 0;
      font: var(--text-caption);
      color: var(--color-fg-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .icon--sm {
      width: 1rem;
      height: 1rem;
      flex: none;
    }
    .request-row__actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequestList {
  readonly items = input.required<readonly RequestListItem[]>();
  /** Accessible name of the list. */
  readonly label = input<string>('');
  /** Ids whose Approve is running. */
  readonly busy = input<readonly string[]>([]);
  /** Pending rows carry a checkbox. */
  readonly selectable = input<boolean>(false);
  /** A member's own list: see the class comment. */
  readonly mine = input<boolean>(false);
  /** Ids of the ticked rows. */
  readonly selected = input<readonly string[]>([]);

  /** The name was pressed: open this request's detail. */
  readonly opened = output<string>();
  /** Decline was pressed on this request. */
  readonly declined = output<string>();
  /** Cancel request was pressed on this request (a member's own list). */
  readonly cancelled = output<string>();
  /** Approve was pressed on this request. */
  readonly approved = output<string>();
  /** A row's checkbox was ticked or cleared. */
  readonly toggled = output<RequestToggle>();

  protected isBusy(id: string): boolean {
    return this.busy().includes(id);
  }

  protected isSelected(id: string): boolean {
    return this.selected().includes(id);
  }

  protected checkLabel(name: string): string {
    return `Select ${name}'s request`;
  }

  protected toggle(id: string, event: Event): void {
    this.toggled.emit({ id, selected: (event.target as HTMLInputElement).checked });
  }
}
