import { Injectable, inject, signal } from '@angular/core';

import { Router } from '@angular/router';

import { AuthConfig, OAuthService, OAuthEvent } from 'angular-oauth2-oidc';

import { authConfig } from './auth.config';
import { filter } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthGoogleService {
  private oAuthService = inject(OAuthService);

  private router = inject(Router);

  profile = signal<any>(null);
  name = signal<string | null>(null);
  isTokenExpired = signal<boolean>(false);

  constructor() {
    this.initConfiguration();
    this.setupTokenRefreshHandling();
  }

  initConfiguration() {
    this.oAuthService.configure(authConfig);

    this.oAuthService.setupAutomaticSilentRefresh();

    this.oAuthService.loadDiscoveryDocumentAndTryLogin().then(() => {
      if (this.oAuthService.hasValidIdToken()) {
        this.profile.set(this.oAuthService.getIdentityClaims());
        this.name.set(this.oAuthService.getIdentityClaims()['name'] || null);
      }
    });
  }

  login() {
    this.oAuthService.initImplicitFlow();
  }

  logout() {
    this.oAuthService.revokeTokenAndLogout();

    this.oAuthService.logOut();

    this.profile.set(null);
    this.name.set(null);
  }

  getAccessToken() {
    return this.oAuthService.getAccessToken();
  }

  private setupTokenRefreshHandling() {
    // Listen for token refresh events
    this.oAuthService.events
      .pipe(filter(e => e.type === 'token_refresh_error'))
      .subscribe((e: OAuthEvent) => {
        console.error('Token refresh failed:', e);
        this.isTokenExpired.set(true);
        // Optionally auto-logout on refresh failure
        // this.logout();
      });

    this.oAuthService.events
      .pipe(filter(e => e.type === 'token_refreshed'))
      .subscribe(() => {
        console.log('Token successfully refreshed');
        this.isTokenExpired.set(false);
      });

    this.oAuthService.events
      .pipe(filter(e => e.type === 'token_expires'))
      .subscribe(() => {
        console.log('Token is about to expire, attempting refresh...');
        this.refreshToken();
      });
  }

  async refreshToken(): Promise<boolean> {
    try {
      await this.oAuthService.silentRefresh();
      this.isTokenExpired.set(false);
      return true;
    } catch (error) {
      console.error('Silent refresh failed:', error);
      this.isTokenExpired.set(true);
      return false;
    }
  }

  isTokenValid(): boolean {
    return this.oAuthService.hasValidAccessToken() && !this.isTokenExpired();
  }

  getTokenExpirationTime(): number | null {
    const tokenExpires = this.oAuthService.getAccessTokenExpiration();
    return tokenExpires || null;
  }

  getTimeUntilExpiration(): number | null {
    const expirationTime = this.getTokenExpirationTime();
    if (!expirationTime) return null;
    
    const now = Date.now();
    return Math.max(0, expirationTime - now);
  }
}
