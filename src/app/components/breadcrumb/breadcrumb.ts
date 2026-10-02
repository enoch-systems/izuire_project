import { Component, computed, inject, input, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

/** One stop on a breadcrumb trail. The last stop carries no `link` — it is where
 *  the visitor already stands — and every stop ahead of it is drawn as a link. */
export interface Crumb {
  label: string;
  link?: string;
}

/**
 * Declare a route's breadcrumb trail beside the title and description it already
 * carries in `data`, so the trail a page shows is the route it was reached by and
 * cannot drift away from it. Home is not part of a route's own trail; the
 * component puts it in front of whatever a route declares.
 */
export function trail(...stops: Crumb[]): Crumb[] {
  return stops;
}

/**
 * Breadcrumb navigation, read from the route rather than written into a page.
 *
 * Every route in `app.routes.ts` names its own trail in `data.crumb`, and this
 * component reads that trail back from the activated route, adds Home in front of
 * it and draws the row of stops. Adding a page therefore means adding one line of
 * route data — not another hand-written row of links that can fall out of step
 * with where the page actually sits, which is how the breadcrumbs on the original
 * pages were written.
 *
 * A page whose last stop is dynamic — a product detail, which titles itself from
 * the catalogue rather than from the route — passes that label in as `[leaf]`.
 */
@Component({
  selector: 'app-breadcrumb',
  imports: [RouterLink],
  templateUrl: './breadcrumb.html',
})
export class Breadcrumb {
  /** The label of the last stop, for routes that cannot name it themselves. */
  readonly leaf = input<string | null>(null);
  /** `product` is the roomier trail the product page stands under its gallery. */
  readonly variant = input<'plain' | 'product'>('plain');

  private readonly route = inject(ActivatedRoute);

  /** The trail the active route declared, Home excluded. */
  private readonly declared = signal<Crumb[]>(this.read());

  /** Home, then the route's own trail, then the leaf when a page handed one in. */
  protected readonly crumbs = computed<Crumb[]>(() => {
    const stops = [...this.declared()];
    const leaf = this.leaf();
    if (leaf) stops.push({ label: leaf });
    return [{ label: 'Home', link: '/' }, ...stops];
  });

  constructor() {
    // A route can swap its params without the component being rebuilt — the
    // product page steps between ids — so follow the data stream rather than the
    // single snapshot read at construction.
    this.route.data.subscribe(() => this.declared.set(this.read()));
  }

  /** What the route declared, or nothing for a route that declared nothing. */
  private read(): Crumb[] {
    const declared = this.route.snapshot.data['crumb'] as Crumb[] | undefined;
    return Array.isArray(declared) ? declared : [];
  }
}