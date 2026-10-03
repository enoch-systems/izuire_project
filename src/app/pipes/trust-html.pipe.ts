import { Pipe, inject, type PipeTransform } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';

/**
 * Marks a static, developer-authored HTML string as trusted so Angular's
 * [innerHTML] binding renders it as-is.
 *
 * The built-in HTML sanitizer (`VALID_ELEMENTS` in @angular/core) allowlists
 * no SVG tags, so the icon strings bound with [innerHTML] — service clusters,
 * freight routes, value pillars — were being stripped to an empty chip. The
 * strings all come from component data files, never from user input, so the
 * bypass carries no injection risk.
 */
@Pipe({ name: 'trustHtml' })
export class TrustHtmlPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
