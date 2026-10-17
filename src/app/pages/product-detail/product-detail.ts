import { Component, computed, effect, inject, signal } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Product } from '../marketplace/marketplace-data';
import { Breadcrumb } from '../../components/breadcrumb/breadcrumb';
import { CartService } from '../../services/cart.service';
import { DisplayCurrencyService } from '../../services/display-currency.service';
import { ProductService } from '../../services/product.service';

/** A single view then the shopper can flip through in the gallery. */
interface GalleryShot {
  src: string;
  label: string;
  kind: 'image' | 'video';
}

/** Build the gallery from the actual image and video assets saved on the row. */
function deriveGallery(product: Product): GalleryShot[] {
  const stored = (product as Product & { gallery?: { src: string }[] }).gallery ?? [];
  const images = [product.image, ...stored]
    .filter((shot): shot is NonNullable<typeof shot> => !!shot?.src)
    .filter((shot, index, all) => all.findIndex((item) => item.src === shot.src) === index)
    .map((shot, index) => ({ src: shot.src, label: index === 0 ? 'Cover' : `Photo ${index + 1}`, kind: 'image' as const }));
  const videos = (product.videos ?? []).map((video, index) => ({
    src: video.src,
    label: `Video ${index + 1}`,
    kind: 'video' as const,
  }));
  return [...images, ...videos];
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
  imports: [TitleCasePipe, RouterLink, Breadcrumb],
  templateUrl: './product-detail.html',
  styles: [`
  `],
})
export class ProductDetail {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly cart = inject(CartService);
  /** The live catalogue — the same rows home and the marketplace read. */
  private readonly catalogue = inject(ProductService);
  protected readonly previewMode = this.catalogue.previewMode;
  private readonly fx = inject(DisplayCurrencyService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  /** The price, in the site's picked display currency. */
  protected readonly money = (value: number): string => this.fx.price(value);

  /** The route's product id, watched so the page re-reads the catalogue. */
  private readonly routeId = signal('');
  /** The product this route renders, or null when the id is unknown. Reads the
  *  live catalogue, so a realtime price edit lands without a reload. */
  protected readonly product = computed<Product | null>(() => {
    const id = this.routeId();
    return id ? this.catalogue.byId(id) : null;
  });
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

  /** Neighbours for "You may also like", from the live catalogue. */
  protected readonly alsoLike = computed(() => {
    const p = this.product();
    return p ? this.catalogue.related(p.id, 9) : [];
  });

  constructor() {
    /* Every product lives on the same route, so Angular reuses this component
       when a "You may also like" card (or any /product/:id link) is followed —
       the constructor only ever runs once. Watching the param is what actually
       swaps the product on those in-page navigations; the initial emission
       still drives the prerendered first paint. */
    this.route.paramMap.subscribe((params) => this.load(params.get('id') ?? ''));
    effect(() => {
      const product = this.product();
      if (!product) {
        if (this.catalogue.live()) {
          this.title.setTitle('Product Not Found | Izuire Marketplace');
          this.meta.updateTag({ name: 'description', content: 'This product is no longer available in the Izuire marketplace.' });
        }
        return;
      }
      const name = (product.title || product.name).trim();
      this.title.setTitle(`${name} | Features, Details and Online Ordering | Izuire`);
      this.meta.updateTag({
        name: 'description',
        content: `View pricing, photos, minimum order quantity and ordering details for ${name} at Izuire.`,
      });
    });
    // Once the live catalogue has answered, an id it does not contain is not a
    // page: bounce to the marketplace rather than render an empty shell.
    effect(() => {
      const id = this.routeId();
      if (id && this.catalogue.live() && !this.catalogue.byId(id)) {
        void this.router.navigate(['/marketplace']);
      }
    });
  }

  /** Point the page at the route's product. */
  private load(id: string): void {
    this.routeId.set(id);
    this.activeShot.set(0);
    this.qty.set(1);
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
    if (!p || p.soldOut) return;
    this.cart.addQty(p, this.qty());
  }

  /** Put the chosen quantity in the cart and move to the cart page. */
  protected buyNow(): void {
    const p = this.product();
    if (!p || p.soldOut) return;
    this.cart.addQty(p, this.qty());
    void this.router.navigate(['/cart']);
  }

  protected openProduct(id: string): void {
    void this.router.navigate(['/product', id]);
  }

  protected scrollAlsoLike(track: HTMLElement, direction: -1 | 1): void {
    track.scrollBy({ left: direction * track.clientWidth, behavior: 'smooth' });
  }

  protected addRelated(product: Product): void {
    this.cart.addQty(product, product.minQty);
  }
}
