import { Injectable, signal } from '@angular/core';
import { LegalDocId } from './legal-content';

/**
 * Shared UI state, reproducing the behavior of the original site's
 * mobile menu and search overlay JavaScript.
 */
@Injectable({ providedIn: 'root' })
export class UiService {
  readonly menuOpen = signal(false);
  readonly searchOpen = signal(false);

  /**
   * Which legal document the footer has asked to read, or null when the modal is
   * shut. Null rather than a separate boolean so the open state and its contents
   * cannot disagree: there is no window where the modal is up showing the last
   * document, or hidden with one set.
   */
  readonly legalDoc = signal<LegalDocId | null>(null);

  /** Open the modal on one document. */
  openLegal(id: LegalDocId): void {
    this.legalDoc.set(id);
  }

  /** Shut the modal. */
  closeLegal(): void {
    this.legalDoc.set(null);
  }

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
