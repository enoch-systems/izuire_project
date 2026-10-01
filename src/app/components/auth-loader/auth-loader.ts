import { Component, OnDestroy, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthLoadingStage, AuthService } from '../../services/auth.service';
import { UiService } from '../../services/ui.service';

/** What the overlay says and how long the bar should take, per stage. */
interface LoaderFace {
  label: string;
  tone: 'in' | 'out' | 'create' | 'reset' | 'update';
  ms: number;
}

/** Every stage the loader can dress up for. `idle` and the confirm step are
 *  absent on purpose — the first means no overlay, the second belongs to the
 *  logout dialog rather than a working spinner. */
const FACES: Partial<Record<AuthLoadingStage, LoaderFace>> = {
  'signing-in': { label: 'Signing you in', tone: 'in', ms: 4200 },
  creating: { label: 'Creating your account', tone: 'create', ms: 4600 },
  resetting: { label: 'Sending your reset link', tone: 'reset', ms: 1800 },
  'signing-out': { label: 'Signing you out', tone: 'out', ms: 2800 },
  'updating-password': { label: 'Updating your password', tone: 'update', ms: 2600 },
};

/**
 * The working overlay for the auth ceremonies.
 *
 * A cousin of the landing signature rather than a copy of it: the same idea —
 * ink drawn on a sheet, nib on the line — but here the stroke never finishes.
 * It loops while the mock call runs, so the mark reads as "still writing"
 * instead of a one-shot animation that would be over before the four seconds
 * are. A progress bar underneath tracks the stage's own duration, and the copy
 * cycles through the lines AuthService stages for it.
 *
 * The tone changes with the ceremony: orange for going in, a quiet ink stroke
 * for coming out (drawn backwards, so leaving reads differently from arriving),
 * blue for a new account. The lock/shield glyph on the sheet names what the
 * overlay is waiting on.
 */
@Component({
  selector: 'app-auth-loader',
  templateUrl: './auth-loader.html',
})
export class AuthLoader implements OnDestroy {
  protected readonly auth = inject(AuthService);
  private readonly ui = inject(UiService);

  /** The face for the current stage, or null when the overlay should be down. */
  protected readonly face = computed<LoaderFace | null>(() => FACES[this.auth.loadingStage()] ?? null);
  /** 0–100, driven on a timer so the bar tracks the stage's real duration. */
  protected readonly progress = signal(0);

  private ticker: ReturnType<typeof setInterval> | undefined;

  constructor() {
    effect(() => {
      const face = this.face();
      clearInterval(this.ticker);
      if (!face) {
        untracked(() => this.progress.set(0));
        this.releaseScroll();
        return;
      }
      document.body.style.overflow = 'hidden';
      const started = performance.now();
      untracked(() => this.progress.set(0));
      this.ticker = setInterval(() => {
        const pct = Math.min(100, ((performance.now() - started) / face.ms) * 100);
        this.progress.set(pct);
        if (pct >= 100) clearInterval(this.ticker);
      }, 60);
    });
  }

  ngOnDestroy(): void {
    clearInterval(this.ticker);
    this.releaseScroll();
  }

  /** Unlock the page, unless another overlay is still holding it. */
  private releaseScroll(): void {
    document.body.style.overflow = this.auth.authOpen() || this.ui.menuOpen() ? 'hidden' : '';
  }
}
