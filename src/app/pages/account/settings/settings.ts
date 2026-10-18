import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AccountGate } from '../../../components/account-gate/account-gate';
import { AccountNav } from '../../../components/account-nav/account-nav';
import { Breadcrumb } from '../../../components/breadcrumb/breadcrumb';
import { AuthService } from '../../../services/auth.service';
import { DisplayCurrencyService } from '../../../services/display-currency.service';
import { Theme, ThemeService } from '../../../services/theme.service';

/**
 * Settings: the switches that are about the experience rather than the person.
 *
 * Appearance and display currency are shared, persistent preferences. Account
 * access links lead to the profile, payments and password flows.
 */
@Component({
  selector: 'app-account-settings',
  imports: [RouterLink, AccountGate, AccountNav, Breadcrumb],
  templateUrl: './settings.html',
})
export class AccountSettings {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);

  /** The shared display-currency pick — same service the payments page and the
   *  marketplace select use, so all three can never disagree. */
  protected readonly fx = inject(DisplayCurrencyService);

  protected setTheme(theme: Theme): void {
    this.theme.set(theme);
  }

  protected signOut(): void {
    this.auth.startLogoutConfirm();
  }
}
