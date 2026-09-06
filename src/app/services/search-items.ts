export interface SearchItem {
  title: string;
  cat: string;
  desc: string;
  route: string;
  fragment: string | undefined;
}

// Search index reproduced from the original site JavaScript (24 entries).
export const SEARCH_ITEMS: SearchItem[] = [
  {
    "title": "Electronics & Phone Accessories",
    "cat": "Marketplace",
    "desc": "Phones, screens, chargers & more",
    "route": "/marketplace",
    "fragment": "electronics"
  },
  {
    "title": "Secondhand Clothing (Okrika)",
    "cat": "Marketplace",
    "desc": "Graded thrift bales",
    "route": "/marketplace",
    "fragment": "okrika"
  },
  {
    "title": "Building Materials",
    "cat": "Marketplace",
    "desc": "Fittings, tiles & hardware",
    "route": "/marketplace",
    "fragment": "building"
  },
  {
    "title": "Hair & Wigs",
    "cat": "Marketplace",
    "desc": "Raw & human hair units",
    "route": "/marketplace",
    "fragment": "hair"
  },
  {
    "title": "Solar Equipment",
    "cat": "Marketplace",
    "desc": "Panels, batteries & inverters",
    "route": "/marketplace",
    "fragment": "solar"
  },
  {
    "title": "Product Sourcing",
    "cat": "Sourcing",
    "desc": "We find and vet the right product for your spec",
    "route": "/sourcing",
    "fragment": undefined
  },
  {
    "title": "Supplier Verification",
    "cat": "Sourcing",
    "desc": "Factory checks before you commit",
    "route": "/sourcing",
    "fragment": undefined
  },
  {
    "title": "Quality Control & Inspection",
    "cat": "Sourcing",
    "desc": "Every order checked before it ships",
    "route": "/sourcing",
    "fragment": undefined
  },
  {
    "title": "White Labeling & Packaging",
    "cat": "Sourcing",
    "desc": "Custom branding on your products",
    "route": "/sourcing",
    "fragment": undefined
  },
  {
    "title": "Air Freight",
    "cat": "Shipping",
    "desc": "Fast shipping for urgent or smaller orders",
    "route": "/shipping",
    "fragment": undefined
  },
  {
    "title": "Sea Freight",
    "cat": "Shipping",
    "desc": "Cost-effective for bulk, higher CBM orders",
    "route": "/shipping",
    "fragment": undefined
  },
  {
    "title": "CBM Calculator",
    "cat": "Shipping",
    "desc": "Estimate your shipment volume",
    "route": "/shipping",
    "fragment": "calculator"
  },
  {
    "title": "New Importers",
    "cat": "Business Solutions",
    "desc": "Start sourcing from China with support at every step",
    "route": "/business-solutions",
    "fragment": undefined
  },
  {
    "title": "Wholesalers & Retailers",
    "cat": "Business Solutions",
    "desc": "Recurring bulk orders with consistent pricing",
    "route": "/business-solutions",
    "fragment": undefined
  },
  {
    "title": "Corporate & Bulk Procurement",
    "cat": "Business Solutions",
    "desc": "Structured procurement for larger buyers",
    "route": "/business-solutions",
    "fragment": undefined
  },
  {
    "title": "Request a Quote",
    "cat": "Get Started",
    "desc": "Tell us what you need and get pricing",
    "route": "/quote",
    "fragment": undefined
  },
  {
    "title": "What is MOQ?",
    "cat": "FAQ",
    "desc": "Minimum order quantity, explained",
    "route": "/faq",
    "fragment": "moq"
  },
  {
    "title": "How does payment work?",
    "cat": "FAQ",
    "desc": "Payment process for sourcing orders",
    "route": "/faq",
    "fragment": "payment"
  },
  {
    "title": "How long does shipping take?",
    "cat": "FAQ",
    "desc": "Air vs sea freight timelines",
    "route": "/faq",
    "fragment": "shipping-time"
  },
  {
    "title": "About Izuire",
    "cat": "Company",
    "desc": "Our story, mission and team",
    "route": "/about",
    "fragment": undefined
  },
  {
    "title": "Contact Izuire",
    "cat": "Company",
    "desc": "WhatsApp, phone, email & office info",
    "route": "/contact",
    "fragment": undefined
  },
  {
    "title": "Terms & Conditions",
    "cat": "Legal",
    "desc": "Terms of using Izuire's sourcing services",
    "route": "/legal",
    "fragment": "terms"
  },
  {
    "title": "Privacy Policy",
    "cat": "Legal",
    "desc": "How we handle your data",
    "route": "/legal",
    "fragment": "privacy"
  },
  {
    "title": "Shipping Policy",
    "cat": "Legal",
    "desc": "Delivery terms and responsibilities",
    "route": "/legal",
    "fragment": "shipping-policy"
  }
];
