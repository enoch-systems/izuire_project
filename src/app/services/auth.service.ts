import { Injectable, computed, effect, signal } from '@angular/core';

/** Which screen the auth modal is on. */
export type AuthMode = 'login' | 'signup' | 'forgot';

/** A billing or shipping address on a user profile. */
export interface AddressInfo {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  country: string;
  zip?: string;
}

/** A full signed-in profile. Sign-up only asks for name + email; the rest is
 *  completed later on the profile page and patched in via updateProfile(). */
export interface AuthUser {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  shipping?: AddressInfo;
  billing?: AddressInfo;
  createdAt?: string;
  memberTier?: 'Standard' | 'Trusted' | 'Enterprise';
}

/** Status of a mock payment/order record. */
export type TxStatus = 'pending' | 'successful' | 'failed' | 'refunded';

/** A row in the Payments page — an order that has a payment attached. */
export interface Transaction {
  id: string;
  date: string;
  title: string;
  items: string;
  amount: number;
  currency: 'NGN' | 'CNY' | 'USD';
  status: TxStatus;
  method: string;
  reference?: string;
  tracking?: string;
  eta?: string;
}

/** A stage the auth loader can be in, so the overlay text changes. */
export type AuthLoadingStage =
  | 'idle'
  | 'signing-in'
  | 'creating'
  | 'resetting'
  | 'confirming-logout'
  | 'signing-out'
  | 'updating-password';

/** The one account the mock auth accepts, pre-populated with profile,
 *  billing, shipping and a list of orders split between pending + successful
 *  so the Payments page has rows for both tabs. */
const MOCK_ACCOUNT: { email: string; password: string; profile: AuthUser } = {
  email: 'user1@gmail.com',
  password: '123456',
  profile: {
    name: 'Demo User',
    email: 'user1@gmail.com',
    phone: '+234 800 000 0000',
    company: 'Demo Trading Ltd.',
    memberTier: 'Trusted',
    createdAt: '14 Mar 2026',
    shipping: {
      line1: 'Shop No. GFQ 53, Happy Baby Line',
      line2: 'Young Shall Grow Plaza, Main Market',
      city: 'Onitsha',
      state: 'Anambra',
      country: 'Nigeria',
      zip: '430211',
    },
    billing: {
      line1: '14A Allen Avenue, Ikeja',
      city: 'Lagos',
      state: 'Lagos',
      country: 'Nigeria',
      zip: '100001',
    },
  },
};

/** Seeded transaction list — split between pending and successful so both
 *  tabs on the Payments page have rows. */
const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 'IZU-2026-0921',
    date: '21 Sep 2026 · 09:12',
    title: 'Wholesale electronics order',
    items: '120× Power banks 20000mAh · 60× Fast chargers',
    amount: 485000,
    currency: 'NGN',
    status: 'successful',
    method: 'Bank transfer',
    reference: 'TRF-88127-IU',
    tracking: 'CN1234567890NG',
    eta: 'Delivered 29 Sep 2026',
  },
  {
    id: 'IZU-2026-0884',
    date: '08 Sep 2026 · 14:40',
    title: 'Sourcing deposit — Okrika bales',
    items: '12× Grade A Okrika women\'s bales',
    amount: 210000,
    currency: 'NGN',
    status: 'successful',
    method: 'Paystack',
    reference: 'PSTK_93b1a0c7',
    tracking: 'CN9876543210NG',
    eta: 'Delivered 16 Sep 2026',
  },
  {
    id: 'IZU-2026-0802',
    date: '02 Sep 2026 · 11:05',
    title: 'Human hair sample box',
    items: '10× 20" straight bundles · 2× 4x4 closures',
    amount: 68500,
    currency: 'NGN',
    status: 'successful',
    method: 'Paystack',
    reference: 'PSTK_71ffaa22',
    tracking: 'CN5551112223NG',
    eta: 'Delivered 07 Sep 2026',
  },
  {
    id: 'IZU-2026-0977',
    date: '30 Sep 2026 · 17:22',
    title: 'Solar panel bulk order — 40% deposit',
    items: '50× 550W Mono solar panels',
    amount: 320000,
    currency: 'NGN',
    status: 'pending',
    method: 'Bank transfer · awaiting balance',
    reference: 'INV-IU-0977',
    eta: 'Production — ships 12 Oct 2026',
  },
  {
    id: 'IZU-2026-0981',
    date: '01 Oct 2026 · 08:47',
    title: 'Building materials — CIF quote accepted',
    items: '20ft container · Tiles, cement mixers, plumbing',
    amount: 1240000,
    currency: 'NGN',
    status: 'pending',
    method: 'Invoice · 30% deposit pending',
    reference: 'QUO-IU-2026-2471',
    eta: 'Awaiting confirmation',
  },
  {
    id: 'IZU-2026-0965',
    date: '27 Sep 2026 · 16:03',
    title: 'Phone accessories restock',
    items: '300× Cases · 150× Screen guards · 80× Earbuds',
    amount: 182000,
    currency: 'NGN',
    status: 'pending',
    method: 'Paystack · processing',
    reference: 'PSTK_cc40028a',
    eta: 'Leaving Guangzhou 06 Oct 2026',
  },
];

