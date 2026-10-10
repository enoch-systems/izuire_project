import { Injectable, computed, signal } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ADMIN_EMAIL, SUPABASE_ANON_KEY, SUPABASE_URL } from '../../environments/environment';

/** Where the admin session is parked between reloads. Deliberately its own key
 *  rather than the shop's, so the two sign-ins cannot tread on each other. */
const SESSION_KEY = 'izuire.admin.session.v1';

/** An administrator at the console. */
export interface AdminSession {
  email: string;
  name: string;
  since: string;
}

/**
 * Sign-in for the admin console, kept apart from the customer AuthService.
 *
 * The shop's own auth is built for shoppers: a four-second signature ceremony,
 * a mock session that stands in when the network is down, and a profile it
 * writes to `public.profiles`. None of that belongs behind the catalogue
 * manager — a silent mock fallback there would show an admin a console they
 * are not entitled to, and the ceremony would just get in the way.
 *
 * So this keeps its own Supabase client with its own storage key. Signing in
 * here leaves any shopper session exactly as it was, and a shopper signing in
 * on the site does not quietly become signed in here.
 */
@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  /** Its own client, on its own storage key, so the two sessions stay separate. */
  private readonly client: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'izuire-admin-auth' },
  });

  /** The signed-in administrator, or null. */
  readonly session = signal<AdminSession | null>(this.restore());
  /** Whether anybody is at the console. */
  readonly signedIn = computed(() => this.session() !== null);
  /** A sign-in is in flight. */
  readonly busy = signal(false);
  /** Why the last attempt was refused, in the sign-in page's own words. */
  readonly error = signal('');

  /** The admin-side client, for reading the tables the console manages. */
  get supabase(): SupabaseClient {
    return this.client;
  }

  /**
   * Sign in, and only stay signed in for an account that is actually an admin.
   * A valid customer who guesses this page gets as far as a refusal, never as
   * far as the catalogue.
   */
  async signIn(email: string, password: string): Promise<boolean> {
    this.busy.set(true);
    this.error.set('');
    try {
      const { data, error } = await this.client.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error || !data.user) {
        this.error.set('Those details were not recognised.');
        return false;
      }
      const address = data.user.email ?? '';
      if (!(await this.isAdmin(address))) {
        // Signed in, but not one of ours — drop the session before it can be
        // mistaken for a pass.
        await this.client.auth.signOut();
        this.error.set('That account is not an administrator.');
        return false;
      }
      const session: AdminSession = {
        email: address,
        name: (data.user.user_metadata?.['name'] as string) || address.split('@')[0],
        since: new Date().toISOString(),
      };
      this.session.set(session);
      this.persist(session);
      return true;
    } catch {
      this.error.set('Could not reach the server. Check your connection and try again.');
      return false;
    } finally {
      this.busy.set(false);
    }
  }

  /** Leave the console. */
  async signOut(): Promise<void> {
    try {
      await this.client.auth.signOut();
    } catch {
      // Already gone, or offline — the local session is cleared either way.
    }
    this.session.set(null);
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      // Private browsing: nothing to clear.
    }
  }

  /**
   * The bootstrap email bundled with the app counts, and so does any row in
   * `app_admins` — which is how a second administrator is added straight in
   * Supabase, with no rebuild. RLS lets a signed-in user read that table, which
   * is what makes the lookup possible here.
   */
  private async isAdmin(email: string): Promise<boolean> {
    const clean = email.trim().toLowerCase();
    if (!clean) return false;
    if (clean === ADMIN_EMAIL.trim().toLowerCase()) return true;
    try {
      const { data } = await this.client.from('app_admins').select('email').ilike('email', clean).maybeSingle();
      return Boolean(data);
    } catch {
      return false;
    }
  }

  /** The session left behind by a previous visit, if it still parses. */
  private restore(): AdminSession | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<AdminSession>;
      if (!parsed?.email) return null;
      return { email: parsed.email, name: parsed.name || parsed.email, since: parsed.since || '' };
    } catch {
      return null;
    }
  }

  private persist(session: AdminSession): void {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      // Storage refused it — the in-memory signal still carries this visit.
    }
  }
}