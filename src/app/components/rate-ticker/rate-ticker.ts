import { Component, inject } from '@angular/core';
import { CURRENCIES, formatMoney, unitsPerUsd } from '../../services/currency';
import { DisplayCurrencyService } from '../../services/display-currency.service';

/** One entry of the strip: which money, and what one dollar buys of it. */
interface TickerRate {
  code: string;
  country: string;
  /** Two-letter code for the flag in public/flags. */
  iso: string;
  /** The rate already dressed in its own symbol, e.g. "₦1,350.00". */
  figure: string;
}

/**
 * The rate strip that rides under the header.
 *
 * It is an indicative display, not a feed. The figures come from the one rate
 * table in services/currency.ts, which is the same table the marketplace
 * converts its prices with, so a price and a ticker entry can never show
 * different numbers for the same money. Nothing is fetched and there is no
 * backend behind it: editing that table is what moves these figures.
 *
 * The travel is done by printing the whole set of rates twice and sliding the
 * track exactly half its own width. At the end of the run the second set is
 * standing where the first one started, so the jump back to the beginning is
 * invisible and the loop has no seam to see.
 *
 * The flags are the real flags, kept in public/flags so no request leaves the
 * site for them. They come from the flag-icons set, which is MIT licensed, and
 * each one keeps its own proportions rather than being stretched into a box.
 */
@Component({
  selector: 'app-rate-ticker',
  templateUrl: './rate-ticker.html',
})
export class RateTicker {
  /** The set is printed twice so the loop has somewhere to travel to. */
  protected readonly copies = [0, 1];

  /** The site's display currency: its chip is marked in the strip, so the rate
   *  behind the prices a reader is looking for is the one to find in the travel. */
  private readonly fx = inject(DisplayCurrencyService);
  protected readonly active = this.fx.currency;

  /** The date the figures are stated for, shown as the strip's first chip. */
  protected readonly today = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  /**
   * Every currency in the shared table, to two decimals on every line so the
   * figures line up, and in the table's own order, which leads with the naira the
   * catalogue is priced in.
   */
  protected readonly rates: TickerRate[] = CURRENCIES.map((currency) => ({
    code: currency.code,
    country: currency.country,
    iso: currency.iso,
    figure: formatMoney(unitsPerUsd(currency.code), currency, 2),
  }));

  protected flagSrc(iso: string): string {
    return `/flags/${iso}.svg`;
  }
}