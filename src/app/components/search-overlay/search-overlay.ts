import {
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { UiService } from '../../services/ui.service';
import { SEARCH_ITEMS } from '../../services/search-items';
import { DisplayCurrencyService } from '../../services/display-currency.service';
import { CATEGORIES, Product } from '../../pages/marketplace/marketplace-data';
import { ProductService } from '../../services/product.service';

/** One slice of a string, so a matched run can be wrapped in <mark>. */
interface TextPart {
  text: string;
  hit: boolean;
}

/** A row in the results list, whichever kind it is. */
interface Hit {
  /** Stable track key, unique across products and pages. */
  key: string;
  group: string;
  title: string;
  titleParts: TextPart[];
  desc: string;
  descParts: TextPart[];
  route: string[];
  fragment?: string;
  /** Where this row sits in the flattened list, for arrow-key selection. */
  index: number;
  icon?: Product['icon'];
  image?: Product['image'];
  soldOut?: boolean;
  price?: string;
  meta?: string;
}

/** Product categories by label, for the meta line on a result. */
const CAT_LABELS = new Map(CATEGORIES.map((c) => [c.id, c.label]));

/** The searches the catalogue answers best, offered as chips. */
const POPULAR = [
  'okrika bales',
  'solar panels',
  'phone screens',
  'human hair',
  'PVC ceiling panels',
  'air freight',
];

/** Suggested replacements when a search finds nothing. */
const FALLBACKS = ['hair', 'solar', 'bales', 'panels', 'shipping', 'MOQ'];
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'buy', 'find', 'for', 'from', 'i', 'in', 'looking', 'me',
  'my', 'need', 'of', 'please', 'product', 'products', 'some', 'source', 'the',
  'to', 'want', 'with', 'wholesale', 'bulk', 'shop',
]);

/**
 * Search panel, rebuilt around the catalogue.
 *
 * It reads the same 24-entry site index the original did, but it also reads the
 * marketplace itself: products come first in the results, with their photo,
 * price and MOQ, because those are the things a wholesale buyer is hunting.
 * With nothing typed the panel is not empty — it shows recommended listings,
 * popular searches and the quickest ways into the site, so it is useful the
 * moment it opens rather than only after a query.
 *
 * Matching is remembered per row as segments (`titleParts`), so the run the
 * query actually hit can be marked without re-scanning in the template.
 */
@Component({
  selector: 'app-search-overlay',
  imports: [RouterLink],
  templateUrl: './search-overlay.html',
  host: {
    '(document:keydown)': 'onKeydown($event)',
  },
})
export class SearchOverlay {
  private readonly ui = inject(UiService);
  private readonly router = inject(Router);
  private readonly fx = inject(DisplayCurrencyService);
  /** The same live catalogue the marketplace and home read. */
  private readonly catalogue = inject(ProductService);

  protected readonly open = this.ui.searchOpen;
  protected readonly query = signal('');
  /** Rows offered while the field is empty. */
  protected readonly recommended = computed(() => this.buildRecommended());
  protected readonly popular = POPULAR;
  protected readonly fallbacks = FALLBACKS;

  /** A recommended listing's price, in the site's picked display currency. */
  protected price(p: Product): string {
    return this.fx.price(p.unitPrice);
  }

  /** Quick doors out of the panel, before a query. */
  protected readonly quickLinks = [
    { title: 'Marketplace', desc: 'Browse every listing in stock', route: ['/marketplace'], fragment: undefined as string | undefined },
    { title: 'Sourcing', desc: 'Have something found and vetted', route: ['/sourcing'], fragment: undefined as string | undefined },
    { title: 'Shipping', desc: 'Air and sea freight, CBM explained', route: ['/shipping'], fragment: undefined as string | undefined },
    { title: 'Business Solutions', desc: 'Bulk and corporate procurement', route: ['/business-solutions'], fragment: undefined as string | undefined },
  ];

