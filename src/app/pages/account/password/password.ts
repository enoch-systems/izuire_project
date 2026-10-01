import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AccountGate } from '../../../components/account-gate/account-gate';
import { AccountNav } from '../../../components/account-nav/account-nav';
import { AuthService } from '../../../services/auth.service';

/** What each strength step is called. Index 0 is "nothing typed yet". */
const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];

/**
 * Change password.
 *
 * Submitted through `AuthService.changePassword`, which checks the current
 * password against the demo account and then plays the updating-password
 * signature while it "works". The strength meter is real — it reads the field
 * as it is typed — and the two new fields are checked against each other before
 * anything is submitted, so a typo cannot cost the whole ceremony.
 */
@Component({
  selector: 'app-account-password',
  imports: [FormsModule, RouterLink, AccountGate, AccountNav],
  templateUrl: './password.html',
})
export class AccountPassword {
  protected readonly auth = inject(AuthService);

  protected readonly current = signal('');
  protected readonly next = signal('');
  protected readonly confirm = signal('');

  protected readonly error = signal('');
  protected readonly done = signal(false);
  /** True while the mock call is in flight, so the button can hold still. */
  protected readonly busy = signal(false);

  /** 0–4: length, length again, case mix, then digits or symbols. */
  protected readonly strength = computed(() => {
    const value = this.next();
    let score = 0;
    if (value.length >= 6) score++;
    if (value.length >= 10) score++;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
    if (/\d/.test(value) || /[^A-Za-z0-9]/.test(value)) score++;
    return Math.min(4, score);
  });
  protected readonly strengthLabel = computed(() => STRENGTH_LABELS[this.strength()]);

  protected async submit(): Promise<void> {
    this.error.set('');
    this.done.set(false);

    if (this.next() !== this.confirm()) {
      this.error.set('The two new passwords do not match.');
      return;
    }
    if (this.next() === this.current()) {
      this.error.set('Pick a password you have not used on this account before.');
      return;
    }

    this.busy.set(true);
    try {
      await this.auth.changePassword(this.current(), this.next());
      this.done.set(true);
      this.current.set('');
      this.next.set('');
      this.confirm.set('');
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not update your password.');
    } finally {
      this.busy.set(false);
    }
  }
}
