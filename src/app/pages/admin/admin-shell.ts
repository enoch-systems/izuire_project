import { Component, HostListener, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AdminAuthService } from '../../services/admin-auth.service';
import { ThemeToggle } from '../../components/theme-toggle/theme-toggle';

/**
 * The frame every console page renders inside: a sidebar, the signed-in admin,
 * and a way out.
 *
 * The storefront header, nav, rate ticker and footer are deliberately absent.
 * An admin editing prices does not need a promotions ticker, and leaving the
 * shopper nav in place is what made this feel like a stray customer page
 * rather than its own application. The root component hides that chrome for
 * anything under /admin.
 */
@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ThemeToggle],
  templateUrl: './admin-shell.html',
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        min-height: 100dvh;
        background: var(--paper);
        color: var(--ink);
      }
      .shell {
        display: block;
        min-height: 100vh;
        min-height: 100dvh;
      }
      .topbar {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 18px;
        background: var(--white);
        border-bottom: 1px solid var(--line);
        position: sticky;
        top: 0;
        z-index: 30;
      }
      .burger {
        display: inline-flex;
        flex-direction: column;
        /* Buttons default to align-items:flex-start in the UA sheet, which
           collapses empty spans to 0 width; the bars need the stretch back. */
        align-items: stretch;
        justify-content: center;
        gap: 5px;
        width: 40px;
        height: 40px;
        padding: 0 9px;
        background: transparent;
        border: 1.5px solid var(--ink);
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.22s var(--ease), border-color 0.22s var(--ease);
      }
      .burger:hover {
        background: rgba(245, 130, 31, 0.1);
        border-color: var(--orange-deep);
      }
      .burger span {
        display: block;
        height: 2px;
        background: var(--ink);
        border-radius: 2px;
      }
      .burger:focus-visible {
        outline: 2.5px solid var(--orange-deep);
        outline-offset: 2px;
      }
      .topmark {
        font-family: var(--font-d);
        font-weight: 600;
        font-size: 0.72rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--orange-deep);
      }
      .backdrop {
        position: fixed;
        inset: 0;
        z-index: 35;
        background: rgba(17, 17, 17, 0.4);
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.25s var(--ease);
      }
      .backdrop.show {
        opacity: 1;
        pointer-events: auto;
      }
      aside {
        position: fixed;
        top: 0;
        bottom: 0;
        left: 0;
        width: 264px;
        z-index: 40;
        border-right: 1px solid var(--line);
        padding: 24px 18px;
        display: flex;
        flex-direction: column;
        gap: 22px;
        background: var(--white);
        transform: translateX(-105%);
        transition: transform 0.28s var(--ease);
        overflow-y: auto;
      }
      aside.open {
        transform: none;
      }
      .mark {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-family: var(--font-d);
        font-weight: 600;
        font-size: 0.72rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--orange-deep);
      }
      .mark::before {
        content: '';
        width: 16px;
        height: 2px;
        background: var(--orange-deep);
        display: inline-block;
      }
      nav {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      nav a {
        display: block;
        padding: 9px 12px;
        font-family: var(--font-d);
        font-weight: 500;
        font-size: 0.93rem;
        letter-spacing: 0.005em;
        color: var(--ink-60);
        text-decoration: none;
        border-radius: 6px;
        transition: color 0.22s var(--ease), background-color 0.22s var(--ease);
      }
      nav a:hover {
        background: rgba(245, 130, 31, 0.1);
        color: var(--ink);
      }
      nav a.active {
        background: var(--orange);
        color: var(--white);
      }
      nav a.active:hover {
        background: var(--orange-deep);
        color: var(--white);
      }
      /* Appearance sits between the nav and the account block: a site-wide
         preference belongs beside the links, not buried in the account. */
      .theme-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 10px 12px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: var(--paper);
      }
      .theme-row > span {
        font-family: var(--font-d);
        font-weight: 600;
        font-size: 0.78rem;
        letter-spacing: 0.04em;
        color: var(--ink-60);
      }
      nav a:focus-visible,
      .actions a:focus-visible,
      .actions button:focus-visible {
        outline: 2.5px solid var(--orange-deep);
        outline-offset: 2px;
      }
      .who {
        margin-top: auto;
        padding-top: 16px;
        border-top: 1px solid var(--line);
        font-size: 13px;
        line-height: 1.5;
      }
      .who strong {
        display: block;
        font-family: var(--font-d);
        font-weight: 600;
        overflow-wrap: anywhere;
      }
      .who span {
        color: var(--ink-40);
        font-size: 12px;
      }
      .actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 14px;
      }
      .actions a,
      .actions button {
        font-family: var(--font-d);
        font-weight: 600;
        font-size: 13px;
        padding: 8px 12px;
        border-radius: 6px;
        cursor: pointer;
        text-decoration: none;
        transition: background-color 0.22s var(--ease), color 0.22s var(--ease);
      }
      .actions button {
        background: transparent;
        color: var(--ink);
        border: 1.5px solid var(--ink);
        text-align: left;
      }
      .actions button:hover {
        background: var(--ink);
        color: var(--white);
      }
      .actions a {
        color: var(--ink-60);
      }
      .actions a:hover {
        color: var(--orange-deep);
      }
      /* Storefront preview: the shop inside the console, no navigation away. */
      /* The storefront-preview overlay itself lives in styles.css with the rest
         of the console's shared sheet CSS, so this component stays under its
         style budget. Its classes are unique to this template. */
      main {
        padding: 28px 28px 48px;
        min-width: 0;
        width: 100%;
        max-width: none;
        margin: 0;
      }
      @media (max-width: 720px) {
        main {
          padding: 20px 14px 36px;
        }
      }
      /* Desktop: the sidebar is the layout, not a drawer. It stops hiding
         behind the burger, the top bar steps aside, and the page flows to
         its right. Below this width the mobile drawer takes over again. */
      @media (min-width: 900px) {
        .topbar {
          display: none;
        }
        .backdrop {
          display: none;
        }
        aside {
          transform: none;
        }
        .shell {
          padding-left: 264px;
        }
        main {
          padding-top: 32px;
        }
      }
    `,
  ],
})
export class AdminShell {
  protected readonly admin = inject(AdminAuthService);
  private readonly router = inject(Router);

  /** Drawer + preview state. The console stays put: the preview is an overlay. */
  protected readonly menuOpen = signal(false);
  protected readonly previewOpen = signal(false);
  protected readonly signOutConfirming = signal(false);
  protected readonly signingOut = signal(false);

  protected isEmailWorkspace(): boolean {
    return ['/admin/email-follow-up', '/admin/email-drafts', '/admin/email-history']
      .some((path) => this.router.url.startsWith(path));
  }

  protected adminInitials(): string {
    const name = this.admin.session()?.name?.trim() || this.admin.session()?.email || 'Admin';
    return name.split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('');
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
    document.body.style.overflow = this.menuOpen() ? 'hidden' : '';
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
    if (!this.previewOpen()) document.body.style.overflow = '';
  }

  /** Storefront preview inside the console — no navigation away. */
  protected openPreview(): void {
    this.previewOpen.set(true);
    this.menuOpen.set(false);
    document.body.style.overflow = 'hidden';
  }

  protected closePreview(): void {
    this.previewOpen.set(false);
    document.body.style.overflow = '';
  }

  protected requestSignOut(): void {
    if (this.signingOut()) return;
    this.closeMenu();
    this.signOutConfirming.set(true);
    document.body.style.overflow = 'hidden';
  }

  protected cancelSignOut(): void {
    if (this.signingOut()) return;
    this.signOutConfirming.set(false);
    if (!this.previewOpen() && !this.menuOpen()) document.body.style.overflow = '';
  }

  protected async confirmSignOut(): Promise<void> {
    if (this.signingOut()) return;
    this.signingOut.set(true);
    try {
      await this.admin.signOut();
      await this.router.navigateByUrl('/admin/login');
    } finally {
      this.signingOut.set(false);
      this.signOutConfirming.set(false);
      document.body.style.overflow = '';
    }
  }

  protected async signOut(): Promise<void> {
    this.closeMenu();
    await this.admin.signOut();
    await this.router.navigateByUrl('/admin/login');
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.previewOpen()) this.closePreview();
    else if (this.signOutConfirming()) this.cancelSignOut();
    else this.closeMenu();
  }

  /** Crossing into the desktop layout makes the drawer permanent, so a menu
   *  left open on a phone must not keep the body scroll locked. */
  @HostListener('window:resize')
  protected onResize(): void {
    if (window.innerWidth >= 900 && this.menuOpen()) this.closeMenu();
  }
}
