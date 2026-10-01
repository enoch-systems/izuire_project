import { Component, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AccountGate } from '../../../components/account-gate/account-gate';
import { AccountNav } from '../../../components/account-nav/account-nav';
import { AddressInfo, AuthUser, AuthService } from '../../../services/auth.service';

/** A blank address, so an empty profile still renders a full form. */
function emptyAddress(): AddressInfo {
  return { line1: '', line2: '', city: '', state: '', country: 'Nigeria', zip: '' };
}

/**
 * The profile page: everything sign-up deliberately did not ask for.
 *
 * The draft fields are plain properties rather than signals because they are
 * bound with `[(ngModel)]`, the way the quote and contact forms are. They are
 * refilled from the signed-in user whenever that user changes — including the
 * moment someone signs in while sitting on this page — so the form is never
 * showing a blank profile that the account does not have.
 *
 * Saving patches the mock store through `AuthService.updateProfile` and
 * flashes a confirmation; nothing is sent anywhere.
 */
@Component({
  selector: 'app-account-profile',
  imports: [FormsModule, AccountGate, AccountNav],
  templateUrl: './profile.html',
})
export class AccountProfile {
  protected readonly auth = inject(AuthService);

  /** Personal details. */
  protected name = '';
  protected email = '';
  protected phone = '';
  protected company = '';

  /** The two addresses, each saved on its own — they are edited separately too. */
  protected shipping: AddressInfo = emptyAddress();
  protected billing: AddressInfo = emptyAddress();

  /** The line under the header after a save, or empty when nothing was saved. */
  protected readonly flash = signal('');
  private flashTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    effect(() => {
      const user = this.auth.user();
      untracked(() => {
        if (user) this.fill(user);
      });
    });
  }

  protected savePersonal(): void {
    this.auth.updateProfile({
      name: this.name.trim(),
      email: this.email.trim(),
      phone: this.phone.trim(),
      company: this.company.trim(),
    });
    this.saved('Personal details saved to your account.');
  }

  protected saveShipping(): void {
    this.auth.updateProfile({ shipping: { ...this.shipping } });
    this.saved('Shipping address saved.');
  }

  protected saveBilling(): void {
    this.auth.updateProfile({ billing: { ...this.billing } });
    this.saved('Billing address saved.');
  }

  /** Whether an address has enough to be worth saving. */
  protected addressReady(address: AddressInfo): boolean {
    return Boolean(address.line1.trim() && address.city.trim() && address.country.trim());
  }

  private saved(message: string): void {
    this.flash.set(message);
    clearTimeout(this.flashTimer);
    this.flashTimer = setTimeout(() => this.flash.set(''), 2800);
  }

  /** Copy the signed-in user over the drafts. */
  private fill(user: AuthUser): void {
    this.name = user.name ?? '';
    this.email = user.email ?? '';
    this.phone = user.phone ?? '';
    this.company = user.company ?? '';
    this.shipping = { ...emptyAddress(), ...(user.shipping ?? {}) };
    this.billing = { ...emptyAddress(), ...(user.billing ?? {}) };
  }
}
