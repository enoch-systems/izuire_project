import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartLine, CartService, naira } from '../../services/cart.service';

/**
 * The cart. Quantities move in whole MOQs because these are wholesale lines —
 * see CartService. The summary deliberately stops short of taking payment: it
 * carries the basket through to the quote form, which is where Izuire confirms
 * freight, duties and final pricing.
 */
@Component({
  selector: 'app-cart',
  imports: [RouterLink],
  templateUrl: './cart.html',
})
export class Cart {
  protected readonly cart = inject(CartService);
  protected readonly money = naira;

  protected step(id: string, delta: number): void {
    this.cart.step(id, delta);
  }

  protected remove(id: string): void {
    this.cart.remove(id);
  }

  protected clear(): void {
    this.cart.clear();
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
