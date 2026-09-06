import { Injectable, signal } from '@angular/core';

/**
 * Shared UI state, reproducing the behavior of the original site's
 * mobile menu and search overlay JavaScript.
 */
@Injectable({ providedIn: 'root' })
export class UiService {
  readonly menuOpen = signal(false);
  readonly searchOpen = signal(false);

  openMenu(): void {
    this.menuOpen.set(true);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  openSearch(): void {
    this.searchOpen.set(true);
  }

  closeSearch(): void {
    this.searchOpen.set(false);
  }
}
