import { Injectable, signal } from '@angular/core';

/**
 * Open/closed state of the site footer's summary, shared so other parts of the
 * shell can open it. On phones the footer has no visible collapsed bar (it would
 * steal height from the wheel), so the header menu is the way in.
 */
@Injectable({ providedIn: 'root' })
export class SiteFooterState {
  readonly expanded = signal(false);

  toggle(): void {
    this.expanded.update((value) => !value);
  }

  open(): void {
    this.expanded.set(true);
  }
}
