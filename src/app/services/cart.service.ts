import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Product } from '../pages/marketplace/marketplace-data';
import { SupabaseService } from './supabase.service';
import { fromKobo, toKobo } from './money';

/** One line of the cart. */
export interface CartLine {
  /** Matches `Product.id`. */
  id: string;
  title: string;
  icon: Product['icon'];
  /** The product photo, snapshot with the rest of the line so the cart shows the
   *  same shot the shopper clicked. Undefined for listings without a photo. */
  image?: Product['image'];
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
const ACCOUNT_STORAGE_PREFIX = 'izuire.cart.v3.';

/** Grouping done here rather than by `Intl` currency style, which some environments
 *  render as "NGN" instead of the naira sign. */
const grouped = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
/** The same, for an amount that is not a whole naira: the cents still show. */
const groupedCents = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Format a naira amount: 18500 -> "₦18,500", 18500.5 -> "₦18,500.50". */
export function naira(value: number): string {
  return `₦${(Number.isInteger(value) ? grouped : groupedCents).format(value)}`;
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
  private readonly backend = inject(SupabaseService);
  private readonly lines = signal<CartLine[]>(this.restoreLocal(null));
  private readonly userId = signal<string | null>(null);
  private readonly switching = signal(false);
  private requestId = 0;
  private remoteWrite = Promise.resolve();

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
    effect(() => {
      const lines = this.lines();
      const userId = this.userId();
      if (this.switching()) return;
      this.persistLocal(lines, userId);
      if (userId) this.queueRemoteSave(userId, lines);
    });
    const restoreSessionCart = (id: string | null) => void this.restoreForUser(id);
    void this.backend.supabase.auth.getSession().then(({ data }) => {
      restoreSessionCart(data.session?.user.id ?? null);
    });
    this.backend.supabase.auth.onAuthStateChange((_event, session) => {
      restoreSessionCart(session?.user.id ?? null);
    });
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

  private persistLocal(lines: CartLine[], userId: string | null): void {
    const key = userId ? `${ACCOUNT_STORAGE_PREFIX}${userId}` : STORAGE_KEY;
    try {
      if (lines.length === 0) {
        localStorage.removeItem(key);
        return;
      }
      localStorage.setItem(key, JSON.stringify(lines));
    } catch {
      // Storage is unavailable or full. The cart still works for this session.
    }
  }

  private async restoreForUser(userId: string | null): Promise<void> {
    const requestId = ++this.requestId;
    this.switching.set(true);
    this.userId.set(userId);
    if (!userId) {
      this.lines.set(this.restoreLocal(null));
      this.switching.set(false);
      return;
    }

    let restored: CartLine[] | null = null;
    try {
      const { data, error } = await this.backend.supabase
        .from('cart_lines')
        .select('product_id,qty,unit_price_kobo,snapshot')
        .eq('user_id', userId);
      if (!error && data) {
        restored = data.map((row) => {
          const snapshot = (row['snapshot'] ?? {}) as Partial<CartLine>;
          return {
            id: String(row['product_id']),
            title: String(snapshot.title ?? row['product_id']),
            icon: snapshot.icon ?? 'box',
            image: snapshot.image,
            unitPrice: fromKobo(Number(row['unit_price_kobo'] ?? 0)),
            unit: snapshot.unit ?? '/ unit',
            minQty: Number(snapshot.minQty ?? 1) || 1,
            qty: Number(row['qty'] ?? 1) || 1,
          };
        });
      }
    } catch {
      // Keep this user's local cache if the backend is temporarily unavailable.
    }
    if (requestId !== this.requestId) return;
    const lines = restored ?? this.restoreLocal(userId);
    this.lines.set(lines);
    this.switching.set(false);
    if (restored === null) this.queueRemoteSave(userId, lines);
  }

  private queueRemoteSave(userId: string, lines: CartLine[]): void {
    const snapshot = lines.map((line) => ({ ...line }));
    this.remoteWrite = this.remoteWrite
      .catch(() => undefined)
      .then(async () => {
        const { data: existing, error: selectError } = await this.backend.supabase
          .from('cart_lines')
          .select('product_id')
          .eq('user_id', userId);
        if (selectError || !existing) return;
        const keep = new Set(snapshot.map((line) => line.id));
        const stale = existing.map((row) => String(row['product_id'])).filter((id) => !keep.has(id));
        if (stale.length) {
          await this.backend.supabase
            .from('cart_lines')
            .delete()
            .eq('user_id', userId)
            .in('product_id', stale);
        }
        if (!snapshot.length) return;
        await this.backend.supabase.from('cart_lines').upsert(
          snapshot.map((line) => ({
            user_id: userId,
            product_id: line.id,
            qty: line.qty,
            unit_price_kobo: toKobo(line.unitPrice),
            snapshot: {
              title: line.title,
              icon: line.icon,
              image: line.image ?? null,
              unit: line.unit,
              minQty: line.minQty,
            },
          })),
          { onConflict: 'user_id,product_id' },
        );
      });
  }

  /** Read saved cart lines, discarding malformed data rather than throwing. */
  private restoreLocal(userId: string | null): CartLine[] {
    const key = userId ? `${ACCOUNT_STORAGE_PREFIX}${userId}` : STORAGE_KEY;
    try {
      const raw = localStorage.getItem(key);
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
