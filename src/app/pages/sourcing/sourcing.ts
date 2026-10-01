import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

const mkWords = (text: string): string[] =>
  text.trim().split(/\s+/);

@Component({
  selector: 'app-sourcing',
  imports: [RouterLink],
  templateUrl: './sourcing.html',
})
export class Sourcing {
  readonly clusters = [
    {
      n: '01',
      title: 'Product Sourcing',
      body: 'Tell us what you need, a photo, a link, or a description, and we track it down across Guangzhou\'s markets and factories.',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 21l-4.3-4.3M19 11a8 8 0 11-16 0 8 8 0 0116 0z"/></svg>',
    },
    {
      n: '02',
      title: 'Manufacturer Sourcing',
      body: 'For larger or custom orders, we go straight to the factory floor, connecting you with manufacturers, not just middlemen.',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>',
    },
    {
      n: '03',
      title: 'Supplier Verification',
      body: 'Every supplier we work with is checked for legitimacy, capacity and track record before your order goes anywhere near them.',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
    },
    {
      n: '04',
      title: 'Price Negotiation',
      body: 'We negotiate on your behalf using market knowledge you likely don\'t have access to on your own, and pass the savings to you.',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>',
    },
    {
      n: '05',
      title: 'MOQ Assistance',
      body: 'Minimum order quantities can make or break a first order. We negotiate lower MOQs where possible, or help you consolidate to meet them.',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
    },
    {
      n: '06',
      title: 'Quality Control',
      body: 'Standards are agreed upfront, and production is checked against them, not left to chance until the goods arrive at your door.',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/></svg>',
    },
    {
      n: '07',
      title: 'Product Inspection',
      body: 'Every order is physically inspected before it ships, with photo and video proof sent to you for sign-off.',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    },
    {
      n: '08',
      title: 'White Labeling',
      body: 'Put your own brand on eligible products, from private-label packaging to fully custom manufacturing runs.',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41L11 3.83V3H3v8h.83l9.58 9.59a2 2 0 002.83 0l4.35-4.35a2 2 0 000-2.83z"/></svg>',
    },
    {
      n: '09',
      title: 'Packaging & Branding',
      body: 'Custom boxes, labels, and inserts, designed and produced to match how you want to present the product to your customers.',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8L12 3 3 8m18 0l-9 5m9-5v10l-9 5M3 8l9 5m-9-5v10l9 5"/></svg>',
    },
    {
      n: '10',
      title: 'Order Monitoring',
      body: 'You get visibility into where your order stands, from production through inspection, instead of radio silence until it ships.',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
    },
    {
      n: '11',
      title: 'Shipping Coordination',
      body: 'We handle freight booking, documentation and customs coordination so your order moves without you chasing three different parties.',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"/></svg>',
    },
  ];

  readonly steps = [
    {
      n: '01',
      chapter: 'Chapter 01 — Brief',
      title: 'You tell us what you need',
      body: mkWords('Product, quantity, spec, target price — send as much or as little detail as you have. A photo, an AliExpress link, a hand-drawn sketch, whatever you\'ve got. We\'ll fill in the blanks.'),
      perk: 'Tip: Share a reference image or competitor link — it cuts discovery time in half.',
    },
    {
      n: '02',
      chapter: 'Chapter 02 — Source',
      title: 'We source the market & send you a quote',
      body: mkWords('We pull options from our vetted supplier network, compare pricing and lead times, and come back with a clear quote: unit price, MOQ, production time, and the trade-offs between suppliers.'),
      perk: 'You get 2–3 supplier options minimum, not just one locked-in choice.',
    },
    {
      n: '03',
      chapter: 'Chapter 03 — Approve',
      title: 'You approve & we lock production',
      body: mkWords('Confirm the quote, the supplier, and the terms. We handle deposit payment, spec sheets, sample requests and production kick-off so nothing moves without your sign-off.'),
      perk: 'Samples available on 90% of orders — test before you commit to bulk.',
    },
    {
      n: '04',
      chapter: 'Chapter 04 — Inspect',
      title: 'Quality check & inspection sign-off',
      body: mkWords('Production doesn\'t finish and ship without a physical check. Our QC team inspects against the agreed spec, sends photo + video proof, and only clears the order when you\'re happy.'),
      perk: 'Defects found at this stage get fixed on the factory floor — not discovered in your warehouse.',
    },
    {
      n: '05',
      chapter: 'Chapter 05 — Deliver',
      title: 'We consolidate & ship to your door',
      body: mkWords('The order is consolidated, packed, booked on the best air/sea option for your timeline, and tracked door-to-door. Customs docs, freight, and local delivery — all handled end-to-end.'),
      perk: 'Shipping passes through at our group rates, typically 15–30% below what you\'d book alone.',
    },
  ];
}
