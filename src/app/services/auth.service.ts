import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';

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
  /** Supabase Auth user ID. */
  id?: string | null;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  /** Storage URL for the user's avatar (avatars bucket), or '' for initial. */
  avatarUrl?: string;
  shipping?: AddressInfo;
  billing?: AddressInfo;
  createdAt?: string;
  memberTier?: 'Standard' | 'Verified' | 'Enterprise';
  /** True only for the NG_ADMIN_EMAIL account. Drives /admin gating. */
  isAdmin?: boolean;
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

/** Faux latency — long enough to show the signature loader and change the
 *  copy underneath it a couple of times so the UX feels "real". */
const LOGIN_DELAY = 4200;
const SIGNUP_DELAY = 4600;
const RESET_DELAY = 1800;
const LOGOUT_DELAY = 2800;
const PASSWORD_DELAY = 2600;

/** Cached profile display; Supabase Auth remains the source of the session. */
const STORAGE_KEY = 'izuire.session.v2';

/**
 * Supabase authentication and user profile state, plus stage signals for the
 * signature loader overlays.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly backend = inject(SupabaseService);
  /** True once Supabase Auth answered — header shows logged-out until then. */
  readonly ready = signal(false);
  /** Last auth error for the modal to surface (null = no error). */
  readonly authError = signal<string | null>(null);
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

  /** Kept empty; real payment history comes from OrderService. */
  readonly transactions = signal<Transaction[]>([]);

  constructor() {
    // Cache profile display fields; Supabase Auth restores the actual session.
    effect(() => this.persist(this.user()));
    void this.bootFromSupabase();
  }

  /** First paint: adopt the Supabase session (if any) + subscribe to change. */
  private async bootFromSupabase(): Promise<void> {
    try {
      const { data } = await this.backend.supabase.auth.getSession();
      await this.adoptSession(data.session?.user ?? null);
      this.backend.supabase.auth.onAuthStateChange((_event, session) => {
        void this.adoptSession(session?.user ?? null);
      });
    } catch {
      this.user.set(null);
      this.transactions.set([]);
    } finally {
      this.ready.set(true);
    }
  }

  /** Map a Supabase user (+ profile row) onto the app's AuthUser shape. */
  private async adoptSession(
    sbUser: { id: string; email?: string | null; created_at?: string } | null,
  ): Promise<void> {
    if (!sbUser) {
      this.user.set(null);
      this.transactions.set([]);
      return;
    }
    const email = (sbUser.email ?? '').toLowerCase();
    let profile: Partial<AuthUser> = {};
    try {
      const { data } = await this.backend.supabase
        .from('profiles')
        .select('name,email,phone,company,avatar_url,member_tier,shipping,billing,created_at')
        .eq('user_id', sbUser.id)
        .maybeSingle();
      if (data) {
        profile = {
          name: (data['name'] as string) ?? '',
          email: (data['email'] as string) ?? email,
          phone: (data['phone'] as string) ?? '',
          company: (data['company'] as string) ?? '',
          avatarUrl: (data['avatar_url'] as string) ?? '',
          memberTier: (data['member_tier'] as AuthUser['memberTier']) ?? 'Standard',
          shipping: (data['shipping'] as AddressInfo) ?? undefined,
          billing: (data['billing'] as AddressInfo) ?? undefined,
        };
      }
    } catch {
      // profiles table not migrated yet — fall back to auth metadata.
    }
    const created = sbUser.created_at
      ? new Date(sbUser.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : undefined;
    this.setUser({
      id: sbUser.id,
      name: profile.name || email.split('@')[0] || 'Izuire buyer',
      email,
      phone: profile.phone,
      company: profile.company,
      avatarUrl: profile.avatarUrl,
      shipping: profile.shipping,
      billing: profile.billing,
      memberTier: profile.memberTier ?? 'Standard',
      createdAt: created,
      isAdmin: await this.resolveAdmin(email),
    });
    this.transactions.set([]);
    this.loadingStage.set('idle');
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

  /** Sign in through Supabase Auth. */
  async login(email: string, password: string): Promise<void> {
    // Stage the loader first so the button submit handler can drive the
    // overlay directly out of the service without having to track its own busy.
    this.loadingStage.set('signing-in');
    this.authError.set(null);
    this.runSigningInCopy();
    let failure = 'Those email and password details were not recognized.';
    const backendAttempt = (async (): Promise<boolean> => {
      try {
        const { data, error } = await this.backend.supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error || !data.user) {
          if (error) failure = error.message;
          return false;
        }
        await this.adoptSession({
          id: data.user.id,
          email: data.user.email,
          created_at: data.user.created_at,
        });
        return true;
      } catch {
        failure = 'Could not reach the server. Check your connection and try again.';
        return false;
      }
    })();
    await this.wait(LOGIN_DELAY);
    if (await backendAttempt) {
      this.loadingStage.set('idle');
      return;
    }
    this.loadingStage.set('idle');
    throw new Error(failure);
  }

  /** Register a Supabase Auth account and persist its profile. */
  async signup(name: string, email: string, password: string): Promise<void> {
    this.loadingStage.set('creating');
    this.authError.set(null);
    this.runCreatingCopy();
    const cleanEmail = email.trim().toLowerCase();
    let failure = 'Could not create your account. Please try again.';
    const backendAttempt = (async (): Promise<boolean> => {
      try {
        const { data, error } = await this.backend.supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { data: { name: name.trim() } },
        });
        if (error || !data.user) {
          failure = error?.message ?? failure;
          return false;
        }
        if (!data.session) {
          failure = 'Check your email to confirm your account, then sign in.';
          return false;
        }
        const { error: profileError } = await this.backend.supabase.from('profiles').upsert({
          user_id: data.user.id,
          name: name.trim(),
          email: cleanEmail,
          member_tier: 'Standard',
        });
        if (profileError) {
          failure = profileError.message;
          return false;
        }
        await this.adoptSession({
          id: data.user.id,
          email: data.user.email ?? cleanEmail,
          created_at: data.user.created_at,
        });
        // adoptSession maps '' names; prefer what was just typed.
        this.user.update((u) => (u ? { ...u, name: name.trim() } : u));
        return true;
      } catch {
        failure = 'Could not reach the server. Check your connection and try again.';
        return false;
      }
    })();
    await this.wait(SIGNUP_DELAY);
    if (await backendAttempt) {
      this.loadingStage.set('idle');
      return;
    }
    this.loadingStage.set('idle');
    throw new Error(failure);
  }

  /** Send a password reset through Supabase Auth. */
  async resetPassword(email: string): Promise<void> {
    this.loadingStage.set('resetting');
    this.loaderCopy.set('Sending a reset link to your inbox…');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      this.loadingStage.set('idle');
      throw new Error('Enter a valid email address.');
    }
    try {
      const { error } = await this.backend.supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
      if (error) throw new Error(error.message);
    } catch {
      this.loadingStage.set('idle');
      throw new Error('Could not send the reset email. Check your connection and try again.');
    }
    await this.wait(RESET_DELAY);
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
    try {
      await this.backend.supabase.auth.signOut();
    } catch {
      // Backend unreachable — local sign-out still applies below.
    }
    await this.wait(LOGOUT_DELAY);
    this.user.set(null);
    this.transactions.set([]);
    this.closeAuth();
  }

  /** Change the password of the current Supabase account. */
  async changePassword(current: string, next: string): Promise<void> {
    this.loadingStage.set('updating-password');
    this.runPasswordCopy();
    if (!current || next.length < 6) {
      this.loadingStage.set('idle');
      throw new Error(!current ? 'Enter your current password.' : 'Your new password needs at least 6 characters.');
    }
    const backendAttempt = (async (): Promise<'ok' | 'skip' | 'bad'> => {
      try {
        const { data } = await this.backend.supabase.auth.getSession();
        if (!data.session?.user?.email) return 'skip';
        const { error: signInError } = await this.backend.supabase.auth.signInWithPassword({
          email: data.session.user.email,
          password: current,
        });
        if (signInError) return 'bad';
        const { error: updateError } = await this.backend.supabase.auth.updateUser({ password: next });
        return updateError ? 'bad' : 'ok';
      } catch {
        return 'skip';
      }
    })();
    await this.wait(PASSWORD_DELAY);
    const backendResult = await backendAttempt;
    if (backendResult === 'ok') {
      this.loadingStage.set('idle');
      return;
    }
    if (backendResult === 'bad') {
      this.loadingStage.set('idle');
      throw new Error('That current password does not match our records.');
    }
    this.loadingStage.set('idle');
    if (!this.user()) throw new Error('You need to be signed in to change your password.');
    throw new Error('Could not update your password. Please sign in again and retry.');
  }

  /** Persist a profile change, then update the local display state. */
  async updateProfile(patch: Partial<AuthUser>): Promise<AuthUser> {
    const next = { ...this.user(), ...patch } as AuthUser;
    const { data } = await this.backend.supabase.auth.getSession();
    const uid = data.session?.user?.id;
    if (!uid) throw new Error('Sign in to update your profile.');
    const { error } = await this.backend.supabase.from('profiles').upsert({
      user_id: uid,
      name: next.name ?? '',
      email: (next.email ?? '').toLowerCase(),
      phone: next.phone ?? '',
      company: next.company ?? '',
      avatar_url: next.avatarUrl ?? '',
      member_tier: next.memberTier ?? 'Standard',
      shipping: next.shipping ?? {},
      billing: next.billing ?? {},
    });
    if (error) throw new Error(error.message);
    this.user.set(next);
    return next;
  }

  /**
   * Upload a user avatar into the private avatars bucket and point the
   * profile row at it. Non-admins can only write under their own uid folder
   * (see RLS); the header shows avatarUrl when set, initial otherwise.
   */
  async uploadAvatar(file: File): Promise<string> {
    const { data } = await this.backend.supabase.auth.getSession();
    const uid = data.session?.user?.id;
    if (!uid) throw new Error('You need to be signed in to upload a photo.');
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().slice(0, 4);
    const path = `${uid}/avatar.${ext}`;
    const { error: uploadError } = await this.backend.supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' });
    if (uploadError) throw new Error(uploadError.message);
    const { data: urlData } = await this.backend.supabase.storage.from('avatars').createSignedUrl(path, 31536000);
    const url = urlData?.signedUrl ?? '';
    await this.updateProfile({ avatarUrl: url });
    return url;
  }

  /**
   * Whether this email is an admin. The bootstrap email bundled with the app
   * counts, and so does any row in the `app_admins` table - so an admin can be
   * added straight in Supabase without a redeploy. RLS lets any signed-in user
   * read that table, which is what makes the lookup possible before the row is
   * ever used to unlock anything.
   */
  private async resolveAdmin(email: string): Promise<boolean> {
    if (this.backend.isAdminEmail(email)) return true;
    try {
      const { data } = await this.backend.supabase
        .from('app_admins')
        .select('email')
        .ilike('email', email)
        .maybeSingle();
      return Boolean(data);
    } catch {
      return false;
    }
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
      if (typeof user.email !== 'string' || !user.email) return null;
      // A session saved before a tier was renamed still holds the retired word —
      // "Trusted", say — and the account chip renders whatever it is given, so
      // the dead name would outlive the rename on every returning visit. A tier
      // the union still knows is kept; anything else falls back to the current
      // default, which is what a fresh sign-in writes.
      const tier = user.memberTier;
      const known = tier === 'Standard' || tier === 'Verified' || tier === 'Enterprise';
      return { ...user, memberTier: known ? tier : 'Verified' } as AuthUser;
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
      'Almost there, setting up your dashboard…',
    ];
    this.stageCopy(lines, LOGIN_DELAY);
  }

  private runCreatingCopy(): void {
    const lines = [
      'Creating your Izuire account…',
      'Stamping a member tier on your profile…',
      'Wiring up your first quote inbox…',
      'One moment, opening the doors…',
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
