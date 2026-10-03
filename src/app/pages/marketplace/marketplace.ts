import { Component, HostListener, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Breadcrumb } from '../../components/breadcrumb/breadcrumb';
import { CATEGORIES, PRODUCTS, Product } from './marketplace-data';
import { DisplayCurrencyService } from '../../services/display-currency.service';
import { CartService } from '../../services/cart.service';
import { FlyToCartService } from '../../services/fly-to-cart.service';

/**
 * How many listings a page of the catalogue holds. Eight, rather than the five
 * this used to be: a phone screen holds two rows of two comfortably and a
 * desktop four-across holds two, so eight lands the grid near the fold on both
 * and halves the number of taps a shopper needs to reach the twelfth listing.
 */
const PAGE_SIZE = 8;

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
  imports: [RouterLink, Breadcrumb],
  templateUrl: './marketplace.html',
})
export class Marketplace {
  /** The site-wide display-currency pick. The sheet's select writes straight to
   *  it, so the choice survives leaving the page and follows the shopper to the
   *  payments page, a product page and home alike. */
  private readonly fx = inject(DisplayCurrencyService);
  protected readonly products = PRODUCTS;
  protected readonly categories = CATEGORIES;
  protected readonly currencies = this.fx.currencies;
  protected readonly pageSize = PAGE_SIZE;
  protected readonly priceBands = [
    { id: 'all', label: 'Any price', min: 0, max: Infinity },
    { id: 'under-10k', label: 'Under ₦10k', min: 0, max: 10000 },
    { id: '10k-50k', label: '₦10k–₦50k', min: 10000, max: 50000 },
    { id: '50k-200k', label: '₦50k–₦200k', min: 50000, max: 200000 },
    { id: 'over-200k', label: 'Over ₦200k', min: 200000, max: Infinity },
  ];
  /**
   * The orders the refine sheet offers, described in the one place the sheet and
   * the document title both read from. Sort was a `<select>` in the toolbar
   * before; it is a list of rows in the sheet now, which is a taller target and
   * reads without opening a native picker over the page.
   */
  protected readonly sortOrders = [
    { id: 'featured', label: 'Featured' },
    { id: 'price-low', label: 'Price: low to high' },
    { id: 'price-high', label: 'Price: high to low' },
  ];
  /** The money prices are shown in — the shared pick, naira unless a visit said
   *  otherwise. Exposed as the service's own computed, so this page and the
   *  select that sets it can never disagree. */
  protected readonly currency = this.fx.currency;
  protected readonly filter = signal('all');
  protected readonly priceFilter = signal('all');
  protected readonly sortOrder = signal('featured');
  protected readonly query = signal('');
  protected readonly page = signal(0);
  private readonly qtyDrafts = signal<Record<string, number>>({});
  protected readonly cart = inject(CartService);
  private readonly flyToCart = inject(FlyToCartService);

  /**
   * Whether the refine sheet is up.
   *
   * The sheet is held here rather than in UiService alongside the search overlay
   * and the legal modal, because it is the only one of the three that is opened
   * from inside the page it refines: nobody can reach the marketplace filters
   * from another route, so there is nothing for a shared service to share.
   */
  protected readonly sheetOpen = signal(false);

  /**
   * How much of the list is narrowed. The search is not counted — it has a field
   * of its own showing what is in it, and a count beside it would say the same
   * thing twice.
   */
  protected readonly activeCount = computed(
    () => (this.filter() === 'all' ? 0 : 1) + (this.priceFilter() === 'all' ? 0 : 1),
  );

  constructor() {
    // A sheet over a scrollable page means the page underneath keeps moving
    // under a thumb that is meant to be choosing something. Held here as an
    // effect rather than a pair of calls at each open and close, so the two can
    // never be left disagreeing — and so leaving the page with the sheet up still
    // hands the scrollbar back.
    effect(() => {
      document.body.style.overflow = this.sheetOpen() ? 'hidden' : '';
    });
  }

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
    return this.fx.price(p.unitPrice);
  }

  protected setCurrency(code: string): void {
    this.fx.set(code);
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

  /**
   * Open the refine sheet, brought to the group that was asked for.
   *
   * Both toolbar buttons open the same panel — a shopper who taps Sort and
   * finds the price bands first has to hunt for what they came for, so the
   * group is scrolled into view. The scroll is set on the sheet body directly
   * rather than with `scrollIntoView`, which would also walk the page behind
   * the sheet and leave it somewhere it was not before.
   */
  protected openSheet(group: 'cat' | 'sort'): void {
    this.sheetOpen.set(true);
    const body = document.getElementById('mkSheetBody');
    const target = document.getElementById(group === 'sort' ? 'mkSetSort' : 'mkSetCat');
    if (body && target) body.scrollTop = target.offsetTop - 8;
  }

  protected closeSheet(): void {
    this.sheetOpen.set(false);
  }

  /**
   * The backdrop, the close button and Escape all end up here. Escape is
   * handled on the document rather than the panel, because the panel is not
   * focused when the sheet opens and a keypress needs somewhere to be heard.
   */
  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.sheetOpen()) this.closeSheet();
  }

  /** A press on the dimmed area, but not a press on the sheet itself. */
  protected onSheetBackdrop(event: Event): void {
    if (event.target === event.currentTarget) this.closeSheet();
  }

  /**
   * Put every narrowing back to its default. The currency is left alone: it is a
   * reading of the same prices rather than a narrowing of the list, so someone
   * comparing in dollars and then clearing the filters should still be reading
   * dollars.
   */
  protected resetTune(): void {
    this.filter.set('all');
    this.priceFilter.set('all');
    this.sortOrder.set('featured');
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
