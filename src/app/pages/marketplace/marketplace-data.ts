export interface Product {
  /** Stable key. Used as the cart line key, so it must not change. */
  id: string;
  icon: 'screen' | 'earbuds' | 'bale' | 'building' | 'hair' | 'sun' | 'battery' | 'sandal' | 'pot';
  /**
   * Optional photo for the card's media area, in place of the line icon. Only the
   * listings we have a real shot of set it; the rest keep drawing their icon, so
   * a missing photo is a normal state rather than a broken card.
   *
   * The intrinsic size is carried with the URL rather than hardcoded in the
   * template, so the browser can reserve the box before the bytes land and the
   * card never jumps — each shot is a different size, so one set of numbers
   * would only ever be right for one of them. `src` carries the Cloudinary
   * transforms the rest of the site's images do, so a card never downloads the
   * full-size original.
   */
  image?: { src: string; width: number; height: number };
  verified: boolean;
  cat: string;
  name: string;
  title: string;
  /**
   * The one price this product is sold at, in naira. A single figure rather than
   * a range: a range is not a price, and it cannot be added up, compared or
   * quoted against. `unitPrice` below is the same number, kept as a field for
   * the cart's arithmetic.
   */
  ngn: string;
  /**
   * The same single price in RMB, for the currency toggle. Held alongside `ngn`
   * rather than computed from it: the rate moves with the supplier, not with the
   * naira figure, and a converted number would quietly shift a quoted price.
   * Change the pair together.
   */
  rmb: string;
  unit: string;
  specs: string;
  moq: string;
  /**
   * Naira price per unit, for the cart's arithmetic. The same figure `ngn` shows,
   * kept as a number so totals can be worked out without parsing a display
   * string.
   */
  unitPrice: number;
  /**
   * Minimum order quantity, lifted out of `moq` so the cart can clamp to it.
   * Bales are sold whole, so their minimum is 1 rather than 0.
   */
  minQty: number;
}

