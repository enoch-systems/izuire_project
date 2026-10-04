import { Component, computed, effect, inject, signal } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Product } from '../marketplace/marketplace-data';
import { Breadcrumb } from '../../components/breadcrumb/breadcrumb';
import { CartService } from '../../services/cart.service';
import { DisplayCurrencyService } from '../../services/display-currency.service';
import { ProductService } from '../../services/product.service';
import { AuthService } from '../../services/auth.service';

/** A single view then the shopper can flip through in the gallery. */
interface GalleryShot {
  src: string;
  label: string;
}

/**
 * The image the listing card shows is a single Cloudinary URL. To give the
 * product page the "several shots" feel without an image pipeline yet, this
 * derives a handful of branded views from that one file — the source, a closer
 * crop, a slight rotation, a tighter product crop — by chaining Cloudinary
 * transform segments into the URL. They are real service transforms, not fake
 * files, so every thumbnail loads. Listings without a photo keep their icon.
 *
 * `src` looks like `.../upload/c_limit,w_720,q_auto:good/v<id>/<public-id>.jpg`.
 * A transform inserted before the `/v<id>` segment is applied first, so the
 * URL still resolves to the same public image.
 */
function deriveGallery(product: Product): GalleryShot[] {
  // Prefer the gallery stored against the row (products.gallery). Only a listing
  // that carries a single photo falls back to derived Cloudinary views.
  const stored = (product as { gallery?: { src: string }[] }).gallery;
  if (stored && stored.length > 0) {
    return stored.map((shot, i) => ({ src: shot.src, label: i === 0 ? 'Front' : `View ${i + 1}` }));
  }
  if (!product.image) return [];
  const base = product.image.src;
  const marker = /\/v\d+(?=\/)/;
  if (!marker.test(base)) return [{ src: base, label: 'Front' }];

  const views: [string, string][] = [
    ['', 'Front'],                       // the source as-is
    ['c_limit,w_720,q_auto:good', 'Detail'],
    ['c_crop,g_center,w_720,h_900', 'Close crop'],
    ['a_15,q_auto:good', 'Angle'],
    ['c_crop,g_faces,w_720,h_720', 'Focus'],
  ];
  return views.map(([transform, label]) => ({
    src: transform ? base.replace(marker, `/${transform.replace(/\s+/g, ',')}/v$&`) : base,
    label,
  }));
}

/**
 * Dynamic product page. A card's body or photo opens this route (see how the
 * marketplace cards are wrapped) with the product's id; the page looks the
 * product up, shows a gallery, the price and minimums, a quantity control that
 * steps in the product's MOQ (or is typed), Add to cart and Buy now, and a
 * "You may also like" rail of neighbours from the same category.
 */
@Component({
  selector: 'app-product-detail',
  imports: [TitleCasePipe, RouterLink, Breadcrumb, FormsModule],
  templateUrl: './product-detail.html',
  styles: [`
    .pd-reviews-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
    .pd-reviews-count { font-size: .82rem; color: var(--ink-60); }
    .pd-reviews-layout { display: grid; gap: 22px; }
    .pd-reviews-list { display: grid; gap: 14px; }
    .pd-review { border: 1px solid var(--line); border-radius: 14px; padding: 14px 16px; background: var(--white); }
    .pd-review-head { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
    .pd-review h3 { font-size: .95rem; margin: 4px 0 2px; }
    .pd-review p { margin: 0; color: var(--ink-60); font-size: .9rem; }
    .pd-reviews-empty { color: var(--ink-60); font-size: .9rem; }
    .pd-review-form { border: 1px solid var(--line); border-radius: 14px; padding: 16px; background: var(--paper); display: grid; gap: 10px; align-content: start; }
    .pd-review-form h3 { margin: 0; }
    .pd-review-form input, .pd-review-form textarea { width: 100%; padding: 10px 12px; border: 1px solid var(--line); border-radius: 10px; font: inherit; background: var(--white); color: inherit; }
    .pd-review-stars { display: flex; align-items: center; gap: 10px; font-size: .85rem; }
    .pd-stars--pick button { background: none; border: 0; padding: 0 1px; cursor: pointer; line-height: 0; }
    .pd-stars--pick svg { width: 22px; height: 22px; stroke: var(--ink-40); fill: none; }
    .pd-stars--pick svg.filled { fill: var(--orange); stroke: var(--orange); }
    .pd-review-error { color: #b42318; font-size: .85rem; margin: 0; }
    @media (min-width: 900px) {
      .pd-reviews-layout { grid-template-columns: 1.4fr 1fr; }
    }
  `],
})
export class ProductDetail {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly cart = inject(CartService);
  protected readonly auth = inject(AuthService);
  /** The live catalogue — the same rows home and the marketplace read. */
  private readonly catalogue = inject(ProductService);
  private readonly fx = inject(DisplayCurrencyService);
  /** The price, in the site's picked display currency. */
  protected readonly money = (value: number): string => this.fx.price(value);
  protected readonly Math = Math;

