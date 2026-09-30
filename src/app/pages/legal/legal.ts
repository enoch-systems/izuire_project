import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  LEGAL_DISCLAIMER,
  LEGAL_DOC_IDS,
  LEGAL_DOCS,
  LegalBlock,
  LegalDocId,
} from '../../services/legal-content';

/**
 * Legal page with tab panels. Tabs are switchable, and a URL fragment
 * (e.g. /legal#privacy from the search index) activates the matching tab, like
 * the original script did via location.hash.
 *
 * The copy itself lives in services/legal-content.ts, shared with the footer's
 * modal. This page stays the full set; the modal reads two of them.
 */
@Component({
  selector: 'app-legal',
  imports: [RouterLink],
  templateUrl: './legal.html',
})
export class Legal {
  private readonly route = inject(ActivatedRoute);

  protected readonly docs = LEGAL_DOCS;
  protected readonly disclaimer = LEGAL_DISCLAIMER;
  protected readonly active = signal<LegalDocId>('terms');

  constructor() {
    this.route.fragment.subscribe((fragment) => {
      // Checked against the ids rather than trusted: an unknown fragment in the
      // URL must not leave the page showing a panel that does not exist.
      if (fragment && (LEGAL_DOC_IDS as string[]).includes(fragment)) {
        this.activate(fragment as LegalDocId);
        setTimeout(() => document.getElementById(fragment)?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    });
  }

  protected activate(id: LegalDocId): void {
    this.active.set(id);
  }

  /** Lets the template read a block's list without a cast. */
  protected items(block: LegalBlock): string[] {
    return block.items ?? [];
  }
}
