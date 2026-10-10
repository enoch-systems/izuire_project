import { DatePipe } from '@angular/common';
import { Component, HostListener, inject, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AdminAuthService } from '../../services/admin-auth.service';
import { EmailImage, renderEmailHtml } from './email-content';

interface DraftRecipient {
  user_id: string;
  name: string;
  email: string;
}

interface EmailDraft {
  id: string;
  subject: string;
  body: string;
  recipients: DraftRecipient[];
  images: EmailImage[];
  created_at: string;
  updated_at: string;
}

const PAGE_SIZE = 20;

@Component({
  selector: 'app-admin-email-drafts',
  imports: [DatePipe, RouterLink, RouterLinkActive],
  templateUrl: './admin-email-drafts.html',
  styles: [`
    :host{display:block;font-family:var(--font-b)}
    .backbtn{display:flex;align-items:center;gap:8px;width:max-content;margin:0 0 14px;padding:8px 12px 8px 9px;border:1px solid var(--line);border-radius:999px;background:var(--white);color:var(--ink);font-family:var(--font-d);font-weight:600;cursor:pointer}
    .backbtn svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
    .kicker{font-family:var(--font-d);font-size:.7rem;font-weight:600;text-transform:uppercase;color:var(--orange-deep)}
    h1{margin:8px 0 6px;font-family:var(--font-d);font-size:28px}.lede{margin:0 0 22px;color:var(--ink-60);font-size:.9rem}
    .toolbar{display:flex;justify-content:space-between;align-items:center;gap:14px;margin-bottom:14px}.toolbar input{width:min(360px,100%);height:42px;padding:0 12px;border:1px solid var(--line);border-radius:5px;background:var(--white);color:var(--ink);font:inherit}.count{font-size:.82rem;color:var(--ink-60)}
    .draft{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;width:100%;padding:15px 4px;border:0;border-top:1px solid var(--line);background:transparent;color:var(--ink);text-align:left;cursor:pointer}.draft:hover .subject{color:var(--orange-deep)}.subject{font-family:var(--font-d);font-weight:700}.meta{display:block;margin-top:5px;color:var(--ink-60);font-size:.78rem}.draft-count{color:var(--ink-60);font-size:.8rem;white-space:nowrap}.empty{padding:24px 0;color:var(--ink-60)}
    .pager{display:flex;justify-content:flex-end;align-items:center;gap:12px;padding-top:16px;font-size:.82rem}.pager button{padding:7px 10px;border:1px solid var(--line);border-radius:5px;background:var(--white);color:var(--ink);cursor:pointer}.pager button:disabled{opacity:.45;cursor:default}
    .scrim{position:fixed;inset:0;z-index:100;background:rgba(10,15,18,.42);animation:fade-in .2s ease}.drawer{position:fixed;z-index:101;inset:0 0 0 auto;width:min(560px,100vw);overflow-y:auto;padding:24px;background:var(--white);color:var(--ink);box-shadow:-18px 0 48px rgba(10,15,18,.16);animation:slide-in .26s cubic-bezier(.2,.7,.2,1)}
    .drawer-head{display:flex;justify-content:space-between;gap:16px;padding-bottom:17px;border-bottom:1px solid var(--line)}.drawer-head h2{margin:6px 0 0;font-family:var(--font-d);font-size:21px;overflow-wrap:anywhere}.close{width:38px;height:38px;border:1px solid var(--line);border-radius:50%;background:transparent;color:var(--ink);font-size:22px;cursor:pointer}
    .recipients{display:flex;flex-wrap:wrap;gap:7px;padding:16px 0}.recipient{padding:5px 8px;border:1px solid var(--line);border-radius:4px;color:var(--ink-60);font-size:.75rem;overflow-wrap:anywhere}.email-preview{padding:16px;border:1px solid var(--line);border-radius:5px;line-height:1.6;overflow-wrap:anywhere}.email-preview a{color:var(--orange-deep);text-decoration:underline}.email-preview img{max-width:100%;height:auto}.actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:18px}.action{padding:10px 13px;border:1px solid var(--ink);border-radius:5px;background:var(--white);color:var(--ink);font-family:var(--font-d);font-weight:700;cursor:pointer}.action--delete{border-color:#a32929;color:#a32929}
    @keyframes slide-in{from{transform:translateX(100%)}to{transform:translateX(0)}}@keyframes fade-in{from{opacity:0}to{opacity:1}}
    @media(max-width:600px){.toolbar{align-items:stretch;flex-direction:column}.draft{grid-template-columns:1fr}.draft-count{white-space:normal}.drawer{padding:20px 17px}}
  `],
})
export class AdminEmailDrafts {
  private readonly admin = inject(AdminAuthService);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly drafts = signal<EmailDraft[]>([]);
  protected readonly selected = signal<EmailDraft | null>(null);
  protected readonly filter = signal('');
  protected readonly total = signal(0);
  protected readonly page = signal(0);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly actionError = signal('');

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

  protected preview(draft: EmailDraft): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(renderEmailHtml(draft.body, draft.images ?? [], draft.subject));
  }

  protected editDraft(draft: EmailDraft): void {
    void this.router.navigate(['/admin/email-follow-up'], { queryParams: { draft: draft.id } });
  }

  protected async deleteDraft(draft: EmailDraft): Promise<void> {
    if (!window.confirm(`Delete the draft “${draft.subject}”?`)) return;
    this.actionError.set('');
    const { error } = await this.admin.supabase.from('email_followup_drafts').delete().eq('id', draft.id);
    if (error) {
      this.actionError.set('Could not delete this draft.');
      return;
    }
    this.selected.set(null);
    await this.load();
  }

  protected onFilter(value: string): void {
    this.filter.set(value);
    this.page.set(0);
    void this.load();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.selected.set(null);
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      let query = this.admin.supabase
        .from('email_followup_drafts')
        .select('id,subject,body,recipients,images,created_at,updated_at', { count: 'exact' })
        .order('updated_at', { ascending: false });
      const filter = this.filter().trim();
      if (filter) query = query.ilike('subject', `%${filter}%`);
      const { data, count, error } = await query.range(this.page() * PAGE_SIZE, (this.page() + 1) * PAGE_SIZE - 1);
      if (error) throw error;
      this.drafts.set((data ?? []) as EmailDraft[]);
      this.total.set(count ?? 0);
    } catch {
      this.error.set('Could not load drafts. Push the email drafts migration and check admin access.');
    } finally {
      this.loading.set(false);
    }
  }
}
