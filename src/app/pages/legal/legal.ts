import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

/**
 * Legal page with tab panels. Tabs are switchable, and a URL fragment
 * (e.g. /legal#privacy from the footer "Privacy" link) activates the
 * matching tab, like the original script did via location.hash.
 */
@Component({
  selector: 'app-legal',
  imports: [RouterLink],
  templateUrl: './legal.html',
})
export class Legal {
  private readonly route = inject(ActivatedRoute);

  protected readonly tabs = ['terms', 'privacy', 'refund', 'shipping-policy', 'responsibilities'];
  protected readonly active = signal('terms');

  constructor() {
    this.route.fragment.subscribe((fragment) => {
      if (fragment && this.tabs.includes(fragment)) {
        this.activate(fragment);
        setTimeout(() => document.getElementById(fragment)?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    });
  }

  protected activate(id: string): void {
    this.active.set(id);
  }
}
