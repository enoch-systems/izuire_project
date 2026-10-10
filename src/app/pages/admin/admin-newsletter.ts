import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AdminAuthService } from '../../services/admin-auth.service';

interface NewsletterSignup {
  id: string;
  email: string;
  created_at: string;
}

const PAGE_SIZE = 30;

@Component({
  selector: 'app-admin-newsletter',
  imports: [DatePipe],
  templateUrl: './admin-newsletter.html',
  styles: [`
    :host{display:block;font-family:var(--font-b)}
    .backbtn{display:flex;align-items:center;gap:8px;width:max-content;margin:0 0 14px;padding:8px 12px 8px 9px;border:1px solid var(--line);border-radius:999px;background:var(--white);color:var(--ink);font-family:var(--font-d);font-weight:600;cursor:pointer}
    .backbtn svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
    .kicker{font-family:var(--font-d);font-size:.7rem;font-weight:600;text-transform:uppercase;color:var(--orange-deep)}
    h1{margin:8px 0 6px;font-family:var(--font-d);font-size:28px}.lede{margin:0 0 22px;color:var(--ink-60);font-size:.9rem}
    .toolbar{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:14px}.toolbar input{width:min(360px,100%);height:42px;padding:0 12px;border:1px solid var(--line);border-radius:5px;background:var(--white);color:var(--ink);font:inherit}.toolbar-actions{display:flex;align-items:center;gap:12px}.count{color:var(--ink-60);font-size:.82rem}
    .compose{min-height:40px;padding:0 13px;border:0;border-radius:5px;background:var(--orange);color:var(--white);font-family:var(--font-d);font-weight:700;cursor:pointer}.compose:disabled{opacity:.45;cursor:default}
    .row{display:flex;justify-content:space-between;gap:16px;padding:15px 3px;border-top:1px solid var(--line)}.email{font-weight:600;overflow-wrap:anywhere}.date{color:var(--ink-60);font-size:.8rem;white-space:nowrap}.empty{padding:24px 0;color:var(--ink-60)}
    .signup-select{display:flex;align-items:center;gap:10px;min-width:0}.signup-select input{width:17px;height:17px;flex:none;accent-color:var(--orange)}.empty-state{max-width:520px;padding:30px 0}.empty-mark{display:grid;place-items:center;width:42px;height:42px;border:1px solid var(--line);border-radius:50%;color:var(--orange-deep);font-size:22px}.empty-state h2{margin:16px 0 6px;font-family:var(--font-d);font-size:19px}.empty-state p{max-width:48ch;margin:0 0 16px;color:var(--ink-60);font-size:.86rem;line-height:1.55}
    .pager{display:flex;justify-content:flex-end;align-items:center;gap:12px;padding-top:16px;font-size:.82rem}.pager button{padding:7px 10px;border:1px solid var(--line);border-radius:5px;background:var(--white);color:var(--ink);cursor:pointer}.pager button:disabled{opacity:.45;cursor:default}
    @media(max-width:600px){.toolbar{align-items:stretch;flex-direction:column}.toolbar-actions{justify-content:space-between}.row{align-items:flex-start;flex-direction:column;gap:6px}}
  `],
})
export class AdminNewsletter {
  private readonly admin = inject(AdminAuthService);
  private readonly router = inject(Router);
  protected readonly signups = signal<NewsletterSignup[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(0);
  protected readonly filter = signal('');
  protected readonly selectedIds = signal<string[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
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

  protected changePage(delta: number): void {
    const lastPage = Math.max(0, Math.ceil(this.total() / PAGE_SIZE) - 1);
    this.page.set(Math.min(lastPage, Math.max(0, this.page() + delta)));
    void this.load();
  }

  protected maxPage(): number {
    return Math.max(1, Math.ceil(this.total() / PAGE_SIZE));
  }

  protected isSelected(id: string): boolean {
    return this.selectedIds().includes(id);
  }

  protected toggleSignup(id: string, checked: boolean): void {
    this.selectedIds.update((ids) => checked ? [...new Set([...ids, id])] : ids.filter((item) => item !== id));
  }

  protected emailSelected(): void {
    if (!this.selectedIds().length) return;
    void this.router.navigate(['/admin/email-follow-up'], {
      queryParams: { audience: 'newsletter', signupIds: this.selectedIds().join(',') },
    });
  }

  protected openSignupForm(): void {
    void this.router.navigate(['/'], { fragment: 'newsletterHeading' }).then(() => {
      window.setTimeout(() => document.getElementById('newsletterHeading')?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      let query = this.admin.supabase
        .from('newsletter_signups')
        .select('id,email,created_at', { count: 'exact' })
        .order('created_at', { ascending: false });
      const email = this.filter().trim();
      if (email) query = query.ilike('email', `%${email}%`);
      const { data, count, error } = await query.range(this.page() * PAGE_SIZE, (this.page() + 1) * PAGE_SIZE - 1);
      if (error) throw error;
      this.signups.set((data ?? []) as NewsletterSignup[]);
      this.total.set(count ?? 0);
    } catch {
      this.error.set('Could not load newsletter sign-ups. Push the newest Supabase migration and check admin access.');
    } finally {
      this.loading.set(false);
    }
  }
}