  /** Every hit for the current query: catalogue rows first, then site pages. */
  private readonly flat = computed<Hit[]>(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return [];

    const terms = q.split(/[^a-z0-9]+/).filter((term) => term.length > 1 && !STOP_WORDS.has(term));
    const products: Hit[] = this.catalogue.all()
      .map((product) => {
        const haystack = `${product.title} ${product.name} ${CAT_LABELS.get(product.cat) ?? product.cat} ${product.unit}`.toLowerCase();
        const matchedTerms = terms.filter((term) => haystack.includes(term));
        const score = matchedTerms.length + (haystack.includes(q) ? 2 : 0);
        return { product, score };
      })
      .filter((match) => match.score > 0)
      .sort((first, second) => second.score - first.score)
      .slice(0, 8)
      .map(({ product }) => product)
      .map((p) => ({
        key: 'p-' + p.id,
        group: 'Products',
        title: p.title,
        titleParts: this.segments(p.title, q),
        desc: `${CAT_LABELS.get(p.cat) ?? p.cat} · ${p.unit}`,
        descParts: this.segments(`${CAT_LABELS.get(p.cat) ?? p.cat} · ${p.unit}`, q),
        route: ['/product', p.id],
        index: 0,
        icon: p.icon,
        image: p.image,
        soldOut: p.soldOut,
        price: this.fx.price(p.unitPrice),
        meta: CAT_LABELS.get(p.cat) ?? p.cat,
      }));

    const pages: Hit[] = SEARCH_ITEMS.map((item) => {
      const haystack = `${item.title} ${item.desc} ${item.cat}`.toLowerCase();
      const matchedTerms = terms.filter((term) => haystack.includes(term));
      return { item, score: matchedTerms.length + (haystack.includes(q) ? 2 : 0) };
    }).filter((match) => match.score > 0)
      .sort((first, second) => second.score - first.score)
      .map(({ item: i }) => ({
      key: 'i-' + i.title,
      group: i.cat,
      title: i.title,
      titleParts: this.segments(i.title, q),
      desc: i.desc,
      descParts: this.segments(i.desc, q),
      route: [i.route],
      fragment: i.fragment,
      index: 0,
      }));

    return [...products, ...pages].map((hit, index) => ({ ...hit, index }));
  });

  /** The same rows, grouped so each block can carry a heading. */
  protected readonly groups = computed(() => {
    const out: { label: string; hits: Hit[] }[] = [];
    for (const hit of this.flat()) {
      const last = out[out.length - 1];
      if (last && last.label === hit.group) last.hits.push(hit);
      else out.push({ label: hit.group, hits: [hit] });
    }
    return out;
  });

  /** The row the arrow keys are on. */
  protected readonly active = signal(0);

  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  constructor() {
    effect(() => {
      if (!this.open()) return;
      // Open with whatever the field that launched the panel held, so the
      // words are never asked for twice.
      this.query.set(this.ui.searchSeed());
      this.active.set(0);
      setTimeout(() => this.searchInput()?.nativeElement.focus(), 50);
    });
    // A new query starts the selection over.
    effect(() => {
      this.query();
      this.active.set(0);
    });
  }

  protected onInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  /** Run one of the suggestion chips, as if it had been typed. */
  protected useChip(term: string): void {
    this.query.set(term);
    this.searchInput()?.nativeElement.focus();
  }

  protected clear(): void {
    this.query.set('');
    this.searchInput()?.nativeElement.focus();
  }

  protected close(): void {
    this.ui.closeSearch();
  }

  protected onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close();
  }

  /** Follow the row the keyboard is on. */
  private openActive(): void {
    const hit = this.flat()[this.active()];
    if (!hit) return;
    void this.router.navigate(hit.route, { fragment: hit.fragment });
    this.close();
  }

  protected onKeydown(event: KeyboardEvent): void {
    const tag = (event.target as HTMLElement | null)?.tagName;
    if (event.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
      event.preventDefault();
      this.ui.openSearch();
      return;
    }
    if (!this.open()) return;

    if (event.key === 'Escape') {
      this.close();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.step(1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.step(-1);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      this.openActive();
    }
  }

  private step(delta: number): void {
    const count = this.flat().length;
    if (count === 0) return;
    this.active.update((current) => (current + delta + count) % count);
  }

  /** Split `text` around the query so the matched run can be marked up. */
  private segments(text: string, q: string): TextPart[] {
    if (!q) return [{ text, hit: false }];
    const at = text.toLowerCase().indexOf(q);
    if (at < 0) return [{ text, hit: false }];
    const parts: TextPart[] = [];
    if (at > 0) parts.push({ text: text.slice(0, at), hit: false });
    parts.push({ text: text.slice(at, at + q.length), hit: true });
    const rest = text.slice(at + q.length);
    if (rest) parts.push({ text: rest, hit: false });
    return parts;
  }

  /** The featured set first, then a couple more lines to fill the rail. */
  private buildRecommended(): Product[] {
    const featured = this.catalogue.featured();
    const extras = this.catalogue
      .all()
      .filter((p) => !featured.some((f) => f.id === p.id))
      .slice(0, 2);
    return [...featured, ...extras];
  }
}
