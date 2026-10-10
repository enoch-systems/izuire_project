import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminAuthService } from '../../services/admin-auth.service';

/** A count shown on the dashboard, or a dash when it could not be read. */
interface Stat {
  label: string;
  value: number | null;
  hint: string;
}

interface RegisteredUser {
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  member_tier: string;
  shipping: ProfileAddress | null;
  billing: ProfileAddress | null;
  created_at: string;
}

interface ProfileAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
}

interface AdminOrder {
  id: string;
  number: string;
  title: string;
  items_summary: string;
  subtotal_kobo: number;
  currency: string;
  status: string;
  method: string;
  created_at: string;
}

const USERS_PER_PAGE = 20;
const ORDERS_PER_PAGE = 20;

/**
 * /admin — the console landing page.
 *
 * Counts are read with `head: true` rather than by pulling whole tables down,
 * so opening the console stays cheap no matter how large the catalogue grows.
 * A count that fails to load shows as a dash rather than a zero: "0 products"
 * and "the table is not there" are very different facts, and only one of them
 * is a lie.
 */
@Component({
  selector: 'app-admin-dashboard',
  imports: [DatePipe, RouterLink],
  templateUrl: './admin-dashboard.html',
  styles: [
    `
      :host {
        display: block;
        font-family: var(--font-b);
      }
      .kicker {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-family: var(--font-d);
        font-weight: 600;
        font-size: 0.72rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--orange-deep);
        margin: 0 0 12px;
      }
      .kicker::before {
        content: '';
        width: 16px;
        height: 2px;
        background: var(--orange-deep);
        display: inline-block;
      }
      h1 {
        font-family: var(--font-d);
        font-weight: 700;
        letter-spacing: -0.01em;
        line-height: 1.08;
        font-size: 28px;
        margin: 0 0 6px;
      }
      .lede {
        margin: 0 0 28px;
        font-size: 0.86rem;
        line-height: 1.6;
        color: var(--ink-60);
        max-width: 62ch;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 14px;
        margin-bottom: 28px;
      }
      .card {
        padding: 18px;
        border: 1px solid var(--line);
        border-radius: var(--radius);
        background: var(--white);
        transition: box-shadow 0.25s var(--ease), transform 0.25s var(--ease);
      }
      .card:hover {
        box-shadow: 0 18px 36px rgba(17, 17, 17, 0.09);
        transform: translateY(-3px);
      }
      :root[data-theme='dark'] .card {
        box-shadow: none;
      }
      :root[data-theme='dark'] .card:hover {
        box-shadow: none;
        transform: translateY(-3px);
      }
      .card .n {
        font-family: var(--font-d);
        font-weight: 700;
        font-size: 30px;
        line-height: 1.1;
        margin-bottom: 4px;
      }
      .card .l {
        font-family: var(--font-d);
        font-size: 13px;
        font-weight: 600;
      }
      .card .h {
        font-size: 12px;
        color: var(--ink-40);
        margin-top: 4px;
        line-height: 1.5;
      }
      h2 {
        font-family: var(--font-d);
        font-weight: 700;
        letter-spacing: -0.01em;
        font-size: 18px;
        margin: 0 0 12px;
      }
      .registrations { margin: 28px 0; }
      .registrations-head { display: flex; align-items: baseline; gap: 10px; }
      .live { color: var(--verify); font-size: 0.72rem; font-weight: 700; }
      .users { border-top: 1px solid var(--line); }
      .user { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 7px 16px; align-items: center; padding: 15px 0; border-bottom: 1px solid var(--line); }
      .user-name { min-width: 0; font-weight: 600; overflow-wrap: anywhere; }
      .user-email,.user-detail { grid-column: 1; color: var(--ink-60); font-size: 0.84rem; overflow-wrap: anywhere; }
      .user-date { grid-column: 2; grid-row: 1; color: var(--ink-60); font-size: 0.8rem; text-align: right; font-variant-numeric: tabular-nums; }
      .user-tier { grid-column: 2; grid-row: 2; color: var(--ink-40); font-size: 0.8rem; text-align: right; }
      .user-pages { display: flex; justify-content: flex-end; align-items: center; gap: 10px; padding-top: 14px; font-size: 0.84rem; }
      .user-pages button { border: 1px solid var(--line); border-radius: 4px; background: var(--white); color: var(--ink); padding: 7px 10px; cursor: pointer; }
      .user-pages button:disabled { opacity: .45; cursor: default; }
      .users-empty { padding: 18px 0; color: var(--ink-60); font-size: 0.9rem; }
      @media (max-width: 520px) {
        .user { grid-template-columns: minmax(0, 1fr); }
        .user-email,.user-detail,.user-date,.user-tier { grid-column: 1; grid-row: auto; text-align: left; }
      }
      .links {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }
      .links a {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 10px 18px;
        font-family: var(--font-d);
        font-weight: 600;
        font-size: 0.82rem;
        letter-spacing: 0.01em;
        text-decoration: none;
        border-radius: 5px;
        border: 1.5px solid var(--ink);
        background: transparent;
        color: var(--ink);
        transition:
          transform 0.22s var(--ease),
          background 0.22s var(--ease),
          color 0.22s var(--ease);
      }
      .links a:hover {
        background: var(--ink);
        color: var(--white);
      }
      .links a.primary {
        background: var(--orange);
        color: var(--white);
        border-color: transparent;
        box-shadow: 0 1px 0 rgba(0, 0, 0, 0.08);
      }
      .links a.primary:hover {
        background: var(--orange-deep);
        transform: translateY(-1px);
      }
      .links a:focus-visible {
        outline: 2.5px solid var(--orange-deep);
        outline-offset: 2px;
      }
      .status {
        margin: 0 0 28px;
        padding: 12px 14px;
        font-size: 13px;
        line-height: 1.6;
        border-radius: 10px;
        background: rgba(180, 40, 40, 0.07);
        border: 1px solid rgba(180, 40, 40, 0.24);
        color: #8a1c1c;
      }

      :root[data-theme='dark'] .status {
        color: #ff9d9d;
        background: rgba(255, 110, 110, 0.12);
        border-color: rgba(255, 110, 110, 0.3);
      }
      .status code {
        font-size: 12px;
      }
    `,
  ],
})
export class AdminDashboard {
  /** Read by the template, which needs the signed-in admin's email. */
  protected readonly admin = inject(AdminAuthService);