  /** The route's product id, watched so the page re-reads the catalogue. */
  private readonly routeId = signal('');
  /** The product this route renders, or null when the id is unknown. Reads the
   *  live catalogue, so a realtime price or rating edit lands without a reload. */
  protected readonly product = computed<Product | null>(() => {
    const id = this.routeId();
    return id ? this.catalogue.byId(id) : null;
  });
  /** Which gallery view is showing, by index. */
  protected readonly activeShot = signal(0);
  /** How many units the shopper is putting in the cart. */
  protected readonly qty = signal(1);

  /** The listing's reviews, live from Supabase. */
  protected readonly reviews = this.catalogue.currentReviews;
  /** The review form's own state. */
  protected readonly draftRating = signal(5);
  protected readonly draftTitle = signal('');
  protected readonly draftBody = signal('');
  protected readonly reviewError = signal('');
  protected readonly reviewBusy = signal(false);

  /** The gallery this product can show; empty for icon-only listings. */
  protected readonly gallery = computed(() => {
    const p = this.product();
    return p ? deriveGallery(p) : [];
  });

  /** The currently selected gallery shot. */
  protected readonly activeImage = computed(() => this.gallery()[this.activeShot()] ?? null);

  /** Shots other than the active one, for the thumbnail strip. */
  protected readonly thumbs = computed(() => {
    const shots = this.gallery();
    return shots.map((shot, i) => ({ shot, index: i }));
  });

  /** Neighbours for "You may also like", from the live catalogue. */
  protected readonly alsoLike = computed(() => {
    const p = this.product();
    return p ? this.catalogue.related(p.id, 4) : [];
  });

  /**
   * The star reading. Real when the row carries one (a trigger keeps
   * products.rating in step with the reviews); otherwise a stable placeholder,
   * so a listing with no reviews yet still shows a ribbon.
   */
  protected readonly rating = computed(() => {
    const p = this.product() as (Product & { ratingValue?: number; ratingCount?: number }) | null;
    if (!p) return { value: 4.7, count: 0 };
    if (typeof p.ratingValue === 'number' && p.ratingCount) {
      return { value: p.ratingValue, count: p.ratingCount };
    }
    let hash = 0;
    for (const ch of p.id) hash = (hash * 31 + ch.charCodeAt(0)) % 1000;
    return { value: 4.4 + (hash % 6) / 10, count: this.reviews().length || 12 + (hash % 14) * 3 };
  });

  constructor() {
    /* Every product lives on the same route, so Angular reuses this component
       when a "You may also like" card (or any /product/:id link) is followed —
       the constructor only ever runs once. Watching the param is what actually
       swaps the product on those in-page navigations; the initial emission
       still drives the prerendered first paint. */
    this.route.paramMap.subscribe((params) => this.load(params.get('id') ?? ''));
    // Once the live catalogue has answered, an id it does not contain is not a
    // page: bounce to the marketplace rather than render an empty shell.
    effect(() => {
      const id = this.routeId();
      if (id && this.catalogue.live() && !this.catalogue.byId(id)) {
        void this.router.navigate(['/marketplace']);
      }
    });
  }

  /** Point the page at the route's product and pull its reviews. */
  private load(id: string): void {
    this.routeId.set(id);
    this.activeShot.set(0);
    this.qty.set(1);
    if (id) void this.catalogue.loadReviews(id);
  }

  protected setShot(index: number): void {
    this.activeShot.set(index);
  }

  /** Step the quantity by the product's MOQ. */
  protected stepQty(delta: number): void {
    const p = this.product();
    if (!p) return;
    const next = Math.max(1, this.qty() + delta * p.minQty);
    this.qty.set(next);
  }

  /** Let the shopper type a number directly. */
  protected typeQty(value: string): void {
    const parsed = Math.max(1, Math.round(Number(value) || 1));
    this.qty.set(parsed);
  }

  /** Put the chosen quantity in the cart. */
  protected addToCart(): void {
    const p = this.product();
    if (!p) return;
    this.cart.addQty(p, this.qty());
  }

  /** Put the chosen quantity in the cart and move to the cart page. */
  protected buyNow(): void {
    const p = this.product();
    if (!p) return;
    this.cart.addQty(p, this.qty());
    void this.router.navigate(['/cart']);
  }

  protected openProduct(id: string): void {
    void this.router.navigate(['/product', id]);
  }

  protected setDraftRating(value: number): void {
    this.draftRating.set(value);
  }

  /** Save the review, then clear the form. The rating trigger moves the stars. */
  protected async submitReview(): Promise<void> {
    const p = this.product();
    if (!p) return;
    this.reviewError.set('');
    this.reviewBusy.set(true);
    try {
      await this.catalogue.addReview({
        productId: p.id,
        rating: this.draftRating(),
        title: this.draftTitle(),
        body: this.draftBody(),
      });
      this.draftTitle.set('');
      this.draftBody.set('');
    } catch (e) {
      this.reviewError.set(e instanceof Error ? e.message : 'Could not save your review.');
    } finally {
      this.reviewBusy.set(false);
    }
  }

  protected addRelated(product: Product): void {
    this.cart.addQty(product, product.minQty);
  }
}