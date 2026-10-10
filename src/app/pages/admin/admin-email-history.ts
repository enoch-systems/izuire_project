import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AdminAuthService } from '../../services/admin-auth.service';
import { EmailImage, renderEmailHtml } from './email-content';

interface EmailHistoryItem {
  id: string;
  recipient_email: string;
  recipient_name: string;
  email_type: string;
  subject: string;
  body: string;
  images: { name: string; url: string }[];
  status: 'sending' | 'sent' | 'failed' | 'unknown';
  error_message: string | null;
  provider_message_id: string | null;
  created_at: string;
  completed_at: string | null;
}

const PAGE_SIZE = 25;

@Component({
  selector: 'app-admin-email-history',
  imports: [DatePipe, RouterLink, RouterLinkActive],
  templateUrl: './admin-email-history.html',
  styles: [`
    :host{display:block;font-family:var(--font-b)}
    .kicker{font-family:var(--font-d);font-size:.7rem;font-weight:600;text-transform:uppercase;color:var(--orange-deep)}
    h1{margin:8px 0 6px;font-family:var(--font-d);font-size:28px}.lede{margin:0;color:var(--ink-60);font-size:.9rem}
    .page-head{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin-bottom:20px}
    .toolbar{display:grid;grid-template-columns:minmax(200px,1fr) minmax(150px,200px) auto;align-items:center;gap:10px;margin-bottom:12px}.toolbar input,.toolbar select{height:42px;min-width:0;padding:0 11px;border:1px solid var(--line);border-radius:5px;background:var(--white);color:var(--ink);font:inherit}.count,.row-meta{color:var(--ink-60);font-size:.78rem}
    .history-row{display:flex;align-items:center;justify-content:space-between;gap:14px;width:100%;padding:14px 4px;border:0;border-top:1px solid var(--line);background:transparent;color:var(--ink);text-align:left;cursor:pointer}.row-main{display:grid;gap:3px;min-width:0}.row-title,.row-subject{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.row-title{font-size:.86rem;font-weight:700}.row-email{margin-left:5px;color:var(--ink-60);font-size:.8rem;font-weight:400}.row-subject{font-size:.82rem}.row-meta{font-size:.74rem}
    .status{display:inline-flex;align-items:center;width:max-content;padding:4px 8px;border-radius:4px;background:var(--paper);font-size:.72rem;font-weight:700;white-space:nowrap}.status--sent{color:var(--verify);background:var(--verify-tint)}.status--failed{color:#a32929;background:rgba(163,41,41,.08)}.status--unknown{color:var(--orange-deep);background:rgba(245,130,31,.1)}
    .empty{padding:24px 0;color:var(--ink-60)}.pager{display:flex;justify-content:flex-end;align-items:center;gap:12px;padding-top:16px;font-size:.82rem}.pager button{padding:7px 10px;border:1px solid var(--line);border-radius:5px;background:var(--white);color:var(--ink);cursor:pointer}.pager button:disabled{opacity:.45;cursor:default}
    .scrim{position:fixed;inset:0;z-index:100;background:rgba(10,15,18,.42)}.drawer{position:fixed;z-index:101;inset:0 0 0 auto;width:min(600px,100vw);overflow-y:auto;padding:24px;background:var(--white);color:var(--ink);box-shadow:-18px 0 48px rgba(10,15,18,.16);animation:history-in .24s ease}@keyframes history-in{from{transform:translateX(30px);opacity:.5}}
    .drawer-head{display:flex;justify-content:space-between;gap:16px;padding-bottom:16px;border-bottom:1px solid var(--line)}.drawer-head h2{margin:6px 0 0;font-family:var(--font-d);font-size:20px;overflow-wrap:anywhere}.close{width:38px;height:38px;flex:none;border:1px solid var(--line);border-radius:50%;background:transparent;color:var(--ink);font-size:22px;cursor:pointer}
    .details{display:grid;gap:11px;padding:16px 0}.details div{display:grid;grid-template-columns:92px minmax(0,1fr);gap:10px}.details dt{color:var(--ink-60);font-size:.78rem}.details dd{font-size:.8rem;overflow-wrap:anywhere}.delivery-error{display:grid;gap:4px;margin-bottom:14px;padding:11px;border-left:3px solid #a32929;background:rgba(163,41,41,.06);font-size:.8rem;overflow-wrap:anywhere}.email-preview{padding:16px;border:1px solid var(--line);border-radius:5px;line-height:1.6;overflow-wrap:anywhere}.email-preview a{color:var(--orange-deep);text-decoration:underline}.email-preview img{max-width:100%;height:auto}
    @media(max-width:650px){.page-head{align-items:flex-start;flex-direction:column}.toolbar{grid-template-columns:1fr}.history-row{align-items:flex-start}.row-title,.row-subject{white-space:normal}.drawer{padding:20px 17px}}
  `],
})
export class AdminEmailHistory {
  private readonly admin = inject(AdminAuthService);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly entries = signal<EmailHistoryItem[]>([]);
  protected readonly selected = signal<EmailHistoryItem | null>(null);
  protected readonly search = signal('');
  protected readonly statusFilter = signal('all');
  protected readonly total = signal(0);
  protected readonly page = signal(0);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly filtered = computed(() => this.entries());
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    void this.load();
  }

  protected goBack(): void {
    void this.router.navigateByUrl('/admin');
  }

  protected maxPage(): number {
    return Math.max(1, Math.ceil(this.total() / PAGE_SIZE));
  }

  protected changePage(delta: number): void {
    this.page.set(Math.min(this.maxPage() - 1, Math.max(0, this.page() + delta)));
    void this.load();
  }

  protected onSearch(value: string): void {
    this.search.set(value);
    this.page.set(0);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => void this.load(), 250);
  }

  protected onStatusFilter(value: string): void {
    this.statusFilter.set(value);
    this.page.set(0);
    void this.load();
  }

  protected statusLabel(status: string): string {
    return ({ sent: 'Sent', failed: 'Failed', unknown: 'Unconfirmed', sending: 'Processing' } as Record<string, string>)[status] ?? status;
  }

  protected emailTypeLabel(type: string): string {
    return ({ welcome: 'Welcome email', newsletter: 'Newsletter', 'check-in': 'Sourcing check-in', quote: 'Quote follow-up' } as Record<string, string>)[type] ?? type;
  }

  protected preview(item: EmailHistoryItem): SafeHtml {
    const images = (item.images ?? []).map((image) => ({ ...image, path: '' })) as EmailImage[];
    return this.sanitizer.bypassSecurityTrustHtml(renderEmailHtml(item.body, images, item.subject));
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      let query = this.admin.supabase
        .from('email_send_history')
        .select('id,recipient_email,recipient_name,email_type,subject,body,images,status,error_message,provider_message_id,created_at,completed_at', { count: 'exact' })
        .order('created_at', { ascending: false });
      const status = this.statusFilter();
      if (status !== 'all') query = query.eq('status', status);
      const filter = this.search().trim().replace(/[^a-zA-Z0-9@._+\-\s]/g, ' ');
      if (filter) query = query.or(`recipient_email.ilike.%${filter}%,subject.ilike.%${filter}%`);
      const { data, count, error } = await query.range(this.page() * PAGE_SIZE, (this.page() + 1) * PAGE_SIZE - 1);
      if (error) throw error;
      this.entries.set((data ?? []) as EmailHistoryItem[]);
      this.total.set(count ?? 0);
    } catch {
      this.error.set('Could not load email history. Apply the email history migration and check admin access.');
    } finally {
      this.loading.set(false);
    }
  }
}
