import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AccountGate } from '../../../components/account-gate/account-gate';
import { AccountNav } from '../../../components/account-nav/account-nav';
import { AuthService } from '../../../services/auth.service';
import { Theme, ThemeService } from '../../../services/theme.service';

/**
 * Settings: the switches that are about the experience rather than the person.
 *
 * Appearance is the one that is real — it drives the same ThemeService the
 * header toggle does, so the page and the bar can never disagree. The
 * notification and currency preferences are session-level mock state: they flip,
 * they read back, and they reset on reload, which is the honest behaviour for a
 * site with no backend.
 */
@Component({
  selector: 'app-account-settings',
  imports: [RouterLink, AccountGate, AccountNav],
  templateUrl: './settings.html',
})
export class AccountSettings {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);

  /** Mock preferences, kept only for this session. */
  protected readonly emailUpdates = signal(true);
  protected readonly whatsappUpdates = signal(true);
  protected readonly priceAlerts = signal(false);
  protected readonly currency = signal<'NGN' | 'RMB'>('NGN');

  protected setTheme(theme: Theme): void {
    this.theme.set(theme);
  }

  protected toggle(setting: 'email' | 'whatsapp' | 'alerts'): void {
    if (setting === 'email') this.emailUpdates.update((on) => !on);
    if (setting === 'whatsapp') this.whatsappUpdates.update((on) => !on);
    if (setting === 'alerts') this.priceAlerts.update((on) => !on);
  }

  protected setCurrency(code: 'NGN' | 'RMB'): void {
    this.currency.set(code);
  }

  protected signOut(): void {
    this.auth.startLogoutConfirm();
  }
}
