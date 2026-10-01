import { Component, inject, input } from '@angular/core';
import { AuthService } from '../../services/auth.service';

/**
 * The signed-in switch for the account pages.
 *
 * Each page hands its own content in as projected markup; this component only
 * decides whether it is shown or replaced with the "sign in first" card. That
 * keeps the four account pages from each growing their own copy of the same
 * gate, and keeps the gate's wording in one place.
 */
@Component({
  selector: 'app-account-gate',
  templateUrl: './account-gate.html',
})
export class AccountGate {
  protected readonly auth = inject(AuthService);
  /** What the visitor came for — "payments", "your profile" — for the heading. */
  readonly label = input('account');

  protected openAuth(): void {
    this.auth.openAuth();
  }

  protected openSignup(): void {
    this.auth.openSignup();
  }
}
