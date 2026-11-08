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
  /** The row's role, shown in the Role control when the list is `editable`. */
  readonly role?: string;
  /** The row's own yearly days (null: the team's default), shown when the list is `editable`. */
  readonly yearlyDays?: number | null;
  /**
   * The Child mark (L2-060, pages/settings/school-calendar): left out, the row has no Child control; true or false,
   * an editable list shows the checkbox "Child" named "{name} is a child", and a child shows "No allowance" instead of
   * the yearly-days field.
   */
  readonly child?: boolean;
}

/** The Child mark set or cleared in a row. */
export interface MemberChildChange {
  readonly member: MemberListItem;
  readonly child: boolean;
}

/** A role chosen in a row. */
export interface MemberRoleChange {
  readonly member: MemberListItem;
  readonly role: string;
}

/** Yearly days typed in a row; null when the field was emptied. */
export interface MemberYearlyDaysChange {
  readonly member: MemberListItem;
  readonly yearlyDays: number | null;
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
      @for (member of members(); track member.id ?? member.name) {
        <li>
          <gl-avatar [name]="member.name" />
          <div class="member-list__who">
            <span class="member-list__name">{{ member.name }}</span>
            @if (member.detail) {
              <span class="member-list__detail">{{ member.detail }}</span>
            }
          </div>
          @if (editable()) {
            <label class="visually-hidden" [for]="'role-' + (member.id ?? member.name)"
              >Role for {{ member.name }}</label
            >
            <select
              #roleControl
              class="select input--sm"
              [id]="'role-' + (member.id ?? member.name)"
              (change)="roleChange.emit({ member, role: roleControl.value })"
            >
              <option value="Member" [selected]="member.role === 'Member'">Member</option>
              <option value="Manager" [selected]="member.role === 'Manager'">Manager</option>
            </select>
            @if (member.child !== undefined) {
              <label class="choice member-list__child">
                <input
                  #childControl
                  type="checkbox"
                  [checked]="member.child"
                  [attr.aria-label]="member.name + ' is a child'"
                  (change)="childChange.emit({ member, child: childControl.checked })"
                />Child
              </label>
            }
            @if (member.child) {
              <span class="member-list__no-allowance">No allowance</span>
            } @else {
              <label class="days-input">
                <input
                  #daysControl
                  class="input input--sm"
                  type="number"
                  min="0"
                  [value]="member.yearlyDays ?? ''"
                  [attr.aria-label]="'Yearly days for ' + member.name"
                  (input)="
                    yearlyDaysChange.emit({
                      member,
                      yearlyDays: daysControl.value === '' ? null : daysControl.valueAsNumber,
                    })
                  "
                />days / yr
              </label>
            }
          }
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
    .member-list__child {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      min-height: var(--target-min);
      font: var(--text-caption);
      color: var(--color-fg-default);
      cursor: pointer;
    }
    .member-list__child input {
      width: 1.125rem;
      height: 1.125rem;
      accent-color: var(--color-accent);
    }
    .member-list__no-allowance {
      font: var(--text-caption);
      color: var(--color-fg-muted);
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
    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
    .select,
    .input {
      min-height: var(--control-height-sm);
      padding: var(--space-1) var(--space-3);
      font: var(--text-body-sm);
      color: var(--color-fg-default);
      background-color: var(--color-bg-surface);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-md);
    }
    .select {
      padding-right: var(--space-8);
      appearance: none;
      background-image:
        linear-gradient(45deg, transparent 50%, currentColor 50%),
        linear-gradient(135deg, currentColor 50%, transparent 50%);
      background-position:
        calc(100% - 16px) 50%,
        calc(100% - 11px) 50%;
      background-size: 5px 5px;
      background-repeat: no-repeat;
    }
    .select:focus-visible,
    .input:focus-visible {
      outline: var(--focus-ring-width) solid var(--color-focus-ring);
      outline-offset: 0;
      border-color: var(--color-focus-ring);
    }
    .select:disabled,
    .input:disabled {
      background-color: var(--color-bg-subtle);
      color: var(--color-fg-disabled);
      border-color: var(--color-border-default);
      cursor: not-allowed;
    }
    .days-input {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font: var(--text-caption);
      color: var(--color-fg-muted);
    }
    .days-input .input {
      width: 5rem;
      font-variant-numeric: tabular-nums;
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
  /** Each row gets a Role control and a Yearly days field (the Team section of Settings). */
  readonly editable = input<boolean>(false);
  /** The row's action button was pressed. */
  readonly actioned = output<MemberListItem>();
  readonly roleChange = output<MemberRoleChange>();
  readonly yearlyDaysChange = output<MemberYearlyDaysChange>();
  readonly childChange = output<MemberChildChange>();
}
