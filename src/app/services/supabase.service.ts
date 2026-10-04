import { Injectable, inject } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ADMIN_EMAIL, SUPABASE_ANON_KEY, SUPABASE_URL } from '../../environments/environment';

/**
 * Single Supabase client for the whole app (anon key only — safe to bundle).
 * Auth persists to localStorage so logged-in / logged-out header states
 * survive reloads, matching the old mock session behavior.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private readonly client: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true },
  });

  readonly supabase: SupabaseClient = this.client;

  /** The one email allowed into /admin (lowercased compare). */
  isAdminEmail(email: string | null | undefined): boolean {
    if (!email) return false;
    return email.trim().toLowerCase() === ADMIN_EMAIL.trim().toLowerCase();
  }
}

export const injectSupabase = (): SupabaseClient => inject(SupabaseService).supabase;
