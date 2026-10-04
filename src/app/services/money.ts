/**
 * Kobo-safe price helpers. All money that settles is an INTEGER count of the
 * minor unit (kobo for NGN, fen for CNY, cents for USD) — never a float — so
 * an admin typing 18500.50 can never become 18500.49999 in the cart, the
 * checkout, or the transaction history.
 */
export const koboPerNaira = 100;

/** Naira → integer kobo, rounding half away from float error. */
export function toKobo(naira: number): number {
  return Math.round((Number(naira) || 0) * koboPerNaira);
}

/** Integer kobo → naira float for display/quote math only. */
export function fromKobo(kobo: number): number {
  return (Number(kobo) || 0) / koboPerNaira;
}

/** Parse an admin-typed price ("18,500.50") into integer kobo. */
export function parsePriceToKobo(input: string | number): number {
  if (typeof input === 'number') return toKobo(input);
  const cleaned = input.replace(/[^0-9.\-]/g, '');
  return toKobo(Number(cleaned) || 0);
}
