import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
  viewChildren,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FEATURED, Product, PRODUCTS } from '../marketplace/marketplace-data';
import { CartService } from '../../services/cart.service';
import { FlyToCartService } from '../../services/fly-to-cart.service';

/** One slide of the hero stat carousel (a card plus its backdrop design). */
interface HeroStat {
  icon: 'calendar' | 'grid' | 'clock' | 'plane' | 'shield' | 'pin' | 'camera';
  num: string;
  lbl: string;
  tone: 'bs-a' | 'bs-b' | 'bs-c' | 'bs-d' | 'bs-e' | 'bs-f' | 'bs-g';
  bg: 'bg-a' | 'bg-b' | 'bg-c' | 'bg-d' | 'bg-e' | 'bg-f' | 'bg-g';
}

/** One of the reasons listed under "Why Izuire". */
interface WhyReason {
  title: string;
  body: string;
  /** `body` split into words, each carrying its own leading space. */
  words: string[];
}

/** The reasons, in the order they are read down the page. */
const REASONS: Omit<WhyReason, 'words'>[] = [
  {
    title: 'China Sourcing Network',
    body: "Years inside Guangzhou's markets and factory networks, not a broker working from a spreadsheet.",
  },
  {
    title: 'Supplier Verification',
    body: 'Every supplier is checked before your money goes anywhere near them.',
  },
  {
    title: 'Quality Control',
    body: 'Inspected before shipping, with photo and video proof, every time.',
  },
  {
    title: 'Transparent Process',
    body: 'Clear pricing and order status, no radio silence between quote and delivery.',
  },
  {
    title: 'Procurement Support',
    body: 'From MOQ negotiation to custom packaging, support beyond just placing an order.',
  },
  {
    title: 'Shipping Coordination',
    body: "Freight, documentation and customs handled, you're not chasing three parties.",
  },
];

/** One figure in the trust band. `suffix` is the part that is not a number. */
interface TrustStat {
  value: number;
  suffix: string;
  label: string;
}

const TRUST_STATS: TrustStat[] = [
  { value: 6, suffix: '+', label: 'Years sourcing from China' },
  { value: 8, suffix: '', label: 'Product categories covered' },
  { value: 50, suffix: '+', label: 'Suppliers vetted & managed' },
  { value: 1000, suffix: '+', label: 'Orders fulfilled to Africa' },
];

/** One customer story in the testimonials slider. */
interface Testimonial {
  quote: string;
  name: string;
  role: string;
}

/** The stories, in the order they are read. */
const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "IZUIRE found me a supplier for screens I'd been struggling to source for months, and the quality check before shipping saved me from a bad batch.",
    name: 'Chidinma O.',
    role: 'Electronics Reseller, Lagos',
  },
  {
    quote:
      'My first Okrika order arrived exactly as graded. Communication was clear from quote to delivery, and pricing was fair for the quality.',
    name: 'Emeka A.',
    role: 'Thrift Wholesaler, Onitsha',
  },
  {
    quote:
      "Having a team physically in Guangzhou made all the difference, they negotiated better terms than I could get on my own.",
    name: 'Blessing N.',
    role: 'General Merchandise, Abuja',
  },
];

/** Products per pager page. Four keeps the grid's own four-column rhythm. */
const PAGE_SIZE = 4;

/**
 * The showcase, split into pages for the dot pager under the grid. Chunked from
 * the whole catalogue so the pager actually cycles through the range rather than
 * shuffling the same four cards; the trailing page takes whatever is left.
 */
const PRODUCT_PAGES: Product[][] = [];
for (let i = 0; i < PRODUCTS.length; i += PAGE_SIZE) {
  PRODUCT_PAGES.push(PRODUCTS.slice(i, i + PAGE_SIZE));
}

