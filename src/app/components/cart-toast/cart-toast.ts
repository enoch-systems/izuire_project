import { Component, inject } from '@angular/core';
import { FlyToCartService } from '../../services/fly-to-cart.service';

/**
 * The green "added to cart" confirmation, raised from the bottom right after a
 * product flies into the header cart.
 *
 * It lives at the app root rather than on the home page so an add reads the same
 * from anywhere — the cart is reachable from every page, so the confirmation
 * should not be tied to one of them. `role="status"` with `aria-live="polite"`
 * announces it to a screen reader, since the flight itself is purely visual and
 * carries no information a sighted user alone would get.
 */
@Component({
  selector: 'app-cart-toast',
  templateUrl: './cart-toast.html',
})
export class CartToast {
  protected readonly fly = inject(FlyToCartService);

  /** Clicking the toast dismisses it early rather than waiting out the timer. */
  protected dismiss(): void {
    this.fly.dismiss();
  }
}
