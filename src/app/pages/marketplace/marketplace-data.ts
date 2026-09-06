export interface Product {
  icon: 'screen' | 'earbuds' | 'bale' | 'building' | 'hair' | 'sun' | 'battery' | 'sandal' | 'pot';
  verified: boolean;
  cat: string;
  name: string;
  title: string;
  ngn: string;
  rmb: string;
  unit: string;
  specs: string;
  moq: string;
}

/** Marketplace catalogue reproduced 1:1 from the original marketplace page markup. */
export const PRODUCTS: Product[] = [
  { icon: 'screen', verified: true, cat: 'electronics', name: 'a-grade phone screens (assorted)', title: 'A-Grade Phone Screens (Assorted)', ngn: '₦18,500 – 64,000', rmb: '¥58 – 200', unit: '/ unit', specs: 'Grades A/A+, multiple models', moq: 'MOQ: 20 units' },
  { icon: 'earbuds', verified: false, cat: 'electronics', name: 'bluetooth earbuds (oem)', title: 'Bluetooth Earbuds (OEM)', ngn: '₦6,200 – 14,000', rmb: '¥19 – 44', unit: '/ unit', specs: 'TWS, custom branding available', moq: 'MOQ: 50 units' },
  { icon: 'bale', verified: true, cat: 'okrika', name: 'okrika mixed bale — grade a', title: 'Okrika Mixed Bale — Grade A', ngn: '₦185,000', rmb: '¥580', unit: '/ bale', specs: 'Adult mixed, top grade', moq: 'MOQ: 1 bale (100kg)' },
  { icon: 'bale', verified: false, cat: 'okrika', name: 'okrika children\'s wear bale', title: 'Okrika Children\'s Wear Bale', ngn: '₦150,000', rmb: '¥470', unit: '/ bale', specs: 'Ages 2-12, mixed', moq: 'MOQ: 1 bale (100kg)' },
  { icon: 'building', verified: false, cat: 'building', name: 'pvc ceiling panels', title: 'PVC Ceiling Panels', ngn: '₦3,400', rmb: '¥10.7', unit: '/ panel', specs: 'White, 60cm x 60cm', moq: 'MOQ: 200 panels' },
  { icon: 'building', verified: false, cat: 'building', name: 'bathroom fittings set', title: 'Bathroom Fittings Set', ngn: '₦22,000', rmb: '¥69', unit: '/ set', specs: 'Chrome finish', moq: 'MOQ: 30 sets' },
  { icon: 'hair', verified: true, cat: 'hair', name: 'raw human hair bundles, 20"', title: 'Raw Human Hair Bundles, 20"', ngn: '₦38,000', rmb: '¥120', unit: '/ bundle', specs: 'Unprocessed, single donor', moq: 'MOQ: 12 bundles' },
  { icon: 'hair', verified: false, cat: 'hair', name: 'lace front wig, 24"', title: 'Lace Front Wig, 24"', ngn: '₦64,000', rmb: '¥200', unit: '/ unit', specs: 'HD lace, pre-plucked', moq: 'MOQ: 10 units' },
  { icon: 'sun', verified: true, cat: 'solar', name: '150w solar panel (monocrystalline)', title: '150W Solar Panel (Monocrystalline)', ngn: '₦46,000', rmb: '¥145', unit: '/ panel', specs: '12V, high-efficiency cells', moq: 'MOQ: 10 panels' },
  { icon: 'battery', verified: false, cat: 'solar', name: '200ah lithium battery', title: '200Ah Lithium Battery', ngn: '₦285,000', rmb: '¥895', unit: '/ unit', specs: 'LiFePO4, 12V', moq: 'MOQ: 5 units' },
  { icon: 'sandal', verified: false, cat: 'fashion', name: 'ladies sandals (assorted)', title: 'Ladies Sandals (Assorted)', ngn: '₦3,200', rmb: '¥10', unit: '/ pair', specs: 'Mixed sizes 36-40', moq: 'MOQ: 100 pairs' },
  { icon: 'pot', verified: false, cat: 'kitchen', name: 'stainless cookware set (10pc)', title: 'Stainless Cookware Set (10pc)', ngn: '₦28,000', rmb: '¥88', unit: '/ set', specs: 'Induction-ready', moq: 'MOQ: 20 sets' },
];
