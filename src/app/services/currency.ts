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
 * Foreign currency display rates are derived from USD. The NGN/USD anchor is
 * fixed here at the requested indicative rate; the other cross-rates are kept
 * together below so they can be updated without changing the conversion code.
 */
export interface Currency {
  /** ISO code, e.g. 'NGN'. Shown beside the symbol so the money is unambiguous. */
  code: string;
  /** The country a reader picks it by. */
  country: string;
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
 * Prices are stored in naira. Each foreign-currency rate is calculated from its
 * USD cross-rate and the single NGN/USD anchor, keeping conversions consistent.
 */
const NAIRA_PER_USD = 1350;
const USD_PER_UNIT: Record<string, number> = {
  USD: 1,
  GBP: 1960 / 1550,
  EUR: 1690 / 1550,
  GHS: 105 / 1550,
  KES: 12 / 1550,
  ZAR: 88 / 1550,
  CNY: 1 / 7.2,
};

export const CURRENCIES: Currency[] = [
  { code: 'NGN', country: 'Nigeria', symbol: '₦', decimals: 0 },
  { code: 'USD', country: 'United States', symbol: '$', decimals: 2, nairaPerUnit: NAIRA_PER_USD * USD_PER_UNIT['USD'] },
  { code: 'GBP', country: 'United Kingdom', symbol: '£', decimals: 2, nairaPerUnit: NAIRA_PER_USD * USD_PER_UNIT['GBP'] },
  { code: 'EUR', country: 'Eurozone', symbol: '€', decimals: 2, nairaPerUnit: NAIRA_PER_USD * USD_PER_UNIT['EUR'] },
  { code: 'GHS', country: 'Ghana', symbol: 'GH₵', decimals: 0, nairaPerUnit: NAIRA_PER_USD * USD_PER_UNIT['GHS'] },
  { code: 'KES', country: 'Kenya', symbol: 'KSh', decimals: 0, nairaPerUnit: NAIRA_PER_USD * USD_PER_UNIT['KES'] },
  { code: 'ZAR', country: 'South Africa', symbol: 'R', decimals: 0, nairaPerUnit: NAIRA_PER_USD * USD_PER_UNIT['ZAR'] },
  { code: 'CNY', country: 'China', symbol: '¥', decimals: 2, nairaPerUnit: NAIRA_PER_USD * USD_PER_UNIT['CNY'] },
];

/**
 * A figure in a currency's own shape, e.g. "≈ $11.94" reads "\$11.94" here.
 *
 * Grouping is done by hand rather than through `Intl`'s currency style, which
 * some environments render as "NGN" where the naira sign belongs - the same
 * reason the cart does its own formatting. The symbol is carried on the currency
 * so both places agree on it.
 */
export function formatMoney(value: number, currency: Currency): string {
  const grouped = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: currency.decimals,
    maximumFractionDigits: currency.decimals,
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
