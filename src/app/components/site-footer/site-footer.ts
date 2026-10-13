import { Component, inject, OnDestroy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LOGO_SRC } from '../../logo';
import { UiService } from '../../services/ui.service';
import { LegalDocId } from '../../services/legal-content';
import { SupabaseService } from '../../services/supabase.service';

/** Site footer, reproduced 1:1 from the original pages. */
@Component({
  selector: 'app-site-footer',
  imports: [RouterLink],
  templateUrl: './site-footer.html',
  styles: [`
    .footer-newsletter{display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,440px);align-items:center;gap:28px;padding:26px 0;border-bottom:1px solid var(--f-line)}
    .footer-newsletter h2{margin:0 0 5px;font-family:var(--font-d);font-size:1rem;color:var(--f-strong)}
    .footer-newsletter p{margin:0;color:var(--f-body);font-size:.82rem;line-height:1.5}
    .newsletter-form{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}
    .newsletter-form input[type=email]{min-width:0;height:42px;padding:0 12px;border:1px solid var(--f-line);border-radius:5px;background:var(--white);color:var(--ink);font:inherit}
    .newsletter-form button{height:42px;padding:0 14px;border:0;border-radius:5px;background:var(--orange);color:var(--white);font-family:var(--font-d);font-weight:700;cursor:pointer}
    .newsletter-form button:disabled{opacity:.55;cursor:default}
    .consent{grid-column:1/-1;display:flex;align-items:center;gap:8px;color:var(--f-body);font-size:.75rem}
    .consent input{accent-color:var(--orange)}
    .newsletter-status{grid-column:1/-1;margin:0;color:var(--f-strong);font-size:.78rem}
    .newsletter-status.is-error{color:#a32929}
    @media(max-width:620px){.footer-newsletter{grid-template-columns:1fr;gap:15px}}
  `],
})
export class SiteFooter implements OnDestroy {
  private readonly ui = inject(UiService);
  private readonly backend = inject(SupabaseService);

  protected readonly year = new Date().getFullYear();
  protected readonly newsletterEmail = signal('');
  protected readonly newsletterConsent = signal(false);
  protected readonly newsletterBusy = signal(false);
  protected readonly newsletterMessage = signal('');
  protected readonly newsletterError = signal(false);
  protected readonly featureNotice = signal<string | null>(null);
  private noticeTimer: ReturnType<typeof setTimeout> | undefined;
  /** The wordmark, from the one shared copy in logo.ts. */
  protected readonly logo = LOGO_SRC;

  /**
   * Hand the document to the modal at the app root rather than opening one here.
   * The two are siblings with no parent-child relationship, so the shared signal
   * is how they talk — the same arrangement the header and search overlay use.
   */
  protected openLegal(id: LegalDocId): void {
    this.ui.openLegal(id);
  }

  protected showFeatureNotice(feature: string): void {
    this.featureNotice.set(`${feature} feature will be available soon.`);
    clearTimeout(this.noticeTimer);
    this.noticeTimer = setTimeout(() => this.featureNotice.set(null), 3000);
  }

  ngOnDestroy(): void {
    clearTimeout(this.noticeTimer);
  }

  /**
   * The mark signs itself again when it is clicked, exactly as the header's does:
   * the link is left alone, so the click still goes home and the animation plays
   * over the top of the navigation rather than holding it back.
   */
  protected async subscribe(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const email = this.newsletterEmail().trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      this.setNewsletterMessage('Enter a valid email address.', true);
      return;
    }
    if (!this.newsletterConsent()) {
      this.setNewsletterMessage('Confirm you would like to receive email updates.', true);
      return;
    }
    this.newsletterBusy.set(true);
    this.newsletterMessage.set('');
    try {
      const { error } = await this.backend.supabase.from('newsletter_signups').insert({ email });
      if (error?.code === '23505') {
        this.setNewsletterMessage('This email is already subscribed.', false);
      } else if (error) {
        throw error;
      } else {
        this.setNewsletterMessage('You are subscribed. Thank you.', false);
        this.newsletterEmail.set('');
        this.newsletterConsent.set(false);
      }
    } catch {
      this.setNewsletterMessage('Could not save your signup. Please try again.', true);
    } finally {
      this.newsletterBusy.set(false);
    }
  }

  private setNewsletterMessage(message: string, isError: boolean): void {
    this.newsletterMessage.set(message);
    this.newsletterError.set(isError);
  }
}
