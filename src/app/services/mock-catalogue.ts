import type { DbProduct } from './product.service';

interface PreviewProductSeed {
  title: string;
  cat: string;
  icon: DbProduct['icon'];
  unitPrice: number;
  unit: string;
  minQty: number;
  featured?: boolean;
}

const photoPools: Record<string, string[]> = {
  electronics: [
    'photo-1511707171634-5f897ff02aa9',
    'photo-1516035069371-29a1b244cc32',
    'photo-1505740420928-5e560c06d30e',
    'photo-1606220945770-b5b6c2c55bf1',
    'photo-1496181133206-80ce9b88a853',
    'photo-1523275335684-37898b6baf30',
  ],
  okrika: [
    'photo-1529139574466-a303027c1d8b',
    'photo-1521572163474-6864f9cf17ab',
    'photo-1551488831-00ddcb6c6bd3',
    'photo-1595777457583-95e059d581b8',
    'photo-1543163521-1bf539c55dd2',
  ],
  building: [
    'photo-1504307651254-35680f356dfd',
    'photo-1504148455328-c376907d081c',
    'photo-1581091226825-a6a2a5aee158',
    'photo-1586864387789-628af9feed72',
  ],
  hair: [
    'photo-1522335789203-aabd1fc54bc9',
    'photo-1596462502278-27bfdc403348',
    'photo-1524504388940-b1c1722653e1',
    'photo-1583241800698-e8ab01830a8e',
  ],
  solar: [
    'photo-1509391366360-2e959784a276',
    'photo-1508514177221-188b1cf16e9d',
    'photo-1497435334941-8c899ee9e8e9',
    'photo-1518005020951-eccb494ad742',
  ],
  fashion: [
    'photo-1542291026-7eec264c27ff',
    'photo-1548036328-c9fa89d128fa',
    'photo-1511499767150-a48a237f0083',
    'photo-1560343090-f0409e92791a',
    'photo-1551232864-3b8fbadea3c5',
    'photo-1572635196237-14b3f281503f',
  ],
  kitchen: [
    'photo-1556911220-e15b29be8c8f',
    'photo-1556911220-bff31c812dba',
    'photo-1584990347449-a9cfbe8dffe8',
    'photo-1556909114-f6e7ad7d3136',
    'photo-1556912172-45b7abe8b7e1',
  ],
  general: [
    'photo-1555041469-a586c61ea9bc',
    'photo-1503602642458-232111445657',
    'photo-1558060370-d644479cb6f7',
    'photo-1553062407-98eeb64c6a62',
    'photo-1542291026-7eec264c27ff',
  ],
};

