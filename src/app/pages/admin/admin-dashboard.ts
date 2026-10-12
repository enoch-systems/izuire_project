import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
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
  member_tier: string;
  created_at: string;
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

interface ActivitySeries {
  labels: string[];
  registrations: number[];
  orders: number[];
  tiers: number[];
}

const LATEST_USERS_LIMIT = 5;
const ORDERS_PER_PAGE = 20;
let dashboardChannelSequence = 0;
const MEMBER_TIERS = ['Standard', 'Verified', 'Enterprise'] as const;

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
        font-family: var(--font-d);
        font-weight: 600;
        font-size: 0.72rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--ink-60);
        margin: 0 0 12px;
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
      .user { display: grid; grid-template-columns: 36px minmax(0, 1fr) auto auto; gap: 5px 12px; align-items: center; padding: 13px 0; border-bottom: 1px solid var(--line); }
      .user-name { min-width: 0; font-weight: 600; overflow-wrap: anywhere; }
      .user-email,.user-detail { grid-column: 2; color: var(--ink-60); font-size: 0.78rem; overflow-wrap: anywhere; }
      .user-date { grid-column: 3; grid-row: 1; color: var(--ink-60); font-size: 0.74rem; text-align: right; font-variant-numeric: tabular-nums; }
      .user-tier { grid-column: 4; grid-row: 1 / span 2; color: var(--ink-60); font-size: 0.68rem; text-align: center; }
      .users-empty { padding: 18px 0; color: var(--ink-60); font-size: 0.9rem; }
      @media (max-width: 520px) {
        .user { grid-template-columns: 36px minmax(0, 1fr); }
        .user-email,.user-detail { grid-column: 2; grid-row: auto; }
        .user-date,.user-tier { grid-column: 2; grid-row: auto; text-align: left; }
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
export class AdminDashboard implements OnDestroy {
  /** Read by the template, which needs the signed-in admin's email. */
  protected readonly admin = inject(AdminAuthService);

  protected readonly loading = signal(true);
  protected readonly stats = signal<Stat[]>([]);
  protected readonly catalogueIsEmpty = computed(() =>
    this.stats().find((stat) => stat.label === 'Products')?.value === 0,
  );
  protected readonly users = signal<RegisteredUser[]>([]);
  protected readonly orders = signal<AdminOrder[]>([]);
  protected readonly ordersLoading = signal(true);
  protected readonly ordersError = signal('');
  protected readonly chartLoading = signal(true);
  protected readonly chartError = signal('');
  protected readonly activity = signal<ActivitySeries>({ labels: [], registrations: [], orders: [], tiers: [0, 0, 0] });
  protected readonly hasActivity = computed(() =>
    this.activity().registrations.some(Boolean) || this.activity().orders.some(Boolean),
  );
  protected readonly hasTierActivity = computed(() => this.activity().tiers.some(Boolean));
  protected readonly tierTotal = computed(() => this.activity().tiers.reduce((sum, count) => sum + count, 0));
  protected readonly dailyActivity = computed(() => {
    const series = this.activity();
    const peak = Math.max(1, ...series.registrations, ...series.orders);
    return series.labels.map((label, index) => {
      const registrations = series.registrations[index] ?? 0;
      const orders = series.orders[index] ?? 0;
      return {
        label,
        registrations,
        orders,
        registrationsHeight: registrations ? Math.max(3, Math.round((registrations / peak) * 100)) : 0,
        ordersHeight: orders ? Math.max(3, Math.round((orders / peak) * 100)) : 0,
      };
    });
  });
  protected readonly tierBreakdown = computed(() => {
    const counts = this.activity().tiers;
    return MEMBER_TIERS.map((label, index) => ({ label, count: counts[index] ?? 0 }));
  });
  protected readonly welcomeName = computed(() => this.admin.session()?.name.trim().split(/\s+/)[0] || 'Admin');
  protected readonly usersLoading = signal(true);
  protected readonly usersError = signal('');
  /** Set when a table could not be read at all — usually not yet migrated. */
  protected readonly schemaMissing = signal(false);
  private realtimeChannel: ReturnType<AdminAuthService['supabase']['channel']> | null = null;

  constructor() {
    this.realtimeChannel = this.admin.supabase
      .channel(`admin-registrations-${++dashboardChannelSequence}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        void this.loadLatestUsers();
        void this.refreshUserCount();
        void this.loadActivity();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        void this.loadOrders();
        void this.loadActivity();
      })
      .subscribe();
    void this.load();
    void this.loadOrders();
    void this.loadActivity();
  }

  ngOnDestroy(): void {
    if (this.realtimeChannel) void this.admin.supabase.removeChannel(this.realtimeChannel);
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.schemaMissing.set(false);
    const rows = await Promise.all([
      this.count('products', false),
      this.count('products', true),
      this.count('orders', false),
      this.count('profiles', false),
    ]);
    const [total, featured, orders, users] = rows;
    // Every count failing together means the schema is not there, rather than
    // the catalogue happening to be empty.
    if (rows.every((r) => r === null)) this.schemaMissing.set(true);
    this.stats.set([
      { label: 'Registered users', value: users, hint: 'Customer and admin accounts' },
      { label: 'Products', value: total, hint: 'Rows in the catalogue' },
      { label: 'Featured', value: featured, hint: 'Shown on the home rail' },
      { label: 'Orders', value: orders, hint: 'Across all customers' },
    ]);
    await this.loadLatestUsers();
    this.loading.set(false);
  }

  private async refreshUserCount(): Promise<void> {
    const count = await this.count('profiles');
    this.stats.update((stats) => stats.map((stat) =>
      stat.label === 'Registered users' ? { ...stat, value: count } : stat,
    ));
  }

  protected formatOrderAmount(amountKobo: number, currency: string): string {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency }).format(amountKobo / 100);
  }

  private async loadActivity(): Promise<void> {
    this.chartLoading.set(true);
    this.chartError.set('');
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const dates = Array.from({ length: 14 }, (_, index) => {
      const date = new Date(today);
      date.setUTCDate(today.getUTCDate() - (13 - index));
      return date;
    });
    try {
      const [profilesResult, ordersResult] = await Promise.all([
        this.admin.supabase.from('profiles').select('created_at,member_tier').gte('created_at', dates[0].toISOString()).limit(5000),
        this.admin.supabase.from('orders').select('created_at').gte('created_at', dates[0].toISOString()).limit(5000),
      ]);
      if (profilesResult.error) throw profilesResult.error;
      if (ordersResult.error) throw ordersResult.error;

      const registrationsByDay = new Map<string, number>();
      const ordersByDay = new Map<string, number>();
      const registrationsByTier = new Map([['Standard', 0], ['Verified', 0], ['Enterprise', 0]]);
      for (const profile of profilesResult.data ?? []) {
        const day = new Date(profile.created_at).toISOString().slice(0, 10);
        registrationsByDay.set(day, (registrationsByDay.get(day) ?? 0) + 1);
        const tier = registrationsByTier.has(profile.member_tier) ? profile.member_tier : 'Standard';
        registrationsByTier.set(tier, (registrationsByTier.get(tier) ?? 0) + 1);
      }
      for (const order of ordersResult.data ?? []) {
        const day = new Date(order.created_at).toISOString().slice(0, 10);
        ordersByDay.set(day, (ordersByDay.get(day) ?? 0) + 1);
      }

      const formatter = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' });
      this.activity.set({
        labels: dates.map((date) => formatter.format(date)),
        registrations: dates.map((date) => registrationsByDay.get(date.toISOString().slice(0, 10)) ?? 0),
        orders: dates.map((date) => ordersByDay.get(date.toISOString().slice(0, 10)) ?? 0),
        tiers: ['Standard', 'Verified', 'Enterprise'].map((tier) => registrationsByTier.get(tier) ?? 0),
      });
    } catch {
      this.chartError.set('Activity data could not be loaded.');
    } finally {
      this.chartLoading.set(false);
    }
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

  private async loadLatestUsers(): Promise<void> {
    this.usersLoading.set(true);
    this.usersError.set('');
    try {
      const { data, error } = await this.admin.supabase
        .from('profiles')
        .select('user_id,name,email,member_tier,created_at')
        .order('created_at', { ascending: false })
        .limit(LATEST_USERS_LIMIT);
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
