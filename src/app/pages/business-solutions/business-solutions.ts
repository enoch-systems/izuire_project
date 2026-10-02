import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Breadcrumb } from '../../components/breadcrumb/breadcrumb';

export type PathKey = 'new' | 'existing' | 'retail' | 'wholesale' | 'corp' | 'bulk';

@Component({
  selector: 'app-business-solutions',
  imports: [RouterLink, Breadcrumb],
  templateUrl: './business-solutions.html',
})
export class BusinessSolutions {
  readonly active = signal<PathKey>('new');
  readonly setActive = (k: PathKey) => this.active.set(k);

  readonly paths: { key: PathKey; n: string; label: string; eyebrow: string; title: string; lead: string; features: string[] }[] = [
    {
      key: 'new',
      n: '01',
      label: 'New Importers',
      eyebrow: 'First-time buyers',
      title: 'Your first import, hand-held from start to finish',
      lead: 'Sourcing from China for the first time? We take care of the parts that trip up first-timers, supplier vetting, quality control, and customs coordination, so your first order goes smoothly and builds a base of good suppliers for the next one.',
      features: [
        'Guided first-order walkthrough, a real person explains each step before anything moves',
        'Lower-risk MOQs where possible, or consolidation with other buyers to hit minimums',
        'Full quality inspection before shipping, with photo proof of every box',
      ],
    },
    {
      key: 'existing',
      n: '02',
      label: 'Existing Businesses',
      eyebrow: 'Already importing',
      title: 'More reliability, better pricing, fewer surprises',
      lead: 'Already importing but dealing with unreliable suppliers, stale pricing, or quality inconsistency? We plug into your existing supply chain, re-vet your suppliers against the market, and replace the weak links with stronger ones.',
      features: [
        'Supplier re-vetting and backup-sourcing so you are never hostage to one factory',
        'Price benchmarking against live market rates, you find out if your current price is actually good',
        'Consistent quality standards enforced on every run, not just the first sample',
      ],
    },
    {
      key: 'retail',
      n: '03',
      label: 'Retailers',
      eyebrow: 'Shop & e-commerce',
      title: 'Smaller, faster orders across mixed categories',
      lead: 'Retail works on restock speed and category breadth. We handle smaller, more frequent orders across varied product lines, source and consolidate them in Guangzhou, so you\'re not managing five suppliers and chasing five separate shipments a month.',
      features: [
        'Mixed-category consolidation, multiple suppliers, one container, one tracking number',
        'Flexible order sizes that match your cashflow, not a factory\'s minimum',
        'Fast-moving category expertise (thrift, hair, electronics, accessories)',
      ],
    },
    {
      key: 'wholesale',
      n: '04',
      label: 'Wholesalers',
      eyebrow: 'B2B distributors',
      title: 'Recurring bulk orders where consistency wins',
      lead: 'Wholesale lives and dies on price consistency and reliable timelines, your customers count on you having stock. We lock in negotiated recurring pricing, schedule production in advance, and monitor every run so restocks land when you said they would.',
      features: [
        'Negotiated recurring pricing locked in across quarterly production runs',
        'Priority production scheduling with your key factories to skip seasonal backlogs',
        'Dedicated order monitoring, a named contact who knows your line sheet',
      ],
    },
    {
      key: 'corp',
      n: '05',
      label: 'Corporate Buyers',
      eyebrow: 'Org procurement',
      title: 'Structured procurement with the paper trail you need',
      lead: 'For organizations buying in a formal capacity, traceability and compliance matter as much as the product. We build formal proforma invoicing, compliance-ready documentation, and single-point accountability into every procurement run.',
      features: [
        'Formal proforma invoicing and staged payment schedules per your finance process',
        'Compliance-ready documentation (SONCAP, test reports, packing manifests)',
        'Single point of contact for procurement who answers your finance team directly',
      ],
    },
    {
      key: 'bulk',
      n: '06',
      label: 'Bulk Procurement',
      eyebrow: 'Large / container loads',
      title: 'High-volume orders, optimized by CBM and freight',
      lead: 'At volume, CBM optimization and freight strategy directly move your margins. We optimize by cube, negotiate factory-direct at scale, and model air vs. sea vs. consolidation for every run so you\'re paying for the right mode, not the default one.',
      features: [
        'Freight strategy modeled by volume (air vs. sea vs. consolidation) per shipment',
        'Factory-direct negotiation at scale, volume pricing passed through transparently',
        'Full container-load and less-than-container consolidation options available',
      ],
    },
  ];
}
