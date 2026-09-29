import { Injectable, signal } from '@angular/core';

/**
 * Shared UI state, reproducing the behavior of the original site's
 * mobile menu and search overlay JavaScript.
 */
@Injectable({ providedIn: 'root' })
export class UiService {
  readonly menuOpen = signal(false);
  readonly searchOpen = signal(false);

  /**
   * Bumped when the header logo is clicked, asking the signature animation to
   * play again.
   *
   * A signal rather than a direct call into the loader, so the header does not
   * have to reach for a component it does not own. The two are siblings at the
   * app root with no parent-child relationship, so this is how they talk.
   */
  readonly signatureRequested = signal(0);

  /** Ask for the signature to be played again. */
  requestSignature(): void {
    this.signatureRequested.update((n) => n + 1);
  }

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
