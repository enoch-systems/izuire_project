/**
 * The money the marketplace will show a price in.
 *
 * There are two kinds here, and the difference is the whole point of the file.
 *
 * A currency with `nairaPerUnit` is one the naira price is *converted* into, for
 * a reader who thinks in that money. The rate is a single number in one place
 * because it is a decision rather than a computation: it moves with the market
 * and someone has to own it. These are indicative - the price a customer is
 * actually quoted is the naira one - which is why `formatMoney` is never called
 * for them without the `≈` the page puts in front of it.
 *
 * Every rate on the site lives in the single table further down this file.
 * Editing that table is the whole of the job when the rates move: the prices the
 * marketplace converts and the figures the rate ticker quotes are both read from
 * it, so the two cannot drift apart.
 */
export interface Currency {
  /** ISO code, e.g. 'NGN'. Shown beside the symbol so the money is unambiguous. */
  code: string;
  /** The country a reader picks it by. */
  country: string;
  /** ISO country code for the flag that stands beside it in the rate ticker.
   *  The euro is the one that belongs to a currency rather than a country, so it
   *  carries `eu`, the flag that stands in for it. */
  iso: string;
  /** What goes in front of the figure. */
  symbol: string;
  /** Decimal places to show. Whole units for the currencies whose small change
   *  is worth less than a naira, cents for the ones where it is not. */
  decimals: number;
  /**
   * Naira to one unit of this currency, for the converted currencies only.
   * Absent means the catalogue itself holds this currency's price.
   */
  nairaPerUnit?: number;
}

/**
 * THE RATES: one table, and the only place a rate is ever edited.
 *
 * Each line is how many units of that currency one US dollar buys, at today's
 * indicative rate. Everything that shows money works from this table, so a price
 * on the marketplace and a figure in the rate ticker can never disagree.
 *
 * Two lines carry weight:
 *
 *   NGN is the anchor. The catalogue is priced in naira, so this line is what
 *   decides what everything costs, and it is the first rate the ticker quotes.
 *
 *   USD is the base and stays at 1. Every other line is quoted against it, so
 *   changing it would change nothing.
 *
 * These are fixed indicative figures. There is no backend and no live feed
 * behind them, so they only move when someone edits this table.
 */
const UNITS_PER_USD: Record<string, number> = {
  USD: 1, // the base: leave this line alone
  NGN: 1350, // naira to the dollar, the anchor the catalogue is priced in
  CNY: 7.2, // Chinese yuan (RMB)
  GBP: 0.7908, // British pound
  EUR: 0.9172, // euro
  ZAR: 17.6136, // South African rand
  KRW: 1382, // South Korean won
  GHS: 14.7619, // Ghanaian cedi
  JPY: 156.8, // Japanese yen
};

/** Naira to one US dollar, read off the table so the anchor lives in one place
 *  only. */
const NAIRA_PER_USD = UNITS_PER_USD['NGN'];

/**
 * Units of a currency to one US dollar. The conversions below and the rate
 * ticker both ask this rather than keeping a copy of a rate of their own, which
 * is what keeps them in step when the table is edited.
 */
export function unitsPerUsd(code: string): number {
  return UNITS_PER_USD[code] ?? 1;
}

/** Naira to one unit of a currency, from its dollar rate and the anchor. */
const nairaPerUnitOf = (code: string): number => NAIRA_PER_USD / unitsPerUsd(code);

export const CURRENCIES: Currency[] = [
  { code: 'NGN', country: 'Nigeria', iso: 'ng', symbol: '₦', decimals: 0 },
  { code: 'USD', country: 'United States', iso: 'us', symbol: '$', decimals: 2, nairaPerUnit: nairaPerUnitOf('USD') },
  { code: 'GBP', country: 'United Kingdom', iso: 'gb', symbol: '£', decimals: 2, nairaPerUnit: nairaPerUnitOf('GBP') },
  { code: 'EUR', country: 'Eurozone', iso: 'eu', symbol: '€', decimals: 2, nairaPerUnit: nairaPerUnitOf('EUR') },
  { code: 'GHS', country: 'Ghana', iso: 'gh', symbol: 'GH₵', decimals: 0, nairaPerUnit: nairaPerUnitOf('GHS') },
  { code: 'ZAR', country: 'South Africa', iso: 'za', symbol: 'R', decimals: 0, nairaPerUnit: nairaPerUnitOf('ZAR') },
  { code: 'CNY', country: 'China', iso: 'cn', symbol: '¥', decimals: 2, nairaPerUnit: nairaPerUnitOf('CNY') },
  { code: 'KRW', country: 'South Korea', iso: 'kr', symbol: '₩', decimals: 0, nairaPerUnit: nairaPerUnitOf('KRW') },
  { code: 'JPY', country: 'Japan', iso: 'jp', symbol: '¥', decimals: 0, nairaPerUnit: nairaPerUnitOf('JPY') },
];

/**
 * A figure in a currency's own shape, e.g. "≈ $11.94" reads "\$11.94" here.
 *
 * Grouping is done by hand rather than through `Intl`'s currency style, which
 * some environments render as "NGN" where the naira sign belongs - the same
 * reason the cart does its own formatting. The symbol is carried on the currency
 * so both places agree on it.
 *
 * The number of decimals is the currency's own unless a caller asks for another.
 * The rate ticker asks for two on every line, including the currencies whose own
 * small change is worth less than a naira, so its column of figures reads
 * straight down.
 */
export function formatMoney(value: number, currency: Currency, decimals = currency.decimals): string {
  const grouped = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${currency.symbol}${grouped.format(value)}`;
}

/**
 * The naira price read in another currency, or null when this currency is one
 * the catalogue holds itself and there is nothing to convert.
 */
export function convertFromNaira(naira: number, currency: Currency): number | null {
  if (!currency.nairaPerUnit) return null;
  return naira / currency.nairaPerUnit;
}