/**
 * Home page. The testimonial slider reproduces the original behavior:
 * prev/next arrows, dots, and auto-advance every 6 seconds.
 *
 * The hero stat area is a 7-slide carousel that steps right to left every 3
 * seconds. Two layers move per step: the backdrop artwork (.badge-bg) and the
 * stat card (.badge-slider) on top of it. Both tracks share one index, and the
 * backdrop uses a slightly longer transition so it trails the card and lands on
 * the same offset.
 *
 * A clone of slide 1 sits at the end of each track, so looping back to slide 1
 * keeps the same direction instead of rewinding. Both tracks snap back to slide
 * 1 in the same frame with their transitions switched off, which is invisible
 * because the clone matches slide 1 exactly.
 *
 * Each of the eight category tiles loops a short Cloudinary clip, and so do the
 * Sourcing and Shipping service cards through the same #catMedia ref. The trust band
 * and the closing CTA carry their own blurred backdrops on the same terms. Only the
 * clips inside the viewport play (see playCategoryClips) so the browser never
 * decodes every clip at once and off-screen ones stay on their poster frame.
 *
 * The four process steps sit on a rail: each point lights as it is reached and the
 * join behind it charges up from the point before, so the section reads as a
 * signal travelling from "tell us what you need" to "shipped to your door" (see
 * watchSteps). The pulses on the points are pure CSS.
 *
 * The six reasons under "Why Izuire" are set as plain text rather than cards: each
 * body copy is split into words and lights up word by word as it is read down the
 * page, while the readout in the section head counts the reasons off (see
 * readReasons and countTo).
 *
 * The trust band below counts its figures up from zero when the band is scrolled to,
 * each one starting a beat after the one before it, with a bar filling under each
 * number and the three sign-off badges settling in once the count has landed (see
 * watchTrust and tween).
 *
 * Category and product cards also bubble up one at a time as you scroll to them
 * (see revealCards). A card's resting style is its normal style and the "not
 * revealed yet" class is added from script, so nothing disappears when JS is off.
 */
@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
})
export class Home implements OnInit, OnDestroy, AfterViewInit {
  /** Slider positions, one per story. */
  protected readonly dots = TESTIMONIALS.map((_, index) => index);
  /** The stories in the slider, so the slide markup is generated from one place. */
  protected readonly testimonials = TESTIMONIALS;
  protected readonly current = signal(0);

  /** Hero slides, in order. Add another entry here for an 8th slide. */
  protected readonly heroStats: HeroStat[] = [
    { icon: 'calendar', num: '6+', lbl: 'Years Sourcing', tone: 'bs-a', bg: 'bg-a' },
    { icon: 'grid', num: '8', lbl: 'Categories Covered', tone: 'bs-b', bg: 'bg-b' },
    { icon: 'clock', num: '24hr', lbl: 'Quote Turnaround', tone: 'bs-c', bg: 'bg-c' },
    { icon: 'plane', num: '2', lbl: 'Freight Modes: Air & Sea', tone: 'bs-d', bg: 'bg-d' },
    { icon: 'shield', num: '100%', lbl: 'Orders Inspected', tone: 'bs-e', bg: 'bg-e' },
    { icon: 'pin', num: 'Guangzhou', lbl: 'On-Ground Sourcing Team', tone: 'bs-f', bg: 'bg-f' },
    { icon: 'camera', num: 'Photo + Video', lbl: 'Proof Before Shipping', tone: 'bs-g', bg: 'bg-g' },
  ];

  /** The slides plus a clone of slide 1, giving a seamless right-to-left loop. */
  protected readonly loopStats = computed(() => [...this.heroStats, this.heroStats[0]]);
  protected readonly statSlide = signal(0);
  protected readonly activeStat = computed(() => this.statSlide() % this.heroStats.length);
  protected readonly snapping = signal(false);

  /** The six reasons, each body pre-split so the template can render one span per
   *  word. The spaces ride along with the words, so the copy still reads - and
   *  copies - as prose. */
  protected readonly reasons: WhyReason[] = REASONS.map((reason) => ({
    ...reason,
    words: reason.body.split(' ').map((word, index) => (index === 0 ? word : ` ${word}`)),
  }));

