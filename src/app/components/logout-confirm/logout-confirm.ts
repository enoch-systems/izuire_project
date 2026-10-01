import { Component, computed, effect, inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { UiService } from '../../services/ui.service';

/**
 * The "are you sure?" step before a sign-out.
 *
 * It lives at the app root and reads AuthService state, so every trigger — the
 * header menu, the drawer, the account dialog, the settings page — opens the
 * same dialog without owning a copy of it. Confirming hands straight over to
 * `logout()`, which plays the signing-out signature.
 */
@Component({
  selector: 'app-logout-confirm',
  templateUrl: './logout-confirm.html',
  host: {
    '(document:keydown)': 'onKeydown($event)',
  },
})
export class LogoutConfirm {
  protected readonly auth = inject(AuthService);
  private readonly ui = inject(UiService);

  protected readonly open = this.auth.logoutConfirming;
  /** The name the dialog speaks to, so it reads as a question about a person. */
  protected readonly firstName = computed(() => {
    const user = this.auth.user();
    return user ? (user.name || user.email).split(' ')[0] : 'there';
  });

  constructor() {
    effect(() => {
      if (this.open()) {
        document.body.style.overflow = 'hidden';
        return;
      }
      // Another overlay may still want the page held — the account dialog is
      // open behind this one, for instance.
      document.body.style.overflow = this.auth.authOpen() || this.ui.menuOpen() ? 'hidden' : '';
    });
  }

  protected confirm(): void {
    void this.auth.logout();
  }

  protected cancel(): void {
    this.auth.cancelLogoutConfirm();
  }

  protected onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.cancel();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.open()) this.cancel();
  }
}
