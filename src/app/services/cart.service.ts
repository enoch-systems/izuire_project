import { Injectable, computed, effect, signal } from '@angular/core';
import { Product } from '../pages/marketplace/marketplace-data';

/** One line of the cart. */
export interface CartLine {
  /** Matches `Product.id`. */
  id: string;
  title: string;
  icon: Product['icon'];
  /** The product photo, snapshot with the rest of the line so the cart shows the
   *  same shot the shopper clicked. Undefined for listings without a photo. */
  image?: Product['image'];
  verified: boolean;
  /** Naira per unit, snapshotted from the product at the moment it was added. */
  unitPrice: number;
  /** e.g. `/ unit`. Carries its own leading slash. */
  unit: string;
  /** Smallest quantity this line may hold. */
  minQty: number;
  qty: number;
}

/** Where the cart is kept between visits. Bump if `CartLine` ever changes shape. */
const STORAGE_KEY = 'izuire.cart.v2';

/** Grouping done here rather than by `Intl` currency style, which some environments
 *  render as "NGN" instead of the naira sign. */
const grouped = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/** Format a naira amount for display, e.g. 18500 -> "₦18,500". */
export function naira(value: number): string {
  return `₦${grouped.format(value)}`;
}

/**
 * The shopping cart.
 *
 * These are wholesale lines rather than retail ones, so quantities are clamped to
 * each product's MOQ and the stepper moves in MOQ-sized jumps — you cannot half a
 * pallet. A line is a snapshot of the product rather than a reference to it, so
 * later edits to the catalogue never silently reprice a basket someone already
 * built.
 *
 * State is persisted to localStorage so the cart survives a reload. Storage can be
 * unavailable (private browsing, blocked cookies), so every access is guarded: the
 * cart then simply lives for the session rather than the app failing to start.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly lines = signal<CartLine[]>(this.restore());

  /** The lines, newest last. */
  readonly items = this.lines.asReadonly();
  /** Total units across all lines — what the header badge shows. */
  readonly count = computed(() => this.lines().reduce((total, line) => total + line.qty, 0));
  readonly subtotal = computed(() => this.lines().reduce((total, line) => total + line.qty * line.unitPrice, 0));
  readonly isEmpty = computed(() => this.lines().length === 0);
  /** Whether a given product is already in the cart, for the card's button state. */
  readonly has = (id: string): boolean => this.lines().some((line) => line.id === id);

  /** The product added most recently, so a card can confirm its own click. */
  private readonly justAdded = signal<string | null>(null);
  readonly addedId = this.justAdded.asReadonly();

  private clearAddedTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    effect(() => this.persist(this.lines()));
  }

  /** Put a product in the cart at its MOQ. */
  add(product: Product): void {
    this.addQty(product, product.minQty);
  }

  /**
   * Put `qty` units of a product in the cart, or top up the line if it is
   * already there.
   *
   * `floor` is the smallest order this call will accept. It defaults to 1
   * because a shopper picking a number on a card means that number — silently
   * raising it to the MOQ would put something in the basket they did not ask
   * for. The cart page passes its own MOQ, where the wholesale rules do apply.
   */
  addQty(product: Product, qty: number, floor = 1): void {
    const amount = Math.max(floor, Math.round(qty));
    this.lines.update((lines) => {
      const existing = lines.find((line) => line.id === product.id);
      if (existing) {
        return lines.map((line) =>
          line.id === product.id ? { ...line, qty: line.qty + amount } : line,
        );
      }
      return [
        ...lines,
        {
          id: product.id,
          title: product.title,
          image: product.image,
          icon: product.icon,
          verified: product.verified,
          unitPrice: product.unitPrice,
          unit: product.unit,
          minQty: product.minQty,
          qty: amount,
        },
      ];
    });
    this.confirm(product.id);
  }

  /**
   * Set a line's quantity outright, never below a single unit.
   *
   * The floor is one rather than the product's MOQ because a card can add a
   * single unit — see `addQty`. A line below its MOQ is a line the shopper
   * deliberately built, so raising it here would silently change their order.
   */
  setQty(id: string, qty: number): void {
    this.lines.update((lines) =>
      lines.map((line) => (line.id === id ? { ...line, qty: Math.max(1, Math.round(qty)) } : line)),
    );
  }

  /**
   * Move a line up or down, removing it if it drops out.
   *
   * A line sitting at or above its MOQ moves in whole MOQs, which is how
   * wholesale ordering works. A line below it — the single unit a card added —
   * moves by one, so pressing minus takes 1 to nothing rather than jumping
   * straight past the minimum.
   */
  step(id: string, delta: number): void {
    const line = this.lines().find((entry) => entry.id === id);
    if (!line) return;
    const byMOQ = line.qty >= line.minQty;
    const next = byMOQ ? line.qty + delta * line.minQty : line.qty + delta;
    if (next < 1) {
      this.remove(id);
      return;
    }
    this.setQty(id, next);
  }

  remove(id: string): void {
    this.lines.update((lines) => lines.filter((line) => line.id !== id));
  }

  clear(): void {
    this.lines.set([]);
  }

  /** Lock or release the page's background scroll for a cart-level modal. */
  lockBodyScroll(locked: boolean): void {
    document.body.style.overflow = locked ? 'hidden' : '';
  }

  /** Flash `addedId` so the card that was clicked can confirm it, then let it go. */
  private confirm(id: string): void {
    this.justAdded.set(id);
    clearTimeout(this.clearAddedTimer);
    this.clearAddedTimer = setTimeout(() => this.justAdded.set(null), 1800);
  }

  private persist(lines: CartLine[]): void {
    try {
      if (lines.length === 0) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // Storage is unavailable or full. The cart still works for this session.
    }
  }

  /** Read the saved cart, discarding anything malformed rather than throwing. */
  private restore(): CartLine[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];

      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      return parsed.filter((line): line is CartLine => {
        if (typeof line !== 'object' || line === null) return false;
        const candidate = line as Partial<CartLine>;
        return (
          typeof candidate.id === 'string' &&
          typeof candidate.title === 'string' &&
          typeof candidate.unitPrice === 'number' &&
          Number.isFinite(candidate.unitPrice) &&
          typeof candidate.qty === 'number' &&
          Number.isFinite(candidate.qty)
        );
      });
    } catch {
      return [];
    }
  }
}
