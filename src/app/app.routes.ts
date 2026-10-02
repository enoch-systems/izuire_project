import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Legal } from './pages/legal/legal';
import { Contact } from './pages/contact/contact';
import { Insights } from './pages/insights/insights';
import { Faq } from './pages/faq/faq';
import { About } from './pages/about/about';
import { Quote } from './pages/quote/quote';
import { BusinessSolutions } from './pages/business-solutions/business-solutions';
import { Shipping } from './pages/shipping/shipping';
import { Sourcing } from './pages/sourcing/sourcing';
import { Marketplace } from './pages/marketplace/marketplace';
import { Cart } from './pages/cart/cart';
import { ProductDetail } from './pages/product-detail/product-detail';
import { AccountProfile } from './pages/account/profile/profile';
import { Payments } from './pages/account/payments/payments';
import { AccountSettings } from './pages/account/settings/settings';
import { AccountPassword } from './pages/account/password/password';
import { trail } from './components/breadcrumb/breadcrumb';

/**
 * One route per original HTML page, with the same titles and meta
 * descriptions the original <head> blocks carried. /fax is kept as an
 * alias of the FAQ page (the source site only contains faq.html).
 *
 * Each route also declares its breadcrumb trail in `crumb`, which the shared
 * <app-breadcrumb /> reads back from the activated route — so a page's trail is
 * the route it was reached by, rather than a hand-written row of links that can
 * fall out of step with it. Home is added by the component itself.
 */
export const routes: Routes = [
  {
    path: '',
    component: Home,
    title: 'IZUIRE, Your Trusted Bridge from China to Africa',
    data: {
      desc: 'IZUIRE sources, inspects and ships products from China to African buyers. Electronics, thrift, hair, building materials, solar and more, sourced, vetted, delivered.',
    },
  },
  {
    path: 'legal',
    component: Legal,
    title: 'Terms, Privacy & Policies, Izuire',
    data: {
      desc: "Izuire's terms and conditions, privacy policy, refund and payment policy, shipping policy, and supplier/customer responsibilities.",
      crumb: trail({ label: 'Legal' }),
    },
  },
  {
    path: 'contact',
    component: Contact,
    title: 'Contact Izuire, WhatsApp, Phone, Email & Office',
    data: {
      desc: 'Get in touch with Izuire Co. Ltd. via WhatsApp, phone, email, or our registered offices in Guangzhou and Onitsha.',
      crumb: trail({ label: 'Contact' }),
    },
  },
  {
    path: 'insights',
    component: Insights,
    title: 'Izuire Insights, China Import Guides & Market Education',
    data: {
      desc: 'Guides on importing from China, Guangzhou market research, product sourcing tips and business advice for African importers.',
      crumb: trail({ label: 'Izuire Insights' }),
    },
  },
  {
    path: 'faq',
    component: Faq,
    title: 'FAQ, Izuire Sourcing Questions Answered',
    data: {
      desc: 'Answers to common questions about MOQ, payment, shipping timelines, product inspection and sourcing with Izuire.',
      crumb: trail({ label: 'FAQ' }),
    },
  },
  { path: 'fax', redirectTo: 'faq', pathMatch: 'full' },
  {
    path: 'about',
    component: About,
    title: 'About Izuire, Our Story, Mission & Team',
    data: {
      desc: 'Learn about Izuire Co. Ltd., the China-to-Africa sourcing company bridging Guangzhou manufacturers and African buyers.',
      crumb: trail({ label: 'About' }),
    },
  },
  {
    path: 'quote',
    component: Quote,
    title: 'Request a Quote, Izuire Sourcing',
    data: {
      desc: 'Request a sourcing quote from Izuire, product, quantity, specifications, target price, destination and shipping method.',
      crumb: trail({ label: 'Request a Quote' }),
    },
  },
  {
    path: 'business-solutions',
    component: BusinessSolutions,
    title: 'Business Solutions, Izuire',
    data: {
      desc: 'Sourcing solutions tailored for new importers, existing businesses, retailers, wholesalers, corporate buyers and bulk procurement.',
      crumb: trail({ label: 'Business Solutions' }),
    },
  },
  {
    path: 'shipping',
    component: Shipping,
    title: 'Shipping & Logistics, China to Nigeria | Izuire',
    data: {
      desc: 'Air and sea freight from China to Nigeria, CBM explained, a CBM calculator, and destination coverage across Africa.',
      crumb: trail({ label: 'Shipping & Logistics' }),
    },
  },
  {
    path: 'sourcing',
    component: Sourcing,
    title: 'Sourcing & Procurement, Izuire',
    data: {
      desc: 'Product sourcing, manufacturer sourcing, supplier verification, price negotiation, MOQ assistance, quality control, inspection, white labeling, packaging and shipping coordination.',
      crumb: trail({ label: 'Sourcing & Procurement' }),
    },
  },
  {
    path: 'marketplace',
    component: Marketplace,
    title: 'Marketplace, Available Stock | Izuire',
    data: {
      desc: 'Browse trending products sourced from China, electronics, Okrika thrift bales, building materials, hair, solar equipment and more. Request a quote on any item.',
      crumb: trail({ label: 'Marketplace' }),
    },
  },
  {
    path: 'cart',
    component: Cart,
    title: 'Your Cart, Izuire',
    data: {
      desc: 'Review the products you have added, adjust quantities to your minimums, and send the basket through for a quote.',
      crumb: trail({ label: 'Cart' }),
    },
  },
  {
    path: 'product/:id',
    component: ProductDetail,
    title: 'Product, Izuire',
    data: {
      desc: 'Product details, photos, pricing and minimums for this Izuire listing.',
      // The product names the last stop from the catalogue; the route only knows
      // the catalogue it came out of.
      crumb: trail({ label: 'Marketplace', link: '/marketplace' }),
    },
  },
  /* The signed-in side. Each page gates itself with the account prompt rather
     than a route guard, so a shared link still explains what it is and offers
     the way in instead of bouncing the visitor home. */
  { path: 'account', redirectTo: 'account/profile', pathMatch: 'full' },
  {
    path: 'account/profile',
    component: AccountProfile,
    title: 'Profile, Your Account | Izuire',
    data: {
      desc: 'Your Izuire profile: name, contact details, shipping address and billing address.',
      crumb: trail({ label: 'Account', link: '/account' }, { label: 'Profile' }),
    },
  },
  {
    path: 'account/payments',
    component: Payments,
    title: 'Payments, Pending & Successful Orders | Izuire',
    data: {
      desc: 'Your Izuire payment history: pending transactions, successful payments, references and tracking.',
      crumb: trail({ label: 'Account', link: '/account' }, { label: 'Payments' }),
    },
  },
  {
    path: 'account/settings',
    component: AccountSettings,
    title: 'Settings, Your Account | Izuire',
    data: {
      desc: 'Appearance, notifications and marketplace currency preferences for your Izuire account.',
      crumb: trail({ label: 'Account', link: '/account' }, { label: 'Settings' }),
    },
  },
  {
    path: 'account/password',
    component: AccountPassword,
    title: 'Change Password, Your Account | Izuire',
    data: {
      desc: 'Change the password on your Izuire account.',
      crumb: trail({ label: 'Account', link: '/account' }, { label: 'Change password' }),
    },
  },
  { path: '**', redirectTo: '' },
];