  protected readonly loading = signal(true);
  protected readonly stats = signal<Stat[]>([]);
  protected readonly users = signal<RegisteredUser[]>([]);
  protected readonly orders = signal<AdminOrder[]>([]);
  protected readonly ordersLoading = signal(true);
  protected readonly ordersError = signal('');
  protected readonly usersPage = signal(0);
  protected readonly usersLoading = signal(true);
  protected readonly usersError = signal('');
  protected readonly usersPageCount = computed(() => {
    const total = this.stats().find((stat) => stat.label === 'Registered users')?.value ?? 0;
    return Math.max(1, Math.ceil(total / USERS_PER_PAGE));
  });
  /** Set when a table could not be read at all — usually not yet migrated. */
  protected readonly schemaMissing = signal(false);

  constructor() {
    this.admin.supabase
      .channel('admin-registrations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
        if (payload.eventType === 'INSERT') this.usersPage.set(0);
        void this.loadUsersPage();
        void this.refreshUserCount();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => void this.loadOrders())
      .subscribe();
    void this.load();
    void this.loadOrders();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.schemaMissing.set(false);
    const rows = await Promise.all([
      this.count('products', false),
      this.count('products', true),
      this.count('orders', false),
      this.count('reviews', false),
      this.count('profiles', false),
    ]);
    const [total, featured, orders, reviews, users] = rows;
    // Every count failing together means the schema is not there, rather than
    // the catalogue happening to be empty.
    if (rows.every((r) => r === null)) this.schemaMissing.set(true);
    this.stats.set([
      { label: 'Registered users', value: users, hint: 'Customer and admin accounts' },
      { label: 'Products', value: total, hint: 'Rows in the catalogue' },
      { label: 'Featured', value: featured, hint: 'Shown on the home rail' },
      { label: 'Orders', value: orders, hint: 'Across all customers' },
      { label: 'Reviews', value: reviews, hint: 'Ratings left by buyers' },
    ]);
    await this.loadUsersPage();
    this.loading.set(false);
  }

  private async refreshUserCount(): Promise<void> {
    const count = await this.count('profiles');
    this.stats.update((stats) => stats.map((stat) =>
      stat.label === 'Registered users' ? { ...stat, value: count } : stat,
    ));
  }

  protected previousUsersPage(): void {
    this.usersPage.update((page) => Math.max(0, page - 1));
    void this.loadUsersPage();
  }

  protected nextUsersPage(): void {
    this.usersPage.update((page) => Math.min(this.usersPageCount() - 1, page + 1));
    void this.loadUsersPage();
  }

  protected formatAddress(address: ProfileAddress | null): string {
    if (!address) return '';
    return [address.line1, address.line2, address.city, address.state, address.country, address.zip]
      .filter(Boolean)
      .join(', ');
  }

  protected formatOrderAmount(amountKobo: number, currency: string): string {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency }).format(amountKobo / 100);
  }

  private async loadOrders(): Promise<void> {
    this.ordersLoading.set(true);
    this.ordersError.set('');
    try {
      const { data, error } = await this.admin.supabase
        .from('orders')
        .select('id,number,title,items_summary,subtotal_kobo,currency,status,method,created_at')
        .order('created_at', { ascending: false })
        .limit(ORDERS_PER_PAGE);
      if (error) throw error;
      this.orders.set((data ?? []) as AdminOrder[]);
    } catch {
      this.ordersError.set('Could not load orders. Check the admin order policy and try again.');
    } finally {
      this.ordersLoading.set(false);
    }
  }

  private async loadUsersPage(): Promise<void> {
    this.usersLoading.set(true);
    this.usersError.set('');
    try {
      const { data, error } = await this.admin.supabase
        .from('profiles')
        .select('user_id,name,email,phone,company,member_tier,shipping,billing,created_at')
        .order('created_at', { ascending: false })
        .range(this.usersPage() * USERS_PER_PAGE, (this.usersPage() + 1) * USERS_PER_PAGE - 1);
      if (error) throw error;
      this.users.set((data ?? []) as RegisteredUser[]);
    } catch {
      this.usersError.set('Could not load registered users. Check the admin profile policy and try again.');
    } finally {
      this.usersLoading.set(false);
    }
  }

  /** A row count, or null when the table is unreadable. */
  private async count(table: string, where?: boolean): Promise<number | null> {
    try {
      let query = this.admin.supabase.from(table).select('*', { count: 'exact', head: true });
      if (where) query = query.eq('featured', true);
      const { count, error } = await query;
      if (error) return null;
      return count ?? 0;
    } catch {
      return null;
    }
  }
}