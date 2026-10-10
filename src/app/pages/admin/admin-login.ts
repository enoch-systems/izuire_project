import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminAuthService } from '../../services/admin-auth.service';

/**
 * /admin/login — the console's own front door.
 *
 * It is deliberately separate from the shop's auth modal. Admin access is
 * validated against the real Supabase session and fails closed when unavailable.
 *
 * It also sits outside the storefront chrome (no header, nav or footer), which
 * is what keeps the console from being reachable by wandering the site.
 */
@Component({
  selector: 'app-admin-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-login.html',
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        min-height: 100dvh;
        background: var(--paper);
        color: var(--ink);
      }
      .admin-login {
        min-height: 100vh;
        min-height: 100dvh;
        display: grid;
        place-items: center;
        padding: 32px 20px;
        font-family: var(--font-b);
      }
      .card {
        width: 100%;
        max-width: 400px;
        background: var(--white);
        border: 1px solid var(--line);
        border-radius: 18px;
        padding: 26px 26px 24px;
        box-shadow: 0 14px 40px rgba(17, 17, 17, 0.05);
      }
      :root[data-theme='dark'] .card {
        box-shadow: none;
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
        margin: 0 0 14px;
      }
      .mark::before {
        content: '';
        width: 16px;
        height: 2px;
        background: var(--orange-deep);
        display: inline-block;
      }
      h1 {
        font-family: var(--font-d);
        font-weight: 700;
        letter-spacing: -0.01em;
        font-size: 26px;
        line-height: 1.15;
        margin: 0 0 6px;
      }
      .lede {
        margin: 0 0 26px;
        font-size: 0.86rem;
        line-height: 1.6;
        color: var(--ink-60);
      }
      label {
        display: block;
        font-family: var(--font-d);
        font-size: 0.78rem;
        font-weight: 600;
        color: var(--ink);
        margin-bottom: 7px;
      }
      .field {
        margin-bottom: 18px;
      }
      input {
        width: 100%;
        padding: 12px 14px;
        /* 16px is the floor: iOS zooms the viewport into any smaller field. */
        font-size: 16px;
        font-weight: 500;
        font-family: var(--font-d);
        color: var(--ink);
        background: var(--white);
        border: 1px solid var(--line);
        border-radius: 7px;
        transition: border-color 0.2s var(--ease);
      }
      input::placeholder {
        color: var(--ink-40);
        font-weight: 400;
      }
      .password-control {
        position: relative;
      }
      .password-control input {
        padding-right: 56px;
      }
      input:focus {
        border-color: var(--orange);
        outline: none;
        box-shadow: 0 0 0 4px rgba(245, 130, 31, 0.14);
      }
      .error {
        margin: 0 0 18px;
        padding: 10px 12px;
        font-size: 13px;
        line-height: 1.5;
        color: #8a1c1c;
        background: rgba(180, 40, 40, 0.08);
        border: 1px solid rgba(180, 40, 40, 0.28);
        border-radius: 8px;
      }

      :root[data-theme='dark'] .error {
        color: #ff9d9d;
        background: rgba(255, 110, 110, 0.12);
        border-color: rgba(255, 110, 110, 0.3);
      }
      button {
        width: 100%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 14px 26px;
        font-size: 0.95rem;
        font-family: var(--font-d);
        font-weight: 600;
        letter-spacing: 0.01em;
        color: var(--white);
        background: var(--orange);
        border: 1px solid transparent;
        border-radius: 6px;
        cursor: pointer;
        box-shadow: 0 1px 0 rgba(0, 0, 0, 0.08);
        transition:
          transform 0.22s var(--ease),
          background 0.22s var(--ease);
      }
      button:hover:not(:disabled) {
        background: var(--orange-deep);
        transform: translateY(-1px);
      }
      button:active:not(:disabled) {
        transform: translateY(0);
      }
      button:disabled {
        opacity: 0.55;
        cursor: progress;
      }
      .password-toggle {
        position: absolute;
        top: 50%;
        right: 8px;
        width: 38px;
        height: 38px;
        padding: 0;
        transform: translateY(-50%);
        border: 0;
        background: transparent;
        color: var(--ink-60);
        box-shadow: none;
      }
      .password-toggle:hover:not(:disabled) {
        transform: translateY(-50%);
        background: var(--paper);
        color: var(--ink);
      }
      .password-toggle svg {
        width: 18px;
        height: 18px;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.8;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      button:focus-visible,
      input:focus-visible,
      a:focus-visible {
        outline: 2.5px solid var(--orange-deep);
        outline-offset: 2px;
      }
      .foot {
        margin: 24px 0 0;
        padding-top: 18px;
        border-top: 1px solid var(--line);
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }
      .foot a {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        font-weight: 600;
        font-family: var(--font-d);
        color: var(--ink-60);
        text-decoration: none;
      }

      .foot a svg {
        width: 15px;
        height: 15px;
        stroke: currentColor;
        fill: none;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
        flex: none;
      }
      .foot a:hover {
        color: var(--orange-deep);
      }
      .foot span {
        font-size: 12px;
        color: var(--ink-40);
      }
    `,
  ],
})
export class AdminLogin {
  private readonly admin = inject(AdminAuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly busy = this.admin.busy;
  protected readonly error = this.admin.error;
  protected readonly passwordVisible = signal(false);

  protected email = '';
  protected password = '';
  /** Set once, so the field can explain itself instead of just refusing input. */
  protected readonly touched = signal(false);

  protected togglePassword(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.busy()) return;
    this.touched.set(true);
    if (!this.email.trim() || !this.password) return;
    if (await this.admin.signIn(this.email, this.password)) {
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
      const safeReturnUrl = returnUrl?.startsWith('/admin/') && returnUrl !== '/admin/login'
        ? returnUrl
        : '/admin';
      await this.router.navigateByUrl(safeReturnUrl);
    }
  }
}