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
import { AdminLogin } from './pages/admin/admin-login';
import { AdminShell } from './pages/admin/admin-shell';
import { AdminProducts } from './pages/admin/admin-products';
import { Checkout } from './pages/checkout/checkout';
import { AdminGuard } from './services/admin.guard';
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
    title: 'Izuire | Sourcing and Shopping from China to Africa',
    data: {
      desc: 'IZUIRE sources, inspects and ships products from China to African buyers. Electronics, thrift, hair, building materials, solar and more, sourced, vetted, delivered.',
    },
  },
  {
    path: 'legal',
    component: Legal,
    title: 'Legal Policies | Izuire',
    data: {
      desc: "Izuire's terms and conditions, privacy policy, refund and payment policy, shipping policy, and supplier/customer responsibilities.",
      crumb: trail({ label: 'Legal' }),
    },
  },
  {
    path: 'contact',
    component: Contact,
    title: 'Contact Izuire | Customer Support and Enquiries',
    data: {
      desc: 'Get in touch with Izuire Co. Ltd. via WhatsApp, phone, email, or our registered offices in Guangzhou and Onitsha.',
      crumb: trail({ label: 'Contact' }),
    },
  },
  {
    path: 'insights',
    component: Insights,
    title: 'Importing Guides and Trade Insights | Izuire',
    data: {
      desc: 'Guides on importing from China, Guangzhou market research, product sourcing tips and business advice for African importers.',
      crumb: trail({ label: 'Izuire Insights' }),
    },
  },
  {
    path: 'faq',
    component: Faq,
    title: 'FAQs | Sourcing, Orders and Shipping | Izuire',
    data: {
      desc: 'Answers to common questions about MOQ, payment, shipping timelines, product inspection and sourcing with Izuire.',
      crumb: trail({ label: 'FAQ' }),
    },
  },
  { path: 'fax', redirectTo: 'faq', pathMatch: 'full' },
  {
    path: 'about',
    component: About,
    title: 'About Izuire | Our Story and Commitment',
    data: {
      desc: 'Learn about Izuire Co. Ltd., a sourcing company connecting manufacturers in Guangzhou with buyers across Africa.',
      crumb: trail({ label: 'About' }),
    },
  },
  {
    path: 'quote',
    component: Quote,
    title: 'Request a Sourcing Quote | Izuire',
    data: {
      desc: 'Request a sourcing quote from Izuire, product, quantity, specifications, target price, destination and shipping method.',
      crumb: trail({ label: 'Request a Quote' }),
    },
  },
  {
    path: 'business-solutions',
    component: BusinessSolutions,
    title: 'Business Sourcing Solutions | Izuire',
    data: {
      desc: 'Sourcing solutions tailored for new importers, existing businesses, retailers, wholesalers, corporate buyers and bulk procurement.',
      crumb: trail({ label: 'Business Solutions' }),
    },
  },
  {
    path: 'shipping',
    component: Shipping,
    title: 'Shipping and Logistics from China to Africa | Izuire',
    data: {
      desc: 'Air and sea freight from China to Nigeria, CBM explained, and destination coverage across Africa.',
      crumb: trail({ label: 'Shipping and logistics' }),
    },
  },
  {
    path: 'sourcing',
    component: Sourcing,
    title: 'Product Sourcing and Procurement | Izuire',
    data: {
      desc: 'Product sourcing, manufacturer sourcing, supplier verification, price negotiation, MOQ assistance, quality control, inspection, white labeling, packaging and shipping coordination.',
      crumb: trail({ label: 'Sourcing and procurement' }),
    },
  },
  {
    path: 'marketplace',
    component: Marketplace,
    title: 'Marketplace | Shop Products Sourced from China | Izuire',
    data: {
      desc: 'Browse trending products sourced from China, electronics, Okrika thrift bales, building materials, hair, solar equipment and more. Request a quote on any item.',
      crumb: trail({ label: 'Marketplace' }),
    },
  },
  {
    path: 'cart',
    component: Cart,
    title: 'Shopping Cart | Review Your Selected Products | Izuire',
    data: {
      desc: 'Review the products you have added, adjust quantities to your minimums, and send the basket through for a quote.',
      robots: 'noindex, nofollow',
      crumb: trail({ label: 'Cart' }),
    },
  },
  {
    path: 'product/:id',
    component: ProductDetail,
    title: 'Product Details | Izuire',
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
    title: 'Your Profile | Izuire Account',
    data: {
      desc: 'Your Izuire profile: name, contact details, shipping address and billing address.',
      robots: 'noindex, nofollow',
      crumb: trail({ label: 'Account', link: '/account' }, { label: 'Profile' }),
    },
  },
  {
    path: 'account/payments',
    component: Payments,
    title: 'Payment History | Izuire Account',
    data: {
      desc: 'Your Izuire payment history: pending transactions, successful payments, references and tracking.',
      robots: 'noindex, nofollow',
      crumb: trail({ label: 'Account', link: '/account' }, { label: 'Payments' }),
    },
  },
  {
    path: 'account/settings',
    component: AccountSettings,
    title: 'Account Settings | Izuire',
    data: {
      desc: 'Appearance, notifications and marketplace currency preferences for your Izuire account.',
      robots: 'noindex, nofollow',
      crumb: trail({ label: 'Account', link: '/account' }, { label: 'Settings' }),
    },
  },
  {
    path: 'account/password',
    component: AccountPassword,
    title: 'Change Password | Izuire Account',
    data: {
      desc: 'Change the password on your Izuire account.',
      robots: 'noindex, nofollow',
      crumb: trail({ label: 'Account', link: '/account' }, { label: 'Change password' }),
    },
  },
  {
    path: 'checkout',
    component: Checkout,
    title: 'Secure Checkout | Complete Your Order | Izuire',
    data: {
      desc: 'Confirm your basket, choose a payment method and place your Izuire order.',
      robots: 'noindex, nofollow',
      crumb: trail({ label: 'Checkout' }),
    },
  },
  /* ── Admin console ───────────────────────────────────────────────────────
     A separate application rather than another page of the shop: its own sign-in,
     its own session, its own chrome. `/admin/login` sits outside the shell so
     the signed-out view has no sidebar to render.

     THE CATCH-ALL MUST STAY LAST. It used to sit here, above the admin block,
     which made /admin unreachable — `**` matched first and redirected home, so
     the admin route below it was dead code. Angular matches routes in
     declaration order, so nothing may be added after this line. */
  {
    path: 'admin/login',
    component: AdminLogin,
    title: 'Staff Sign In | Izuire Admin',
    data: { desc: 'Staff sign in to the Izuire admin console.', robots: 'noindex, nofollow' },
  },
  {
    path: 'admin',
    component: AdminShell,
    canActivate: [AdminGuard],
    canActivateChild: [AdminGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/admin/admin-dashboard').then((page) => page.AdminDashboard),
        title: 'Dashboard | Izuire Admin',
        data: { desc: 'Manage Izuire store operations and review current activity.', robots: 'noindex, nofollow' },
      },
      {
        path: 'products',
        component: AdminProducts,
        title: 'Catalogue Manager | Izuire Admin',
        data: { desc: 'Manage catalogue listings, prices, featured products and visibility.', robots: 'noindex, nofollow' },
      },
      {
        path: 'users',
        loadComponent: () => import('./pages/admin/admin-users').then((page) => page.AdminUsers),
        title: 'User Management | Izuire Admin',
        data: { desc: 'Manage customer accounts in the Izuire admin console.', robots: 'noindex, nofollow' },
      },
      {
        path: 'email-follow-up',
        loadComponent: () => import('./pages/admin/admin-email-followup').then((page) => page.AdminEmailFollowup),
        title: 'Email Follow-up | Izuire Admin',
        data: { desc: 'Review and manage customer email follow-ups.', robots: 'noindex, nofollow' },
      },
      {
        path: 'email-history',
        loadComponent: () => import('./pages/admin/admin-email-history').then((page) => page.AdminEmailHistory),
        title: 'Email History | Izuire Admin',
        data: { desc: 'Review email delivery history for the Izuire store.', robots: 'noindex, nofollow' },
      },
      {
        path: 'newsletter-signups',
        loadComponent: () => import('./pages/admin/admin-newsletter').then((page) => page.AdminNewsletter),
        title: 'Newsletter Sign-ups | Izuire Admin',
        data: { desc: 'Review newsletter subscriptions for the Izuire store.', robots: 'noindex, nofollow' },
      },
      {
        path: '**',
        loadComponent: () => import('./pages/not-found').then((page) => page.NotFound),
        title: 'Admin Page Not Found | Izuire Admin',
        data: { desc: 'The requested Izuire admin page could not be found.', robots: 'noindex, nofollow' },
      },
    ],
  },
  { path: '**', loadComponent: () => import('./pages/not-found').then((page) => page.NotFound), title: 'Page Not Found | Izuire', data: { desc: 'The requested Izuire page could not be found.', robots: 'noindex, nofollow' } },
];
