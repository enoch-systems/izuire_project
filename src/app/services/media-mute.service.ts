import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

/** Every element on the site that can make a sound. */
const MEDIA = 'video, audio';

/**
 * Site-wide guarantee that nothing plays sound.
 *
 * `muted` is an IDL property on `HTMLMediaElement`, not something a static template
 * attribute can be relied on to hold: it is re-asserted here on every clip the app
 * starts, and kept under a MutationObserver so it also covers clips that a future
 * page adds, clips the router creates later, and any markup outside the Angular
 * templates. `volume` is pinned to 0 alongside it, so even a player that resets
 * `muted` on load has nothing to output.
 *
 * The clips on this site are decoration — the hero, the category tiles and the
 * section backdrops all loop footage behind text that already says what they are —
 * so none of them want an audio track.
 */
@Injectable({ providedIn: 'root' })
export class MediaMuteService {
  private readonly document = inject(DOCUMENT);
  private observer: MutationObserver | undefined;

  /**
   * Silence everything already on the page, then watch for media that arrives
   * later. Safe to call more than once; only the first call starts the observer.
   */
  start(): void {
    this.silenceAll(this.document.documentElement);

    if (this.observer || typeof MutationObserver === 'undefined') {
      return;
    }

    this.observer = new MutationObserver((records) => {
      for (const record of records) {
        // `muted` or `src` being set is how a clip gets un-muted or reloaded, so
        // the element itself is re-silenced rather than the whole tree.
        if (record.type === 'attributes') {
          this.silence(record.target);
          continue;
        }
        for (const node of Array.from(record.addedNodes)) {
          this.silenceWithin(node);
        }
      }
    });

    this.observer.observe(this.document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['muted', 'src'],
    });
  }

  /** Mute and zero a single media element. */
  silence(target: EventTarget | null): void {
    const media = target as HTMLMediaElement | null;
    if (!media || typeof media.muted !== 'boolean') {
      return;
    }
    // Only write when something is actually off. Writing `muted` reflects to the
    // content attribute, which this same observer watches, so an unconditional
    // write would keep re-triggering itself.
    if (!media.muted) {
      media.muted = true;
    }
    if (media.volume !== 0) {
      media.volume = 0;
    }
  }

  /** Silence every media element inside a node that has just been added. */
  private silenceWithin(node: Node): void {
    if (node.nodeType !== 1 /* Node.ELEMENT_NODE */) {
      return;
    }
    const element = node as Element;
    this.silence(element);
    for (const media of Array.from(element.querySelectorAll(MEDIA))) {
      this.silence(media);
    }
  }

  /** Silence every media element in a subtree, the root document by default. */
  private silenceAll(root: ParentNode): void {
    for (const media of Array.from(root.querySelectorAll(MEDIA))) {
      this.silence(media);
    }
  }
}
