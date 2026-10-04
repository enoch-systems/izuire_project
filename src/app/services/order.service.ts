import { Injectable, computed, inject, signal } from '@angular/core';
import { CartLine } from './cart.service';
import { fromKobo, toKobo } from './money';
import { SupabaseService } from './supabase.service';
import type { Transaction, TxStatus } from './auth.service';

/** What a row is called when the order itself carries no title. */
const STATUS_TITLE: Record<TxStatus, string> = {
  pending: 'Order placed',
  successful: 'Payment received',
  failed: 'Payment failed',
  refunded: 'Refunded',
};

/** One order row as the app reads it back. Amounts stay in kobo until display. */
export interface OrderRow {
  id: string;
  number: string;
  title: string;
  items: string;
  subtotalKobo: number;
  currency: Transaction['currency'];
  status: TxStatus;
  method: string;
  reference: string;
  tracking: string;
  eta: string;
  createdAt: string;
}

/** What `placeOrder` needs to write an order from a built basket. */
export interface PlaceOrderInput {
  lines: CartLine[];
  method: string;
}

const DAY = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const TIME = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

/**
 * Orders and payment history, per signed-in user. Every read is scoped to
 * auth.uid() by Row Level Security, so two accounts never see each other's
 * orders; realtime keeps the Payments page in step. With no backend session the
 * list is empty and the Payments page falls back to its bundled demo history.
 */
@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly backend = inject(SupabaseService);
  private readonly rows = signal<OrderRow[]>([]);
  private readonly synced = signal(false);

  readonly orders = this.rows.asReadonly();
  /** Whether the rows came from a real (signed-in) backend read. */
  readonly ready = this.synced.asReadonly();

  /** The payment-history rows, in the shape the Payments page reads. */
  readonly transactions = computed<Transaction[]>(() =>
    this.rows().map((row) => ({
      id: row.number,
      date: this.stamp(row.createdAt),
      title: row.title || STATUS_TITLE[row.status],
      items: row.items,
      amount: Math.round(fromKobo(row.subtotalKobo)),
      currency: row.currency,
      status: row.status,
      method: row.method,
      reference: row.reference || undefined,
      tracking: row.tracking || undefined,
      eta: row.eta || undefined,
    })),
  );

  constructor() {
    void this.refresh();
    try {
      this.backend.supabase.auth.onAuthStateChange(() => void this.refresh());
      this.backend.supabase
        .channel('orders-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => void this.refresh())
        .subscribe();
    } catch {
      // Realtime unavailable: refresh() still covers first paint and sign-in.
    }
  }

  /** Load this user's orders. RLS scopes the query to the signed-in account. */
  async refresh(): Promise<void> {
    try {
      const { data: session } = await this.backend.supabase.auth.getSession();
      const uid = session.session?.user?.id;
      if (!uid) {
        this.rows.set([]);
        this.synced.set(false);
        return;
      }
      const { data, error } = await this.backend.supabase
        .from('orders')
        .select('id,number,title,items_summary,subtotal_kobo,currency,status,method,reference,tracking,eta,created_at')
        .order('created_at', { ascending: false });
      if (error || !data) return;
      this.rows.set((data as Record<string, unknown>[]).map((r) => this.mapRow(r)));
      this.synced.set(true);
    } catch {
      // Table unmigrated / offline: the page falls back to its bundled history.
    }
  }

  /**
   * Write a basket as an order. The order starts `pending`; `pay()` flips it to
   * `successful`. Prices go to integer kobo here so nothing is lost to a float.
   */
  async placeOrder(input: PlaceOrderInput): Promise<string> {
    const { data: session } = await this.backend.supabase.auth.getSession();
    const uid = session.session?.user?.id;
    if (!uid) throw new Error('Sign in to place an order.');
    const lines = input.lines;
    if (lines.length === 0) throw new Error('Your cart is empty.');

    const subtotalKobo = lines.reduce((sum, line) => sum + line.qty * toKobo(line.unitPrice), 0);
    const number = this.nextNumber();
    const title = lines.length === 1 ? lines[0].title : `${lines[0].title} + ${lines.length - 1} more`;
    const items = lines.map((line) => `${line.qty} x ${line.title}`).join(' - ');

    const { data, error } = await this.backend.supabase
      .from('orders')
      .insert({
        user_id: uid,
        number,
        title,
        items_summary: items,
        subtotal_kobo: subtotalKobo,
        currency: 'NGN',
        status: 'pending',
        method: input.method,
      })
      .select('id')
      .single();
    if (error || !data) throw new Error(error?.message ?? 'Could not place the order.');

    const orderId = String((data as Record<string, unknown>)['id']);
    await this.backend.supabase.from('order_lines').insert(
      lines.map((line) => ({
        order_id: orderId,
        product_id: line.id,
        title: line.title,
        qty: line.qty,
        unit_price_kobo: toKobo(line.unitPrice),
        snapshot: { unit: line.unit, image: line.image ?? null, badge: line.badge ?? null },
      })),
    );
    await this.refresh();
    return orderId;
  }

  /**
   * Mark an order paid. The seam a real gateway callback would sit behind: with
   * no live payment keys yet, checkout calls it directly and the row flips to
   * `successful` with a reference, exactly as a callback would leave it.
   */
  async pay(orderId: string, method: string): Promise<string> {
    const reference = `PSTK_${Math.random().toString(36).slice(2, 10)}`;
    const { error } = await this.backend.supabase
      .from('orders')
      .update({ status: 'successful', method, reference })
      .eq('id', orderId);
    if (error) throw new Error(error.message);
    await this.refresh();
    return reference;
  }

  private mapRow(r: Record<string, unknown>): OrderRow {
    return {
      id: String(r['id'] ?? ''),
      number: String(r['number'] ?? ''),
      title: String(r['title'] ?? ''),
      items: String(r['items_summary'] ?? ''),
      subtotalKobo: Number(r['subtotal_kobo'] ?? 0) || 0,
      currency: (r['currency'] as Transaction['currency']) ?? 'NGN',
      status: (r['status'] as TxStatus) ?? 'pending',
      method: String(r['method'] ?? ''),
      reference: String(r['reference'] ?? ''),
      tracking: String(r['tracking'] ?? ''),
      eta: String(r['eta'] ?? ''),
      createdAt: String(r['created_at'] ?? ''),
    };
  }

  private stamp(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return `${DAY.format(date)} - ${TIME.format(date)}`;
  }

  private nextNumber(): string {
    const year = new Date().getFullYear();
    const tail = Math.floor(1000 + Math.random() * 9000);
    return `IZU-${year}-${tail}`;
  }
}
