import { Component, computed, inject, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AdminAuthService } from '../../services/admin-auth.service';
import { EmailImage, renderEmailHtml } from './email-content';

interface Recipient {
  user_id: string;
  name: string;
  email: string;
  manual?: boolean;
}

interface SendProgress {
  total: number;
  processed: number;
  sent: number;
  failed: number;
  current: string;
}

interface SendFailure {
  email: string;
  name: string;
  message: string;
  status: 'failed' | 'unknown';
}

type FollowupTemplate = 'check-in' | 'quote' | 'welcome' | 'newsletter';

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
    body: 'Hello {{first_name}},\n\nWelcome to Izuire. We help African businesses source products from China, verify suppliers, and coordinate delivery.\n\nTell us what you are looking for and your destination, and our team will help you plan the next step.\n\nExplore the marketplace: https://izuire.com/marketplace\n\nBest,\nIzuire Sourcing Team',
  },
  newsletter: {
    subject: 'Sourcing notes from Izuire',
    body: 'Hello {{first_name}},\n\nHere is the latest from Izuire. We are here to make sourcing from China clearer, from finding reliable suppliers to arranging inspections and delivery.\n\nHave a product in mind? Reply to this email and tell us what you need. Our team would be glad to help you explore the next step.\n\nExplore the marketplace: https://izuire.com/marketplace\n\nWarm regards,\nThe Izuire Team',
  },
};

