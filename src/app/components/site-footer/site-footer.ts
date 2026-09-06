import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Site footer, reproduced 1:1 from the original pages. */
@Component({
  selector: 'app-site-footer',
  imports: [RouterLink],
  templateUrl: './site-footer.html',
})
export class SiteFooter {
  protected readonly year = new Date().getFullYear();
}
