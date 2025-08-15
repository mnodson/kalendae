import { AuthConfig } from 'angular-oauth2-oidc';

export const authConfig: AuthConfig = {
  issuer: 'https://accounts.google.com',
  redirectUri: window.location.origin,
  clientId: '989513238686-d1l0phissm5uj1p2140t71p8i5fem62i.apps.googleusercontent.com',
  scope: 'openid profile email https://www.googleapis.com/auth/calendar.readonly',
  strictDiscoveryDocumentValidation: false,
  silentRefreshRedirectUri: window.location.origin + '/silent-refresh.html',
  silentRefreshTimeout: 5000,
  timeoutFactor: 0.25, // Refresh token when 75% of its lifetime has passed
  silentRefreshShowIFrame: false,
  clearHashAfterLogin: false,
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};