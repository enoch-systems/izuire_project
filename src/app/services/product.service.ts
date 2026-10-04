import { Injectable, computed, inject, signal } from '@angular/core';
import { FEATURED, Product, PRODUCTS } from '../pages/marketplace/marketplace-data';
import { SupabaseService } from './supabase.service';
import { fromKobo, toKobo } from './money';

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
  /** Average review score, 0-5, maintained by a trigger on `reviews`. */
  ratingValue: number;
  /** How many reviews that average is over. */
  ratingCount: number;
  featured: boolean;
  featuredRank: number;
  sortRank: number;
}

/** One customer review of a product. */
export interface Review {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
  authorName: string;
}

/** How many featured products the home page shows at most. */
export const FEATURED_LIMIT = 5;

/** Grouping that renders the naira sign rather than an "NGN" code. */
const grouped = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/**
 * Products backend. Reads the public `products` table (realtime-subscribed,
 * so price/featured edits land without a reload) and falls back to the
 * bundled PRODUCTS catalogue when the table is unreachable or unmigrated —
 * the home + marketplace never render empty.
 */
@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly backend = inject(SupabaseService);
  private readonly rows = signal<DbProduct[] | null>(null);

  /** True once Supabase has answered with rows — i.e. the catalogue is live. */
  readonly live = computed(() => this.rows() !== null);

  /** The whole catalogue: Supabase rows when available, the bundled list otherwise. */
  readonly all = computed<Product[]>(() => this.rows() ?? PRODUCTS);

  /** The four-to-five on show under "Featured products" and atop the marketplace. */
  readonly featured = computed<Product[]>(() => {
    const rows = this.rows();
    if (!rows) return FEATURED;
    const picked = rows.filter((r) => r.featured).sort((a, b) => a.featuredRank - b.featuredRank);
    return (picked.length > 0 ? picked : rows).slice(0, FEATURED_LIMIT);
  });

  constructor() {
    void this.load();
    try {
      this.backend.supabase
        .channel('products-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
          void this.load();
        })
        .subscribe();
      this.backend.supabase
        .channel('reviews-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, () => {
          const id = this.activeProduct();
          if (id) void this.loadReviews(id);
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

  /** Reviews for the product the product page is currently showing. */
  readonly currentReviews = computed<Review[]>(() => {
    const id = this.activeProduct();
    return id ? (this.reviews()[id] ?? []) : [];
  });

  private readonly reviews = signal<Record<string, Review[]>>({});
  private readonly activeProduct = signal<string | null>(null);

  /** Load a product's reviews and mark it as the one realtime refreshes. */
  async loadReviews(productId: string): Promise<void> {
    this.activeProduct.set(productId);
    try {
      const { data, error } = await this.backend.supabase
        .from('reviews')
        .select('id,product_id,user_id,rating,title,body,created_at')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });
      if (error || !data) return;
      const list = (data as Record<string, unknown>[]).map((r) => this.mapReview(r));
      this.reviews.update((map) => ({ ...map, [productId]: list }));
    } catch {
      // reviews table not migrated yet — the page shows its empty state.
    }
  }

  /**
   * Add or replace this user's review. The database trigger recomputes
   * products.rating/rating_count, so the stars move everywhere at once.
   */
  async addReview(input: { productId: string; rating: number; title: string; body: string }): Promise<void> {
    const { data: session } = await this.backend.supabase.auth.getSession();
    const uid = session.session?.user?.id;
    if (!uid) throw new Error('Sign in to leave a review.');
    const { error } = await this.backend.supabase.from('reviews').upsert(
      {
        product_id: input.productId,
        user_id: uid,
        rating: Math.min(5, Math.max(1, Math.round(input.rating))),
        title: input.title.trim(),
        body: input.body.trim(),
      },
      { onConflict: 'product_id,user_id' },
    );
    if (error) throw new Error(error.message);
    await this.loadReviews(input.productId);
    await this.load();
  }

  private async load(): Promise<void> {
    try {
      const { data, error } = await this.backend.supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order('sort_rank', { ascending: true });
      if (error || !data) return;
      this.rows.set(
        (data as Record<string, unknown>[]).map((r) => this.mapRow(r)),
      );
    } catch {
      // Table unmigrated / offline — callers use the bundled catalogue.
    }
  }

  private mapRow(r: Record<string, unknown>): DbProduct {
    const kobo = Number(r['price_kobo'] ?? r['unit_price'] ?? 0) || 0;
    const gallery = Array.isArray(r['gallery']) ? (r['gallery'] as GalleryShot[]) : [];
    const image = (r['image'] as Product['image']) ?? undefined;
    const naira = fromKobo(kobo);
    return {
      id: String(r['id'] ?? ''),
      icon: ((r['icon'] as Product['icon']) ?? 'box') as Product['icon'],
      badge: (r['badge'] as Product['badge']) ?? undefined,
      cat: String(r['cat'] ?? 'general'),
      name: String(r['name'] ?? ''),
      title: String(r['title'] ?? ''),
      ngn: (r['ngn'] as string) || `₦${grouped.format(naira)}`,
      rmb: (r['rmb'] as string) || '',
      unit: String(r['unit'] ?? '/ unit'),
      specs: String(r['specs'] ?? ''),
      moq: String(r['moq'] ?? ''),
      unitPrice: naira,
      minQty: Number(r['min_qty'] ?? 1) || 1,
      image,
      priceKobo: kobo,
      gallery,
      ratingValue: Number(r['rating'] ?? 4.5) || 4.5,
      ratingCount: Number(r['rating_count'] ?? 0) || 0,
      featured: Boolean(r['featured']),
      featuredRank: Number(r['featured_rank'] ?? 0) || 0,
      sortRank: Number(r['sort_rank'] ?? 0) || 0,
    };
  }

  private mapReview(r: Record<string, unknown>): Review {
    return {
      id: String(r['id'] ?? ''),
      productId: String(r['product_id'] ?? ''),
      userId: String(r['user_id'] ?? ''),
      rating: Number(r['rating'] ?? 0) || 0,
      title: String(r['title'] ?? ''),
      body: String(r['body'] ?? ''),
      createdAt: String(r['created_at'] ?? ''),
      authorName: 'Verified buyer',
    };
  }
}
