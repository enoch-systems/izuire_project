import { Component, inject } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Meta } from '@angular/platform-browser';
import { filter } from 'rxjs';
import { SiteHeader } from './components/site-header/site-header';
import { SiteFooter } from './components/site-footer/site-footer';
import { RateTicker } from './components/rate-ticker/rate-ticker';
import { SearchOverlay } from './components/search-overlay/search-overlay';
import { LegalModal } from './components/legal-modal/legal-modal';
import { AuthModal } from './components/auth-modal/auth-modal';
import { CartToast } from './components/cart-toast/cart-toast';
import { SignatureLoader } from './components/signature-loader/signature-loader';
import { AuthLoader } from './components/auth-loader/auth-loader';
import { LogoutConfirm } from './components/logout-confirm/logout-confirm';
import { MediaMuteService } from './services/media-mute.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SiteHeader, SiteFooter, RateTicker, SearchOverlay, LegalModal, AuthModal, CartToast, SignatureLoader, AuthLoader, LogoutConfirm],
  templateUrl: './app.html',
})
export class App {
  constructor() {
    const router = inject(Router);
    const meta = inject(Meta);

    // Every clip on this site is decorative, so none of them play sound. This
    // holds the line from the root component, which covers each route as it is
    // activated rather than leaving it to whichever page happens to remember.
    inject(MediaMuteService).start();

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
