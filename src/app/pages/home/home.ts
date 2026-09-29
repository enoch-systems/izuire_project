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

/** One slide of the hero stat carousel (a card plus its backdrop design). */
interface HeroStat {
  icon: 'calendar' | 'grid' | 'clock' | 'plane' | 'shield' | 'pin' | 'camera';
  num: string;
  lbl: string;
  tone: 'bs-a' | 'bs-b' | 'bs-c' | 'bs-d' | 'bs-e' | 'bs-f' | 'bs-g';
  bg: 'bg-a' | 'bg-b' | 'bg-c' | 'bg-d' | 'bg-e' | 'bg-f' | 'bg-g';
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
 * Sourcing and Shipping service cards through the same #catMedia ref. Only the
 * clips inside the viewport play (see playCategoryClips) so the browser never
 * decodes every clip at once and off-screen ones stay on their poster frame.
 *
 * The four process steps sit on a rail: each point lights as it is reached and the
 * join behind it charges up from the point before, so the section reads as a
 * signal travelling from "tell us what you need" to "shipped to your door" (see
 * watchSteps). The pulses on the points are pure CSS.
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
  protected readonly dots = [0, 1, 2];
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

  /** The looping category tile clips plus the Sourcing and Shipping cards',
   *  played/paused from ngAfterViewInit. */
  private readonly catMedia = viewChildren<ElementRef<HTMLVideoElement>>('catMedia');

  /** This component's root element, so we can find the cards to reveal on scroll. */
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  private timer: ReturnType<typeof setInterval> | undefined;
  private statTimer: ReturnType<typeof setInterval> | undefined;
  private snapTimer: ReturnType<typeof setTimeout> | undefined;
  private mediaObserver: IntersectionObserver | undefined;
  private revealObserver: IntersectionObserver | undefined;
  private stepObserver: IntersectionObserver | undefined;

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
  }

  /**
   * Wire up the on-scroll behavior once the view exists: play the category clips
   * that are on screen, bubble the cards up as they are reached, and light the
   * process rail as it is scrolled through.
   */
  ngAfterViewInit(): void {
    this.playCategoryClips();
    this.revealCards();
    this.watchSteps();
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
      this.host.nativeElement.querySelectorAll<HTMLElement>('.cat-card, .product-card'),
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
      card.classList.add('pop');
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
   * Start each clip only while its tile — or the Sourcing and Shipping service
   * cards, which share the ref — is on screen and pause it again once it scrolls
   * away. Browsers without IntersectionObserver fall back to playing everything,
   * which is the plain autoplay behavior.
   */
  private playCategoryClips(): void {
    const videos = this.catMedia().map((ref) => ref.nativeElement);

    if (videos.length === 0) {
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      for (const video of videos) {
        void video.play().catch(() => undefined);
      }
      return;
    }

    this.mediaObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const video = entry.target as HTMLVideoElement;
          if (entry.isIntersecting) {
            void video.play().catch(() => undefined);
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
}
