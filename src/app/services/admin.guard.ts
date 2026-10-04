import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * /admin gate. Only the NG_ADMIN_EMAIL account passes — every other signed-in
 * user (and every logged-out visitor) is sent home. The demo account is never
 * admin unless its email IS the admin email.
 */
@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  canActivate(): boolean | UrlTree {
    const user = this.auth.user();
    if (user && user.isAdmin) return true;
    return this.router.parseUrl('/');
  }
}
