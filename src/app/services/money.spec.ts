import { fromKobo, parsePriceToKobo, toKobo } from './money';

describe('money helpers', () => {
  it('converts between naira and integer kobo', () => {
    expect(toKobo(18500.5)).toBe(1850050);
    expect(fromKobo(1850050)).toBe(18500.5);
  });

  it('parses formatted prices into kobo', () => {
    expect(parsePriceToKobo('₦18,500.50')).toBe(1850050);
  });

  it('rounds floating-point values to the nearest kobo', () => {
    expect(toKobo(0.29)).toBe(29);
  });
});