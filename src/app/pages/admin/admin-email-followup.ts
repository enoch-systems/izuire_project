import { Component, computed, inject, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminAuthService } from '../../services/admin-auth.service';
import { EmailImage, renderEmailHtml } from './email-content';

interface Recipient {
  user_id: string;
  name: string;
  email: string;
}

type FollowupTemplate = 'check-in' | 'quote' | 'welcome';

const EMAIL_TEMPLATES: Record<FollowupTemplate, { subject: string; body: string }> = {
  'check-in': {
    subject: 'A quick follow-up from Izuire',
    body: 'Hello,\n\nI wanted to follow up on your sourcing plans. If there is a product you are considering, send us the item, target quantity, and destination. We can help with supplier checks, pricing, and shipping options.\n\nBrowse our marketplace: https://izuire.com/marketplace\n\nBest,\nIzuire Sourcing Team',
  },
  quote: {
    subject: 'Following up on your sourcing quote',
    body: 'Hello,\n\nI am checking in about your sourcing request. If your product, quantity, or delivery details have changed, reply to this email and we will update the quote.\n\nWe are happy to help with supplier verification, inspection, and shipping.\n\nBest,\nIzuire Sourcing Team',
  },
  welcome: {
    subject: 'Welcome to Izuire',
    body: 'Hello,\n\nThanks for joining Izuire. We help African businesses source products from China, verify suppliers, and coordinate delivery.\n\nTell us what you are looking for and your destination, and our team will help you plan the next step.\n\nExplore the marketplace: https://izuire.com/marketplace\n\nBest,\nIzuire Sourcing Team',
  },
};

