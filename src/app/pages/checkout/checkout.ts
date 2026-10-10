import { Component, inject, signal } from '@angular/core';
import { AccountGate } from '../../components/account-gate/account-gate';
import { AccountNav } from '../../components/account-nav/account-nav';
import { Breadcrumb } from '../../components/breadcrumb/breadcrumb';
import { AuthService } from '../../services/auth.service';
import { CartService, naira } from '../../services/cart.service';
import { OrderService } from '../../services/order.service';

/**
 * /checkout - saves a trusted order, then hands the customer to WhatsApp.
 *
 * Gated by AccountGate like the rest of the signed-in side: an order is written
 * against a user_id. The database validates availability and current prices;
 * WhatsApp opens only after the pending order has been saved.
 */
@Component({
  selector: 'app-checkout',
  imports: [AccountGate, AccountNav, Breadcrumb],
  templateUrl: './checkout.html',
  styles: [`
    .co-lines { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
    .co-line { display: flex; justify-content: space-between; gap: 12px; font-size: .9rem; }
    .co-line span { color: var(--ink-60); }
  `],
})
export class Checkout {
  protected readonly auth = inject(AuthService);
  protected readonly cart = inject(CartService);
  private readonly orders = inject(OrderService);
  protected readonly money = naira;
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  /** Save a pending order, then send its canonical details to the business. */
  protected async placeOrder(): Promise<void> {
    this.error.set('');
    if (this.cart.isEmpty()) return;
    this.busy.set(true);
    try {
      const cartLines = this.cart.items();
      const order = await this.orders.placeOrder({
        lines: this.cart.items().map(({ id, qty }) => ({ id, qty })),
      });
      const user = this.auth.user();
      const lines = order.lines.length
        ? order.lines.map((line) => `- ${line.qty} x ${line.title}`).join('\n')
        : cartLines.map((line) => `- ${line.qty} x ${line.title}`).join('\n');
      const message = [
        'Hello Izuire, I would like to confirm this order.',
        `Order: ${order.number}`,
        user?.name ? `Name: ${user.name}` : '',
        user?.email ? `Email: ${user.email}` : '',
        user?.phone ? `Phone: ${user.phone}` : '',
        'Items:',
        lines,
        `Goods subtotal: ${this.money(order.subtotalKobo / 100)} (freight quoted separately)`,
      ].filter(Boolean).join('\n');
      this.cart.clear();
      globalThis.location.assign(`https://wa.me/2349162919586?text=${encodeURIComponent(message)}`);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not complete the order.');
    } finally {
      this.busy.set(false);
    }
  }
}