const seeds: PreviewProductSeed[] = [
  { title: 'Android smartphone, 128GB', cat: 'electronics', icon: 'screen', unitPrice: 168000, unit: '/ piece', minQty: 1, featured: true },
  { title: 'Wireless noise-cancelling headphones', cat: 'electronics', icon: 'earbuds', unitPrice: 28500, unit: '/ piece', minQty: 2, featured: true },
  { title: 'Mirrorless digital camera kit', cat: 'electronics', icon: 'box', unitPrice: 425000, unit: '/ kit', minQty: 1, featured: true },
  { title: 'True wireless earbuds', cat: 'electronics', icon: 'earbuds', unitPrice: 14500, unit: '/ pair', minQty: 5 },
  { title: 'Business laptop, 16GB RAM', cat: 'electronics', icon: 'box', unitPrice: 685000, unit: '/ piece', minQty: 1 },
  { title: 'Stainless smart watch', cat: 'electronics', icon: 'box', unitPrice: 46500, unit: '/ piece', minQty: 2 },
  { title: 'Fast-charge USB-C adapter', cat: 'electronics', icon: 'box', unitPrice: 7200, unit: '/ piece', minQty: 10 },
  { title: 'Grade A mixed denim bale', cat: 'okrika', icon: 'bale', unitPrice: 385000, unit: '/ bale', minQty: 1, featured: true },
  { title: 'Premium summer-wear bale', cat: 'okrika', icon: 'bale', unitPrice: 328000, unit: '/ bale', minQty: 1 },
  { title: 'Children’s clothing bale', cat: 'okrika', icon: 'bale', unitPrice: 295000, unit: '/ bale', minQty: 1 },
  { title: 'Vintage shirts, sorted bale', cat: 'okrika', icon: 'bale', unitPrice: 347000, unit: '/ bale', minQty: 1 },
  { title: 'Lightweight knitwear bale', cat: 'okrika', icon: 'bale', unitPrice: 372000, unit: '/ bale', minQty: 1 },
  { title: 'Porcelain floor tiles, matte', cat: 'building', icon: 'building', unitPrice: 11800, unit: '/ m²', minQty: 20, featured: true },
  { title: 'Modern LED ceiling fixture', cat: 'building', icon: 'building', unitPrice: 9200, unit: '/ piece', minQty: 6 },
  { title: 'Cordless drill and bit set', cat: 'building', icon: 'building', unitPrice: 43800, unit: '/ set', minQty: 2 },
  { title: 'Brushed steel door lock set', cat: 'building', icon: 'building', unitPrice: 17600, unit: '/ set', minQty: 5 },
  { title: 'Natural wave human hair bundle', cat: 'hair', icon: 'hair', unitPrice: 64500, unit: '/ bundle', minQty: 2, featured: true },
  { title: 'Lace-front body wave wig', cat: 'hair', icon: 'hair', unitPrice: 128000, unit: '/ wig', minQty: 1 },
  { title: 'Curly extension bundle, 18 inch', cat: 'hair', icon: 'hair', unitPrice: 53500, unit: '/ bundle', minQty: 2 },
  { title: 'HD lace closure, 4 by 4', cat: 'hair', icon: 'hair', unitPrice: 24800, unit: '/ piece', minQty: 3 },
  { title: '450W mono solar panel', cat: 'solar', icon: 'sun', unitPrice: 154000, unit: '/ panel', minQty: 2, featured: true },
  { title: '5kWh lithium storage battery', cat: 'solar', icon: 'battery', unitPrice: 1420000, unit: '/ unit', minQty: 1 },
  { title: 'Hybrid solar inverter, 5kVA', cat: 'solar', icon: 'sun', unitPrice: 648000, unit: '/ unit', minQty: 1 },
  { title: 'Integrated solar street light', cat: 'solar', icon: 'sun', unitPrice: 68500, unit: '/ piece', minQty: 4 },
  { title: 'Retro running sneakers', cat: 'fashion', icon: 'sandal', unitPrice: 26800, unit: '/ pair', minQty: 6 },
  { title: 'Everyday crossbody handbag', cat: 'fashion', icon: 'box', unitPrice: 31800, unit: '/ piece', minQty: 4 },
  { title: 'UV400 acetate sunglasses', cat: 'fashion', icon: 'box', unitPrice: 7800, unit: '/ piece', minQty: 12 },
  { title: 'Relaxed linen midi dress', cat: 'fashion', icon: 'box', unitPrice: 36500, unit: '/ piece', minQty: 4 },
  { title: 'Classic washed denim jacket', cat: 'fashion', icon: 'box', unitPrice: 41200, unit: '/ piece', minQty: 3 },
  { title: 'Lightweight travel trainers', cat: 'fashion', icon: 'sandal', unitPrice: 24300, unit: '/ pair', minQty: 6 },
  { title: 'Nonstick cookware set, 10 pcs', cat: 'kitchen', icon: 'pot', unitPrice: 54800, unit: '/ set', minQty: 2 },
  { title: 'High-speed countertop blender', cat: 'kitchen', icon: 'pot', unitPrice: 39200, unit: '/ piece', minQty: 2 },
  { title: 'Double-wall food flask', cat: 'kitchen', icon: 'pot', unitPrice: 10800, unit: '/ piece', minQty: 6 },
  { title: 'Stainless stock pot with lid', cat: 'kitchen', icon: 'pot', unitPrice: 22800, unit: '/ piece', minQty: 4 },
  { title: 'Compact digital air fryer', cat: 'kitchen', icon: 'pot', unitPrice: 73500, unit: '/ piece', minQty: 2 },
  { title: 'Water-resistant travel backpack', cat: 'general', icon: 'box', unitPrice: 21800, unit: '/ piece', minQty: 4 },
  { title: 'Modern accent lounge chair', cat: 'general', icon: 'box', unitPrice: 98500, unit: '/ piece', minQty: 1 },
  { title: 'Plush animal toy assortment', cat: 'general', icon: 'box', unitPrice: 16400, unit: '/ set', minQty: 6 },
  { title: 'Portable Bluetooth speaker', cat: 'general', icon: 'box', unitPrice: 19200, unit: '/ piece', minQty: 4 },
  { title: 'Ceramic kitchen storage set', cat: 'general', icon: 'box', unitPrice: 14200, unit: '/ set', minQty: 4 },
];

