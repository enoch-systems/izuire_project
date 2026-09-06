import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PRODUCTS, Product } from './marketplace-data';

/**
 * Marketplace page. Reproduces the original behavior: NGN/RMB price
 * toggle, category filter chips, live list search (by product name),
 * and a "no results" message when nothing matches.
 */
@Component({
  selector: 'app-marketplace',
  imports: [RouterLink],
  templateUrl: './marketplace.html',
})
export class Marketplace {
  protected readonly products = PRODUCTS;
  protected readonly currency = signal<'ngn' | 'rmb'>('ngn');
  protected readonly filter = signal('all');
  protected readonly query = signal('');

  protected readonly noResults = computed(() => !this.products.some((p) => this.matches(p)));

  protected matches(p: Product): boolean {
    const catMatch = this.filter() === 'all' || p.cat === this.filter();
    const q = this.query().trim().toLowerCase();
    const searchMatch = q === '' || p.name.indexOf(q) !== -1;
    return catMatch && searchMatch;
  }

  protected setCurrency(currency: 'ngn' | 'rmb'): void {
    this.currency.set(currency);
  }

  protected setFilter(filter: string): void {
    this.filter.set(filter);
  }

  protected onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }
}
