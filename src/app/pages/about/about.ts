import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-about',
  imports: [RouterLink],
  templateUrl: './about.html',
})
export class About {
  readonly story = [
    {
      tag: 'The gap',
      year: 'The problem',
      title: 'The trade gap we saw firsthand',
      body: 'Izuire Co. Ltd. was founded to close a gap that shows up again and again for African importers: finding reliable Chinese suppliers, verifying quality before money changes hands, and getting goods home without losing money in the process. Too many good businesses failed or stalled over a bad sourcing experience they couldn\'t have seen coming.',
    },
    {
      tag: 'Guangzhou ops',
      year: 'Our base',
      title: 'Setting up shop inside Guangzhou\'s markets',
      body: 'We put our operational team on the ground in Guangzhou, inside the wholesale markets and factory networks of one of the world\'s largest manufacturing hubs. Being physically where the sourcing happens — not working through intermediaries — is what lets us see quality issues before they ship and negotiate pricing most importers can\'t get on their own.',
    },
    {
      tag: 'CAC registered',
      year: 'Back home',
      title: 'Registered in Nigeria, accountable at home',
      body: 'Izuire Co. Ltd. is registered with Nigeria\'s Corporate Affairs Commission (CAC), with scope covering importation, exportation, and general trading of consumer goods and merchandise. Our Onitsha roots mean we stay close to the realities of the African businesses we serve — pricing, clearing, last-mile, payment flows — not just the factory side of the trade.',
    },
    {
      tag: 'Onitsha HQ',
      year: 'Our office',
      title: 'A home base in Onitsha Main Market',
      body: 'Our registered office sits at Shop No. GFQ 53, Happy Baby Line, Young Shall Grow Plaza, Main Market, Onitsha, Anambra State. It\'s the face our customers know and the address they can walk into if they need to speak with someone directly about an order, a payment, or a delivery issue.',
    },
    {
      tag: 'Growing network',
      year: 'Today',
      title: 'Serving Africa, one order at a time',
      body: 'While our roots are Nigeria-first, our sourcing and logistics network is built to serve importers across the wider African market. Lagos, Abuja, Accra, Douala, Nairobi — wherever your business is, if you need reliable sourcing out of China, we can build the route.',
    },
  ];

  readonly values = [
    {
      n: '01',
      name: 'Our Mission',
      body: 'To give African buyers direct, trustworthy access to Chinese manufacturers, with sourcing, quality control and logistics handled end-to-end — so that sourcing isn\'t the bottleneck in growing a business.',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
    },
    {
      n: '02',
      name: 'Our Vision',
      body: 'To be the most trusted bridge for China-to-Africa trade, known for transparency where the industry has historically had none. Pricing you can audit, timelines you can rely on, and a person you can reach when something needs answering.',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    },
    {
      n: '03',
      name: 'What makes us different',
      body: 'A team physically based in Guangzhou, direct supplier relationships built over years in the market, and a straightforward process. No middlemen stacking markups you can\'t see, no hidden fees, and no phone calls that go unanswered for three days.',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/></svg>',
    },
  ];

  readonly presence = [
    {
      n: '01',
      name: 'Guangzhou, China',
      body: 'Our operational base, where sourcing, supplier negotiation and quality inspection happen. We walk the factories and markets so you don\'t have to.',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/></svg>',
    },
    {
      n: '02',
      name: 'Onitsha, Nigeria',
      body: 'Our registered office — Shop No. GFQ 53, Happy Baby Line, Young Shall Grow Plaza, Main Market, Onitsha, Anambra State. Walk in anytime.',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/></svg>',
    },
    {
      n: '03',
      name: 'Serving Africa',
      body: 'While our roots are in Nigeria, our sourcing and logistics network is built to serve importers across the wider African market — send us your destination.',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h18M3 6h18M3 18h18"/></svg>',
    },
  ];
}
