/**
 * The legal copy, in one place.
 *
 * Shared rather than written into the page: the /legal page renders these as tab
 * panels and the footer's Terms/Privacy links open the same text in a modal. Two
 * copies of a policy is two copies to forget to update, and the footer is the
 * one place a reader is most likely to read them from.
 *
 * `lead` is the bold run-in at the head of a paragraph ("Izuire's
 * responsibility:"), which is why a block carries a text and an optional lead
 * rather than being a bare string.
 */

export type LegalDocId =
  | 'terms'
  | 'privacy'
  | 'refund'
  | 'shipping-policy'
  | 'responsibilities';

export interface LegalBlock {
  kind: 'h3' | 'p' | 'ul';
  /** Heading or paragraph text. Absent on a list. */
  text?: string;
  /** Items, on a list only. */
  items?: string[];
  /** Bold run-in before `text`, on a paragraph only. */
  lead?: string;
}

export interface LegalDoc {
  id: LegalDocId;
  /** Label on the tab strip and in the modal's switcher. */
  tab: string;
  /** Heading at the top of the panel. */
  title: string;
  blocks: LegalBlock[];
}

/** Carried in the header of every view that shows this copy. */
export const LEGAL_DISCLAIMER =
  'The sections below are a starting structure only and are not final legal terms, have them reviewed by a qualified lawyer licensed in your jurisdiction before publishing them live on the site.';

export const LEGAL_DOCS: LegalDoc[] = [
  {
    id: 'terms',
    tab: 'Terms & Conditions',
    title: 'Terms & Conditions',
    blocks: [
      {
        kind: 'p',
        text: "These terms govern your use of Izuire's sourcing and procurement services. By requesting a quote or placing an order with Izuire Co. Ltd., you agree to the terms outlined here.",
      },
      {
        kind: 'h3',
        text: 'Quotes',
      },
      {
        kind: 'p',
        text: 'Quotes provided are estimates based on information available at the time and may change based on supplier pricing, freight rates, or order specifications at the point of confirmation.',
      },
      { kind: 'h3', text: 'Orders' },
      {
        kind: 'p',
        text: 'An order is confirmed once a quote is accepted and any required deposit is received. Production or purchase begins only after confirmation.',
      },
    ],
  },
  {
    id: 'privacy',
    tab: 'Privacy Policy',
    title: 'Privacy Policy',
    blocks: [
      {
        kind: 'p',
        text: 'Izuire collects the information you provide through our quote, contact, and inquiry forms, such as your name, phone number, email, and order details, to respond to your request and fulfil orders.',
      },
      { kind: 'h3', text: 'How we use your information' },
      {
        kind: 'ul',
        items: [
          'To prepare and communicate quotes',
          'To process and fulfil confirmed orders',
          'To respond to inquiries and provide support',
        ],
      },
      {
        kind: 'p',
        text: 'We do not sell your personal information to third parties.',
      },
    ],
  },
  {
    id: 'refund',
    tab: 'Refund / Payment Policy',
    title: 'Refund / Payment Policy',
    blocks: [
      {
        kind: 'p',
        text: 'Payment terms are confirmed on each individual quote and may involve a deposit before production or purchase, with the balance due before shipping.',
      },
      { kind: 'h3', text: 'Refunds' },
      {
        kind: 'p',
        text: 'Refund eligibility depends on the stage of the order, funds committed to production or already-purchased stock may not be fully refundable. Specific terms are communicated before you confirm an order.',
      },
    ],
  },
  {
    id: 'shipping-policy',
    tab: 'Shipping Policy',
    title: 'Shipping Policy',
    blocks: [
      {
        kind: 'p',
        text: "Shipping method (air or sea) is agreed with you based on your order's timeline, budget and volume (CBM). Estimated timelines are provided at the point of quote and are not guaranteed, as they depend on freight availability and customs processing.",
      },
      { kind: 'h3', text: 'Risk in transit' },
      {
        kind: 'p',
        text: 'Once goods are handed to a freight carrier, standard freight insurance terms apply. Optional additional coverage can be discussed for high-value shipments.',
      },
    ],
  },
  {
    id: 'responsibilities',
    tab: 'Responsibilities',
    title: 'Supplier & Customer Responsibilities',
    blocks: [
      {
        kind: 'p',
        lead: "Izuire's responsibility:",
        text: 'supplier vetting, negotiation, quality inspection, and coordinating shipping in line with the agreed quote.',
      },
      {
        kind: 'p',
        lead: "Customer's responsibility:",
        text: 'providing accurate product specifications, timely payment per agreed terms, and timely response during quality sign-off windows.',
      },
      {
        kind: 'p',
        lead: "Supplier's responsibility:",
        text: "producing goods to the agreed specification and timeline as contracted through Izuire.",
      },
    ],
  },
];

/** Ids in tab order, for the page's fragment check. */
export const LEGAL_DOC_IDS: LegalDocId[] = LEGAL_DOCS.map((d) => d.id);

/** The two the footer offers in a modal; the rest live behind /legal. */
export const MODAL_DOC_IDS: LegalDocId[] = ['terms', 'privacy'];

export function legalDoc(id: LegalDocId): LegalDoc {
  const doc = LEGAL_DOCS.find((d) => d.id === id);
  if (!doc) throw new Error(`Unknown legal document: ${id}`);
  return doc;
}
