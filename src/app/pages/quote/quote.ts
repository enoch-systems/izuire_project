import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectField, SelectOption } from '../../components/select-field/select-field';
import { Breadcrumb } from '../../components/breadcrumb/breadcrumb';

const WHATSAPP_NUMBER = '2340000000000';
const CONTACT_EMAIL = 'hello@izuire.com';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The one list entry no fixed set of options can cover. */
const OTHER = 'Other';

/**
 * A list, lifted into the shape the dropdown on this page takes. Every one of
 * these reads the same in the trigger as it does in the panel, so the value and
 * the label are deliberately the same word — one list, written once.
 */
const options = (values: string[]): SelectOption[] => values.map((value) => ({ value, label: value }));

/** What people actually buy through us, phrased the way a buyer would say it. */
const CATEGORIES = options([
  'Electronics & phone accessories',
  'Fashion & clothing',
  'Okrika (second-hand) bales',
  'Hair & wigs',
  'Beauty & cosmetics',
  'Home & kitchenware',
  'Building materials',
  'Solar equipment',
  'Furniture & decor',
  'Auto parts',
  OTHER,
]);

/** Most buyers know the size of an order, not the exact count, so bands it is. */
const QUANTITIES = options([
  '1 – 49 units',
  '50 – 199 units',
  '200 – 499 units',
  '500 – 999 units',
  '1,000 – 4,999 units',
  '5,000+ units',
]);

/** Where the goods land. Ports and the big inland markets cover most of our buyers. */
const DESTINATIONS = options([
  'Lagos',
  'Abuja',
  'Port Harcourt',
  'Onitsha',
  'Ibadan',
  'Kano',
  'Benin City',
  'Accra',
  'Kampala',
  'Dar es Salaam',
  OTHER,
]);

/** The three ways we move goods. A choice, not an answer, so it is optional. */
const SHIPPING_METHODS = options(['Air freight', 'Sea freight', 'Sea LCL']);

/** One step of the form. `optional` steps open on their own rather than gating the send. */
interface QuoteStep {
  n: number;
  title: string;
  optional: boolean;
}

/** The steps, in the order they are read. Steps 1 and 3 own the required fields. */
const STEPS: QuoteStep[] = [
  { n: 1, title: 'What you need', optional: false },
  { n: 2, title: 'Shipping', optional: true },
  { n: 3, title: 'How to reach you', optional: false },
];

/**
 * Request-a-quote page. Everything the visitor can answer from a list is a
 * dropdown — category, quantity, destination, shipping method — because those are
 * choices, not things to be typed, and picking one beats spelling it. They are
 * drawn by `SelectField` rather than by the platform, so the list opens under
 * the field, follows the arrows and keeps a tick on the standing answer. Text is
 * left only where there is genuinely no fixed set of answers: the product name
 * behind "Other", free-form details, and the two ways to reach you.
 *
 * Required category/quantity/phone/email validation, the success banner, and
 * submission via a prefilled WhatsApp message or a mailto: link are unchanged.
 */
@Component({
  selector: 'app-quote',
  imports: [FormsModule, SelectField, Breadcrumb],
  templateUrl: './quote.html',
})
export class Quote {
  protected rfqCategory = '';
  protected rfqProduct = '';
  protected rfqQty = '';
  protected rfqDetails = '';
  protected rfqDestination = '';
  protected rfqOtherPlace = '';
  protected rfqShipMethod = '';
  protected rfqPrice = '';
  protected rfqPhone = '';
  protected rfqEmail = '';

  protected readonly submitted = signal(false);
  protected readonly success = signal(false);

  /** The steps, for the rail and the cards. */
  protected readonly steps = STEPS;

  protected readonly categories = CATEGORIES;
  protected readonly quantities = QUANTITIES;
  protected readonly destinations = DESTINATIONS;
  protected readonly shippingMethods = SHIPPING_METHODS;

