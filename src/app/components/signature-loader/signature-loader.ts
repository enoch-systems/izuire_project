import { Component, OnDestroy, effect, inject, signal, untracked } from '@angular/core';
import { LOGO_SRC } from '../../logo';
import { UiService } from '../../services/ui.service';

/**
 * The signing animation: the Izuire mark written out in orange, nib first, the
 * way a hand would draw it.
 *
 * It runs once on a cold load, before the page is interactive, and again
 * whenever the header logo is clicked. Two very different jobs, so it is one
 * component reading one signal rather than two components: the click replay is
 * the same marks over again, and there is nothing to keep in step.
 *
 * How it is built, and why not simply animate the PNG:
 *
 * The wordmark is a bitmap on an opaque white plate, so it cannot be traced -
 * there is no path to follow and no stroke to draw. Instead the mark is treated
 * as ink on paper. A sheet rises, an SVG of the Z is drawn stroke-first in the
 * brand orange with a nib riding the end of the stroke, and the wordmark then
 * wipes in behind it, letter by letter, as if the rest of the signature were
 * being written. The real bitmap appears last and settles over the top, so the
 * mark that is left on screen is the actual logo file, not a redrawing of it.
 *
 * The overlay is a full-page cover, so it is `aria-hidden` and takes no focus:
 * it is decoration, and the real header logo behind it is still the thing a
 * screen reader or a keyboard meets.
 */
@Component({
  selector: 'app-signature-loader',
  templateUrl: './signature-loader.html',
})
export class SignatureLoader implements OnDestroy {
  /** The wordmark, shown at the end so the finished mark is the real file. */
  protected readonly logo = LOGO_SRC;
  /** Carries the logo click over to the signature animation. */
  private readonly ui = inject(UiService);

  /**
   * Bumped to start a run, and read by the template as the overlay's key.
   * Re-inserting the overlay on a new value is what restarts the CSS animations:
   * toggling a class that is already applied would change nothing.
   */
  protected readonly runId = signal(0);
  /** True while a run is on screen. */
  protected readonly playing = signal(false);
  /** True once the ink has landed, for the settled state. */
  protected readonly signed = signal(false);
  /**
   * True in the beat between the pen finishing and the real mark arriving, which
   * is when the drawing is struck out and the printed logo fades up in its place.
   */
  protected readonly swapping = signal(false);

  /**
   * A click replay outranks the cold run: the loader is the first thing in the
   * tree, so on a cold load this has already fired once by the time a click could
   * possibly arrive. Watching the counter means a click during the cold
   * animation restarts it rather than queueing behind it.
   *
   * Built as a field initializer, not in ngOnInit: `effect()` needs an injection
   * context to resolve its DestroyRef, and a lifecycle hook is not one. Declared
   * here it runs in the constructor, where the context is guaranteed.
   */
  private readonly watchClicks = effect(() => {
    // Skip 0 — that is the initial value, not a request.
    if (this.ui.signatureRequested() > 0) {
      // `play` writes signals, and an effect may not do that without saying so.
      // The writes are not derived from the value just read — they start a
      // one-shot animation — so untracked is the honest description of them.
      untracked(() => this.play(false));
    }
  });

  private hideTimer: ReturnType<typeof setTimeout> | undefined;
  /** Fires a beat before the sheet is torn down, to land the "signed" state. */
  private settleTimer: ReturnType<typeof setTimeout> | undefined;
  /** Fires at the hand-off, where the drawing gives way to the printed mark. */
  private swapTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    // The cold run. Deferred by a tick so the first paint is the page, not the
    // sheet: the overlay is meant to look like the site opening, not like
    // something standing between the reader and it.
    setTimeout(() => this.play(true), 60);
  }

  /**
   * Play the signing animation. `immediate` is for the cold load, where the run
   * is short and gets out of the way; a click replay is held a beat longer,
   * because someone asked for it and should be able to read it.
   */
  play(immediate = false): void {
    // Reduced motion: the mark is already in the header, so there is nothing to
    // sign. Skipping is the whole point of the preference.
    if (this.prefersReducedMotion()) return;

    clearTimeout(this.hideTimer);
    clearTimeout(this.settleTimer);
    clearTimeout(this.swapTimer);
    this.signed.set(false);
    this.swapping.set(false);
    this.playing.set(true);
    this.runId.update((n) => n + 1);

    // One timer per state, rather than an animationend listener: the sheet
    // carries several stacked animations and the first to finish would tear it
    // down mid-signature.
    this.hideTimer = setTimeout(() => this.playing.set(false), immediate ? 2000 : 2600);
    this.settleTimer = setTimeout(() => this.signed.set(true), immediate ? 1500 : 2100);
    // The hand-off: the drawing clears and the printed mark takes its place.
    this.swapTimer = setTimeout(() => this.swapping.set(true), immediate ? 1150 : 1250);
  }

  ngOnDestroy(): void {
    clearTimeout(this.hideTimer);
    clearTimeout(this.settleTimer);
    clearTimeout(this.swapTimer);
  }

  private prefersReducedMotion(): boolean {
    return (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }
}
