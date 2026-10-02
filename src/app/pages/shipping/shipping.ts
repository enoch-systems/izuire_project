import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Breadcrumb } from '../../components/breadcrumb/breadcrumb';

const mkWords = (t: string): string[] => t.trim().split(/\s+/);

@Component({
  selector: 'app-shipping',
  imports: [RouterLink, Breadcrumb],
  templateUrl: './shipping.html',
})
export class Shipping {
  protected readonly l = signal(0);
  protected readonly w = signal(0);
  protected readonly h = signal(0);
  protected readonly qty = signal(0);

  protected readonly cbm = computed(() => {
    const per = (this.l() / 100) * (this.w() / 100) * (this.h() / 100);
    return (per * (this.qty() || 1)).toFixed(2);
  });

  protected onInput(which: 'l' | 'w' | 'h' | 'qty', event: Event): void {
    const value = parseFloat((event.target as HTMLInputElement).value) || 0;
    if (which === 'l') this.l.set(value);
    if (which === 'w') this.w.set(value);
    if (which === 'h') this.h.set(value);
    if (which === 'qty') this.qty.set(value);
  }

  readonly steps = [
    {
      n: '01',
      chapter: 'Step 01, Consolidate',
      title: 'Packing & consolidation at our Guangzhou warehouse',
      body: mkWords('Your order is inspected, packed, and consolidated with the right commercial invoice, packing list and shipping documentation at our Guangzhou warehouse. We consolidate multiple suppliers into one shipment where it saves you money.'),
      perk: 'Combining orders from 2+ suppliers into one container typically saves 25–40% on per-unit freight.',
    },
    {
      n: '02',
      chapter: 'Step 02, Book',
      title: 'Freight booking on the right route for your timeline',
      body: mkWords('We book air or sea freight based on your timeline, budget and shipment volume. No "one size fits all", we compare routes, lines, and current capacity to get the best option for that specific week.'),
      perk: 'Freight rates change weekly. We quote the live rate, not a stale catalogue price from 6 months ago.',
    },
    {
      n: '03',
      chapter: 'Step 03, Clear',
      title: 'Import documentation & customs clearance on arrival',
      body: mkWords('SONCAP, form M, PAAR, duty assessments, and customs coordination on arrival. We work with licensed clearing agents we\'ve used for years so the paperwork matches the cargo and nothing gets stuck at the port over an avoidable issue.'),
      perk: 'Documentation mismatches are the #1 cause of clearance delays. We catch them before the ship sails, not when it docks.',
    },
    {
      n: '04',
      chapter: 'Step 04, Deliver',
      title: 'Last-mile delivery to your destination city',
      body: mkWords('Once cleared, your cargo is trucked to Lagos, Onitsha, Abuja, or wherever you are in Nigeria or beyond. You get tracking updates at each leg, so you know when to expect delivery instead of guessing.'),
      perk: 'Door-to-door delivery to Onitsha and the Southeast uses established overland routes we run every week.',
    },
  ];

  readonly methods = [
    {
      n: '01',
      name: 'Air Freight',
      tagline: 'Fastest, days to just over a week',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92V14l-8.5-5V5.5a1.5 1.5 0 10-3 0V9L2 14v2.92l8.5-2.42V19L8 20l.5 1.5L12 20.5 15.5 21.5 15 20l-2.5-1v-4.5L22 16.92z"/></svg>',
      rows: [
        ['Cost', 'Higher cost per kg, predictable pricing per weight'],
        ['Best for', 'Urgent, lightweight, or smaller orders under ~500kg'],
        ['Typical use', 'Samples, electronics, urgent restocks, fashion retail'],
      ],
    },
    {
      n: '02',
      name: 'Sea Freight',
      tagline: 'Slower, best value at volume',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 21l1.5-3h17L22 21M4 18l4-10h8l4 10M8.5 8l1.5-4h4l1.5 4M5 18c2 1 4.5 2 7 2s5-1 7-2"/></svg>',
      rows: [
        ['Cost', 'More cost-effective at volume, priced per CBM or per container'],
        ['Best for', 'Bulk orders and larger CBM shipments (1 CBM+ or full containers)'],
        ['Typical use', 'Thrift bales, building materials, bulk merchandise, furniture'],
      ],
    },
  ];

  readonly destinations = [
    {
      n: '01',
      name: 'Lagos',
      body: 'Nigeria\'s primary port of entry, our most common destination for both air and sea shipments, with on-demand clearing and delivery from the ports.',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/></svg>',
    },
    {
      n: '02',
      name: 'Onitsha & Southeast',
      body: 'Home to our registered office, with established weekly overland routes for onward delivery from Lagos Apapa and Tin Can ports.',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/></svg>',
    },
    {
      n: '03',
      name: 'Africa Wide',
      body: 'Shipping beyond Nigeria is available to most major West and Central African destinations, tell us your destination and we\'ll confirm logistics and pricing.',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/></svg>',
    },
  ];
}
