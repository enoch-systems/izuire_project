import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

const WHATSAPP_NUMBER = '2340000000000';
const CONTACT_EMAIL = 'hello@izuire.com';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Contact page. Reproduces the original contact form: required
 * name/email/message validation (email format checked), success banner,
 * and submission via a prefilled WhatsApp message or a mailto: link.
 */
@Component({
  selector: 'app-contact',
  imports: [FormsModule, RouterLink],
  templateUrl: './contact.html',
})
export class Contact {
  protected cName = '';
  protected cEmail = '';
  protected cPhone = '';
  protected cMessage = '';

  protected readonly submitted = signal(false);
  protected readonly success = signal(false);

  protected nameInvalid(): boolean {
    return this.cName.trim().length === 0;
  }

  protected emailInvalid(): boolean {
    const value = this.cEmail.trim();
    return value.length === 0 || !EMAIL_RE.test(value);
  }

  protected messageInvalid(): boolean {
    return this.cMessage.trim().length === 0;
  }

  private buildMessage(): string {
    const lines = ['Hi IZUIRE, my name is ' + this.cName.trim() + '.', this.cMessage.trim()];
    if (this.cPhone.trim()) lines.push('Phone: ' + this.cPhone.trim());
    lines.push('Email: ' + this.cEmail.trim());
    return lines.join('\n');
  }

  private validate(): boolean {
    const valid = !this.nameInvalid() && !this.emailInvalid() && !this.messageInvalid();
    this.submitted.set(!valid);
    return valid;
  }

  protected submit(): void {
    if (!this.validate()) return;
    this.success.set(true);
    window.open('https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(this.buildMessage()), '_blank');
  }

  protected sendEmail(event: Event): void {
    event.preventDefault();
    if (!this.validate()) return;
    this.success.set(true);
    window.location.href =
      'mailto:' + CONTACT_EMAIL + '?subject=' + encodeURIComponent('Website Inquiry') + '&body=' + encodeURIComponent(this.buildMessage());
  }
}
