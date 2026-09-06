import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

const WHATSAPP_NUMBER = '2340000000000';
const CONTACT_EMAIL = 'hello@izuire.com';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Request-a-quote page. Reproduces the original RFQ form: required
 * category/quantity/phone/email validation, success banner, and
 * submission via a prefilled WhatsApp message or a mailto: link.
 */
@Component({
  selector: 'app-quote',
  imports: [FormsModule, RouterLink],
  templateUrl: './quote.html',
})
export class Quote {
  protected rfqCategory = '';
  protected rfqQty = '';
  protected rfqSpecs = '';
  protected rfqPrice = '';
  protected rfqDestination = '';
  protected rfqShipMethod = '';
  protected rfqPhone = '';
  protected rfqEmail = '';
  protected rfqDetails = '';

  protected readonly submitted = signal(false);
  protected readonly success = signal(false);

  protected categoryInvalid(): boolean {
    return this.rfqCategory.trim().length === 0;
  }

  protected qtyInvalid(): boolean {
    return this.rfqQty.trim().length === 0;
  }

  protected phoneInvalid(): boolean {
    return this.rfqPhone.trim().length === 0;
  }

  protected emailInvalid(): boolean {
    const value = this.rfqEmail.trim();
    return value.length === 0 || !EMAIL_RE.test(value);
  }

  private buildMessage(): string {
    const lines = [
      'Hi IZUIRE, I would like to request a quote:',
      'Product/Category: ' + this.rfqCategory.trim(),
      'Quantity: ' + this.rfqQty.trim(),
    ];
    if (this.rfqSpecs.trim()) lines.push('Specifications: ' + this.rfqSpecs.trim());
    if (this.rfqPrice.trim()) lines.push('Target Price: ' + this.rfqPrice.trim());
    if (this.rfqDestination.trim()) lines.push('Destination: ' + this.rfqDestination.trim());
    if (this.rfqShipMethod) lines.push('Preferred Shipping: ' + this.rfqShipMethod);
    if (this.rfqDetails.trim()) lines.push('Details: ' + this.rfqDetails.trim());
    lines.push('Contact phone: ' + this.rfqPhone.trim());
    lines.push('Contact email: ' + this.rfqEmail.trim());
    return lines.join('\n');
  }

  private validate(): boolean {
    const valid = !this.categoryInvalid() && !this.qtyInvalid() && !this.phoneInvalid() && !this.emailInvalid();
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
      'mailto:' + CONTACT_EMAIL + '?subject=' + encodeURIComponent('RFQ: ' + this.rfqCategory.trim()) + '&body=' + encodeURIComponent(this.buildMessage());
  }
}
