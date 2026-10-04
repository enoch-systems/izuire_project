import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Breadcrumb } from '../../components/breadcrumb/breadcrumb';
import { AuthService } from '../../services/auth.service';
import { SupabaseService } from '../../services/supabase.service';
import { DisplayCurrencyService } from '../../services/display-currency.service';
import { parsePriceToKobo } from '../../services/money';

/**
 * /admin — catalogue manager. Gated by AdminGuard (NG_ADMIN_EMAIL only).
 * Lists products from Supabase, edits price (kobo-safe), featured flag/rank,
 * and active state in place; realtime keeps home + marketplace in step.
 */
@Component({
  selector: 'app-admin',
  imports: [FormsModule, RouterLink, Breadcrumb],
  templateUrl: './admin.html',
})
export class Admin {
  protected readonly auth = inject(AuthService);
  private readonly backend = inject(SupabaseService);
  protected readonly fx = inject(DisplayCurrencyService);

  protected readonly rows = signal<Record<string, unknown>[]>([]);
  protected readonly loading = signal(true);
  protected readonly flash = signal('');
  protected readonly priceDrafts: Record<string, string> = {};

  constructor() {
    void this.load();
  }

  protected priceInput(row: Record<string, unknown>): string {
    const id = String(row['id']);
    return this.priceDrafts[id] ?? String(Number(row['price_kobo'] ?? 0) / 100);
  }

  protected setPriceDraft(row: Record<string, unknown>, value: string): void {
    this.priceDrafts[String(row['id'])] = value;
  }

  protected async savePrice(row: Record<string, unknown>): Promise<void> {
    const kobo = parsePriceToKobo(this.priceInput(row));
    await this.patch(String(row['id']), { price_kobo: kobo, unit_price: Math.round(kobo / 100) });
  }

  protected async toggleFeatured(row: Record<string, unknown>): Promise<void> {
    await this.patch(String(row['id']), { featured: !row['featured'] });
  }

  protected async toggleActive(row: Record<string, unknown>): Promise<void> {
    await this.patch(String(row['id']), { active: !row['active'] });
  }

  private async patch(id: string, patch: Record<string, unknown>): Promise<void> {
    try {
      const { error } = await this.backend.supabase.from('products').update(patch).eq('id', id);
      if (error) throw error;
      this.flash.set('Saved.');
      await this.load();
      setTimeout(() => this.flash.set(''), 2200);
    } catch (e) {
      this.flash.set(e instanceof Error ? e.message : 'Could not save.');
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const { data } = await this.backend.supabase
        .from('products')
        .select('id,title,price_kobo,featured,featured_rank,active,cat')
        .order('sort_rank', { ascending: true });
      this.rows.set(((data as Record<string, unknown>[]) ?? []));
    } catch {
      this.rows.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