@Component({
  selector: 'app-admin-email-followup',
  imports: [RouterLink],
  templateUrl: './admin-email-followup.html',
  styles: [`
    :host{display:block;font-family:var(--font-b)}
    .kicker{font-family:var(--font-d);font-size:.7rem;font-weight:600;text-transform:uppercase;color:var(--orange-deep)}
    h1{margin:8px 0 6px;font-family:var(--font-d);font-size:28px}.lede{margin:0 0 22px;color:var(--ink-60);font-size:.9rem}
    .page-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:20px}.page-title{min-width:0}
    .layout{display:grid;grid-template-columns:minmax(260px,.8fr) minmax(0,1.2fr);gap:18px;align-items:start}
    .recipients,.composer{min-width:0;padding:18px;border:1px solid var(--line);border-radius:8px;background:var(--white)}.section-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
    h2{margin:0;font-family:var(--font-d);font-size:16px}.count{color:var(--ink-60);font-size:.8rem;white-space:nowrap}
    input[type=search],input[type=text],textarea,select{width:100%;padding:11px 12px;border:1px solid var(--line);border-radius:5px;background:var(--white);color:var(--ink);font:inherit}input:focus,textarea:focus,select:focus{outline:2px solid rgba(245,130,31,.28);border-color:var(--orange)}
    input[type=search]{margin-bottom:12px}.recipient-list{max-height:470px;overflow:auto}
    .recipient{display:flex;align-items:center;gap:10px;padding:11px 3px;border-bottom:1px solid var(--line);cursor:pointer}.recipient input{width:17px;height:17px;accent-color:var(--orange);flex:none}
    .recipient strong,.recipient small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.recipient strong{font-size:.84rem}.recipient small{margin-top:3px;color:var(--ink-60);font-size:.76rem}
    .empty,.status{padding:16px 0;color:var(--ink-60);font-size:.85rem}.field{display:grid;gap:6px}.field label{font-size:.8rem;font-weight:600}.field textarea{min-height:210px;resize:vertical;line-height:1.5}.template-row{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:12px;margin:0 0 14px}.template-row label{font-size:.8rem;font-weight:600}.template-row select{padding:9px 11px}
    .upload{display:inline-flex;align-items:center;gap:8px;width:max-content;padding:8px 10px;border:1px solid var(--line);border-radius:5px;background:var(--white);color:var(--ink);font-size:.82rem;font-weight:600;cursor:pointer}.upload svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    .images{display:flex;flex-wrap:wrap;gap:10px}.image{position:relative;width:104px;border:1px solid var(--line);border-radius:5px;overflow:hidden;background:var(--paper)}.image img{display:block;width:100%;height:76px;object-fit:cover}.image span{display:block;padding:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:.68rem}.image button{position:absolute;top:4px;right:4px;border:0;border-radius:50%;background:rgba(0,0,0,.7);color:white;cursor:pointer}
    .email-preview{min-height:160px;padding:0;border:1px solid var(--line);border-radius:5px;background:var(--paper);color:var(--ink);line-height:1.6;overflow:auto}.email-preview img{max-width:100%;height:auto}.email-preview a{color:var(--orange-deep);text-decoration:underline}.preview-empty{margin:0;padding:22px;color:var(--ink-60);font-size:.82rem}
    .editor-hint{margin:-7px 0 12px;color:var(--ink-60);font-size:.76rem}.compose-bar{position:sticky;top:12px;z-index:5;display:flex;align-items:center;justify-content:space-between;gap:14px;margin:0 0 16px;padding:10px 12px;border:1px solid var(--line);background:var(--white)}.actions{display:flex;flex-wrap:wrap;gap:9px}.action{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:0 13px;border:1px solid var(--line);border-radius:5px;background:var(--white);color:var(--ink);font-family:var(--font-d);font-weight:700;cursor:pointer;text-decoration:none}.action--primary{border-color:var(--orange);background:var(--orange);color:var(--white)}.action:disabled{opacity:.45;cursor:default}.status{margin:0}.draft-link{color:var(--ink-60);font-size:.8rem}
    @media(max-width:760px){.page-head{align-items:flex-start;flex-direction:column;gap:12px}.layout{grid-template-columns:1fr;gap:14px}.recipient-list{max-height:300px}.compose-bar{top:8px;align-items:flex-start;flex-direction:column}}
  `],
})
export class AdminEmailFollowup {
  private readonly admin = inject(AdminAuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly recipients = signal<Recipient[]>([]);
  protected readonly selectedRecipients = signal<Recipient[]>([]);
  protected readonly search = signal('');
  protected readonly selectedTemplate = signal<FollowupTemplate>('check-in');
  protected readonly subject = signal(EMAIL_TEMPLATES['check-in'].subject);
  protected readonly body = signal(EMAIL_TEMPLATES['check-in'].body);
  protected readonly images = signal<EmailImage[]>([]);
  protected readonly loading = signal(true);
  protected readonly uploading = signal(false);
  protected readonly saving = signal(false);
  protected readonly sending = signal(false);
  protected readonly error = signal('');
  protected readonly status = signal('');
  protected readonly draftId = signal<string | null>(null);
  protected readonly previewHtml = computed(() => this.sanitizer.bypassSecurityTrustHtml(
    renderEmailHtml(this.body(), this.images(), this.subject()),
  ));
  protected readonly filtered = computed(() => {
    const search = this.search().trim().toLowerCase();
    return this.recipients().filter((recipient) =>
      !search || recipient.email.toLowerCase().includes(search) || recipient.name.toLowerCase().includes(search),
    );
  });

  constructor() {
    const draftId = this.route.snapshot.queryParamMap.get('draft');
    const audience = this.route.snapshot.queryParamMap.get('audience');
    const signupIds = this.route.snapshot.queryParamMap.get('signupIds');
    if (audience === 'newsletter' && signupIds) {
      void this.loadNewsletterRecipients(signupIds.split(','));
    } else {
      void this.load();
    }
    if (draftId) void this.loadDraft(draftId);
  }

  protected goBack(): void {
    void this.router.navigateByUrl('/admin');
  }

  protected isSelected(id: string): boolean {
    return this.selectedRecipients().some((recipient) => recipient.user_id === id);
  }

  protected toggleRecipient(recipient: Recipient, checked: boolean): void {
    this.selectedRecipients.update((selected) => checked
      ? [...selected.filter((item) => item.user_id !== recipient.user_id), recipient]
      : selected.filter((item) => item.user_id !== recipient.user_id));
    this.status.set('');
  }

  protected selectVisibleRecipients(): void {
    const visible = this.filtered();
    const visibleIds = new Set(visible.map((recipient) => recipient.user_id));
    const allSelected = visible.length > 0 && visible.every((recipient) => this.isSelected(recipient.user_id));
    this.selectedRecipients.update((selected) => allSelected
      ? selected.filter((recipient) => !visibleIds.has(recipient.user_id))
      : [...selected, ...visible.filter((recipient) => !this.isSelected(recipient.user_id))]);
  }

  protected allVisibleSelected(): boolean {
    return this.filtered().length > 0 && this.filtered().every((recipient) => this.isSelected(recipient.user_id));
  }

  protected applyTemplate(value: FollowupTemplate): void {
    const template = EMAIL_TEMPLATES[value];
    if (!template) return;
    this.selectedTemplate.set(value);
    this.subject.set(template.subject);
    this.body.set(template.body);
    this.error.set('');
    this.status.set('Starter email loaded. Edit it before sending.');
  }

  protected async uploadImage(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (this.images().length >= 10) {
      this.error.set('Add no more than 10 images to one email.');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      this.error.set('Choose a JPG, PNG, WebP, or GIF image up to 5 MB.');
      return;
    }
    this.uploading.set(true);
    this.error.set('');
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100) || 'image';
    const path = `${crypto.randomUUID()}-${safeName}`;
    try {
      const { error } = await this.admin.supabase.storage.from('admin-email-assets').upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) throw error;
      const { data } = this.admin.supabase.storage.from('admin-email-assets').getPublicUrl(path);
      this.images.update((images) => [...images, { name: file.name, path, url: data.publicUrl }]);
    } catch {
      this.error.set('Could not upload this image. Check admin storage access and try again.');
    } finally {
      this.uploading.set(false);
    }
  }

  protected async removeImage(image: EmailImage): Promise<void> {
    const { error } = await this.admin.supabase.storage.from('admin-email-assets').remove([image.path]);
    if (error) {
      this.error.set('Could not remove the uploaded image.');
      return;
    }
    this.images.update((items) => items.filter((item) => item.path !== image.path));
  }

  protected async saveDraft(): Promise<void> {
    if (!this.validContent()) return;
    this.saving.set(true);
    this.status.set('');
    this.error.set('');
    const payload = {
      subject: this.subject().trim(),
      body: this.body(),
      recipients: this.selectedRecipients(),
      images: this.images(),
      updated_at: new Date().toISOString(),
    };
    try {
      const draftId = this.draftId();
      const result = draftId
        ? await this.admin.supabase.from('email_followup_drafts').update(payload).eq('id', draftId).select('id').single()
        : await this.admin.supabase.from('email_followup_drafts').insert(payload).select('id').single();
      if (result.error) throw result.error;
      this.draftId.set(result.data.id);
      this.status.set('Draft saved.');
    } catch {
      this.error.set('Could not save this draft. Check the email drafts migration and admin access.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async sendMail(): Promise<void> {
    if (!this.validMessage()) return;
    this.sending.set(true);
    this.status.set('');
    this.error.set('');
    try {
      const { data, error } = await this.admin.supabase.functions.invoke('send-admin-email', {
        body: {
          recipients: this.selectedRecipients().map((recipient) => recipient.email),
          subject: this.subject(),
          body: this.body(),
          images: this.images().map(({ name, url }) => ({ name, url })),
        },
      });
      if (error) {
        let message = error.message;
        if ('context' in error && error.context instanceof Response) {
          const response = await error.context.json().catch(() => null) as { error?: string } | null;
          message = response?.error ?? message;
        }
        throw new Error(message);
      }
      this.status.set(`Email sent to ${data?.sent ?? this.selectedRecipients().length} recipients.`);
      const draftId = this.draftId();
      if (draftId) {
        await this.admin.supabase.from('email_followup_drafts').delete().eq('id', draftId);
        this.draftId.set(null);
      }
      this.selectedRecipients.set([]);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Email could not be sent.');
    } finally {
      this.sending.set(false);
    }
  }

  private validMessage(): boolean {
    if (!this.selectedRecipients().length) {
      this.error.set('Select at least one recipient.');
      return false;
    }
    if (!this.validContent()) return false;
    if (this.selectedRecipients().length > 50) {
      this.error.set('Send to no more than 50 recipients at a time.');
      return false;
    }
    return true;
  }

  private validContent(): boolean {
    if (!this.subject().trim() || (!this.body().trim() && this.images().length === 0)) {
      this.error.set('Add a subject and message before continuing.');
      return false;
    }
    return true;
  }

  private async loadDraft(id: string): Promise<void> {
    const { data, error } = await this.admin.supabase
      .from('email_followup_drafts')
      .select('id,subject,body,recipients,images')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) {
      this.error.set('Could not open this draft.');
      return;
    }
    this.draftId.set(data.id);
    this.subject.set(data.subject);
    this.body.set(data.body);
    this.selectedRecipients.set((data.recipients ?? []) as Recipient[]);
    this.images.set((data.images ?? []) as EmailImage[]);
  }

  private async loadNewsletterRecipients(ids: string[]): Promise<void> {
    const signupIds = [...new Set(ids)].filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 50);
    if (!signupIds.length) return;
    const { data, error } = await this.admin.supabase
      .from('newsletter_signups')
      .select('id,email')
      .in('id', signupIds);
    if (error) {
      this.error.set('Could not load the selected newsletter subscribers.');
      return;
    }
    const recipients = (data ?? []).map((signup) => ({
      user_id: signup.id,
      name: 'Newsletter subscriber',
      email: signup.email,
    }));
    this.recipients.set(recipients);
    this.selectedRecipients.set(recipients);
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const { data, error } = await this.admin.supabase
        .from('profiles')
        .select('user_id,name,email')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (error) throw error;
      this.recipients.set((data ?? []) as Recipient[]);
    } catch {
      this.error.set('Could not load registered users. Check the admin profile policy and try again.');
    } finally {
      this.loading.set(false);
    }
  }
}