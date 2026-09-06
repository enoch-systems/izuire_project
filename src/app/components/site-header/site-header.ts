import { Component, OnDestroy, effect, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { UiService } from '../../services/ui.service';

/**
 * Site header + mobile navigation.
 * Desktop: sticky glass header with active-route highlighting, animated
 * underlines, a hover/click dropdown, and a polished search trigger.
 * Mobile: hamburger that morphs to an X, a scrim + slide-in drawer with
 * staggered chevron links, active-route states and an end-to-end CTA.
 */
@Component({
  selector: 'app-site-header',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './site-header.html',
  host: {
    '(window:scroll)': 'onWindowScroll()',
    '(document:keydown)': 'onKeydown($event)',
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class SiteHeader implements OnDestroy {
  protected readonly ui = inject(UiService);
  protected readonly scrolled = signal(false);
  protected readonly dropdownOpen = signal(false);

  constructor() {
    // Lock body scroll while the mobile drawer is open.
    effect(() => {
      document.body.style.overflow = this.ui.menuOpen() ? 'hidden' : '';
    });
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
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

  protected toggleDropdown(): void {
    this.dropdownOpen.update((v) => !v);
  }

  protected closeDropdown(): void {
    this.dropdownOpen.set(false);
  }

  protected onWindowScroll(): void {
    this.scrolled.set(window.scrollY > 8);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;
    if (this.ui.menuOpen()) this.ui.closeMenu();
    if (this.dropdownOpen()) this.dropdownOpen.set(false);
  }

  protected onDocumentClick(event: Event): void {
    if (!this.dropdownOpen()) return;
    const target = event.target as HTMLElement | null;
    if (target && !target.closest('.nav-dropdown')) this.dropdownOpen.set(false);
  }
}
