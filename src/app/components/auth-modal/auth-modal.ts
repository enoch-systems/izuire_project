import { Component, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

/**
 * The auth modal: login, sign up and forgot-password in one dialog, taking the
 * same shape as the legal modal and search overlay. It reads the AuthService
 * signals the header, sidebar and hero write, so no trigger holds a reference.
 *
 * There is no backend yet - the service keeps one mock account (user1@gmail.com
 * / 123456) - so this panel just validates against that and shows whoever added
 * the cart next. The three screens swap in place; body scroll locks while it is
 * up and focus moves into the first field, matching the legal modal.
 *
 * Signed in, the panel turns into a small account card with the way into the
 * account pages and a sign-out that goes through the same "are you sure?" step
 * as every other trigger.
 *
 * FormsModule is imported for `ngSubmit` alone: that output belongs to the
 * forms directive, so without it the three screens bind to an event the DOM
 * never fires and the buttons appear dead.
 */
@Component({
  selector: 'app-auth-modal',
  imports: [FormsModule, RouterLink],
  templateUrl: './auth-modal.html',
  host: {
    '(document:keydown)': 'onKeydown($event)',
  },
})
export class AuthModal {
  protected readonly auth = inject(AuthService);

  protected readonly mode = this.auth.authMode;
  protected readonly open = this.auth.authOpen;
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly name = signal('');
  /** Non-empty once a submit has failed, to surface the message. */
  protected readonly error = signal('');
  /** True while a mock call is in flight, so the button can show a spinner. */
  protected readonly busy = signal(false);
  /** Set just after a successful password reset, to tell the user what to do next. */
  protected readonly resetSent = signal(false);

  private readonly firstField = viewChild<ElementRef<HTMLInputElement>>('firstField');

  constructor() {
    effect(() => {
      if (!this.open()) return;
      // Reset transient state each time the panel opens, and put the cursor in
      // whatever the first field of the current screen is.
      this.resetPending();
      setTimeout(() => this.firstField()?.nativeElement.focus(), 60);
    });
    effect(() => {
      if (this.open()) document.body.style.overflow = 'hidden';
      else document.body.style.overflow = '';
    });
  }

  protected get heading(): string {
    switch (this.mode()) {
      case 'login':
        return 'Welcome back';
      case 'signup':
        return 'Create your account';
      default:
        return 'Reset your password';
    }
  }

  protected get subheading(): string {
    switch (this.mode()) {
      case 'login':
        return 'Log in to check out and track your sourcing with Izuire.';
      case 'signup':
        return 'Join Izuire to check out, save quotes and track orders across Africa.';
      default:
        return 'Tell us the email you signed up with and we will reset it for you.';
    }
  }

  protected show(mode: 'login' | 'signup' | 'forgot'): void {
    this.auth.show(mode);
    this.error.set('');
    this.resetSent.set(false);
  }

  protected async onLogin(): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      await this.auth.login(this.email(), this.password());
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not log you in.');
    } finally {
      this.busy.set(false);
    }
  }

  protected async onSignup(): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      await this.auth.signup(this.name(), this.email(), this.password());
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not create your account.');
    } finally {
      this.busy.set(false);
    }
  }

  protected async onForgot(): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      await this.auth.resetPassword(this.email());
      this.resetSent.set(true);
      this.password.set('');
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not send a reset link.');
    } finally {
      this.busy.set(false);
    }
  }

  protected onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close();
  }

  protected close(): void {
    this.auth.closeAuth();
  }

  /** Hand the sign-out to the shared confirm step rather than doing it here. */
  protected logout(): void {
    this.auth.startLogoutConfirm();
  }

  /** Clears the transient fields each time the panel opens for a fresh screen. */
  private resetPending(): void {
    this.error.set('');
    this.resetSent.set(false);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.open()) this.close();
  }
}