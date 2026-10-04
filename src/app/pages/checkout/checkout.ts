import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AccountGate } from '../../components/account-gate/account-gate';
import { AccountNav } from '../../components/account-nav/account-nav';
import { Breadcrumb } from '../../components/breadcrumb/breadcrumb';
import { AuthService } from '../../services/auth.service';
import { CartService, naira } from '../../services/cart.service';
import { OrderService } from '../../services/order.service';

/**
 * /checkout - the step between the basket and the payment history.
 *
 * Gated by AccountGate like the rest of the signed-in side: an order is written
 * against a user_id, so there has to be a user to write it against. On "Place
 * order" it writes the order, marks it paid (see OrderService.pay for why that
 * is local for now), empties the cart and lands on the Payments page, where the
 * new row appears and updates live.
 */
@Component({
  selector: 'app-checkout',
  imports: [AccountGate, AccountNav, Breadcrumb],
  templateUrl: './checkout.html',
  styles: [`
    .co-methods { display: grid; gap: 8px; margin: 4px 0 18px; }
    .co-method {
      display: flex; flex-direction: column; gap: 2px; text-align: left;
      padding: 12px 14px; border: 1px solid var(--line); border-radius: 12px;
      background: var(--white); color: inherit; cursor: pointer;
    }
    .co-method strong { font-size: .95rem; }
    .co-method span { font-size: .76rem; color: var(--ink-60); }
    .co-method.active { border-color: var(--orange); box-shadow: inset 0 0 0 1px var(--orange); }
    .co-lines { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
    .co-line { display: flex; justify-content: space-between; gap: 12px; font-size: .9rem; }
    .co-line span { color: var(--ink-60); }
  `],
})
export class Checkout {
  protected readonly auth = inject(AuthService);
  protected readonly cart = inject(CartService);
  private readonly orders = inject(OrderService);
  private readonly router = inject(Router);
  protected readonly money = naira;

  /** The payment methods on offer. Both settle the same way for now. */
  protected readonly methods = [
    { id: 'Paystack', label: 'Card / Paystack', hint: 'Pay online now' },
    { id: 'Bank transfer', label: 'Bank transfer', hint: 'We send the account details' },
  ];
  protected readonly method = signal(this.methods[0].id);
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  protected setMethod(id: string): void {
    this.method.set(id);
  }

  /** Write the order, settle it, empty the cart, show the history. */
  protected async placeOrder(): Promise<void> {
    this.error.set('');
    if (this.cart.isEmpty()) return;
    this.busy.set(true);
    try {
      const orderId = await this.orders.placeOrder({ lines: this.cart.items(), method: this.method() });
      await this.orders.pay(orderId, this.method());
      this.cart.clear();
      await this.router.navigate(['/account/payments']);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not complete the order.');
    } finally {
      this.busy.set(false);
    }
  }
}
