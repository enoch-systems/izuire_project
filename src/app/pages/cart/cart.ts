import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CartLine, CartService, naira } from '../../services/cart.service';

/**
 * The cart. A modern checkout-style basket: each line shows the product photo,
 * a quantity stepper that moves in whole MOQs, the unit and extended prices,
 * and a per-line remove. Clearing the whole basket asks for confirmation first —
 * it is a destructive action, and wiping every line on a stray tap would be a
 * bad look — so "Empty cart" opens a small modal that states how many units are
 * at stake before anything is removed.
 *
 * The summary deliberately stops short of taking payment: its "Proceed to
 * checkout" button is wired to the quote flow for now, and the payment APIs get
 * connected later.
 */
@Component({
  selector: 'app-cart',
  imports: [RouterLink],
  templateUrl: './cart.html',
})
export class Cart {
  protected readonly cart = inject(CartService);
  protected readonly money = naira;
  private readonly router = inject(Router);

  /** Whether the "are you sure?" clear-confirmation modal is up. */
  protected readonly confirmingClear = signal(false);

  protected step(id: string, delta: number): void {
    this.cart.step(id, delta);
  }

  /** Let the shopper type a quantity directly, never below one unit. */
  protected typeQty(line: CartLine, value: string): void {
    const parsed = Math.max(1, Math.round(Number(value) || 1));
    this.cart.setQty(line.id, parsed);
  }

  protected remove(id: string): void {
    this.cart.remove(id);
  }

  protected openClear(): void {
    this.confirmingClear.set(true);
    this.cart.lockBodyScroll(true);
  }

  protected cancelClear(): void {
    this.confirmingClear.set(false);
    this.cart.lockBodyScroll(false);
  }

  protected confirmClear(): void {
    this.cart.clear();
    this.confirmingClear.set(false);
    this.cart.lockBodyScroll(false);
  }

  protected closeOnBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.cancelClear();
  }

  /**
   * The next step after a basket is built. Payment APIs aren't wired yet, so for
   * now this carries the basket to the quote flow — where freight, duties and
   * final pricing get confirmed — exactly as the previous CTA did.
   */
  protected onCheckout(): void {
    void this.router.navigate(['/quote']);
  }

  /** Extended price for one line. */
  protected lineTotal(line: CartLine): string {
    return naira(line.qty * line.unitPrice);
  }

  /**
   * A readable quantity step, e.g. "20 units" or "1 bale".
   *
   * A line below its MOQ — the single unit a card added — steps in ones, so it
   * says so rather than advertising a minimum the order is already under.
   */
  protected stepLabel(line: CartLine): string {
    const noun = line.unit.replace(/^\/\s*/, '').replace(/s$/, '') || 'unit';
    if (line.minQty === 1) return line.unit.replace(/^\/\s*/, '');
    return line.qty < line.minQty ? '1 unit' : `${line.minQty} ${noun}s`;
  }
}