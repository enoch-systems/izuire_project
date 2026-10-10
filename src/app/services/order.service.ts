import { Injectable, computed, inject, signal } from '@angular/core';
import { CartLine } from './cart.service';
import { fromKobo } from './money';
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
  lines: Pick<CartLine, 'id' | 'qty'>[];
}

export interface PlacedOrder {
  id: string;
  number: string;
  subtotalKobo: number;
  lines: { title: string; qty: number; unitPriceKobo: number }[];
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
      // Keep the last successful result if the backend is temporarily unavailable.
    }
  }

  /** The database validates current product prices and writes atomically. */
  async placeOrder(input: PlaceOrderInput): Promise<PlacedOrder> {
    if (input.lines.length === 0) throw new Error('Your cart is empty.');
    const { data, error } = await this.backend.supabase.rpc('place_whatsapp_order', {
      p_lines: input.lines.map((line) => ({ id: line.id, qty: line.qty })),
    });
    if (error || !data) throw new Error(error?.message ?? 'Could not place the order.');
    const result = (Array.isArray(data) ? data[0] : data) as {
      order_id?: string;
      order_number?: string;
      subtotal_kobo?: number;
    } | null;
    if (!result?.order_id || !result.order_number) throw new Error('The order was not confirmed by the database.');
    const { data: lines } = await this.backend.supabase
      .from('order_lines')
      .select('title,qty,unit_price_kobo')
      .eq('order_id', result.order_id);
    await this.refresh();
    return {
      id: result.order_id,
      number: result.order_number,
      subtotalKobo: Number(result.subtotal_kobo ?? 0),
      lines: (lines ?? []).map((line) => ({
        title: String(line['title'] ?? ''),
        qty: Number(line['qty'] ?? 0),
        unitPriceKobo: Number(line['unit_price_kobo'] ?? 0),
      })),
    };
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
}
