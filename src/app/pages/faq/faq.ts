import { Component, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

export type FaqCatKey = 'sourcing' | 'payment' | 'shipping' | 'quality';

export interface FaqItem {
  id: string;
  q: string;
  a: string;
}

export interface FaqGroup {
  key: FaqCatKey;
  label: string;
  n: string;
  lead: string;
  items: FaqItem[];
}

@Component({
  selector: 'app-faq',
  imports: [RouterLink],
  templateUrl: './faq.html',
})
export class Faq {
  private readonly route = inject(ActivatedRoute);

  protected readonly openId = signal<string | null>(null);
  private readonly heights: Record<string, string> = {};

  readonly activeCat = signal<FaqCatKey>('sourcing');
  readonly setCat = (k: FaqCatKey) => {
    this.activeCat.set(k);
  };

  readonly groups: FaqGroup[] = [
    {
      key: 'sourcing',
      n: '01',
      label: 'Sourcing Basics',
      lead: 'How sourcing works with Izuire, what MOQ means, and what you can (and can\'t) buy through us.',
      items: [
        { id: 'moq', q: 'What is MOQ?', a: 'MOQ stands for Minimum Order Quantity, the smallest amount of a product a supplier will produce or sell in one order. MOQs vary by product and factory; we negotiate the lowest workable MOQ for your order and flag it clearly on every quote.' },
        { id: 'not-listed', q: 'Can I source products not listed on your site?', a: 'Yes. Our marketplace shows trending and popular items, but most of what we source is requested directly. Send us a product photo, link, or description through the Request a Quote form and we\'ll find it.' },
        { id: 'direct', q: 'Can I buy directly from manufacturers?', a: 'We work directly with factories and wholesale markets on your behalf — you don\'t need your own relationship with a manufacturer. This is the core of what Izuire does: we negotiate, inspect and manage the supplier relationship for you.' },
      ],
    },
    {
      key: 'payment',
      n: '02',
      label: 'Payment & Pricing',
      lead: 'How our pricing works, what fees we charge (and what we don\'t), and how payment flows on a typical order.',
      items: [
        { id: 'cost', q: 'How much does sourcing cost?', a: 'There\'s no upfront fee to request a quote. Our margin is built into the pricing we quote you — so the price you see is the price you pay, no surprise sourcing fees added later.' },
        { id: 'payment', q: 'How does payment work?', a: 'Once you approve a quote, we share payment instructions and a proforma invoice. Depending on the order, payment may be split: a deposit to begin production or purchase, with the balance due before shipping. Full terms are confirmed on your specific quote.' },
      ],
    },
    {
      key: 'shipping',
      n: '03',
      label: 'Shipping & Delivery',
      lead: 'Transit times, destinations we serve, and how air vs. sea compares for typical orders.',
      items: [
        { id: 'shipping-time', q: 'How long does shipping take?', a: 'Air freight typically takes days to just over a week door-to-door; sea freight typically takes several weeks depending on the destination and consolidation schedule. Exact timelines are confirmed when we prepare your shipping quote — see our Shipping &amp; Logistics page for more detail.' },
        { id: 'outside-nigeria', q: 'Can you ship outside Nigeria?', a: 'Yes. While most of our current buyers are in Nigeria, our sourcing and shipping process is built to serve importers across Africa. Tell us your destination when requesting a quote and we\'ll confirm logistics.' },
      ],
    },
    {
      key: 'quality',
      n: '04',
      label: 'Quality & Beyond',
      lead: 'Quality checks before orders ship, plus white-labeling, custom branding, and what you can customize.',
      items: [
        { id: 'inspect', q: 'Do you inspect products before shipping?', a: 'Yes. Every order goes through a quality check before it leaves China, and we send photo or video proof so you can confirm before it ships.' },
        { id: 'customize', q: 'Can you customize or brand products?', a: 'Yes — white labeling and custom packaging / branding are available on eligible products and order volumes. Let us know your requirements when you request a quote.' },
      ],
    },
  ];

  @ViewChild('catsWrap', { read: ElementRef, static: false }) private catsWrap?: ElementRef<HTMLDivElement>;

  constructor() {
    this.route.fragment.subscribe((fragment) => {
      if (!fragment) return;
      setTimeout(() => {
        const item = document.getElementById(fragment);
        if (item?.classList.contains('faq-item')) {
          this.toggle(fragment);
          setTimeout(() => item.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200);
        }
      }, 0);
    });
  }

  protected isOpen(id: string): boolean {
    return this.openId() === id;
  }

  protected maxHeight(id: string): string | null {
    return this.isOpen(id) ? (this.heights[id] ?? null) : null;
  }

  protected toggle(id: string): void {
    if (this.isOpen(id)) {
      this.openId.set(null);
      return;
    }
    this.openId.set(id);
    const answer = document.getElementById(id)?.querySelector('.faq-a') as HTMLElement | null;
    if (answer) this.heights[id] = answer.scrollHeight + 'px';
  }

  protected scrollToGroup(key: string): void {
    this.activeCat.set(key as FaqCatKey);
    const el = document.getElementById('grp-' + key);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