@Component({
  selector: 'app-admin-email-followup',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './admin-email-followup.html',
  styles: [
    `
      :host {
        display: block;
        max-width: 1280px;
        margin: 0 auto;
        padding: 0 0 32px;
        color: var(--ink);
        font-family: var(--font-b);
      }
      .kicker {
        font-family: var(--font-d);
        font-size: 0.7rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--orange-deep);
      }
      h1 {
        margin: 8px06px;
        font-family: var(--font-d);
        font-size: clamp(1.7rem, 3vw, 2.4rem);
        line-height: 1.15;
      }
      .lede {
        margin: 0018px;
        color: var(--ink-60);
        font-size: 0.93rem;
        line-height: 1.6;
      }
      .page-head {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 18px;
        margin-bottom: 18px;
      }
      .page-title {
        min-width: 0;
        width: 100%;
      }
      .email-workspace-nav {
        display: flex;
        gap: 8px;
        margin: 0 0 18px;
        padding: 4px;
        border: 1pxsolidvar (--line);
        border-radius: 999px;
        background: var(--paper);
      }
      .email-workspace-nava {
        flex: 10auto;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: max-content;
        padding: 9px14px;
        border-radius: 999px;
        color: var(--ink-70);
        font-size: 0.82rem;
        font-weight: 700;
        text-decoration: none;
      }
      .email-workspace-nava.active {
        background: linear-gradient(135deg, var(--orange), var(--orange-deep));
        color: var(--white);
      }
      .compose-bar {
        position: sticky;
        top: 12px;
        z-index: 8;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        margin: 0018px;
        padding: 12px14px;
        border: 1pxsolidvar (--line);
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.9);
      }
      .compose-bar.count {
        font-size: 0.82rem;
        color: var(--ink-70);
        white-space: nowrap;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 9px;
        justify-content: flex-end;
      }
      .action {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 42px;
        padding: 016px;
        border: 1pxsolidvar (--line);
        border-radius: 10px;
        background: var(--white);
        color: var(--ink);
        font-family: var(--font-d);
        font-weight: 700;
        cursor: pointer;
        text-decoration: none;
      }
      .action--primary {
        border-color: var(--orange);
        background: linear-gradient(135deg, var(--orange), var(--orange-deep));
        color: var(--white);
      }
      .action:disabled {
        opacity: 0.5;
        cursor: default;
      }
      .layout {
        display: grid;
        grid-template-columns: minmax(290px, 0.82fr) minmax(0, 1.18fr);
        gap: 18px;
        align-items: start;
      }
      .recipients,
      .composer {
        min-width: 0;
        padding: 18px;
        border: 1pxsolidvar (--line);
        border-radius: 18px;
        background: var(--white);
      }
      .section-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 14px;
      }
      .section-headh2 {
        margin: 0;
        font-family: var(--font-d);
        font-size: 1rem;
        text-align: left;
      }
      .count {
        color: var(--ink-60);
        font-size: 0.8rem;
        white-space: nowrap;
      }
      .recipient-count {
        margin: 0012px;
        text-align: left;
      }
      input[type='search'],
      input[type='text'],
      textarea,
      select {
        width: 100%;
        padding: 11px 12px;
        border: 1px solid var(--line);
        border-radius: 10px;
        background: var(--white);
        color: var(--ink);
        font: inherit;
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
      }
      input[type='search'] {
        margin-bottom: 12px;
      }
      input:focus,
      textarea:focus,
      select:focus {
        outline: none;
        border-color: var(--orange);
        box-shadow: 0 0 0 4px rgba(245, 130, 31, 0.14);
      }
      .recipient-list {
        max-height: 440px;
        overflow: auto;
        padding-right: 4px;
      }
      .recipient {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 12px;
        border: 1px solid var(--line);
        border-radius: 12px;
        background: var(--white);
        margin-bottom: 8px;
        cursor: pointer;
        text-align: left;
      }
      .recipient:last-child {
        margin-bottom: 0;
      }
      .recipient input {
        width: 17px;
        height: 17px;
        accent-color: var(--orange);
        flex: none;
        margin-top: 3px;
      }
      .recipient-copy {
        display: flex;
        flex-direction: column;
        min-width: 0;
        gap: 3px;
      }
      .recipient-name,
      .recipient-email {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .recipient-name {
        font-size: 0.88rem;
        font-weight: 700;
        color: var(--ink);
      }
      .recipient-email {
        margin: 0;
        color: var(--ink-60);
        font-size: 0.76rem;
      }
      .empty,
      .status {
        padding: 16px0;
        color: var(--ink-60);
        font-size: 0.85rem;
        line-height: 1.5;
        text-align: left;
      }
      .field {
        display: grid;
        gap: 6px;
      }
      .fieldlabel,
      .template-rowlabel {
        font-size: 0.8rem;
        font-weight: 700;
      }
      .fieldtextarea {
        min-height: 220px;
        resize: vertical;
        line-height: 1.5;
      }
      .template-row {
        display: grid;
        grid-template-columns: autominmax(0, 1fr);
        align-items: center;
        gap: 12px;
        margin: 0014px;
      }
      .template-rowselect {
        padding: 9px11px;
      }
      .upload {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        width: max-content;
        max-width: 100%;
        padding: 9px12px;
        border: 1pxsolidvar (--line);
        border-radius: 10px;
        background: var(--white);
        color: var(--ink);
        font-size: 0.82rem;
        font-weight: 700;
        cursor: pointer;
      }
      .uploadsvg {
        width: 18px;
        height: 18px;
        fill: none;
        stroke: currentColor;
        stroke-width: 1.8;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .images {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 14px;
      }
      .image {
        position: relative;
        width: 110px;
        border: 1pxsolidvar (--line);
        border-radius: 10px;
        overflow: hidden;
        background: var(--paper);
      }
      .imageimg {
        display: block;
        width: 100%;
        height: 80px;
        object-fit: cover;
      }
      .imagespan {
        display: block;
        padding: 5px7px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 0.68rem;
        color: var(--ink-70);
      }
      .imagebutton {
        position: absolute;
        top: 6px;
        right: 6px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        border: 0;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.7);
        color: var(--white);
        cursor: pointer;
        font-size: 1rem;
        line-height: 1;
      }
      .email-preview {
        min-height: 160px;
        padding: 0;
        border: 1pxsolidvar (--line);
        border-radius: 10px;
        background: var(--paper);
        color: var(--ink);
        line-height: 1.6;
        overflow: auto;
      }
      .email-previewimg {
        max-width: 100%;
        height: auto;
      }
      .email-previewa {
        color: var(--orange-deep);
        text-decoration: underline;
      }
      .preview-empty {
        margin: 0;
        padding: 20px;
        color: var(--ink-60);
        font-size: 0.82rem;
        text-align: left;
      }
      .editor-hint {
        margin: -4px012px;
        color: var(--ink-60);
        font-size: 0.76rem;
        line-height: 1.5;
        text-align: left;
      }
      .status {
        margin: 0;
      }
      .manual-selected {
        margin-top: 14px;
        padding-top: 14px;
        border-top: 1pxsolidvar (--line);
        text-align: left;
      }
      .manual-selected-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-top: 8px;
        padding: 8px10px;
        border: 1pxsolidvar (--line);
        border-radius: 10px;
        background: var(--paper);
        font-size: 0.82rem;
      }
      .manual-selected-value {
        display: block;
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-weight: 600;
        text-align: left;
      }
      .manual-tool {
        margin-top: 18px;
        padding-top: 18px;
        border-top: 1pxsolidvar (--line);
      }
      .manual-toolh3 {
        margin: 0012px;
        font-family: var(--font-d);
        font-size: 1rem;
        text-align: left;
      }
      .manual-fields {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
      .manual-check-status {
        margin: 10px012px;
        font-size: 0.78rem;
        line-height: 1.5;
        color: var(--ink-60);
        text-align: left;
      }
      .send-progress {
        margin-top: 12px;
        padding: 12px;
        border: 1pxsolidvar (--line);
        border-radius: 12px;
        background: var(--paper);
      }
      .send-progress-summary,
      .send-progress-counts {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        font-size: 0.78rem;
        color: var(--ink-70);
      }
      .send-progress-summary {
        margin-bottom: 8px;
      }
      .send-progress-track {
        position: relative;
        width: 100%;
        height: 8px;
        overflow: hidden;
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.08);
      }
      .send-progress-trackspan {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, var(--orange), var(--orange-deep));
      }
      .send-progress-counts {
        margin-top: 8px;
      }
      .send-current {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 10px00;
        color: var(--ink-70);
        font-size: 0.78rem;
      }
      .send-pulse {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--orange);
        box-shadow: 0000rgba (245, 130, 31, 0.5);
        animation: pulse1.6sinfinite;
      }
      @keyframespulse {
        0% {
          box-shadow: 0000rgba (245, 130, 31, 0.45);
        }
        70% {
          box-shadow: 0008pxrgba (245, 130, 31, 0);
        }
        100% {
          box-shadow: 0000rgba (245, 130, 31, 0);
        }
      }
      @media (max-width: 900px) {
        .layout {
          grid-template-columns: 1fr;
          gap: 14px;
        }
        .compose-bar {
          flex-direction: column;
          align-items: stretch;
        }
        .actions {
          justify-content: stretch;
        }
        .actions.action {
          flex: 110;
        }
      }
      @media (max-width: 640px) {
        :host {
          padding-bottom: 22px;
        }
        .page-head {
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
        }
        .email-workspace-nav {
          margin-bottom: 14px;
          border-radius: 999px;
        }
        .email-workspace-nava {
          padding: 9px12px;
          font-size: 0.75rem;
        }
        .compose-bar {
          top: 8px;
          padding: 12px;
          border-radius: 16px;
        }
        .compose-bar.count {
          white-space: normal;
        }
        .actions {
          display: grid;
          grid-template-columns: 1fr;
          width: 100%;
        }
        .recipients,
        .composer {
          padding: 12px 10px;
          border-radius: 16px;
        }
        .manual-fields,
        .template-row {
          grid-template-columns: 1fr;
        }
        .recipient-list {
          max-height: 300px;
        }
        .fieldtextarea {
          min-height: 180px;
        }
        .recipient {
          padding: 11px 10px;
        }
        .recipient-name {
          font-size: 0.82rem;
        }
        .recipient-email {
          font-size: 0.72rem;
        }
      }
    `,
  ],
})
export class AdminEmailFollowup {
  private readonly admin = inject(AdminAuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly recipients = signal<Recipient[]>([]);
  protected readonly selectedRecipients = signal<Recipient[]>([]);
  protected readonly manualSelectedRecipients = computed(() =>
    this.selectedRecipients().filter((recipient) => recipient.manual),
  );
  protected readonly search = signal('');
  protected readonly manualEmail = signal('');
  protected readonly manualName = signal('');
  protected readonly checkedManualEmail = signal('');
  protected readonly manualEmailState = signal<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  protected readonly manualEmailMessage = signal('');
  protected readonly checkingEmail = signal(false);
  protected readonly selectedTemplate = signal<FollowupTemplate>('check-in');
  protected readonly subject = signal(EMAIL_TEMPLATES['check-in'].subject);
  protected readonly body = signal(EMAIL_TEMPLATES['check-in'].body);
  protected readonly images = signal<EmailImage[]>([]);
  protected readonly loading = signal(true);
  protected readonly uploading = signal(false);
  protected readonly sending = signal(false);
  protected readonly sendProgress = signal<SendProgress | null>(null);
  protected readonly sendFailures = signal<SendFailure[]>([]);
  protected readonly progressPercent = computed(() => {
    const progress = this.sendProgress();
    return progress ? Math.round((progress.processed / progress.total) * 100) : 0;
  });
  protected readonly error = signal('');
  protected readonly status = signal('');
  private readonly previewName = computed(() => {
    const recipient = this.selectedRecipients()[0];
    return recipient ? (recipient.name === 'Newsletter subscriber' ? '' : recipient.name) : 'Amina';
  });
  protected readonly previewHtml = computed(() =>
    this.sanitizer.bypassSecurityTrustHtml(
      renderEmailHtml(
        this.personalize(this.body(), this.previewName()),
        this.images(),
        this.personalize(this.subject(), this.previewName()),
      ),
    ),
  );
  protected readonly filtered = computed(() => {
    const search = this.search().trim().toLowerCase();
    return this.recipients().filter(
      (recipient) =>
        !search ||
        recipient.email.toLowerCase().includes(search) ||
        recipient.name.toLowerCase().includes(search),
    );
  });

  constructor() {
    const audience = this.route.snapshot.queryParamMap.get('audience');
    const signupIds = this.route.snapshot.queryParamMap.get('signupIds');
    if (audience === 'newsletter' && signupIds) {
      this.applyTemplate('newsletter');
      void this.loadNewsletterRecipients(signupIds.split(','));
    } else {
      void this.load();
    }
  }

  protected goBack(): void {
    void this.router.navigateByUrl('/admin');
  }

  protected isSelected(id: string): boolean {
    return this.selectedRecipients().some((recipient) => recipient.user_id === id);
  }

  protected toggleRecipient(recipient: Recipient, checked: boolean): void {
    this.selectedRecipients.update((selected) =>
      checked
        ? [...selected.filter((item) => item.user_id !== recipient.user_id), recipient]
        : selected.filter((item) => item.user_id !== recipient.user_id),
    );
    this.status.set('');
  }

  protected selectVisibleRecipients(): void {
    const visible = this.filtered();
    const visibleIds = new Set(visible.map((recipient) => recipient.user_id));
    const allSelected =
      visible.length > 0 && visible.every((recipient) => this.isSelected(recipient.user_id));
    this.selectedRecipients.update((selected) =>
      allSelected
        ? selected.filter((recipient) => !visibleIds.has(recipient.user_id))
        : [...selected, ...visible.filter((recipient) => !this.isSelected(recipient.user_id))],
    );
  }

  protected allVisibleSelected(): boolean {
    return (
      this.filtered().length > 0 &&
      this.filtered().every((recipient) => this.isSelected(recipient.user_id))
    );
  }

  protected applyTemplate(value: FollowupTemplate): void {
    const template = EMAIL_TEMPLATES[value];
    if (!template) return;
    this.selectedTemplate.set(value);
    this.subject.set(template.subject);
    this.body.set(template.body);
    this.error.set('');
    this.status.set('Email template loaded. Personalize it before sending.');
  }

  private personalize(value: string, name: string): string {
    const firstName = name.trim().split(/\s+/)[0] || 'there';
    return value.replace(/\{\{\s*first_name\s*\}\}/gi, firstName);
  }

  protected onManualEmailChange(value: string): void {
    this.manualEmail.set(value);
    this.checkedManualEmail.set('');
    this.manualEmailState.set('idle');
    this.manualEmailMessage.set('');
  }

  protected async checkManualEmail(): Promise<void> {
    const email = this.manualEmail().trim().toLowerCase();
    if (!email) {
      this.checkedManualEmail.set('');
      this.manualEmailState.set('idle');
      this.manualEmailMessage.set('');
      return;
    }
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.checkedManualEmail.set('');
      this.manualEmailState.set('invalid');
      this.manualEmailMessage.set('Enter a valid email address.');
      return;
    }
    if (this.selectedRecipients().some((recipient) => recipient.email.toLowerCase() === email)) {
      this.checkedManualEmail.set('');
      this.manualEmailState.set('invalid');
      this.manualEmailMessage.set('That address is already selected.');
      return;
    }

    this.checkingEmail.set(true);
    this.manualEmailState.set('checking');
    this.manualEmailMessage.set('Checking the email domain…');
    try {
      const { data, error } = await this.admin.supabase.functions.invoke('check-email-recipient', {
        body: { email },
      });
      if (error) {
        let message = error.message;
        if ('context' in error && error.context instanceof Response) {
          const response = (await error.context.json().catch(() => null)) as {
            error?: string;
          } | null;
          message = response?.error ?? message;
        }
        throw new Error(message);
      }
      if (this.manualEmail().trim().toLowerCase() !== email) return;
      this.checkedManualEmail.set(email);
      this.manualEmailState.set('valid');
      this.manualEmailMessage.set(
        'Valid address format and a domain set up to receive email. The specific inbox is not confirmed.',
      );
    } catch (error) {
      if (this.manualEmail().trim().toLowerCase() !== email) return;
      this.checkedManualEmail.set('');
      this.manualEmailState.set('invalid');
      this.manualEmailMessage.set(
        error instanceof Error ? error.message : 'Could not check this email domain.',
      );
    } finally {
      this.checkingEmail.set(false);
    }
  }

