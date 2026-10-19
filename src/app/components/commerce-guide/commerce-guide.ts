import { Component, HostListener, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiService } from '../../services/ui.service';

@Component({
  selector: 'app-commerce-guide',
  imports: [RouterLink],
  templateUrl: './commerce-guide.html',
})
export class CommerceGuide {
  private readonly ui = inject(UiService);
  protected readonly open = signal(false);

  protected toggle(): void {
    this.open.update((value) => !value);
  }

  protected close(): void {
    this.open.set(false);
  }

  protected search(): void {
    this.close();
    this.ui.openSearch();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.close();
  }
}