interface PreviewProductGroup {
  icon: PreviewProductSeed['icon'];
  unit: string;
  minQty: number;
  basePrice: number;
  priceStep: number;
  titles: string[];
}

const additionalProductGroups: Record<string, PreviewProductGroup> = {
  electronics: {
    icon: 'box', unit: '/ piece', minQty: 2, basePrice: 18500, priceStep: 12600,
    titles: [
      'Android tablet, 10-inch display', '4G dual-SIM feature phone', '4K smart TV streaming box',
      '24-inch full HD monitor', 'Dual-band mesh Wi-Fi router', '20,000mAh fast-charge power bank',
      'Portable mini projector', 'Mechanical gaming keyboard', 'Wireless gaming mouse',
      'USB-C laptop docking station', '2TB portable solid-state drive', 'Compact laser printer',
      'Indoor pan-and-tilt security camera', 'Wireless smart doorbell camera', 'Handheld retro game console',
      '65W GaN wall charger', 'Front and rear car dash camera', 'Adjustable LED ring light',
      'USB condenser microphone', 'Bluetooth keyboard case for tablet',
    ],
  },
  okrika: {
    icon: 'bale', unit: '/ bale', minQty: 1, basePrice: 248000, priceStep: 9700,
    titles: [
      'Sorted men’s polo shirts bale', 'Women’s blouse and top bale', 'Children’s denim mix bale',
      'Lightweight sportswear bale', 'Office trousers grade A bale', 'Vintage sweatshirt mix bale',
      'Summer dresses assorted bale', 'Men’s casual shirts bale', 'Women’s jeans assorted bale',
      'Baby clothing premium bale', 'Rain jacket and outerwear bale', 'Cotton T-shirt bulk bale',
      'Designer handbag mix bale', 'Winter coat sorted bale', 'Unisex tracksuit bale',
      'Shorts and skirts assorted bale', 'Workwear uniform mix bale', 'Premium sneaker mix bale',
      'Printed fabric shirt bale', 'Children’s jacket assortment bale',
    ],
  },
  building: {
    icon: 'building', unit: '/ unit', minQty: 4, basePrice: 7400, priceStep: 8650,
    titles: [
      'Aluminium sliding window frame', 'Water-saving shower mixer tap', 'Ceramic bathroom basin',
      'Digital door access lock', 'Heavy-duty cabinet hinge set', 'Outdoor wall light fixture',
      'PVC drainage pipe assortment', 'Stainless kitchen sink', 'Decorative wall panel sheets',
      'Interior flush door handle set', 'Industrial safety helmet pack', 'Concrete tile cutting blade',
      'Recessed LED downlight pack', 'Adjustable scaffolding jack', 'Thermostatic shower valve',
      'Double-glazed window hardware kit', 'Weatherproof electrical junction box', 'Granite countertop sample set',
      'Bathroom towel rail and hook set', 'Automatic water pump controller',
    ],
  },
  hair: {
    icon: 'hair', unit: '/ piece', minQty: 2, basePrice: 14500, priceStep: 9250,
    titles: [
      'Straight human hair bundle, 16 inch', 'Deep wave hair bundle, 20 inch', 'Kinky curly hair bundle, 18 inch',
      'Silky straight lace-front wig', 'Glueless bob wig, natural black', 'Transparent lace closure, 5 by 5',
      'HD lace frontal, 13 by 4', 'Body wave ponytail extension', 'Braiding hair extension pack',
      'Clip-in human hair extension set', 'Afro kinky drawstring ponytail', 'Water wave lace-front wig',
      'Pre-plucked lace frontal, 18 inch', 'Brazilian curly hair bundle, 22 inch', 'Synthetic passion twist braid pack',
      'Natural black lace closure, 4 by 4', 'Heat-resistant long wig, 24 inch', 'Human hair tape-in extension set',
      'Short pixie-cut lace wig', 'Salon mannequin training head',
    ],
  },
  solar: {
    icon: 'sun', unit: '/ unit', minQty: 1, basePrice: 18500, priceStep: 26800,
    titles: [
      '200W folding solar panel kit', '100Ah deep-cycle gel battery', '3kVA pure sine wave inverter',
      'MPPT solar charge controller, 60A', 'Solar panel mounting rail set', '12V solar water pump',
      'Portable solar generator, 1kWh', 'Solar garden path light set', 'DC refrigerator for solar system',
      '1500W solar power station', '48V lithium battery management unit', 'Solar cable connector pair',
      'Rooftop panel cleaning brush kit', '12-tube solar water heater', 'Solar-powered CCTV camera kit',
      '60W all-in-one solar street lamp', 'Foldable camping solar charger', 'Battery monitor with shunt',
      'Solar panel junction box', 'Grid-tie microinverter, 1200W',
    ],
  },
  fashion: {
    icon: 'sandal', unit: '/ piece', minQty: 4, basePrice: 6800, priceStep: 5450,
    titles: [
      'Canvas low-top casual sneakers', 'Leather-look office loafers', 'Women’s block-heel sandals',
      'Waterproof hiking shoes', 'Minimalist running waist bag', 'Structured faux-leather tote bag',
      'Compact RFID travel wallet', 'Oversized polarized sunglasses', 'Lightweight cotton bucket hat',
      'Canvas high-top fashion sneakers', 'Adjustable sports cap assortment', 'Slim-fit stretch denim jeans',
      'Unisex lightweight raincoat', 'Classic leather-look belt set', 'Foldable travel duffel bag',
      'Women’s woven summer sandals', 'Men’s breathable walking shoes', 'Quilted crossbody phone pouch',
      'Polarized wraparound sport glasses', 'Soft-knit everyday cardigan',
    ],
  },
  kitchen: {
    icon: 'pot', unit: '/ piece', minQty: 3, basePrice: 5200, priceStep: 4180,
    titles: [
      'Electric kettle with temperature control', 'Six-speed hand mixer', 'Compact rice cooker, 1.8 litre',
      'Stainless steel knife block set', 'Digital kitchen weighing scale', 'Manual vegetable chopper set',
      'Four-slice sandwich press', 'Reusable silicone food storage set', 'Glass meal-prep container set',
      'Portable induction cooktop', 'Electric coffee grinder', 'Rotating spice rack assortment',
      'Bamboo serving board set', 'Collapsible dish drying rack', 'Double-layer lunch box set',
      'Stainless insulated water bottle', 'Kitchen faucet water filter', 'Non-slip chopping board set',
      'Handheld milk frother', 'Stackable pantry canister set',
    ],
  },
  general: {
    icon: 'box', unit: '/ piece', minQty: 3, basePrice: 3900, priceStep: 4320,
    titles: [
      'Expandable hard-shell travel suitcase', 'Foldable camping stool', 'Reusable vacuum flask, 750ml',
      'Insulated food delivery bag', 'Car seat-back organizer', 'Rechargeable handheld fan',
      'Adjustable LED desk lamp', 'Digital alarm clock with USB port', 'Windproof folding umbrella',
      'Non-slip exercise yoga mat', 'Breathable pet travel carrier', 'Digital luggage weighing scale',
      'Portable bathroom weighing scale', 'Space-saving vacuum storage bag set', 'Silent wall clock, 12 inch',
      'Ultrasonic room humidifier', 'Collapsible laundry hamper', 'Cotton fitted bed sheet set',
      'Three-tier metal storage rack', 'Two-person pop-up camping tent',
    ],
  },
};

