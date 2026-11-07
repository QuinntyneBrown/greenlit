import { Injectable, signal } from '@angular/core';

import { ToastTone } from 'components';

/** What a feature asks for (docs/detailed-designs/web-experience/feedback-toasts). */
export interface ToastRequest {
  readonly tone: ToastTone;
  readonly title: string;
  readonly body?: string;
  readonly action?: { readonly label: string; readonly run: () => void };
}

export interface ToastHandle {
  readonly id: number;
  dismiss(): void;
}

/** A toast on screen, as the outlet draws it. */
export interface ActiveToast extends ToastRequest {
  readonly id: number;
  /** False for danger toasts: they stay until dismissed. */
  readonly timed: boolean;
  readonly paused: boolean;
}

/** Info, success and warning toasts leave after this long (L2-044). */
export const TOAST_MS = 8000;

/**
 * The stack of toasts (L2-018 AC3, L2-044): newest first, an 8 s timer that
 * pauses while a toast is hovered or focused, and no timer at all on a danger
 * toast. Rendered once by `ToastOutlet`.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  private readonly timers = new Map<
    number,
    { handle: ReturnType<typeof setTimeout> | null; left: number; since: number }
  >();
  private readonly stack = signal<readonly ActiveToast[]>([]);

  /** The toasts on screen, newest first. */
  readonly toasts = this.stack.asReadonly();

  show(request: ToastRequest): ToastHandle {
    const id = this.nextId++;
    const timed = request.tone !== 'danger';
    this.stack.update((all) => [{ ...request, id, timed, paused: false }, ...all]);
    if (timed) this.start(id, TOAST_MS);
    return { id, dismiss: () => this.dismiss(id) };
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer?.handle) clearTimeout(timer.handle);
    this.timers.delete(id);
    this.stack.update((all) => all.filter((t) => t.id !== id));
  }

  /** The pointer or focus is on the toast: stop its clock. */
  pause(id: number): void {
    const timer = this.timers.get(id);
    if (!timer?.handle) return;
    clearTimeout(timer.handle);
    timer.left -= Date.now() - timer.since;
    timer.handle = null;
    this.setPaused(id, true);
  }

  resume(id: number): void {
    const timer = this.timers.get(id);
    if (!timer || timer.handle) return;
    this.start(id, Math.max(timer.left, 0));
    this.setPaused(id, false);
  }

  private start(id: number, ms: number): void {
    this.timers.set(id, {
      handle: setTimeout(() => this.dismiss(id), ms),
      left: ms,
      since: Date.now(),
    });
  }

  private setPaused(id: number, paused: boolean): void {
    this.stack.update((all) => all.map((t) => (t.id === id ? { ...t, paused } : t)));
  }
}
