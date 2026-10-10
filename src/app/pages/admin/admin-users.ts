import { DatePipe } from '@angular/common';
import { Component, HostListener, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AdminAuthService } from '../../services/admin-auth.service';

interface UserAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
}

interface AdminUser {
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  member_tier: string;
  shipping: UserAddress | null;
  billing: UserAddress | null;
  created_at: string;
}

const PAGE_SIZE = 20;

@Component({
  selector: 'app-admin-users',
  imports: [DatePipe],
  templateUrl: './admin-users.html',
  styles: [`
    :host{display:block;font-family:var(--font-b)}
    .backbtn{display:flex;align-items:center;gap:8px;width:max-content;margin:0 0 14px;padding:8px 12px 8px 9px;border:1px solid var(--line);border-radius:999px;background:var(--white);color:var(--ink);font-family:var(--font-d);font-weight:600;cursor:pointer}
    .backbtn svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
    .kicker{font-family:var(--font-d);font-size:.7rem;font-weight:600;text-transform:uppercase;color:var(--orange-deep)}
    h1{margin:8px 0 6px;font-family:var(--font-d);font-size:28px;line-height:1.1}
    .lede{margin:0 0 22px;color:var(--ink-60);font-size:.9rem}
    .toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:14px}
    .toolbar input{width:min(360px,100%);height:42px;padding:0 12px;border:1px solid var(--line);border-radius:6px;background:var(--white);color:var(--ink);font:inherit}
    .total{color:var(--ink-60);font-size:.82rem;white-space:nowrap}
    .rows{border-top:1px solid var(--line)}
    .row{display:grid;grid-template-columns:minmax(0,1fr) minmax(180px,.8fr) auto;align-items:center;gap:16px;padding:15px 4px;border-bottom:1px solid var(--line)}
    .identity{min-width:0}.identity strong,.identity span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .identity strong{font-family:var(--font-d);font-size:.92rem}.identity span,.date{color:var(--ink-60);font-size:.8rem}
    .view{padding:8px 13px;border:1px solid var(--ink);border-radius:5px;background:transparent;color:var(--ink);font-family:var(--font-d);font-weight:600;cursor:pointer}
    .view:hover{background:var(--ink);color:var(--white)}
    .empty{padding:26px 0;color:var(--ink-60)}
    .pager{display:flex;align-items:center;justify-content:flex-end;gap:12px;padding-top:16px;font-size:.82rem}
    .pager button{padding:7px 10px;border:1px solid var(--line);border-radius:5px;background:var(--white);color:var(--ink);cursor:pointer}
    .pager button:disabled{opacity:.45;cursor:default}
    .scrim{position:fixed;inset:0;z-index:100;background:rgba(10,15,18,.34);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);animation:fade-in .2s ease}
    .drawer{position:fixed;z-index:101;inset:0 0 0 auto;width:min(50vw,680px);overflow-y:auto;padding:24px;background:var(--white);color:var(--ink);box-shadow:-18px 0 48px rgba(10,15,18,.16);animation:slide-in .26s cubic-bezier(.2,.7,.2,1)}
    .close{width:38px;height:38px;border:1px solid var(--line);border-radius:50%;background:transparent;color:var(--ink);font-size:22px;cursor:pointer}
    @keyframes slide-in{from{transform:translateX(100%)}to{transform:translateX(0)}}
    @keyframes fade-in{from{opacity:0}to{opacity:1}}
    @media(max-width:600px){.toolbar{align-items:stretch;flex-direction:column;gap:8px}.row{grid-template-columns:minmax(0,1fr) auto;gap:9px}.date{grid-column:1}.row .view{grid-column:2;grid-row:1 / span 2}.drawer{width:75vw;padding:14px 12px}.scrim{backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}}
  `],
})
export class AdminUsers {
  private readonly admin = inject(AdminAuthService);
  private readonly router = inject(Router);
  protected readonly users = signal<AdminUser[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(0);
  protected readonly filter = signal('');
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly selected = signal<AdminUser | null>(null);
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    void this.load();
  }

  protected goBack(): void {
    void this.router.navigateByUrl('/admin');
  }

  protected onFilter(value: string): void {
    this.filter.set(value);
    this.page.set(0);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => void this.load(), 250);
  }

  protected address(address: UserAddress | null): string {
    if (!address) return '';
    return [address.line1, address.line2, address.city, address.state, address.country, address.zip]
      .filter(Boolean)
      .join(', ');
  }

  protected userInitials(value: string): string {
    return value.trim().split(/[\s@._-]+/).filter(Boolean).slice(0, 2)
      .map((part) => part[0].toUpperCase()).join('');
  }

  protected changePage(delta: number): void {
    const lastPage = Math.max(0, Math.ceil(this.total() / PAGE_SIZE) - 1);
    this.page.set(Math.min(lastPage, Math.max(0, this.page() + delta)));
    void this.load();
  }

  protected maxPage(): number {
    return Math.max(1, Math.ceil(this.total() / PAGE_SIZE));
  }

  protected closeDetails(): void {
    this.selected.set(null);
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.closeDetails();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      let query = this.admin.supabase
        .from('profiles')
        .select('user_id,name,email,phone,company,member_tier,shipping,billing,created_at', { count: 'exact' })
        .order('created_at', { ascending: false });
      const email = this.filter().trim();
      if (email) query = query.ilike('email', `%${email}%`);
      const { data, count, error } = await query.range(this.page() * PAGE_SIZE, (this.page() + 1) * PAGE_SIZE - 1);
      if (error) throw error;
      this.users.set((data ?? []) as AdminUser[]);
      this.total.set(count ?? 0);
    } catch {
      this.error.set('Could not load users. Check the admin profile policy and try again.');
    } finally {
      this.loading.set(false);
    }
  }
}