const allSeeds = [
  ...seeds,
  ...Object.entries(additionalProductGroups).flatMap(([cat, group]) =>
    group.titles.map((title, index): PreviewProductSeed => ({
      title,
      cat,
      icon: group.icon,
      unitPrice: group.basePrice + index * group.priceStep,
      unit: group.unit,
      minQty: group.minQty,
    })),
  ),
];

function image(photoId: string) {
  return {
    src: `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=900&q=80`,
    width: 900,
    height: 1125,
  };
}

const categoryPositions = new Map<string, number>();
const money = new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 });

export const PREVIEW_PRODUCTS: DbProduct[] = allSeeds.map((seed, index) => {
  const pool = photoPools[seed.cat];
  const position = categoryPositions.get(seed.cat) ?? 0;
  categoryPositions.set(seed.cat, position + 1);
  const shots = [0, 1, 2].map((offset) => image(pool[(position + offset) % pool.length]));

  return {
    id: `preview-${String(index + 1).padStart(2, '0')}`,
    name: seed.title.toLowerCase(),
    title: seed.title,
    icon: seed.icon,
    cat: seed.cat,
    ngn: `₦${money.format(seed.unitPrice)}`,
    rmb: `¥${money.format(seed.unitPrice / 190)}`,
    unit: seed.unit,
    unitPrice: seed.unitPrice,
    minQty: seed.minQty,
    image: shots[0],
    gallery: shots.slice(1),
    videos: [],
    priceKobo: seed.unitPrice * 100,
    featured: Boolean(seed.featured),
    featuredRank: seed.featured ? index + 1 : 0,
    sortRank: index + 1,
    soldOut: false,
  };
});
