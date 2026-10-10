import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';

/** The two appearances. Light is the default — the site was built on it. */
export type Theme = 'light' | 'dark';

/**
 * Where the choice is kept between visits. Bumped only if the shape changes.
 */
const STORAGE_KEY = 'izuire.theme.v1';
const ACCOUNT_STORAGE_PREFIX = 'izuire.theme.v2.';

/**
 * Light or dark, held on the root element.
 *
 * The theme is a `data-theme` attribute on <html> rather than a class on a
 * component because the variables it drives are declared in the global
 * stylesheet and inherited from the root. Every surface on the site — 40
 * `var(--white)` backgrounds among them — picks the new tokens up from that one
 * attribute, so the mode switch needs no per-component work and cannot leave a
 * panel behind in the old palette.
 *
 * The attribute is applied before first paint from an inline script in
 * index.html, reading the same key, so a returning visitor in dark mode does not
 * get a white flash while the bundle loads.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly backend = inject(SupabaseService);
  private readonly current = signal<Theme>(this.restore());
  private readonly userId = signal<string | null>(null);
  private requestId = 0;

  /** The mode now in force. */
  readonly theme = this.current.asReadonly();
  /** True when dark, for the template's boolean bindings. */
  readonly isDark = () => this.current() === 'dark';

  constructor() {
    this.apply(this.current());
    const restoreSessionTheme = (id: string | null) => void this.restoreForUser(id);
    void this.backend.supabase.auth.getSession().then(({ data }) => {
      restoreSessionTheme(data.session?.user.id ?? null);
    });
    this.backend.supabase.auth.onAuthStateChange((_event, session) => {
      restoreSessionTheme(session?.user.id ?? null);
    });
  }

  /** Switch to the other mode. */
  toggle(): void {
    this.set(this.current() === 'dark' ? 'light' : 'dark');
  }

  /** Go to a specific mode and remember it. */
  set(theme: Theme): void {
    this.requestId++;
    this.current.set(theme);
    this.apply(theme);
    this.cache(theme, this.userId());
    if (this.userId()) void this.persist(theme, this.userId()!);
  }

  /**
   * Put the attribute on <html>. `color-scheme` is set alongside it so the
   * browser draws its own scrollbars, form controls and the like for the mode
   * too, rather than leaving a white scrollbar down a dark page.
   *
   * This is also what keeps the OS out of it. Left at its default the property
   * means "follow the device", so a phone with system dark on would render its
   * native controls dark inside a light page. Writing the mode out on every
   * apply — light included — means only the toggle decides. The stylesheet says
   * the same thing, so the page is already correct if this never runs.
   */
  private apply(theme: Theme): void {
    const root = document.documentElement;
    root.dataset['theme'] = theme;
    root.style.colorScheme = theme;
  }

  private async restoreForUser(userId: string | null): Promise<void> {
    const requestId = ++this.requestId;
    this.userId.set(userId);
    if (!userId) {
      const guestTheme = this.restore();
      this.current.set(guestTheme);
      this.apply(guestTheme);
      return;
    }

    const cached = this.restoreAccount(userId);
    const theme = cached ?? 'light';
    this.current.set(theme);
    this.apply(theme);
    try {
      const { data } = await this.backend.supabase
        .from('user_settings')
        .select('theme')
        .eq('user_id', userId)
        .maybeSingle();
      if (requestId !== this.requestId) return;
      const saved = data?.['theme'];
      const resolved = saved === 'dark' || saved === 'light' ? saved : theme;
      this.current.set(resolved);
      this.apply(resolved);
      this.cache(resolved, userId);
      if (saved !== 'dark' && saved !== 'light') await this.persist(resolved, userId);
    } catch {
      // Keep this account's device cache if settings are temporarily unavailable.
    }
  }

  private async persist(theme: Theme, userId: string): Promise<void> {
    const { error } = await this.backend.supabase
      .from('user_settings')
      .upsert({ user_id: userId, theme });
    if (error) return;
  }

  private cache(theme: Theme, userId: string | null): void {
    try {
      if (userId) localStorage.setItem(`${ACCOUNT_STORAGE_PREFIX}${userId}`, theme);
      else localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // The setting still applies for this visit.
    }
  }

  private restoreAccount(userId: string): Theme | null {
    try {
      const value = localStorage.getItem(`${ACCOUNT_STORAGE_PREFIX}${userId}`);
      return value === 'dark' || value === 'light' ? value : null;
    } catch {
      return null;
    }
  }

  /** Read the saved mode, defaulting to light. Never throws. */
  private restore(): Theme {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  }
}
