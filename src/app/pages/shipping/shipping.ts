import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Shipping page. Reproduces the original CBM calculator:
 * CBM per carton = (L/100) × (W/100) × (H/100), multiplied by the
 * number of cartons (or 1 when empty), displayed with 2 decimals.
 */
@Component({
  selector: 'app-shipping',
  imports: [RouterLink],
  templateUrl: './shipping.html',
})
export class Shipping {
  protected readonly l = signal(0);
  protected readonly w = signal(0);
  protected readonly h = signal(0);
  protected readonly qty = signal(0);

  protected readonly cbm = computed(() => {
    const cbmPerCarton = (this.l() / 100) * (this.w() / 100) * (this.h() / 100);
    return (cbmPerCarton * (this.qty() || 1)).toFixed(2);
  });

  protected onInput(which: 'l' | 'w' | 'h' | 'qty', event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value) || 0;
    if (which === 'l') this.l.set(value);
    if (which === 'w') this.w.set(value);
    if (which === 'h') this.h.set(value);
    if (which === 'qty') this.qty.set(value);
  }
}
