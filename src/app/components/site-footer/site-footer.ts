import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LOGO_SRC } from '../../logo';

/** Site footer, reproduced 1:1 from the original pages. */
@Component({
  selector: 'app-site-footer',
  imports: [RouterLink],
  templateUrl: './site-footer.html',
})
export class SiteFooter {
  protected readonly year = new Date().getFullYear();
  /** The wordmark, from the one shared copy in logo.ts. */
  protected readonly logo = LOGO_SRC;
}