/** Faux latency — long enough to show the signature loader and change the
 *  copy underneath it a couple of times so the UX feels "real". */
const LOGIN_DELAY = 4200;
const SIGNUP_DELAY = 4600;
const RESET_DELAY = 1800;
const LOGOUT_DELAY = 2800;
const PASSWORD_DELAY = 2600;

/** Where the signed-in profile is kept between visits, like the cart and the
 *  theme are. Bump if AuthUser ever changes shape. Nothing here is an account —
 *  it is the demo session, and it never leaves the device. */
const STORAGE_KEY = 'izuire.session.v1';

/**
 * Mock authentication for the user-facing part of the site. Holds one known
 * account (user1@gmail.com / 123456), a signed-in user signal, profile and
 * transactions that the Payments + Profile pages read, plus stage signals
 * for the signature loader overlays.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  /** The signed-in user, null when logged out. Restored from the last visit, so
   *  a reload (or a deep link to an account page) does not sign anyone out. */
  readonly user = signal<AuthUser | null>(this.restore());
  /** The auth modal is open as of this value. */
  readonly authOpen = signal(false);
  /** Which screen the modal is showing. */
  readonly authMode = signal<AuthMode>('login');
  /** Convenience flag the sidebar and hero use to pick a label. Derived from
   *  `user` rather than held beside it, so the two can never disagree. */
  readonly isLoggedIn = computed(() => this.user() !== null);

  /** Current stage of the auth loader overlay. "idle" = no overlay. */
  readonly loadingStage = signal<AuthLoadingStage>('idle');
  /** True once the user has clicked "Log out" and we are showing the
   *  "Are you sure?" confirmation dialog before actually signing them out. */
  readonly logoutConfirming = signal(false);
  /** Copy that cycles below the signature loader while signing in. */
  readonly loaderCopy = signal('');

  /** All seeded transactions — Profile/Payments reads from this signal. */
  readonly transactions = signal<Transaction[]>(MOCK_TRANSACTIONS);

  constructor() {
    // Keep the demo session between visits, exactly as the cart and the theme
    // are kept. Storage can be unavailable, so every write is guarded.
    effect(() => this.persist(this.user()));
  }

  openAuth(): void {
    this.authOpen.set(true);
    this.authMode.set('login');
  }

  /** Open straight onto the sign-up screen ("Get started"). */
  openSignup(): void {
    this.authOpen.set(true);
    this.authMode.set('signup');
  }

  closeAuth(): void {
    this.authOpen.set(false);
    this.loadingStage.set('idle');
  }

  show(mode: AuthMode): void {
    this.authMode.set(mode);
  }

  /** Show the "Are you sure?" dialog in whatever surface the header or modal
   *  uses for a logout trigger. */
  startLogoutConfirm(): void {
    this.logoutConfirming.set(true);
  }

  cancelLogoutConfirm(): void {
    this.logoutConfirming.set(false);
  }

  /**
   * Mock login: only the demo account works. Shows the signature loader for
   * ~4 seconds while the text underneath cycles through a few steps.
   */
  async login(email: string, password: string): Promise<void> {
    // Stage the loader first so the button submit handler can drive the
    // overlay directly out of the service without having to track its own busy.
    this.loadingStage.set('signing-in');
    this.runSigningInCopy();
    await this.wait(LOGIN_DELAY);
    if (
      email.trim().toLowerCase() === MOCK_ACCOUNT.email &&
      password === MOCK_ACCOUNT.password
    ) {
      this.setUser(MOCK_ACCOUNT.profile);
      this.loadingStage.set('idle');
      return;
    }
    this.loadingStage.set('idle');
    throw new Error('That email and password do not match a demo account.');
  }

  /** Mock sign-up: any non-empty fields create a session with the rest of the
   *  demo account's data overlaid so the Profile page has something to edit. */
  async signup(name: string, email: string, password: string): Promise<void> {
    this.loadingStage.set('creating');
    this.runCreatingCopy();
    await this.wait(SIGNUP_DELAY);
    if (!name.trim() || !email.trim() || password.length < 6) {
      this.loadingStage.set('idle');
      throw new Error('Please complete every field, with a password of 6+ characters.');
    }
    this.setUser({
      ...MOCK_ACCOUNT.profile,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      memberTier: 'Standard',
      createdAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    });
    this.loadingStage.set('idle');
  }

  /** Mock password reset: always succeeds for now. */
  async resetPassword(email: string): Promise<void> {
    this.loadingStage.set('resetting');
    this.loaderCopy.set('Sending a reset link to your inbox…');
    await this.wait(RESET_DELAY);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      this.loadingStage.set('idle');
      throw new Error('Enter a valid email address.');
    }
    this.loadingStage.set('idle');
    this.show('login');
  }

  /**
   * Commit the actual logout — plays the "Signing you out…" signature loader
   * for ~2.8s before clearing the user and session signals. callers who want
   * an "Are you sure?" step should go through startLogoutConfirm() or drive
   * logoutConfirming by hand first.
   */
  async logout(): Promise<void> {
    this.logoutConfirming.set(false);
    this.loadingStage.set('signing-out');
    this.runSigningOutCopy();
    await this.wait(LOGOUT_DELAY);
    this.user.set(null);
    this.closeAuth();
  }

  /**
   * Mock password change: checks the current password against the demo
   * account, then plays the signature loader while "re-securing" the account.
   * Nothing is persisted — there is no backend yet.
   */
  async changePassword(current: string, next: string): Promise<void> {
    this.loadingStage.set('updating-password');
    this.runPasswordCopy();
    await this.wait(PASSWORD_DELAY);
    const owner = this.user();
    if (!owner) {
      this.loadingStage.set('idle');
      throw new Error('You need to be signed in to change your password.');
    }
    const isDemo = owner.email.toLowerCase() === MOCK_ACCOUNT.email;
    if (isDemo && current !== MOCK_ACCOUNT.password) {
      this.loadingStage.set('idle');
      throw new Error('That current password does not match our records.');
    }
    if (!current) {
      this.loadingStage.set('idle');
      throw new Error('Enter your current password.');
    }
    if (next.length < 6) {
      this.loadingStage.set('idle');
      throw new Error('Your new password needs at least 6 characters.');
    }
    this.loadingStage.set('idle');
  }

  /** Patches the profile from the Profile page. No server round-trip — just
   *  applies the patch and returns the new merged user. */
  updateProfile(patch: Partial<AuthUser>): AuthUser {
    const next = { ...this.user(), ...patch } as AuthUser;
    this.user.set(next);
    return next;
  }

  private setUser(profile: AuthUser): void {
    this.user.set(profile);
    this.closeAuth();
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** Write the session out, or clear it on a sign-out. */
  private persist(user: AuthUser | null): void {
    try {
      if (user === null) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } catch {
      // Storage unavailable. The session then lasts for this visit only.
    }
  }

  /** Read the saved session back, discarding anything malformed. */
  private restore(): AuthUser | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) return null;
      const user = parsed as Partial<AuthUser>;
      return typeof user.email === 'string' && user.email ? (user as AuthUser) : null;
    } catch {
      return null;
    }
  }

  /** Shuffles "Signing you in…" copy to give the 4s loader some life. */
  private runSigningInCopy(): void {
    const lines = [
      'Signing you in…',
      'Pulling up your orders and saved quotes…',
      'Syncing payments and delivery updates…',
      'Almost there — setting up your dashboard…',
    ];
    this.stageCopy(lines, LOGIN_DELAY);
  }

  private runCreatingCopy(): void {
    const lines = [
      'Creating your Izuire account…',
      'Stamping a member tier on your profile…',
      'Wiring up your first quote inbox…',
      'One moment — opening the doors…',
    ];
    this.stageCopy(lines, SIGNUP_DELAY);
  }

  private runSigningOutCopy(): void {
    const lines = [
      'Signing you out…',
      'Clearing session tokens from this device…',
      'Saving any last-minute updates to your profile…',
    ];
    this.stageCopy(lines, LOGOUT_DELAY);
  }

  private runPasswordCopy(): void {
    const lines = [
      'Updating your password…',
      'Re-wrapping your account keys…',
      'Closing the other sessions on your account…',
    ];
    this.stageCopy(lines, PASSWORD_DELAY);
  }

  private stageCopy(lines: string[], totalMs: number): void {
    const step = Math.max(120, Math.floor(totalMs / lines.length));
    lines.forEach((line, i) => {
      setTimeout(() => this.loaderCopy.set(line), i * step);
    });
  }
}
