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
      eyebrow: 'First time buyers',
      title: 'Your first import, guided from start to finish',
      lead: 'Sourcing from China for the first time? We handle the parts that usually trip up new importers, from supplier vetting to quality control and customs coordination, so your first order runs smoothly and sets up a stronger supply base for the next one.',
      features: [
        'Guided walkthrough for your first order, with a real person explaining each step before anything moves',
        'Lower MOQs where possible, or consolidation with other buyers to meet supplier minimums',
        'Full quality inspection before shipping, with photo proof of every box',
      ],
    },
    {
      key: 'existing',
      n: '02',
      label: 'Existing Businesses',
      eyebrow: 'Already importing',
      title: 'More reliability, better pricing, fewer surprises',
      lead: 'Already importing but dealing with unreliable suppliers, stale pricing, or quality inconsistency? We work with your existing supply chain, review your suppliers against the market, and replace weak links with stronger ones.',
      features: [
        'Supplier reviews and backup suppliers, so you are never dependent on one factory',
        'Price benchmarking against live market rates, you find out if your current price is actually good',
        'Consistent quality standards enforced on every run, not just the first sample',
      ],
    },
    {
      key: 'retail',
      n: '03',
      label: 'Retailers',
      eyebrow: 'Shop and online retail',
      title: 'Smaller, faster orders across mixed categories',
      lead: 'Retail works on restock speed and category breadth. We handle smaller, more frequent orders across varied product lines, source and consolidate them in Guangzhou, so you\'re not managing five suppliers and chasing five separate shipments a month.',
      features: [
        'Mixed category consolidation, multiple suppliers, one container, one tracking number',
        'Flexible order sizes that match your cashflow, not a factory\'s minimum',
        'Expertise in popular categories such as thrift, hair, electronics, and accessories',
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
      lead: 'For organizations buying in a formal capacity, traceability and compliance matter as much as the product. We provide formal proforma invoicing, documentation that meets requirements, and one accountable contact for every procurement run.',
      features: [
        'Formal proforma invoicing and staged payment schedules per your finance process',
        'Documentation that meets requirements, including SONCAP, test reports, and packing manifests',
        'One procurement contact who answers your finance team directly',
      ],
    },
    {
      key: 'bulk',
      n: '06',
      label: 'Bulk Procurement',
      eyebrow: 'Large and container loads',
      title: 'High-volume orders, optimized by CBM and freight',
      lead: 'At volume, CBM optimization and freight strategy directly move your margins. We optimize by cube, negotiate directly with factories at scale, and model air versus sea versus consolidation for every run so you\'re paying for the right mode, not the default one.',
      features: [
        'Freight strategy modeled by volume (air vs. sea vs. consolidation) per shipment',
        'Negotiation directly with factories at scale, with volume pricing passed through transparently',
        'Full container and shared container options available',
      ],
    },
  ];
}
