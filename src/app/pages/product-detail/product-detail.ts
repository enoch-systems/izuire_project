import { Component, computed, inject, signal } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Product, PRODUCTS } from '../marketplace/marketplace-data';
import { CartService, naira } from '../../services/cart.service';

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
  imports: [TitleCasePipe, RouterLink],
  templateUrl: './product-detail.html',
})
export class ProductDetail {
  private readonly router = inject(Router);
  protected readonly cart = inject(CartService);
  protected readonly money = naira;
  protected readonly Math = Math;

  /** The product this route renders, or null when the id is unknown. */
  protected readonly product = signal<Product | null>(null);
  /** Which gallery view is showing, by index. */
  protected readonly activeShot = signal(0);
  /** How many units the shopper is putting in the cart. */
  protected readonly qty = signal(1);

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

  /** Neighbours from the same category, the current listing excluded. */
  protected readonly alsoLike = computed(() => {
    const p = this.product();
    if (!p) return [];
    return PRODUCTS.filter((candidate) => candidate.id !== p.id)
      .sort((a, b) => (b.cat === p.cat ? 1 : 0) - (a.cat === p.cat ? 1 : 0))
      .slice(0, 4);
  });

  /** A deterministic rating so the stars read as a real review ribbon feels. */
  protected readonly rating = computed(() => {
    const p = this.product();
    if (!p) return { value: 4.7, count: 0 };
    // Hash the id to a stable 4.4–4.9 range.
    let hash = 0;
    for (const ch of p.id) hash = (hash * 31 + ch.charCodeAt(0)) % 1000;
    return { value: 4.4 + (hash % 6) / 10, count: 12 + (hash % 14) * 3 };
  });

  constructor() {
    this.load(this.router.url);
  }

  /** Look the product up from the route's final segment. */
  private load(url: string): void {
    const id = url.split('/').pop() ?? '';
    const found = PRODUCTS.find((p) => p.id === id) ?? null;
    this.product.set(found);
    this.activeShot.set(0);
    this.qty.set(found ? Math.min(found.minQty, 1) : 1);
    if (!found) {
      // Unknown id: send straight back to the marketplace rather than a dead page.
      void this.router.navigate(['/marketplace']);
    }
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

  protected addRelated(product: Product): void {
    this.cart.addQty(product, product.minQty);
  }
}