  /** How many of the six have been read. It starts at the full count, because the
   *  readout is finished-looking until scripting arms the list and rewinds it. */
  protected readonly readCount = signal(REASONS.length);
  protected readonly reasonTotal = REASONS.length;
  /** The readout, zero padded so the digits do not shuffle around while counting. */
  protected readonly readLabel = computed(
    () => `${this.pad(this.readCount())} / ${this.pad(this.reasonTotal)}`,
  );

  /** The trust band's figures. `trustProgress` runs 0 → 1 while the band counts, and
   *  starts at 1 so the band reads as finished until scripting rewinds it. */
  protected readonly trustStats = TRUST_STATS;
  private readonly trustProgress = signal(1);
  /** How far each figure has got, staggered so the count travels across the band
   *  instead of all four climbing at once: each starts a tenth later and counts
   *  through the same 70% of the run. */
  protected readonly trustShares = computed(() => {
    const progress = this.trustProgress();
    return TRUST_STATS.map((_, index) =>
      Math.min(1, Math.max(0, (progress - index * 0.1) / 0.7)),
    );
  });
  /** The digits as they stand, grouped so 1,000 counts as 1,000. */
  protected readonly shownTrust = computed(() =>
    TRUST_STATS.map((stat, index) =>
      this.format(Math.round(stat.value * this.trustShares()[index])),
    ),
  );

  /** The four products under "Featured products", in showcase order. */
  protected readonly featured = FEATURED;

  /** The showcase as pager pages, and which one is showing. */
  protected readonly pages = PRODUCT_PAGES;
  protected readonly page = signal(0);

  /**
   * Show a page of the showcase. The track is moved with a single transform, so
   * travelling to a later page slides left and going back slides right on its
   * own — there is no direction state to keep in step with the index.
   */
  protected goToPage(index: number): void {
    this.page.set(index);
  }

  /**
   * Step the showcase a page back or forward from the chevrons either side of the
   * dots. The index is clamped rather than wrapped, matching the disabled state the
   * chevrons take at each end, so a step can never land off the end of the track.
   */
  protected stepPage(delta: number): void {
    const next = this.page() + delta;
    this.page.set(Math.min(Math.max(next, 0), this.pages.length - 1));
  }

  /** The cart. Its count drives the header badge; `addedId` flashes the card's
   *  button to "Added" for a moment after a click. */
  protected readonly cart = inject(CartService);
  /** Sends the clicked product's picture into the header cart and raises the toast. */
  private readonly flyToCart = inject(FlyToCartService);

  /**
   * Add a featured product at the quantity its card is showing, then fly its
   * picture into the cart. The event is used to find the card being clicked
   * rather than passing the element through the template, so the markup stays a
   * plain `addToCart(p, $event)` call and the button needs no reference of its
   * own.
   */
  protected addToCart(product: Product, event: Event): void {
    this.cart.addQty(product, this.qtyFor(product.id));
    // closest() is typed as Element; the card really is an HTMLElement, and the
    // service only ever reads a rect off it.
    const card = (event.currentTarget as HTMLElement | null)?.closest<HTMLElement>('.product-card');
    if (card) this.flyToCart.flyFrom(card, product);
  }

  /**
   * Every card starts on a single unit, whatever the product's MOQ. The
   * wholesale minimum is a fact about ordering, not a reason to make someone
   * click four times to find out the price of one — a buyer who wants 50 types
   * it or steps up to it.
   */
  protected readonly defaultQty = 1;

  /**
   * The unit count each card's stepper is currently showing, keyed by product id.
   * Held per card rather than as one number because the showcase shows four
   * products at a time and each keeps its own figure while you page through.
   */
  private readonly qtyDrafts = signal<Record<string, number>>({});

  /** The count a card is showing, defaulting to a single unit. */
  protected qtyFor(id: string): number {
    return this.qtyDrafts()[id] ?? this.defaultQty;
  }

  /** Step a card's count by single units, never below one. */
  protected stepQty(id: string, delta: number): void {
    this.setQty(id, Math.max(1, this.qtyFor(id) + delta));
  }

