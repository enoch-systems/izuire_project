import {
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiService } from '../../services/ui.service';
import {
  LEGAL_DISCLAIMER,
  LegalBlock,
  LegalDocId,
  MODAL_DOC_IDS,
  legalDoc,
} from '../../services/legal-content';

/**
 * The legal modal: the Terms and Privacy policies read in place, without leaving
 * the page the reader is on.
 *
 * Sits at the app root as a sibling of the search overlay and reads the same
 * UiService signal the footer writes, so neither has to hold a reference to the
 * other. Open state is the document id, not a boolean, so the panel can never be
 * showing one policy while the trigger asked for another.
 *
 * Two things beyond the search overlay's behaviour, both because this panel holds
 * prose rather than a list: the body scroll is locked while it is up, since a
 * long policy scrolled against a moving page is miserable to read, and focus is
 * moved into the dialog and handed back on close, since it is the only thing on
 * the page a keyboard reader can act on.
 */
@Component({
  selector: 'app-legal-modal',
  imports: [RouterLink],
  templateUrl: './legal-modal.html',
  host: {
    '(document:keydown)': 'onKeydown($event)',
  },
})
export class LegalModal {
  private readonly ui = inject(UiService);

  protected readonly disclaimer = LEGAL_DISCLAIMER;
  /**
   * The two the footer offers, as whole documents rather than bare ids, so the
   * tab strip can read each one's own label instead of a copy of it. The label is
   * then guaranteed to match the heading it switches to.
   */
  protected readonly switchable = MODAL_DOC_IDS.map(legalDoc);

  /** The document the footer asked for, null when shut. */
  private readonly requested = this.ui.legalDoc;

  /**
   * Which of the two is on screen. Seeded from the request, then owned here, so
   * the reader can move between Terms and Privacy without the footer's choice
   * being overwritten the moment the modal is reopened.
   */
  protected readonly active = signal<LegalDocId>('terms');

  protected readonly open = computed(() => this.requested() !== null);
  protected readonly doc = computed(() => legalDoc(this.active()));

  private readonly dialog = viewChild<ElementRef<HTMLElement>>('dialog');
  private readonly body = viewChild<ElementRef<HTMLElement>>('body');

  /** Who to hand focus back to. */
  private restoreTo: HTMLElement | null = null;

  constructor() {
    effect(() => {
      const requested = this.requested();
      if (requested) {
        this.active.set(requested);
        this.restoreTo = document.activeElement as HTMLElement | null;
        document.body.style.overflow = 'hidden';
        setTimeout(() => this.dialog()?.nativeElement.focus());
      } else {
        document.body.style.overflow = '';
        // Only on a real close. The first run of this effect has nothing to
        // restore, and stealing focus on page load would be worse than useless.
        if (this.restoreTo) {
          this.restoreTo.focus();
          this.restoreTo = null;
        }
      }
    });
  }

  protected show(id: LegalDocId): void {
    this.active.set(id);
    // The body keeps its scroll position across a swap, so reading halfway down
    // Terms and switching would land mid-paragraph in Privacy.
    this.body()?.nativeElement.scrollTo({ top: 0 });
  }

  protected close(): void {
    this.ui.closeLegal();
  }

  /** Click-away: only the backdrop itself, never the panel's own padding. */
  protected onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.open()) this.close();
  }

  /** Lets the template read a block's list without a cast. */
  protected items(block: LegalBlock): string[] {
    return block.items ?? [];
  }
}
