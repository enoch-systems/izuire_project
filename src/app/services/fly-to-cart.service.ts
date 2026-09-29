import { Injectable, signal } from '@angular/core';
import { Product } from '../pages/marketplace/marketplace-data';

/** What the green toast says. One at a time; a new add replaces the old. */
export interface AddedToast {
  /** Product name, so the toast names what went in. */
  title: string;
  /** Monotonic counter, so re-adding the same product re-triggers the entrance. */
  seq: number;
}

/** The measured box a flight starts from. */
interface FlightBox {
  left: number;
  top: number;
  width: number;
  height: number;
  src?: string;
}

/**
 * The "it went in" feedback: a copy of the product's picture flying into the cart
 * button, and a toast confirming it.
 *
 * The flight is driven by the Web Animations API rather than a CSS class because
 * both ends are only known at click time — the card can be on any of the pager's
 * pages, and the header moves with the window. Keyframes are built from two
 * measured rectangles, so the ghost flies from wherever the card actually is into
 * wherever the cart button actually is.
 *
 * The curve is the point: the ghost lifts away, arcs over, and is reeled into the
 * button while it shrinks, the way a window is pulled into the Dock. The ghost is
 * drawn on a fixed layer and removed on finish, so nothing reflows while it flies.
 */
@Injectable({ providedIn: 'root' })
export class FlyToCartService {
  /** The toast to show, or null when none is up. */
  readonly toast = signal<AddedToast | null>(null);
  /**
   * Bumped when a ghost lands, so the cart button can pulse on arrival without
   * this service having to reach into the header component.
   */
  readonly landed = signal(0);

  private seq = 0;
  private hideTimer: ReturnType<typeof setTimeout> | undefined;

  /**
   * Fly `product`'s picture out of `card` and into the cart button, then raise
   * the toast. Safe to call when the button or the picture cannot be found: the
   * toast still appears, because the line really was added.
   */
  flyFrom(card: HTMLElement, product: Product): void {
    this.toast.set({ title: product.title, seq: ++this.seq });
    // Each add restarts the clock, so a second add does not get cut short by the
    // timer left running from the first.
    clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => this.toast.set(null), 3200);

    const from = card.querySelector<HTMLElement>('.product-media');
    const to = document.querySelector<HTMLElement>('.cart-btn');
    if (!from || !to) {
      this.landed.update((n) => n + 1);
      return;
    }

    this.animate(this.measure(from, product), to);
  }

  /** Hide the toast. Exposed so clicking it can dismiss it early. */
  dismiss(): void {
    clearTimeout(this.hideTimer);
    this.toast.set(null);
  }

  /**
   * The box to fly from. A product with a photo flies that photo; one without
   * flies a plain ghost of its own media box, so the effect is the same either
   * way and a click is never silently swallowed.
   */
  private measure(from: HTMLElement, product: Product): FlightBox {
    const rect = from.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      src: product.image?.src,
    };
  }

  /**
   * Build the ghost and run the flight. The ghost is a fixed-position copy of
   * the source box, so the card is left exactly as it was and nothing reflows
   * while its picture is in the air.
   *
   * The shape is clipped to a polygon that is squared off while the picture is
   * still the card's, pinches into an open mouth as it turns for the cart, and
   * closes to a point over the button. The whole ghost is rotated onto the angle
   * to the cart, so the point is always the leading edge no matter which corner
   * of the page the card was in.
   */
  private animate(source: FlightBox, to: HTMLElement): void {
    const target = to.getBoundingClientRect();
    const ghost = this.buildGhost(source);
    document.body.appendChild(ghost);

    const fromX = source.left + source.width / 2;
    const fromY = source.top + source.height / 2;
    const toX = target.left + target.width / 2;
    const toY = target.top + target.height / 2;
    const dx = toX - fromX;
    const dy = toY - fromY;

    // Where the point is aimed, in degrees. Everything below leans this way.
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    // Scaled to the distance so a nearby cart does not fling it off the page.
    const lift = Math.min(150, Math.max(80, Math.hypot(dx, dy) * 0.3));

    const frames: Keyframe[] = [
      {
        offset: 0,
        transform: 'translate(0px, 0px) rotate(0deg) scale(1, 1)',
        clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
        opacity: 1,
      },
      {
        // Lifts clear of the card and stretches tall as it gathers itself.
        offset: 0.26,
        transform: `translate(${dx * 0.05}px, ${-lift}px) rotate(${angle * 0.18}deg) scale(0.94, 1.12)`,
        clipPath: 'polygon(0% 6%, 100% 0%, 100% 100%, 0% 94%)',
        opacity: 1,
      },
      {
        // The mouth: the far edge pulls in to a waist while the near edge stays
        // square, and the ghost flattens as if drawn through a narrowing gap.
        offset: 0.55,
        transform: `translate(${dx * 0.38}px, ${dy * 0.38 - lift * 0.55}px) rotate(${angle * 0.55}deg) scale(0.6, 0.3)`,
        clipPath: 'polygon(0% 0%, 100% 34%, 100% 66%, 0% 100%)',
        opacity: 0.92,
      },
      {
        // The jaws close and the point forms, angled hard onto the cart.
        offset: 0.8,
        transform: `translate(${dx * 0.76}px, ${dy * 0.76 - lift * 0.18}px) rotate(${angle * 0.88}deg) scale(0.22, 0.08)`,
        clipPath: 'polygon(0% 0%, 100% 46%, 100% 54%, 0% 100%)',
        opacity: 0.5,
      },
      {
        offset: 1,
        transform: `translate(${dx}px, ${dy}px) rotate(${angle}deg) scale(0.02, 0.02)`,
        clipPath: 'polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)',
        opacity: 0,
      },
    ];

    const motion = ghost.animate(frames, {
      duration: 820,
      // Front-loaded: it leaves readily, then is reeled in hard.
      easing: 'cubic-bezier(.5,.05,.7,.2)',
      fill: 'forwards',
    });

    motion.addEventListener('finish', () => {
      ghost.remove();
      this.landed.update((n) => n + 1);
    });
  }

  /** A fixed-position copy of the flying picture, ready to be animated. */
  private buildGhost(source: FlightBox): HTMLElement {
    const ghost = document.createElement('div');
    ghost.className = 'fly-ghost';
    ghost.style.left = `${source.left}px`;
    ghost.style.top = `${source.top}px`;
    ghost.style.width = `${source.width}px`;
    ghost.style.height = `${source.height}px`;
    ghost.setAttribute('aria-hidden', 'true');

    if (source.src) {
      const img = document.createElement('img');
      img.src = source.src;
      img.alt = '';
      ghost.appendChild(img);
    }

    return ghost;
  }
}
