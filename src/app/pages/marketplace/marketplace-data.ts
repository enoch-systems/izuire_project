/**
 * The words a card's badge may use. One shallow union rather than free text, so
 * the page cannot drift into a hundred near-synonyms and each label can be
 * restyled in one place. Swap a word here and every card wearing it follows.
 */
export type ProductBadge = 'Popular' | 'Hot Deal' | 'New' | 'Best Selling' | 'Sold out';

export interface Product {
  /** Stable key. Used as the cart line key, so it must not change. */
  id: string;
  icon: 'screen' | 'earbuds' | 'bale' | 'building' | 'hair' | 'sun' | 'battery' | 'sandal' | 'pot' | 'box';
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
  videos?: { src: string; duration?: number }[];
  /**
   * The promotional label the card carries, if any. One word and no more, and at
   * most one per product, so a grid of them reads as a shop's own labels rather
   * than a wall of stickers — the colour stays put and only the words change.
   *
   * This replaces the old boolean `verified`, which put the same word on half the
   * catalogue: repeated that often it said nothing about any one listing, and
   * what it did say was the wrong thing — that a supplier is checked is a promise
   * the whole catalogue makes (see the product page's own note), not a remark on
   * one card. Left out entirely on the listings with nothing to shout about.
   */
  badge?: ProductBadge;
  /**
   * True while the listing is sold out. The card stays visible with a pill and
   * a disabled cart button (unlike `active=false`, which removes it entirely).
   * Written from /admin/products; bundled rows omit it and read as available.
   */
  soldOut?: boolean;
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
  description: string;
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

/**
 * Preferred labels for familiar categories. Category IDs themselves come from
 * live product rows, so new admin-created categories appear automatically.
 */
export const CATEGORIES: { id: string; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'electronics', label: 'Electronics' },
  { id: 'okrika', label: 'Okrika / Thrift' },
  { id: 'building', label: 'Building Materials' },
  { id: 'hair', label: 'Hair & Wigs' },
  { id: 'solar', label: 'Solar Equipment' },
  { id: 'fashion', label: 'Fashion & Footwear' },
  { id: 'kitchen', label: 'Kitchenware' },
];