  protected addManualRecipient(): void {
    const email = this.manualEmail().trim().toLowerCase();
    if (this.manualEmailState() !== 'valid' || this.checkedManualEmail() !== email) return;
    const name = this.manualName().trim();
    if (!name) {
      this.error.set('Enter the recipient name before adding this address.');
      return;
    }
    if (this.selectedRecipients().length >= 50) {
      this.error.set('Send to no more than 50 recipients at a time.');
      return;
    }
    this.selectedRecipients.update((selected) => [
      ...selected,
      {
        user_id: `manual:${email}`,
        email,
        name,
        manual: true,
      },
    ]);
    this.manualEmail.set('');
    this.manualName.set('');
    this.checkedManualEmail.set('');
    this.manualEmailState.set('idle');
    this.manualEmailMessage.set('');
    this.error.set('');
    this.status.set(`${email} added. The selected email type will be used when you send.`);
  }

  protected removeManualRecipient(recipient: Recipient): void {
    this.selectedRecipients.update((selected) =>
      selected.filter((item) => item.email !== recipient.email),
    );
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
    if (
      !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      this.error.set('Choose a JPG, PNG, WebP, or GIF image up to 5 MB.');
      return;
    }
    this.uploading.set(true);
    this.error.set('');
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100) || 'image';
    const path = `${crypto.randomUUID()}-${safeName}`;
    try {
      const { error } = await this.admin.supabase.storage
        .from('admin-email-assets')
        .upload(path, file, {
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
    const { error } = await this.admin.supabase.storage
      .from('admin-email-assets')
      .remove([image.path]);
    if (error) {
      this.error.set('Could not remove the uploaded image.');
      return;
    }
    this.images.update((items) => items.filter((item) => item.path !== image.path));
  }

  protected async sendMail(): Promise<void> {
    if (!this.validMessage()) return;
    const recipients = [...this.selectedRecipients()];
    const total = recipients.length;
    const failedRecipients: Recipient[] = [];
    let sent = 0;
    let failed = 0;
    this.sending.set(true);
    this.status.set('');
    this.error.set('');
    this.sendFailures.set([]);
    this.sendProgress.set({ total, processed: 0, sent, failed, current: recipients[0].email });
    try {
      for (const [index, recipient] of recipients.entries()) {
        this.sendProgress.update((progress) =>
          progress ? { ...progress, current: recipient.email } : progress,
        );
        let failure: SendFailure | null = null;
        try {
          const { data, error } = await this.admin.supabase.functions.invoke('send-admin-email', {
            body: {
              recipients: [
                { email: recipient.email, name: recipient.name, manual: recipient.manual === true },
              ],
              subject: this.subject(),
              body: this.body(),
              emailType: this.selectedTemplate(),
              images: this.images().map(({ name, url }) => ({ name, url })),
            },
          });
          if (error) {
            let message = error.message;
            if ('context' in error && error.context instanceof Response) {
              const response = (await error.context.json().catch(() => null)) as {
                error?: string;
              } | null;
              message = response?.error ?? message;
            }
            throw new Error(message);
          }
          if (data?.sent === true) {
            sent += 1;
          } else {
            failure = {
              email: recipient.email,
              name: recipient.name,
              message: data?.error ?? 'Delivery failed.',
              status: data?.status === 'unknown' ? 'unknown' : 'failed',
            };
          }
        } catch (error) {
          failure = {
            email: recipient.email,
            name: recipient.name,
            message: error instanceof Error ? error.message : 'Delivery could not be confirmed.',
            status: 'unknown',
          };
          await this.recordUnconfirmedSend(recipient, failure.message);
        }
        if (failure) {
          failed += 1;
          if (failure.status === 'failed') failedRecipients.push(recipient);
          this.sendFailures.update((items) => [...items, failure!]);
        }
        this.sendProgress.set({ total, processed: index + 1, sent, failed, current: '' });
      }

      this.selectedRecipients.set(failedRecipients);
      this.status.set(
        failed
          ? `${sent} of ${total} delivered. ${failed} failed or unconfirmed; confirmed failures remain selected for retry.`
          : `All ${sent} emails sent successfully.`,
      );
    } finally {
      this.sending.set(false);
    }
  }

  private async recordUnconfirmedSend(recipient: Recipient, message: string): Promise<void> {
    const { data } = await this.admin.supabase.auth.getUser();
    if (!data.user) return;
    await this.admin.supabase.from('email_send_history').insert({
      admin_user_id: data.user.id,
      recipient_email: recipient.email,
      recipient_name: recipient.name || 'there',
      email_type: this.selectedTemplate(),
      subject: this.personalize(this.subject(), recipient.name),
      body: this.personalize(this.body(), recipient.name),
      images: this.images().map(({ name, url }) => ({ name, url })),
      status: 'unknown',
      error_message: message,
    });
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
      this.error.set(
        'Could not load registered users. Check the admin profile policy and try again.',
      );
    } finally {
      this.loading.set(false);
    }
  }
}
