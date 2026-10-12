import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <main class="not-found" aria-labelledby="notFoundTitle">
      <div class="not-found-code" aria-hidden="true">404</div>
      <p class="not-found-kicker">{{ adminArea ? 'ADMIN CONSOLE' : 'IZUIRE' }}</p>
      <h1 id="notFoundTitle">This page isn’t here.</h1>
      <p class="not-found-copy">The address may have changed, or the page may no longer be available.</p>
      <div class="not-found-actions">
        @if (adminArea) {
          <a class="not-found-primary" routerLink="/admin">Back to dashboard</a>
          <a class="not-found-secondary" routerLink="/admin/products">Open catalogue</a>
        } @else {
          <a class="not-found-primary" routerLink="/marketplace">Back to marketplace</a>
          <a class="not-found-secondary" routerLink="/">Go to home</a>
        }
      </div>
    </main>
  `,
  styles: [`
    :host{display:block;min-height:58vh;color:var(--ink)}
    .not-found{position:relative;display:flex;min-height:58vh;max-width:760px;flex-direction:column;justify-content:center;align-items:flex-start;margin:0 auto;padding:64px 28px;overflow:hidden}
    .not-found-code{position:absolute;right:12px;top:50%;transform:translateY(-55%);color:var(--paper);font-family:var(--font-d);font-size:clamp(11rem,28vw,22rem);font-weight:700;line-height:.8;pointer-events:none;user-select:none}
    .not-found-kicker,.not-found h1,.not-found-copy,.not-found-actions{position:relative}
    .not-found-kicker{margin:0 0 16px;color:var(--orange-deep);font-family:var(--font-d);font-size:.68rem;font-weight:700;letter-spacing:.12em}
    h1{max-width:12ch;margin:0;font-family:var(--font-d);font-size:clamp(2.4rem,6vw,4.3rem);line-height:1.03}
    .not-found-copy{max-width:45ch;margin:16px 0 0;color:var(--ink-60);font-size:.95rem;line-height:1.6}
    .not-found-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:28px}
    .not-found-actions a{display:inline-flex;min-height:42px;align-items:center;justify-content:center;padding:0 15px;border:1px solid var(--line);border-radius:5px;color:var(--ink);font-family:var(--font-d);font-size:.78rem;font-weight:700;text-decoration:none;transition:background .18s ease,color .18s ease,border-color .18s ease}
    .not-found-actions .not-found-primary{border-color:var(--ink);background:var(--ink);color:var(--white)}
    .not-found-actions a:hover{border-color:var(--orange-deep);background:var(--orange-deep);color:#fff}
    @media(max-width:600px){.not-found{min-height:68vh;padding:48px 22px}.not-found-code{right:-10px;top:43%;font-size:48vw;opacity:.72}.not-found-actions{width:100%;flex-direction:column;align-items:stretch}}
  `],
})
export class NotFound {
  protected readonly adminArea = inject(Router).url.startsWith('/admin');
}
