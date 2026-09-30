import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LOGO_SRC } from '../../logo';
import { UiService } from '../../services/ui.service';
import { LegalDocId } from '../../services/legal-content';

/** Site footer, reproduced 1:1 from the original pages. */
@Component({
  selector: 'app-site-footer',
  imports: [RouterLink],
  templateUrl: './site-footer.html',
})
export class SiteFooter {
  private readonly ui = inject(UiService);

  protected readonly year = new Date().getFullYear();
  /** The wordmark, from the one shared copy in logo.ts. */
  protected readonly logo = LOGO_SRC;

  /**
   * Hand the document to the modal at the app root rather than opening one here.
   * The two are siblings with no parent-child relationship, so the shared signal
   * is how they talk — the same arrangement the header and search overlay use.
   */
  protected openLegal(id: LegalDocId): void {
    this.ui.openLegal(id);
  }

  /**
   * The mark signs itself again when it is clicked, exactly as the header's does:
   * the link is left alone, so the click still goes home and the animation plays
   * over the top of the navigation rather than holding it back.
   */
  protected onLogoClick(): void {
    this.ui.requestSignature();
  }
}
