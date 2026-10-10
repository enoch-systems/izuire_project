import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, CanActivateChild, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AdminAuthService } from './admin-auth.service';

/**
 * Gate for the whole admin console.
 *
 * It reads AdminAuthService, not the shop's AuthService, so a shopper who is
 * merely signed in stays outside, and a console that was signed in separately
 * does not depend on the shopper's session surviving.
 *
 * A refusal goes to the admin sign-in page rather than home. Being bounced to
 * the storefront with no explanation is what made this hard to diagnose in the
 * first place: the guard was working, it just had nowhere useful to send you.
 *
 * It is also both a CanActivate and a CanActivateChild, so signing out on one
 * admin page cannot leave another one open behind you.
 */
@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate, CanActivateChild {
  private readonly admin = inject(AdminAuthService);
  private readonly router = inject(Router);

  canActivate(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    return this.admin.signedIn()
      ? true
      : this.router.createUrlTree(['/admin/login'], { queryParams: { returnUrl: state.url } });
  }

  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    return this.canActivate(route, state);
  }
}
