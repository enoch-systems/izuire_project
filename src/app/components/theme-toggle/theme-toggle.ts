import { Component, inject } from '@angular/core';
import { ThemeService } from '../../services/theme.service';

/**
 * The light/dark switch.
 *
 * One component with one appearance, used twice — above Marketplace in the
 * desktop nav, and in the mobile drawer. Both instances read the same
 * `ThemeService`, so they can never disagree about which mode is on.
 *
 * It is a real button holding `aria-pressed` rather than a checkbox: the control
 * is a switch, and its state is the thing a screen reader needs announced.
 */
@Component({
  selector: 'app-theme-toggle',
  templateUrl: './theme-toggle.html',
})
export class ThemeToggle {
  protected readonly theme = inject(ThemeService);

  protected toggle(): void {
    this.theme.toggle();
  }
}
