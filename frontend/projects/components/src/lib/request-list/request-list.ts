import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Avatar } from '../avatar/avatar';
import { Button } from '../button/button';

/** One request as the list shows it. */
export interface RequestListItem {
  readonly id: string;
  readonly name: string;
  /** "16–20 Nov · 5 days" */
  readonly summary: string;
  readonly note: string | null;
}

/**
 * The manager's requests (docs/design-system/components/request-row.html): one row per request with
 * who asked, for which days, the note, and an Approve button. The name opens the request's detail.
 * The row's `request-row` classes are the mock's. While a request is being approved its button
 * says "Approving…" (`aria-busy`) and stays off; the other rows stay usable. Selection, overlaps and
 * Decline arrive with journeys 9 and 10, so the check column is kept but empty.
 */
@Component({
  selector: 'gl-request-list',
  imports: [Avatar, Button],
  template: `
    <ul class="request-list" [attr.aria-label]="label() || null">
      @for (item of items(); track item.id) {
        <li class="request-row">
          <span class="request-row__check"></span>
          <button class="request-row__who" type="button" (click)="opened.emit(item.id)">
            <gl-avatar [name]="item.name" />
            <span class="request-row__text">
              <span class="request-row__title">{{ item.name }}</span>
              <span class="request-row__sub">{{ item.summary }}</span>
            </span>
          </button>
          <div class="request-text">
            @if (item.note) {
              <p class="request-row__note">“{{ item.note }}”</p>
            } @else {
              <p class="request-row__note request-row__note--none">No note</p>
            }
          </div>
          <div class="request-row__actions">
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
    .request-row__check {
      display: none;
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

  /** The name was pressed: open this request's detail. */
  readonly opened = output<string>();
  /** Approve was pressed on this request. */
  readonly approved = output<string>();

  protected isBusy(id: string): boolean {
    return this.busy().includes(id);
  }
}