  /** Shown next to the email fallback link, so the two cannot drift apart. */
  protected readonly contactEmail = CONTACT_EMAIL;

  /** Whether the optional shipping block is unfolded. Closed by default: nothing in
   *  it is required, and a form that opens with four steps of noise reads heavier
   *  than the two questions that actually matter. */
  protected readonly shippingOpen = signal(false);

  /** The product as it should read in the message. "Other" carries the typed name
   *  instead of the literal word, so nobody is quoted back "Category: Other". */
  protected productLabel(): string {
    return this.rfqCategory === OTHER ? this.rfqProduct.trim() : this.rfqCategory.trim();
  }

  /** Same for the destination. */
  protected destinationLabel(): string {
    return this.rfqDestination === OTHER ? this.rfqOtherPlace.trim() : this.rfqDestination.trim();
  }

  protected categoryInvalid(): boolean {
    return this.productLabel().length === 0;
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

  /** How many of the four required fields are answered, 0-4. Drives the meter. */
  protected requiredFilled(): number {
    return [this.categoryInvalid(), this.qtyInvalid(), this.phoneInvalid(), this.emailInvalid()].filter(
      (invalid) => !invalid,
    ).length;
  }

  /** How far through the form the visitor is, 0-1. */
  protected progress(): number {
    return this.requiredFilled() / 4;
  }

  /** True when the request can actually be sent. */
  protected ready(): boolean {
    return this.requiredFilled() === 4;
  }

  /**
   * The request as it stands, read back to the visitor in the strip above the
   * send button. Only what has actually been answered goes in, so the strip
   * fills as they work rather than sitting there announcing empty slots — and
   * a choice made two steps up is still visible from the bottom of the form.
   */
  protected previewChips(): string[] {
    const chips: string[] = [];
    if (this.productLabel()) chips.push(this.productLabel());
    if (this.rfqQty.trim()) chips.push(this.rfqQty.trim());
    if (this.destinationLabel()) chips.push(this.destinationLabel());
    if (this.rfqShipMethod) chips.push(this.rfqShipMethod);
    if (this.rfqPrice.trim()) chips.push('Target ' + this.rfqPrice.trim());
    return chips;
  }

  /**
   * Whether a step has everything it needs. Steps 1 and 3 own the required fields
   * and fill their rule as they are answered; step 2 is optional, so its rule
   * only ever fills if the visitor has put something in it — it should not claim
   * to be done just because it was left alone.
   */
  protected stepReady(n: number): boolean {
    if (n === 1) {
      return !this.categoryInvalid() && !this.qtyInvalid();
    }
    if (n === 2) {
      return (
        this.destinationLabel().length > 0 ||
        this.rfqShipMethod.length > 0 ||
        this.rfqPrice.trim().length > 0
      );
    }
    return !this.phoneInvalid() && !this.emailInvalid();
  }

  /** A step's title, so the rail and the card cannot drift apart. */
  protected step(n: number): QuoteStep {
    return STEPS[n - 1];
  }

  /** The WhatsApp / email body. Only what was actually answered goes in it. */
  private buildMessage(): string {
    const lines = [
      'Hi IZUIRE, I would like to request a quote:',
      'Product: ' + this.productLabel(),
      'Quantity: ' + this.rfqQty.trim(),
    ];
    if (this.rfqDetails.trim()) lines.push('Details: ' + this.rfqDetails.trim());
    if (this.rfqPrice.trim()) lines.push('Target Price: ' + this.rfqPrice.trim());
    if (this.destinationLabel()) lines.push('Destination: ' + this.destinationLabel());
    if (this.rfqShipMethod) lines.push('Preferred Shipping: ' + this.rfqShipMethod);
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
      'mailto:' + CONTACT_EMAIL + '?subject=' + encodeURIComponent('RFQ: ' + this.productLabel()) + '&body=' + encodeURIComponent(this.buildMessage());
  }
}
