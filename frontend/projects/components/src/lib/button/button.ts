import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, UrlTree } from '@angular/router';

export type ButtonVariant = 'default' | 'primary' | 'approve' | 'danger' | 'ghost' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Greenlit button (docs/design-system/components/button.html).
 *
 * Renders a plain anchor when `href` is set (another origin or an in-page
 * anchor), a router link (`<a class="btn">`) when `link` is set, otherwise a
 * native `<button>`. The label and any icon are projected once and rendered
 * in every branch through `ngTemplateOutlet`.
 */
@Component({
  selector: 'gl-button',
  imports: [NgTemplateOutlet, RouterLink],
  host: { style: 'display: contents' },
  template: `
    <ng-template #content><ng-content /></ng-template>
    @if (href(); as url) {
      <a class="btn" [class]="classes()" [href]="url" [attr.aria-label]="ariaLabel() || null"
        ><ng-container [ngTemplateOutlet]="content"
      /></a>
    } @else if (link(); as href) {
      <a class="btn" [class]="classes()" [routerLink]="href" [attr.aria-label]="ariaLabel() || null"
        ><ng-container [ngTemplateOutlet]="content"
      /></a>
    } @else {
      <button
        class="btn"
        [class]="classes()"
        [type]="type()"
        [disabled]="disabled()"
        [attr.aria-busy]="busy() || null"
        [attr.aria-label]="ariaLabel() || null"
      >
        <ng-container [ngTemplateOutlet]="content" />
      </button>
    }
  `,
  styles: `
    /* --gl-btn-fg and --gl-btn-bg-hover: knobs a host sets to draw a ghost or link button on an inverse surface. */
    .btn {
      --btn-bg: var(--color-bg-surface);
      --btn-fg: var(--gl-btn-fg, var(--color-fg-default));
      --btn-border: var(--color-border-strong);
      --btn-bg-hover: var(--gl-btn-bg-hover, var(--color-bg-subtle));
      --btn-bg-active: var(--color-bg-subtle-hover);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      min-height: var(--control-height-md);
      padding: 0 var(--space-4);
      font: var(--text-label);
      font-size: var(--font-size-md);
      line-height: 1;
      white-space: nowrap;
      color: var(--btn-fg);
      background: var(--btn-bg);
      border: 1px solid var(--btn-border);
      border-radius: var(--radius-md);
      cursor: pointer;
      text-decoration: none;
      user-select: none;
      position: relative;
      transition:
        background-color var(--duration-fast) var(--ease-standard),
        border-color var(--duration-fast) var(--ease-standard),
        transform var(--duration-fast) var(--ease-standard),
        box-shadow var(--duration-fast) var(--ease-standard);
    }
    .btn:hover {
      background: var(--btn-bg-hover);
      color: var(--btn-fg);
    }
    .btn:active {
      background: var(--btn-bg-active);
      transform: translateY(1px);
    }
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }
    .btn--primary {
      --btn-bg: var(--color-accent);
      --btn-fg: var(--color-fg-on-accent);
      --btn-border: var(--color-accent);
      --btn-bg-hover: var(--color-accent-hover);
      --btn-bg-active: var(--color-accent-active);
    }
    .btn--primary:hover {
      border-color: var(--color-accent-hover);
      box-shadow: var(--shadow-1);
    }
    .btn--approve {
      --btn-bg: var(--color-brand-strong);
      --btn-fg: var(--color-fg-on-brand-strong);
      --btn-border: var(--color-brand-strong);
      --btn-bg-hover: var(--color-success-fg);
    }
    .btn--danger {
      --btn-bg: var(--color-danger-solid);
      --btn-fg: var(--color-fg-on-danger);
      --btn-border: var(--color-danger-solid);
      --btn-bg-hover: var(--color-danger-solid-hover);
      --btn-bg-active: var(--color-danger-solid-hover);
    }
    .btn--ghost {
      --btn-bg: transparent;
      --btn-border: transparent;
    }
    .btn--link {
      --btn-bg: transparent;
      --btn-border: transparent;
      --btn-fg: var(--color-fg-link);
      --btn-bg-hover: var(--color-accent-subtle);
      text-decoration: underline;
      text-underline-offset: 0.15em;
    }
    .btn--icon {
      padding: 0;
      width: var(--control-height-md);
    }
    .btn--icon.btn--sm {
      width: var(--control-height-sm);
    }
    .btn--sm {
      min-height: var(--control-height-sm);
      padding-inline: var(--space-3);
      font-size: var(--font-size-sm);
    }
    .btn--lg {
      min-height: var(--control-height-lg);
      padding-inline: var(--space-6);
      font-size: var(--font-size-lg);
    }
    .btn--block {
      display: flex;
      width: 100%;
    }
    .btn[aria-busy='true'] {
      color: transparent;
      pointer-events: none;
    }
    .btn[aria-busy='true']::after {
      content: '';
      position: absolute;
      inset: 0;
      margin: auto;
      width: 1.1em;
      height: 1.1em;
      border: 2px solid var(--btn-fg);
      border-right-color: transparent;
      border-radius: 50%;
      animation: gl-btn-spin 0.8s linear infinite;
    }
    @keyframes gl-btn-spin {
      to {
        rotate: 360deg;
      }
    }
    @media (forced-colors: active) {
      .btn {
        forced-color-adjust: none;
        border: 1px solid CanvasText;
      }
      .btn--primary {
        background: Highlight;
        color: HighlightText;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Button {
  readonly variant = input<ButtonVariant>('default');
  readonly size = input<ButtonSize>('md');
  /** Router link (a path, or a URL tree that keeps a query); when set the button renders as `<a>`. */
  readonly link = input<string | UrlTree | null>(null);
  /** Plain address (another origin, or `#anchor`); when set the button renders as `<a href>`. */
  readonly href = input<string | null>(null);
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input<boolean>(false);
  /** Shows the spinner and sets `aria-busy`. */
  readonly busy = input<boolean>(false);
  readonly block = input<boolean>(false);
  /** Square icon-only button (`btn--icon`); give it an `ariaLabel`. */
  readonly icon = input<boolean>(false);
  /** Accessible name for an icon-only button. */
  readonly ariaLabel = input<string>('');

  protected classes(): string {
    const list = ['btn'];
    if (this.variant() !== 'default') list.push(`btn--${this.variant()}`);
    if (this.size() !== 'md') list.push(`btn--${this.size()}`);
    if (this.block()) list.push('btn--block');
    if (this.icon()) list.push('btn--icon');
    return list.join(' ');
  }
}