/** Marketplace catalogue reproduced 1:1 from the original marketplace page markup. */
export const PRODUCTS: Product[] = [
  { id: 'phone-screens-a-grade', icon: 'screen', image: { src: 'https://res.cloudinary.com/djdbcoyot/image/upload/c_limit,w_720,q_auto:good/v1790716688/wafeiy3hzjxpb3kigoyh.jpg', width: 736, height: 981 }, verified: true, cat: 'electronics', name: 'a-grade phone screens (assorted)', title: 'A-Grade Phone Screens (Assorted)', ngn: '₦18,500', rmb: '¥58', unit: '/ unit', specs: 'Grades A/A+, multiple models', moq: 'MOQ: 20 units', unitPrice: 18500, minQty: 20 },
  { id: 'bluetooth-earbuds-oem', icon: 'earbuds', image: { src: 'https://res.cloudinary.com/djdbcoyot/image/upload/c_limit,w_720,q_auto:good/v1790717225/xmljkgwbxvran4uprx5y.jpg', width: 425, height: 535 }, verified: false, cat: 'electronics', name: 'bluetooth earbuds (oem)', title: 'Bluetooth Earbuds (OEM)', ngn: '₦6,200', rmb: '¥19', unit: '/ unit', specs: 'TWS, custom branding available', moq: 'MOQ: 50 units', unitPrice: 6200, minQty: 50 },
  { id: 'okrika-mixed-bale-a', icon: 'bale', image: { src: 'https://res.cloudinary.com/djdbcoyot/image/upload/c_limit,w_720,q_auto:good/v1790717225/yqwubjvjgyutcmwbcn7d.jpg', width: 720, height: 960 }, verified: true, cat: 'okrika', name: 'okrika mixed bale — grade a', title: 'Okrika Mixed Bale — Grade A', ngn: '₦185,000', rmb: '¥580', unit: '/ bale', specs: 'Adult mixed, top grade', moq: 'MOQ: 1 bale (100kg)', unitPrice: 185000, minQty: 1 },
  { id: 'okrika-childrens-wear-bale', icon: 'bale', image: { src: 'https://res.cloudinary.com/djdbcoyot/image/upload/c_limit,w_720,q_auto:good/v1790717225/hou9xyiuxrdixg5jcsd8.jpg', width: 720, height: 960 }, verified: false, cat: 'okrika', name: 'okrika children\'s wear bale', title: 'Okrika Children\'s Wear Bale', ngn: '₦150,000', rmb: '¥470', unit: '/ bale', specs: 'Ages 2-12, mixed', moq: 'MOQ: 1 bale (100kg)', unitPrice: 150000, minQty: 1 },
  { id: 'pvc-ceiling-panels', icon: 'building', verified: false, cat: 'building', name: 'pvc ceiling panels', title: 'PVC Ceiling Panels', ngn: '₦3,400', rmb: '¥10.7', unit: '/ panel', specs: 'White, 60cm x 60cm', moq: 'MOQ: 200 panels', unitPrice: 3400, minQty: 200 },
  { id: 'bathroom-fittings-set', icon: 'building', verified: false, cat: 'building', name: 'bathroom fittings set', title: 'Bathroom Fittings Set', ngn: '₦22,000', rmb: '¥69', unit: '/ set', specs: 'Chrome finish', moq: 'MOQ: 30 sets', unitPrice: 22000, minQty: 30 },
  { id: 'raw-human-hair-bundles-20', icon: 'hair', verified: true, cat: 'hair', name: 'raw human hair bundles, 20"', title: 'Raw Human Hair Bundles, 20"', ngn: '₦38,000', rmb: '¥120', unit: '/ bundle', specs: 'Unprocessed, single donor', moq: 'MOQ: 12 bundles', unitPrice: 38000, minQty: 12 },
  { id: 'lace-front-wig-24', icon: 'hair', verified: false, cat: 'hair', name: 'lace front wig, 24"', title: 'Lace Front Wig, 24"', ngn: '₦64,000', rmb: '¥200', unit: '/ unit', specs: 'HD lace, pre-plucked', moq: 'MOQ: 10 units', unitPrice: 64000, minQty: 10 },
  { id: '150w-solar-panel', icon: 'sun', verified: true, cat: 'solar', name: '150w solar panel (monocrystalline)', title: '150W Solar Panel (Monocrystalline)', ngn: '₦46,000', rmb: '¥145', unit: '/ panel', specs: '12V, high-efficiency cells', moq: 'MOQ: 10 panels', unitPrice: 46000, minQty: 10 },
  { id: '200ah-lithium-battery', icon: 'battery', verified: false, cat: 'solar', name: '200ah lithium battery', title: '200Ah Lithium Battery', ngn: '₦285,000', rmb: '¥895', unit: '/ unit', specs: 'LiFePO4, 12V', moq: 'MOQ: 5 units', unitPrice: 285000, minQty: 5 },
  { id: 'ladies-sandles-assorted', icon: 'sandal', verified: false, cat: 'fashion', name: 'ladies sandals (assorted)', title: 'Ladies Sandals (Assorted)', ngn: '₦3,200', rmb: '¥10', unit: '/ pair', specs: 'Mixed sizes 36-40', moq: 'MOQ: 100 pairs', unitPrice: 3200, minQty: 100 },
  { id: 'stainless-cookware-set-10pc', icon: 'pot', verified: false, cat: 'kitchen', name: 'stainless cookware set (10pc)', title: 'Stainless Cookware Set (10pc)', ngn: '₦28,000', rmb: '¥88', unit: '/ set', specs: 'Induction-ready', moq: 'MOQ: 20 sets', unitPrice: 28000, minQty: 20 },
];

/**
 * The four products the home page puts on show under "Featured products", in the
 * order they appear there. Read from the catalogue rather than restated, so the
 * cards and the marketplace can never drift apart on price or MOQ.
 */
export const FEATURED_IDS = [
  'phone-screens-a-grade',
  'okrika-mixed-bale-a',
  '150w-solar-panel',
  'raw-human-hair-bundles-20',
] as const;

export const FEATURED: Product[] = FEATURED_IDS.map((id) => PRODUCTS.find((p) => p.id === id)!);
