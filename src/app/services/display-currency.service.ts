import { Injectable, computed, signal } from '@angular/core';
import { CURRENCIES, Currency, convertFromNaira, formatMoney } from './currency';

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

  /** The ISO code picked on this device. NGN unless a visit chose otherwise. */
  private readonly code = signal<string>(DisplayCurrencyService.restore());

  /** The nine currencies the rate ticker quotes — the dropdown's options. */
  readonly currencies: Currency[] = CURRENCIES;

  /** The picked currency as an object, for formatting. */
  readonly currency = computed<Currency>(
    () => CURRENCIES.find((c) => c.code === this.code()) ?? CURRENCIES[0],
  );

  /** True outside NGN, so a page can explain the indicative conversion. */
  readonly converted = computed(() => this.currency().code !== 'NGN');

  /** Pick a currency; the choice persists to this device. */
  set(code: string): void {
    if (!CURRENCIES.some((c) => c.code === code)) return;
    this.code.set(code);
    try {
      localStorage.setItem(DisplayCurrencyService.STORAGE_KEY, code);
    } catch {
      // Storage unavailable. The pick then lasts for this visit only.
    }
  }

  /**
   * A naira price in the picked money: straight in NGN, and ≈-marked in
   * anything else, so an indicative reading never reads as a quoted figure.
   */
  price(naira: number): string {
    const currency = this.currency();
    const converted = convertFromNaira(naira, currency);
    if (converted === null) return formatMoney(naira, currency);
    return `≈ ${formatMoney(converted, currency)}`;
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