  /**
   * Take a typed count. Empty and unparseable input falls back to a single unit
   * rather than zero, so clearing the box can never mean "order none of it" —
   * dropping a line is the cart's business, not the card's.
   */
  protected typeQty(id: string, raw: string): void {
    const parsed = Number.parseInt(raw, 10);
    this.setQty(id, Number.isFinite(parsed) ? Math.max(1, parsed) : 1);
  }

  private setQty(id: string, qty: number): void {
    this.qtyDrafts.update((drafts) => ({ ...drafts, [id]: qty }));
  }

  /** The looping category tile clips plus the Sourcing and Shipping cards',
   *  played/paused from ngAfterViewInit. */
  private readonly catMedia = viewChildren<ElementRef<HTMLVideoElement>>('catMedia');

  /** The two full-bleed section backdrops (trust band, closing CTA). They are played
   *  and paused on the same terms as the tiles, by playCategoryClips. */
  private readonly bgMedia = viewChildren<ElementRef<HTMLVideoElement>>('bgMedia');

  /** This component's root element, so we can find the cards to reveal on scroll. */
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  private timer: ReturnType<typeof setInterval> | undefined;
  private statTimer: ReturnType<typeof setInterval> | undefined;
  private snapTimer: ReturnType<typeof setTimeout> | undefined;
  private mediaObserver: IntersectionObserver | undefined;
  private revealObserver: IntersectionObserver | undefined;
  private stepObserver: IntersectionObserver | undefined;
  private reasonObserver: IntersectionObserver | undefined;
  /** Cancel handles for the two count-ups, so a new one can take over mid-flight and
   *  both can be stopped when the view goes away. */
  private cancelCount: (() => void) | undefined;
  private cancelTrust: (() => void) | undefined;
  private trustObserver: IntersectionObserver | undefined;

  protected goTo(idx: number): void {
    this.current.set(((idx % this.dots.length) + this.dots.length) % this.dots.length);
  }

  /** Move cards and backdrop one step left, then snap both back off the clone. */
  private nextStat(): void {
    const cloneIndex = this.loopStats().length - 1;
    const next = this.statSlide() + 1;
    this.statSlide.set(next);
    if (next === cloneIndex) {
      this.snapTimer = setTimeout(() => {
        this.snapping.set(true);
        this.statSlide.set(0);
        this.snapTimer = setTimeout(() => this.snapping.set(false), 80);
      }, 900);
    }
  }

  ngOnInit(): void {
    this.timer = setInterval(() => this.goTo(this.current() + 1), 6000);
    this.statTimer = setInterval(() => this.nextStat(), 3000);
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
    clearInterval(this.statTimer);
    clearTimeout(this.snapTimer);
    this.mediaObserver?.disconnect();
    this.revealObserver?.disconnect();
    this.stepObserver?.disconnect();
    this.reasonObserver?.disconnect();
    this.trustObserver?.disconnect();
    this.cancelCount?.();
    this.cancelTrust?.();
  }

  /**
   * Wire up the on-scroll behavior once the view exists: play the category clips
   * that are on screen, bubble the cards up as they are reached, light the process
   * rail as it is scrolled through, read the reasons in, and count the trust band up.
   */
  ngAfterViewInit(): void {
    this.playCategoryClips();
    this.revealCards();
    this.watchSteps();
    this.readReasons();
    this.watchTrust();
  }

