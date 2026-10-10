import { Injectable, computed, inject, signal } from '@angular/core';
import { CURRENCIES, Currency, convertFromNaira, formatMoney } from './currency';
import { SupabaseService } from './supabase.service';

/**
 * The money every price on the site is *shown* in.
 *
 * Naira remains what the catalogue is priced in and what settles — this service
 * only picks the reading. The choice is a single signal so the payments page,
 * settings, the marketplace's own select and every product card move together:
 * one pick, made anywhere, and the whole site re-reads its figures from it.
 *
 * The options are the same CURRENCIES the rate ticker quotes, because they come
 * from the same table — the dropdown and the strip can never disagree about
 * which monies exist or what they are worth. NGN is the default; a visit that
 * picks otherwise is remembered on the device, like the theme and the cart.
 *
 * Converted figures carry the site's `≈` — the naira price is the one a customer
 * is actually quoted, the same rule `currency.ts` states for its own conversions.
 */
@Injectable({ providedIn: 'root' })
export class DisplayCurrencyService {
  /** Where the pick is kept between visits. Bump if the shape ever changes. */
  private static readonly STORAGE_KEY = 'izuire.currency.v1';
  private static readonly ACCOUNT_STORAGE_PREFIX = 'izuire.currency.v2.';

  private readonly backend = inject(SupabaseService);
  private readonly userId = signal<string | null>(null);
  private requestId = 0;
  /** The ISO code for the current account, or the guest device. */
  private readonly code = signal<string>(DisplayCurrencyService.restore());

  /** The nine currencies the rate ticker quotes — the dropdown's options. */
  readonly currencies: Currency[] = CURRENCIES;

  /** The picked currency as an object, for formatting. */
  readonly currency = computed<Currency>(
    () => CURRENCIES.find((c) => c.code === this.code()) ?? CURRENCIES[0],
  );

  /** True outside NGN, so a page can explain the indicative conversion. */
  readonly converted = computed(() => this.currency().code !== 'NGN');

  constructor() {
    const restoreSessionCurrency = (id: string | null) => void this.restoreForUser(id);
    void this.backend.supabase.auth.getSession().then(({ data }) => {
      restoreSessionCurrency(data.session?.user.id ?? null);
    });
    this.backend.supabase.auth.onAuthStateChange((_event, session) => {
      restoreSessionCurrency(session?.user.id ?? null);
    });
  }

  /** Pick a currency; persists to device + Supabase row when signed in. */
  set(code: string): void {
    if (!CURRENCIES.some((c) => c.code === code)) return;
    this.requestId++;
    this.code.set(code);
    this.cache(code, this.userId());
    if (this.userId()) void this.persistCurrency(code, this.userId()!);
  }

  private async restoreForUser(userId: string | null): Promise<void> {
    const requestId = ++this.requestId;
    this.userId.set(userId);
    if (!userId) {
      this.code.set(DisplayCurrencyService.restore());
      return;
    }

    const cached = this.restoreAccount(userId);
    const currency = cached ?? 'NGN';
    this.code.set(currency);
    try {
      const { data } = await this.backend.supabase
        .from('user_settings')
        .select('currency')
        .eq('user_id', userId)
        .maybeSingle();
      const server = data?.['currency'] as string | undefined;
      if (requestId !== this.requestId) return;
      if (server && CURRENCIES.some((c) => c.code === server)) {
        this.code.set(server);
        this.cache(server, userId);
      } else {
        await this.persistCurrency(currency, userId);
      }
    } catch {
      // Keep this account's device cache if settings are temporarily unavailable.
    }
  }

  private async persistCurrency(code: string, userId: string): Promise<void> {
    try {
      await this.backend.supabase.from('user_settings').upsert({ user_id: userId, currency: code });
    } catch {
      // The current display preference remains active for this visit.
    }
  }

  private cache(code: string, userId: string | null): void {
    try {
      if (userId) {
        localStorage.setItem(`${DisplayCurrencyService.ACCOUNT_STORAGE_PREFIX}${userId}`, code);
      } else {
        localStorage.setItem(DisplayCurrencyService.STORAGE_KEY, code);
      }
    } catch {
      // The current display preference remains active for this visit.
    }
  }

  private restoreAccount(userId: string): string | null {
    try {
      const saved = localStorage.getItem(`${DisplayCurrencyService.ACCOUNT_STORAGE_PREFIX}${userId}`);
      return saved && CURRENCIES.some((c) => c.code === saved) ? saved : null;
    } catch {
      return null;
    }
  }

  /**
   * A naira price in the picked money: straight in NGN, and ≈-marked in
   * anything else, so an indicative reading never reads as a quoted figure.
   */
  price(naira: number): string {
    const currency = this.currency();
    // A price that is not a whole unit still prints its cents, so an admin
    // typing 18500.50 shows as 18500.50 rather than being rounded away.
    const decimals = Number.isInteger(naira) ? currency.decimals : 2;
    const converted = convertFromNaira(naira, currency);
    if (converted === null) return formatMoney(naira, currency, decimals);
    return `≈ ${formatMoney(converted, currency, decimals)}`;
  }

  /** The saved code, or NGN — on the server, in private mode, or if stale. */
  private static restore(): string {
    try {
      const saved = localStorage.getItem(DisplayCurrencyService.STORAGE_KEY);
      if (saved && CURRENCIES.some((c) => c.code === saved)) return saved;
    } catch {
      // No storage (SSR or private mode): fall through to the default.
    }
    return 'NGN';
  }
}