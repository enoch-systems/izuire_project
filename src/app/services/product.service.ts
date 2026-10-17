import { Injectable, computed, inject, isDevMode, signal } from '@angular/core';
import { Product } from '../pages/marketplace/marketplace-data';
import { SupabaseService } from './supabase.service';
import { fromKobo, toKobo } from './money';
import { PREVIEW_PRODUCTS } from './mock-catalogue';

/** One gallery view stored against a product row. */
export interface GalleryShot {
  src: string;
  width?: number;
  height?: number;
}

/** A product row from Supabase, mapped onto the catalogue Product shape. */
export interface DbProduct extends Product {
  /** Exact price in kobo (NGN minor units) — the figure that settles. */
  priceKobo: number;
  /** Extra views the product page's thumbnail strip shows. */
  gallery: GalleryShot[];
  featured: boolean;
  featuredRank: number;
  sortRank: number;
  /** True while sold out: visible in the shop with a pill, cart button disabled. */
  soldOut: boolean;
}

/** How many featured products the home page shows at most. */
export const FEATURED_LIMIT = 5;

/** Grouping that renders the naira sign rather than an "NGN" code. */
const grouped = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/**
 * Products backend. The database is the sole catalogue source; an empty or
 * unreachable database stays empty rather than presenting stale sample rows.
 */
@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly backend = inject(SupabaseService);
  private readonly rows = signal<DbProduct[] | null>(null);
  readonly previewMode = typeof window !== 'undefined' && (!isDevMode() || new URLSearchParams(window.location.search).get('previewCatalog') === '1');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  /** True once Supabase has answered with rows — i.e. the catalogue is live. */
  readonly live = computed(() => this.rows() !== null && !this.previewMode);

  /** The whole catalogue, or an empty list until Supabase returns rows. */
  readonly all = computed<Product[]>(() => this.rows() ?? []);

  /** The four-to-five on show under "Featured products" and atop the marketplace. */
  readonly featured = computed<Product[]>(() => {
    const rows = this.rows();
    if (!rows) return [];
    const picked = rows.filter((r) => r.featured).sort((a, b) => a.featuredRank - b.featuredRank);
    return picked.slice(0, FEATURED_LIMIT);
  });

  constructor() {
    if (this.previewMode) {
      this.rows.set(PREVIEW_PRODUCTS);
      this.loading.set(false);
      return;
    }
    void this.load();
    try {
      this.backend.supabase
        .channel('products-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
          void this.load();
        })
        .subscribe();
    } catch {
      // Realtime unavailable — load() already covered first paint.
    }
  }

  /** The product a route id names, or null when it is unknown. */
  byId(id: string): Product | null {
    return this.all().find((p) => p.id === id) ?? null;
  }

  /** Neighbours for "You may also like": same category first, the rest to fill. */
  related(id: string, limit = 4): Product[] {
    const current = this.byId(id);
    if (!current) return this.all().slice(0, limit);
    return this.all()
      .filter((p) => p.id !== id)
      .sort((a, b) => (b.cat === current.cat ? 1 : 0) - (a.cat === current.cat ? 1 : 0))
      .slice(0, limit);
  }

  /** The exact kobo price of a product, from the row when the catalogue is live. */
  koboOf(p: Product): number {
    const kobo = (p as Partial<DbProduct>).priceKobo;
    return typeof kobo === 'number' ? kobo : toKobo(p.unitPrice);
  }

  /** A naira reading of a product's price. */
  nairaOf(p: Product): number {
    return fromKobo(this.koboOf(p));
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const { data, error } = await this.backend.supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order('sort_rank', { ascending: true });
      if (error || !data) {
        this.error.set(error?.message ?? 'Could not load products.');
        return;
      }
      this.rows.set(
        (data as Record<string, unknown>[]).map((r) => this.mapRow(r)),
      );
    } catch {
      this.error.set('Could not reach the product catalog. Check your connection and try again.');
    } finally {
      this.loading.set(false);
    }
  }

  private mapRow(r: Record<string, unknown>): DbProduct {
    const kobo = Number(r['price_kobo'] ?? r['unit_price'] ?? 0) || 0;
    const gallery = Array.isArray(r['gallery'])
      ? r['gallery'].map((shot) => this.mapImage(shot)).filter((shot): shot is NonNullable<Product['image']> => !!shot)
      : [];
    const image = this.mapImage(r['image']);
    const videos = Array.isArray(r['videos'])
      ? r['videos']
        .map((video) => {
          if (typeof video === 'string') return { src: video };
          if (!video || typeof video !== 'object' || typeof (video as { src?: unknown }).src !== 'string') return null;
          const entry = video as { src: string; duration?: unknown };
          return { src: entry.src, duration: typeof entry.duration === 'number' ? entry.duration : undefined };
        })
        .filter((video): video is { src: string; duration?: number } => video !== null)
      : [];
    const naira = fromKobo(kobo);
    return {
      id: String(r['id'] ?? ''),
      icon: ((r['icon'] as Product['icon']) ?? 'box') as Product['icon'],
      cat: String(r['cat'] ?? 'general'),
      name: String(r['name'] ?? ''),
      title: String(r['title'] ?? ''),
      ngn: (r['ngn'] as string) || `₦${grouped.format(naira)}`,
      rmb: (r['rmb'] as string) || '',
      unit: String(r['unit'] ?? '/ unit'),
      unitPrice: naira,
      minQty: Number(r['min_qty'] ?? 1) || 1,
      image,
      videos,
      priceKobo: kobo,
      gallery,
      featured: Boolean(r['featured']),
      featuredRank: Number(r['featured_rank'] ?? 0) || 0,
      sortRank: Number(r['sort_rank'] ?? 0) || 0,
      // Rows written before the sold_out migration carry no column — read as available.
      soldOut: Boolean((r as Record<string, unknown>)['sold_out'] ?? false),
    };
  }

  private mapImage(value: unknown): Product['image'] {
    if (typeof value === 'string' && value) return { src: value, width: 720, height: 900 };
    if (!value || typeof value !== 'object' || typeof (value as { src?: unknown }).src !== 'string') return undefined;
    const image = value as { src: string; width?: unknown; height?: unknown };
    return {
      src: image.src,
      width: typeof image.width === 'number' && image.width > 0 ? image.width : 720,
      height: typeof image.height === 'number' && image.height > 0 ? image.height : 900,
    };
  }

}
