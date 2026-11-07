import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';

/**
 * Reveal on scroll for the marketing page's `[data-reveal]` blocks: adds
 * `is-in` once the element enters the viewport, so the page's styles can fade
 * it in. Purely decorative (nothing waits on it); shows everything at once when
 * the viewer prefers reduced motion or the browser has no IntersectionObserver.
 */
@Directive({ selector: '[mkReveal]' })
export class RevealDirective {
  constructor() {
    const element = inject(ElementRef).nativeElement as HTMLElement;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (reduced || !('IntersectionObserver' in window)) {
      element.classList.add('is-in');
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          element.classList.add('is-in');
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    observer.observe(element);
    inject(DestroyRef).onDestroy(() => observer.disconnect());
  }
}
