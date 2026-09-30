import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CATEGORIES, PRODUCTS, Product } from './marketplace-data';
import { CURRENCIES, Currency, convertFromNaira, formatMoney } from '../../services/currency';
import { CartService } from '../../services/cart.service';
import { FlyToCartService } from '../../services/fly-to-cart.service';

const PAGE_SIZE = 5;

/**
 * Marketplace page: searchable stock, price/category filters, currency display,
 * pagination and direct cart actions.
 *
 * The prices are naira prices, because naira is what the goods are sold at, and
 * every other currency is an indicative reading of that figure using the USD
 * anchor in currency.ts.
 */
@Component({
  selector: 'app-marketplace',
  imports: [RouterLink],
  templateUrl: './marketplace.html',
})
export class Marketplace {
  protected readonly products = PRODUCTS;
  protected readonly categories = CATEGORIES;
  protected readonly currencies = CURRENCIES;
  protected readonly pageSize = PAGE_SIZE;
  protected readonly priceBands = [
    { id: 'all', label: 'Any price', min: 0, max: Infinity },
    { id: 'under-10k', label: 'Under ₦10k', min: 0, max: 10000 },
    { id: '10k-50k', label: '₦10k–₦50k', min: 10000, max: 50000 },
    { id: '50k-200k', label: '₦50k–₦200k', min: 50000, max: 200000 },
    { id: 'over-200k', label: 'Over ₦200k', min: 200000, max: Infinity },
  ];
  /** The money prices are shown in. Naira, because that is the price. */
  protected readonly currency = signal<Currency>(CURRENCIES[0]);
  protected readonly filter = signal('all');
  protected readonly priceFilter = signal('all');
  protected readonly sortOrder = signal('featured');
  protected readonly query = signal('');
  protected readonly page = signal(0);
  private readonly qtyDrafts = signal<Record<string, number>>({});
  protected readonly cart = inject(CartService);
  private readonly flyToCart = inject(FlyToCartService);

  /**
   * The listings on screen. Filtering drops cards from the list rather than
   * hiding them with a style binding, so what is filtered out is genuinely not in
   * the document: it cannot be read, tabbed into, or reached by the browser's own
   * find.
   */
  protected readonly shown = computed(() => {
    const matching = this.products.filter((p) => this.matches(p));
    if (this.sortOrder() === 'price-low') return matching.sort((a, b) => a.unitPrice - b.unitPrice);
    if (this.sortOrder() === 'price-high') return matching.sort((a, b) => b.unitPrice - a.unitPrice);
    return matching;
  });
  protected readonly visible = computed(() => {
    const start = this.page() * PAGE_SIZE;
    return this.shown().slice(start, start + PAGE_SIZE);
  });
  protected readonly pageCount = computed(() => Math.ceil(this.shown().length / PAGE_SIZE));
  protected readonly pageNumbers = computed(() => Array.from({ length: this.pageCount() }, (_, index) => index));
  protected readonly noResults = computed(() => this.shown().length === 0);

  /** True outside NGN, so the page can explain the indicative conversion. */
  protected readonly converted = computed(() => this.currency().code !== 'NGN');

  /**
   * How many listings sit behind each chip, counted against the search rather
   * than against the whole catalogue: a chip that would lead to an empty page
   * says 0 before it is pressed, which is the one thing a filter row can usefully
   * warn about.
   */
  private readonly counts = computed(() => {
    const q = this.query().trim().toLowerCase();
    const counted = new Map<string, number>();
    for (const p of this.products) {
      if (q !== '' && p.name.indexOf(q) === -1) continue;
      counted.set(p.cat, (counted.get(p.cat) ?? 0) + 1);
    }
    return counted;
  });

  /** What a chip would leave. "All" is the search's own total. */
  protected count(id: string): number {
    if (id === 'all') {
      let total = 0;
      this.counts().forEach((n) => (total += n));
      return total;
    }
    return this.counts().get(id) ?? 0;
  }

  protected matches(p: Product): boolean {
    const catMatch = this.filter() === 'all' || p.cat === this.filter();
    const q = this.query().trim().toLowerCase();
    const searchMatch = q === '' || p.name.indexOf(q) !== -1;
    const band = this.priceBands.find((option) => option.id === this.priceFilter())!;
    const priceMatch = p.unitPrice >= band.min && p.unitPrice < band.max;
    return catMatch && searchMatch && priceMatch;
  }

  /**
   * The price in the chosen money, with its symbol.
   *
  * Naira comes straight from the catalogue. Foreign currencies are converted
  * from naira using the USD-based indicative rates and carry an `≈`.
   */
  protected price(p: Product): string {
    const currency = this.currency();
    if (currency.code === 'NGN') return p.ngn;
    const converted = convertFromNaira(p.unitPrice, currency);
    return converted === null ? p.ngn : `≈ ${formatMoney(converted, currency)}`;
  }

  protected setCurrency(code: string): void {
    const next = this.currencies.find((c) => c.code === code);
    if (next) this.currency.set(next);
  }

  protected setFilter(filter: string): void {
    this.filter.set(filter);
    this.page.set(0);
  }

  protected setPriceFilter(filter: string): void {
    this.priceFilter.set(filter);
    this.page.set(0);
  }

  protected setSortOrder(order: string): void {
    this.sortOrder.set(order);
    this.page.set(0);
  }

  protected onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.page.set(0);
  }

  protected clearSearch(): void {
    this.query.set('');
    this.page.set(0);
  }

  protected goToPage(index: number): void {
    this.page.set(index);
  }

  protected stepPage(delta: number): void {
    this.page.update((current) => Math.min(Math.max(current + delta, 0), this.pageCount() - 1));
  }

  protected qtyFor(id: string): number {
    return this.qtyDrafts()[id] ?? 1;
  }

  protected stepQty(id: string, delta: number): void {
    this.setQty(id, Math.max(1, this.qtyFor(id) + delta));
  }

  protected typeQty(id: string, raw: string): void {
    const parsed = Number.parseInt(raw, 10);
    this.setQty(id, Number.isFinite(parsed) ? Math.max(1, parsed) : 1);
  }

  protected addToCart(product: Product, event: Event): void {
    this.cart.addQty(product, this.qtyFor(product.id));
    const card = (event.currentTarget as HTMLElement | null)?.closest<HTMLElement>('.product-card');
    if (card) this.flyToCart.flyFrom(card, product);
  }

  private setQty(id: string, qty: number): void {
    this.qtyDrafts.update((drafts) => ({ ...drafts, [id]: qty }));
  }
}
