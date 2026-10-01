import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';

/**
 * The rail that runs across the account pages, so the four destinations read as
 * one section rather than four unrelated screens. Log out sits at the end, with
 * the same confirm step the header uses.
 */
@Component({
  selector: 'app-account-nav',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './account-nav.html',
})
export class AccountNav {
  protected readonly auth = inject(AuthService);

  protected startLogout(): void {
    this.auth.startLogoutConfirm();
  }
}
