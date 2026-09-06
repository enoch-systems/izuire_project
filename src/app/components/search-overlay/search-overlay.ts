import {
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiService } from '../../services/ui.service';
import { SEARCH_ITEMS } from '../../services/search-items';

/**
 * Search overlay, reproducing the original site's search behavior:
 * opens from the header button or the "/" shortcut, filters the same
 * 24-entry index, closes on ESC / backdrop click.
 */
@Component({
  selector: 'app-search-overlay',
  imports: [RouterLink],
  templateUrl: './search-overlay.html',
  host: {
    '(document:keydown)': 'onKeydown($event)',
  },
})
export class SearchOverlay {
  private readonly ui = inject(UiService);

  protected readonly open = this.ui.searchOpen;
  protected readonly query = signal('');
  protected readonly results = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (q.length === 0) return SEARCH_ITEMS;
    return SEARCH_ITEMS.filter(
      (i) => (i.title + ' ' + i.desc + ' ' + i.cat).toLowerCase().includes(q)
    );
  });

  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  constructor() {
    effect(() => {
      if (this.open()) {
        this.query.set('');
        setTimeout(() => this.searchInput()?.nativeElement.focus(), 50);
      }
    });
  }

  protected onInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected close(): void {
    this.ui.closeSearch();
  }

  protected onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close();
  }

  protected onKeydown(event: KeyboardEvent): void {
    const tag = (event.target as HTMLElement | null)?.tagName;
    if (event.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
      event.preventDefault();
      this.ui.openSearch();
    }
    if (event.key === 'Escape') this.close();
  }
}
