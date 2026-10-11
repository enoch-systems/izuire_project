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
const DEFAULT_USER_IMAGE = 'https://res.cloudinary.com/dwry4zb9z/image/upload/v1791692142/-6_al2ljo.jpg';

@Component({
  selector: 'app-admin-users',
  imports: [DatePipe],
  templateUrl: './admin-users.html',
  styles: [`
    :host{display:block;font-family:var(--font-b)}
    .backbtn{display:flex;align-items:center;gap:7px;width:max-content;margin:0 0 18px;padding:6px 0;border:0;background:transparent;color:var(--ink-60);font-family:var(--font-d);font-size:.78rem;font-weight:600;cursor:pointer}
    .backbtn svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
    .page-head{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;padding:2px 0 22px;border-bottom:1px solid var(--line)}
    .heading-copy{min-width:0}.kicker{display:flex;align-items:center;gap:8px;font-family:var(--font-d);font-size:.68rem;font-weight:700;text-transform:uppercase;color:var(--orange-deep)}
    .kicker:before{width:18px;height:2px;background:var(--orange);content:""}
    h1{margin:9px 0 5px;font-family:var(--font-d);font-size:32px;line-height:1.05}
    .lede{margin:0;color:var(--ink-60);font-size:.86rem}
    .count-mark{display:grid;grid-template-columns:auto auto;align-items:baseline;column-gap:9px;padding:2px 0 2px 15px;border-left:2px solid var(--orange)}
    .count-mark strong{font-family:var(--font-d);font-size:1.9rem;line-height:1}
    .count-mark span{color:var(--ink-60);font-size:.74rem}
    .directory{margin-top:20px}
    .toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:13px 0;border-bottom:1px solid var(--line)}
    .searchbox{display:flex;align-items:center;gap:10px;width:min(390px,100%);height:42px;padding:0 12px;border:1px solid var(--line);border-radius:5px;background:var(--white);color:var(--ink-60)}
    .searchbox:focus-within{border-color:var(--orange-deep);box-shadow:0 0 0 2px rgba(245,130,31,.12)}
    .searchbox svg{flex:0 0 17px;width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round}
    .searchbox input{width:100%;min-width:0;height:100%;padding:0;border:0;outline:0;background:transparent;color:var(--ink);font:inherit;font-size:.82rem}
    .searchbox input::placeholder{color:var(--ink-40)}
    .total{color:var(--ink-60);font-size:.74rem;white-space:nowrap}.total span{padding:0 5px;color:var(--orange-deep)}
    .column-head,.row{display:grid;grid-template-columns:minmax(0,1fr) minmax(90px,.26fr) minmax(130px,.42fr) 34px;align-items:center;gap:16px}
    .column-head{padding:10px 14px;background:var(--paper);color:var(--ink-40);font-family:var(--font-d);font-size:.63rem;font-weight:700;text-transform:uppercase}
    .column-head span:nth-child(4){width:34px}
    .rows{border-top:1px solid var(--line)}
    .row{position:relative;min-height:76px;padding:10px 14px;border-bottom:1px solid var(--line);transition:background .16s ease}
    .row:before{position:absolute;inset:0 auto 0 0;width:2px;background:var(--orange);content:"";opacity:0;transition:opacity .16s ease}
    .row:hover{background:var(--paper)}.row:hover:before{opacity:1}
    .identity{display:flex;align-items:center;gap:12px;min-width:0}.avatar{display:block;flex:0 0 42px;width:42px;height:42px;border:1px solid var(--line);border-radius:50%;background:var(--paper);object-fit:cover;object-position:center}
    .identity-copy{min-width:0}.identity strong,.identity span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .identity strong{font-family:var(--font-d);font-size:.84rem}.identity-copy span{margin-top:3px;color:var(--ink-60);font-size:.73rem}
    .row-meta{display:contents}
    .tier{width:max-content;max-width:100%;overflow:hidden;padding:5px 8px;border-left:2px solid var(--orange);background:var(--paper);color:var(--ink-60);font-size:.67rem;font-weight:700;text-overflow:ellipsis;white-space:nowrap}
    .date{color:var(--ink-60);font-size:.74rem;white-space:nowrap}
    .view{display:grid;place-items:center;width:34px;height:34px;padding:0;border:1px solid var(--line);border-radius:4px;background:transparent;color:var(--ink);cursor:pointer}
    .view svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;transition:transform .16s ease}
    .view:hover{border-color:var(--ink);background:var(--ink);color:var(--white)}.view:hover svg{transform:translateX(2px)}
    .empty{margin:0;padding:34px 14px;border-bottom:1px solid var(--line);color:var(--ink-60);font-size:.84rem}
    .pager{display:flex;align-items:center;justify-content:flex-end;gap:6px;padding-top:13px}
    .page-status{margin-right:8px;color:var(--ink-60);font-size:.74rem}
    .pager button{display:grid;place-items:center;width:34px;height:34px;border:1px solid var(--line);border-radius:4px;background:var(--white);color:var(--ink);cursor:pointer}
    .pager button svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    .pager button:not(:disabled):hover{border-color:var(--ink)}.pager button:disabled{opacity:.4;cursor:default}
    .scrim{position:fixed;inset:0;z-index:100;background:rgba(10,15,18,.34);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);animation:fade-in .3s ease both}
    .scrim.closing{animation:fade-out .3s ease both}
    .drawer{position:fixed;z-index:101;inset:0 0 0 auto;width:min(50vw,680px);overflow-y:auto;padding:24px;border-top-left-radius:24px;background:var(--white);color:var(--ink);box-shadow:-18px 0 48px rgba(10,15,18,.16);animation:slide-in .3s cubic-bezier(.2,.7,.2,1) both}
    .drawer.closing{animation:slide-out .3s cubic-bezier(.4,0,.2,1) both}
    .close{width:38px;height:38px;border:1px solid var(--line);border-radius:50%;background:transparent;color:var(--ink);font-size:22px;cursor:pointer}
    @keyframes slide-in{from{transform:translateX(100%)}to{transform:translateX(0)}}
    @keyframes slide-out{from{transform:translateX(0)}to{transform:translateX(100%)}}
    @keyframes fade-in{from{opacity:0}to{opacity:1}}
    @keyframes fade-out{from{opacity:1}to{opacity:0}}
    @media(max-width:820px){.column-head{display:none}.row{grid-template-columns:minmax(0,1fr) 36px;gap:9px 12px;min-height:0;padding:13px 12px}.identity{grid-column:1;grid-row:1}.row .view{grid-column:2;grid-row:1}.row-meta{display:flex;grid-column:1 / -1;align-items:center;flex-wrap:wrap;gap:8px;padding-left:54px}.tier{padding:4px 7px}.date{font-size:.7rem}}
    @media(max-width:600px){.page-head{align-items:flex-start;gap:12px;padding-bottom:16px}h1{font-size:27px}.count-mark{grid-template-columns:auto;gap:3px;padding-left:10px}.count-mark strong{font-size:1.45rem}.count-mark span{font-size:.65rem}.directory{margin-top:14px}.toolbar{align-items:stretch;flex-direction:column;gap:8px;padding:11px 0}.searchbox{width:100%;height:42px}.total{align-self:flex-end;font-size:.68rem}.row{gap:7px 10px;padding:12px 9px}.avatar{flex-basis:40px;width:40px;height:40px}.identity{gap:10px}.identity strong{font-size:.82rem}.identity-copy span{font-size:.7rem}.row-meta{gap:7px;padding-left:50px}.tier{font-size:.63rem}.date{font-size:.66rem}.view{width:32px;height:32px}.drawer{width:80vw;padding:16px}.scrim{backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}}
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
  protected readonly closing = signal(false);
  protected readonly defaultUserImage = DEFAULT_USER_IMAGE;
  private searchTimer: ReturnType<typeof setTimeout> | undefined;
  private closeTimer: ReturnType<typeof setTimeout> | undefined;

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

  protected changePage(delta: number): void {
    const lastPage = Math.max(0, Math.ceil(this.total() / PAGE_SIZE) - 1);
    this.page.set(Math.min(lastPage, Math.max(0, this.page() + delta)));
    void this.load();
  }

  protected maxPage(): number {
    return Math.max(1, Math.ceil(this.total() / PAGE_SIZE));
  }

  protected openDetails(user: AdminUser): void {
    clearTimeout(this.closeTimer);
    this.closing.set(false);
    this.selected.set(user);
  }

  protected closeDetails(): void {
    if (!this.selected() || this.closing()) return;
    this.closing.set(true);
    this.closeTimer = setTimeout(() => {
      this.selected.set(null);
      this.closing.set(false);
      this.closeTimer = undefined;
    }, 300);
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
