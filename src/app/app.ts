import { Component, HostListener, OnDestroy, computed, inject, signal } from '@angular/core';
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
import { ActionFeedback } from './components/action-feedback/action-feedback';
import { MediaMuteService } from './services/media-mute.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SiteHeader, SiteFooter, RateTicker, SearchOverlay, LegalModal, AuthModal, CartToast, SignatureLoader, AuthLoader, LogoutConfirm, ActionFeedback],
  templateUrl: './app.html',
})
export class App implements OnDestroy {
  /** The URL as it stands, so the chrome can stand down inside the admin. */
  private readonly url = signal('/');

  /** True anywhere under /admin — the console is its own application, so the
   *  storefront header, rate ticker, footer and shopper overlays are all held
   *  back there. Without this the console renders inside the shop's nav, which
   *  is what made it read as a stray customer page. */
  protected readonly isAdmin = computed(() => this.url().startsWith('/admin'));
  protected readonly offline = signal(typeof navigator !== 'undefined' && !navigator.onLine);
  protected readonly connectionRestored = signal(false);
  private connectionTimer: ReturnType<typeof setTimeout> | undefined;

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
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.url.set(router.url);
        let route: ActivatedRoute | null = router.routerState.root;
        while (route.firstChild) route = route.firstChild;
        const desc = route.snapshot.data['desc'] ?? 'Izuire connects African buyers with trusted suppliers in China through sourcing, procurement and shopping.';
        const privateRoute = route.snapshot.data['robots'] === 'noindex, nofollow' || /^\/(admin|account|cart|checkout)(\/|$)/.test(router.url);
        meta.updateTag({ name: 'description', content: desc });
        meta.updateTag({ name: 'robots', content: privateRoute ? 'noindex, nofollow' : 'index, follow' });
      });
  }

  @HostListener('window:offline')
  protected onOffline(): void {
    clearTimeout(this.connectionTimer);
    this.connectionRestored.set(false);
    this.offline.set(true);
  }

  @HostListener('window:online')
  protected onOnline(): void {
    if (!this.offline()) return;
    this.offline.set(false);
    this.connectionRestored.set(true);
    clearTimeout(this.connectionTimer);
    this.connectionTimer = setTimeout(() => this.connectionRestored.set(false), 3600);
  }

  ngOnDestroy(): void {
    clearTimeout(this.connectionTimer);
  }
}
