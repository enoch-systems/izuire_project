import { Component, inject } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Meta } from '@angular/platform-browser';
import { filter } from 'rxjs';
import { SiteHeader } from './components/site-header/site-header';
import { SiteFooter } from './components/site-footer/site-footer';
import { SearchOverlay } from './components/search-overlay/search-overlay';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SiteHeader, SiteFooter, SearchOverlay],
  templateUrl: './app.html',
})
export class App {
  constructor() {
    const router = inject(Router);
    const meta = inject(Meta);

    // Keep the meta description in sync with the active page, like the
    // per-page <meta name="description"> tags in the original site.
    router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => {
        let route: ActivatedRoute | null = router.routerState.root;
        while (route.firstChild) route = route.firstChild;
        const desc = route.snapshot.data['desc'];
        if (desc) meta.updateTag({ name: 'description', content: desc });
      });
  }
}
