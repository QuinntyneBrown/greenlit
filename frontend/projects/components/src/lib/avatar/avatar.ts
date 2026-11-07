import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

/** Initials for a member's name: first letter of the first and last words. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return (first + last).toUpperCase();
}

/**
 * Avatar (docs/design-system/components/avatar.html): a round badge with a
 * member's initials. Decorative: the member's name is always said next to it
 * (row header, menu label), so the avatar itself is `aria-hidden`.
 */
@Component({
  selector: 'gl-avatar',
  host: { style: 'display: contents' },
  template: `<span class="avatar" [class]="sizeClass()" aria-hidden="true">{{ initials() }}</span>`,
  styles: `
    .avatar {
      display: inline-grid;
      place-items: center;
      width: 2.5rem;
      height: 2.5rem;
      border-radius: var(--radius-full);
      background: var(--color-bg-subtle);
      color: var(--color-fg-muted);
      font: var(--text-label);
      overflow: hidden;
      flex: none;
    }
    .avatar--sm {
      width: 2rem;
      height: 2rem;
      font-size: var(--font-size-xs);
    }
    .avatar--xl {
      width: 4rem;
      height: 4rem;
      font-size: var(--font-size-xl);
    }
    .avatar--lg {
      width: 3.5rem;
      height: 3.5rem;
      font-size: var(--font-size-lg);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Avatar {
  /** The member's display name; the initials come from it. */
  readonly name = input.required<string>();
  readonly size = input<AvatarSize>('md');

  protected readonly initials = computed(() => initialsOf(this.name()));
  protected readonly sizeClass = computed(() =>
    this.size() === 'md' ? 'avatar' : `avatar avatar--${this.size()}`,
  );
}
