import { Component, OnDestroy, effect, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { UiService } from '../../services/ui.service';
import { CartService } from '../../services/cart.service';
import { FlyToCartService } from '../../services/fly-to-cart.service';
import { AuthService } from '../../services/auth.service';
import { ThemeToggle } from '../theme-toggle/theme-toggle';
import { LOGO_SRC } from '../../logo';

/** Desktop dropdowns. Only one may be open at a time. */
type DropdownName = 'services' | 'company' | 'account';

/**
 * Site header + mobile navigation.
 * Desktop: sticky glass header with active-route highlighting, animated
 * underlines, hover/click dropdowns (Services and Company), and a polished
 * search trigger.
 * Mobile: hamburger that morphs to an X, a scrim + slide-in drawer with
 * collapsible sections and a theme switch at the head.
 */
@Component({
  selector: 'app-site-header',
  imports: [RouterLink, RouterLinkActive, ThemeToggle],
  templateUrl: './site-header.html',
  host: {
    '(window:scroll)': 'onWindowScroll()',
    '(document:keydown)': 'onKeydown($event)',
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class SiteHeader implements OnDestroy {
  protected readonly ui = inject(UiService);
  /** The wordmark, from the one shared copy in logo.ts. */
  protected readonly logo = LOGO_SRC;
  /** Drives the header's cart badge. */
  protected readonly cart = inject(CartService);
  /** Drives the login / get-started button and the signed-in state. */
  protected readonly auth = inject(AuthService);
  /** Bumped when a product's picture lands in this button. */
  private readonly fly = inject(FlyToCartService);
  /**
   * True for the moment a product lands, so the button takes the impact. Held as
   * a signal rather than read straight off `landed` because that counter never
   * resets — it has to go up and come back down, or the button would stay lit
   * after the first add.
   */
  protected readonly cartLanded = signal(false);
  private landTimer: ReturnType<typeof setTimeout> | undefined;
  protected readonly scrolled = signal(false);
  /** Name of the open desktop dropdown, or null when they are all closed. */
  protected readonly openDropdown = signal<DropdownName | null>(null);
  /** Which mobile drawer sections are expanded. */
  protected readonly openGroup = signal<{ services: boolean; company: boolean }>({ services: false, company: false });

  constructor() {
    // Lock body scroll while the mobile drawer is open.
    effect(() => {
      document.body.style.overflow = this.ui.menuOpen() ? 'hidden' : '';
    });

    // Flash the cart button each time a product's picture lands in it.
    effect(() => {
      if (this.fly.landed() === 0) return;
      this.cartLanded.set(true);
      clearTimeout(this.landTimer);
      this.landTimer = setTimeout(() => this.cartLanded.set(false), 420);
    });
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
    clearTimeout(this.landTimer);
  }

  protected menuOpen() {
    return this.ui.menuOpen();
  }

  protected openMenu(): void {
    this.ui.openMenu();
  }

  protected closeMenu(): void {
    this.ui.closeMenu();
  }

  protected openSearch(): void {
    this.ui.openSearch();
  }

  /** Open the auth modal on login from the desktop button. */
  protected openAuth(): void {
    this.auth.openAuth();
  }

  /** Open the sign-up screen from the "Get started" call in the drawer. */
  protected openSignup(): void {
    this.auth.openSignup();
  }

  /**
   * Ask before signing out. The dialog itself lives at the app root and reads
   * AuthService state, so this closes whatever surface the click came from and
   * lets the confirm step take over from there.
   */
  protected startLogout(): void {
    this.openDropdown.set(null);
    this.ui.closeMenu();
    this.auth.startLogoutConfirm();
  }

  /** First letter of whoever is signed in, for the account avatar. */
  protected initial(name: string | undefined, fallback: string): string {
    return (name || fallback).charAt(0).toUpperCase();
  }

  /** First word of the name, or the email if the profile has no name yet. */
  protected firstName(name: string | undefined, email: string): string {
    return (name || email).trim().split(' ')[0];
  }

  /**
   * Signing the mark again when the logo is clicked.
   *
   * The link is left alone: the click still navigates home, and the animation
   * plays over the top of it. Holding the navigation back until the signature
   * finished would make the logo feel broken, and routing first means the
   * animation is already running by the time the new page paints under it.
   */
  protected onLogoClick(): void {
    this.ui.requestSignature();
  }

  protected isDropdownOpen(name: DropdownName): boolean {
    return this.openDropdown() === name;
  }

  /** Opens `name`, or closes it when it is already the open dropdown. */
  protected toggleDropdown(name: DropdownName): void {
    this.openDropdown.update((current) => (current === name ? null : name));
  }

  protected closeDropdown(): void {
    this.openDropdown.set(null);
  }

  /** Toggles a mobile drawer section open or shut. */
  protected toggleGroup(group: 'services' | 'company'): void {
    this.openGroup.update((current) => ({ ...current, [group]: !current[group] }));
  }

  protected onWindowScroll(): void {
    this.scrolled.set(window.scrollY > 8);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;
    if (this.ui.menuOpen()) this.ui.closeMenu();
    if (this.openDropdown()) this.openDropdown.set(null);
  }

  protected onDocumentClick(event: Event): void {
    if (!this.openDropdown()) return;
    const target = event.target as HTMLElement | null;
    if (target && !target.closest('.nav-dropdown') && !target.closest('.account-menu')) {
      this.openDropdown.set(null);
    }
  }
}
