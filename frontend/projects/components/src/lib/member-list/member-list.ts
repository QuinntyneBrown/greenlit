import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Avatar } from '../avatar/avatar';
import { Button } from '../button/button';

export interface MemberListItem {
  /** Who the row is, when an action needs to say which row it came from. */
  readonly id?: string;
  readonly name: string;
  /** The label of a button at the end of the row, such as "Edit working days"; its accessible name adds the person. */
  readonly action?: string;
  /** A second line under the name, such as the email address. */
  readonly detail?: string;
}

/**
 * Member list (docs/design-system/components/member-list.html): one row per
 * person, each with an avatar and the name. The `member-list` classes are the
 * mock's, so one set of locators serves both.
 */
@Component({
  selector: 'gl-member-list',
  imports: [Avatar, Button],
  template: `
    <ul class="member-list" [attr.aria-label]="label() || null">
      @for (member of members(); track member.name) {
        <li>
          <gl-avatar [name]="member.name" />
          <div class="member-list__who">
            <span class="member-list__name">{{ member.name }}</span>
            @if (member.detail) {
              <span class="member-list__detail">{{ member.detail }}</span>
            }
          </div>
          @if (member.action) {
            <gl-button
              size="sm"
              [ariaLabel]="member.action + ' for ' + member.name"
              (click)="actioned.emit(member)"
            >
              {{ member.action }}
            </gl-button>
          }
        </li>
      }
    </ul>
  `,
  styles: `
    :host {
      display: block;
    }
    .member-list {
      list-style: none;
      padding: 0;
      margin: 0;
      background: var(--color-bg-surface);
      border: 1px solid var(--color-border-default);
      border-radius: var(--radius-md);
    }
    li {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
      border-bottom: 1px solid var(--color-border-default);
    }
    li:last-child {
      border-bottom: 0;
    }
    .member-list__who {
      flex: 1;
      min-width: 10rem;
    }
    .member-list__name {
      display: block;
      font: var(--text-label);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .member-list__detail {
      display: block;
      font: var(--text-caption);
      color: var(--color-fg-muted);
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemberList {
  readonly members = input.required<readonly MemberListItem[]>();
  readonly label = input<string>('');
  /** The row's action button was pressed. */
  readonly actioned = output<MemberListItem>();
}