  /**
   * Bubble each category and product card up as it scrolls into view. Each card
   * gets `.pop` (sunk + transparent) and then `.in` (its resting spot) the first
   * time it enters the viewport, with a small per-card delay so a row rises in
   * sequence instead of all at once.
   */
  private revealCards(): void {
    if (typeof IntersectionObserver === 'undefined') {
      return;
    }

    const cards = Array.from(
      this.host.nativeElement.querySelectorAll<HTMLElement>(
        '.cat-card, .product-card, .subbrand, .cta-final',
      ),
    );

    this.revealObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }
          entry.target.classList.add('in');
          // One shot only: scrolling back up should not replay the animation.
          this.revealObserver?.unobserve(entry.target);
        }
      },
      // Wait for the card to be properly on screen rather than a sliver of it, and
      // pull the bottom edge of the trigger area in so a card that is only about to
      // peek in stays hidden until you actually reach it.
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    );

    // Count cards per grid so the stagger restarts at the first card of the product
    // row instead of continuing from the category grid. `% 4` matches the four card
    // columns on desktop and keeps the longest wait under a third of a second when
    // the grid wraps to two columns on phones.
    const perGrid = new Map<Element, number>();
    for (const card of cards) {
      const parent = card.parentElement ?? card;
      const position = perGrid.get(parent) ?? 0;
      perGrid.set(parent, position + 1);
      card.style.setProperty('--pop-delay', `${(position % 4) * 90}ms`);
      // `.reveal-soft` items are never hidden - only what happens inside them waits
      // for `.in` - so the page's most important call to action is not left at the
      // mercy of an observer.
      if (!card.classList.contains('reveal-soft')) {
        card.classList.add('pop');
      }
      this.revealObserver.observe(card);
    }
  }

  /**
   * Light the process rail as it is scrolled through: each step takes its own
   * delay, then `.live` the moment it reaches the viewport, and the step before it
   * gets `.linked` so the join between the two points charges up behind it.
   *
   * The rail is armed here rather than in the stylesheet, because the CSS resting
   * state is the finished rail. With scripting off nothing is armed, so the four
   * points and their joins are already lit and the section never looks half-drawn.
   */
  private watchSteps(): void {
    const rail = this.host.nativeElement.querySelector<HTMLElement>('.steps--rail');
    const steps = rail ? Array.from(rail.querySelectorAll<HTMLElement>('.step')) : [];

    if (!rail || steps.length === 0 || typeof IntersectionObserver === 'undefined') {
      return;
    }

    steps.forEach((step, index) => {
      step.style.setProperty('--step-delay', `${index * 130}ms`);
      // A join charges as the point it leads to is reached, not with its own point,
      // so the light always runs forwards along the rail.
      step.style.setProperty('--link-delay', `${(index + 1) * 130}ms`);
      // Offsets the pulses so the rings read as one signal running down the rail.
      step.style.setProperty('--ping-delay', `${index * 0.45}s`);
    });

    rail.classList.add('armed');

    this.stepObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }
          const step = entry.target as HTMLElement;
          step.classList.add('live');
          const previous = step.previousElementSibling;
          if (previous instanceof HTMLElement) {
            previous.classList.add('linked');
          }
          // One shot: scrolling back up should not replay the ignition.
          this.stepObserver?.unobserve(step);
        }
      },
      // The point has to be properly on screen rather than clipping an edge before
      // it counts as reached.
      { threshold: 0.4 },
    );

    for (const step of steps) {
      this.stepObserver.observe(step);
    }
  }

  /**
   * Read the six reasons in. Each reason is marked `.reading` the first time it is
   * properly on screen, which starts the word-by-word light-up of its copy, lights
   * its bubble and charges the piece of line below it (all in CSS).
   *
   * Nothing is primed here: the words only animate once `.reading` lands, so with
   * scripting off - or with reduced motion, where the animation is switched off -
   * the copy simply reads as ordinary text.
   */
  private readReasons(): void {
    const list = this.host.nativeElement.querySelector<HTMLElement>('.reasons');
    const reasons = list ? Array.from(list.querySelectorAll<HTMLElement>('.reason')) : [];

    if (!list || reasons.length === 0 || typeof IntersectionObserver === 'undefined') {
      return;
    }

    // Arming rewinds the readout to zero and marks the section, which is what turns
    // the readout's accent on. It happens here rather than in CSS so the list looks
    // finished until scripting takes over: with scripting off there is nothing primed
    // and no count to be stuck on.
    list.closest('section')?.classList.add('armed');
    this.readCount.set(0);

    this.reasonObserver = new IntersectionObserver(
      (entries) => {
        let reached = false;
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }
          entry.target.classList.add('reading');
          // One shot: scrolling back up should not replay the reading.
          this.reasonObserver?.unobserve(entry.target);
          reached = true;
        }
        if (reached) {
          // Counted off the list itself, so two reasons landing in the same frame
          // still land on the right number.
          this.countTo(list.querySelectorAll('.reason.reading').length);
        }
      },
      // Most of the reason has to be on screen, so the reading starts when the
      // copy is really being looked at rather than as it clips the edge.
      { threshold: 0.65 },
    );

    for (const reason of reasons) {
      this.reasonObserver.observe(reason);
    }
  }

  /** Zero pad a count, so the readout keeps its width while the digits tick. */
  private pad(value: number): string {
    return value.toString().padStart(2, '0');
  }

  /**
   * Roll the readout from wherever it is up to `next` over a fraction of a second, so
   * the count reads as counting instead of jumping. The fill bar is driven off the
   * same signal, so it climbs along with the digits.
   */
  private countTo(next: number): void {
    this.cancelCount?.();
    this.cancelCount = undefined;

    const from = this.readCount();
    if (from === next) {
      return;
    }
    this.cancelCount = this.tween(from, next, 420, (value) =>
      this.readCount.set(Math.round(value)),
    );
  }

  /**
   * Count the trust band up as it is scrolled to. The figures run from zero to their
   * real values, staggered across the band, and the three sign-off badges below
   * settle in sequence once the count has landed. Nothing is primed until the band is
   * actually reached, so without scripting the band renders finished.
   */
  private watchTrust(): void {
    const band = this.host.nativeElement.querySelector<HTMLElement>('.trust-band');

    if (!band || typeof IntersectionObserver === 'undefined') {
      return;
    }

    this.trustObserver = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          return;
        }
        // One shot: the count should not replay on every pass.
        this.trustObserver?.disconnect();

        band.classList.add('armed');
        this.trustProgress.set(0);
        this.cancelTrust = this.tween(0, 1, 1500, (value) => {
          this.trustProgress.set(value);
          if (value >= 1) {
            band.classList.add('counted');
          }
        });
      },
      { threshold: 0.45 },
    );

    this.trustObserver.observe(band);
  }

  /**
   * Ease a number from one value to another over `duration` milliseconds, handing
   * every frame's value to `apply`. Eased out, so whatever it drives settles rather
   * than crawling in. When less motion has been asked for, the end value is applied
   * straight away. Returns a cancel function.
   */
  private tween(from: number, to: number, duration: number, apply: (value: number) => void): () => void {
    const lessMotion =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (lessMotion) {
      apply(to);
      return () => undefined;
    }

    const started = performance.now();
    let frame = 0;
    const step = (now: number): void => {
      const progress = Math.min(1, (now - started) / duration);
      apply(from + (to - from) * (1 - Math.pow(1 - progress, 3)));
      frame = progress < 1 ? requestAnimationFrame(step) : 0;
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }

  /** Group a count, so a figure in flight reads as 1,000 and not 1000. */
  private format(value: number): string {
    return value.toLocaleString('en-US');
  }

  /**
   * Start each clip only while its tile — or the Sourcing and Shipping service
   * cards, which share the ref — is on screen and pause it again once it scrolls
   * away. Browsers without IntersectionObserver fall back to playing everything,
   * which is the plain autoplay behavior.
   */
  private playCategoryClips(): void {
    const videos = [...this.catMedia(), ...this.bgMedia()].map((ref) => ref.nativeElement);

    if (videos.length === 0) {
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      for (const video of videos) {
        this.playSilent(video);
      }
      return;
    }

    this.mediaObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) {
            this.playSilent(video);
          } else {
            video.pause();
          }
        }
      },
      { rootMargin: '120px' },
    );

    for (const video of videos) {
      this.mediaObserver.observe(video);
    }
  }

  /**
   * Start a clip in silence. A player resets `muted` when it loads a source, so the
   * template attribute cannot be trusted to still hold by the time a tile scrolls
   * into view. Re-assert the property and pin the volume on every start, which is
   * also what keeps autoplay from being blocked. MediaMuteService holds the same
   * line for every clip on the site.
   */
  private playSilent(video: HTMLVideoElement): void {
    video.muted = true;
    video.volume = 0;
    void video.play().catch(() => undefined);
  }
}
