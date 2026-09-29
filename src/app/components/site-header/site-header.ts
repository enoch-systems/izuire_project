import { Component, OnDestroy, effect, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { UiService } from '../../services/ui.service';

/** Desktop nav dropdowns. Only one may be open at a time. */
type DropdownName = 'categories' | 'resources';

/**
 * Site header + mobile navigation.
 * Desktop: sticky glass header with active-route highlighting, animated
 * underlines, hover/click dropdowns (Categories and Resources), and a
 * polished search trigger.
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
  /** Name of the open desktop dropdown, or null when they are all closed. */
  protected readonly openDropdown = signal<DropdownName | null>(null);

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
    if (target && !target.closest('.nav-dropdown')) this.openDropdown.set(null);
  }
}
