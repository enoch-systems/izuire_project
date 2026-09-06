import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

/**
 * FAQ page with accordion items (one open at a time, animated via
 * max-height like the original). A URL fragment (e.g. /faq#moq) opens
 * and scrolls to the matching item, like the original script.
 */
@Component({
  selector: 'app-faq',
  imports: [RouterLink],
  templateUrl: './faq.html',
})
export class Faq {
  private readonly route = inject(ActivatedRoute);

  protected readonly openId = signal<string | null>(null);
  private readonly heights: Record<string, string> = {};

  constructor() {
    this.route.fragment.subscribe((fragment) => {
      if (!fragment) return;
      setTimeout(() => {
        const item = document.getElementById(fragment);
        if (item?.classList.contains('faq-item')) {
          this.toggle(fragment);
          setTimeout(() => item.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200);
        }
      }, 0);
    });
  }

  protected isOpen(id: string): boolean {
    return this.openId() === id;
  }

  protected maxHeight(id: string): string | null {
    return this.isOpen(id) ? (this.heights[id] ?? null) : null;
  }

  protected toggle(id: string): void {
    if (this.isOpen(id)) {
      this.openId.set(null);
      return;
    }
    this.openId.set(id);
    const answer = document.getElementById(id)?.querySelector('.faq-a') as HTMLElement | null;
    if (answer) this.heights[id] = answer.scrollHeight + 'px';
  }
}
