/**
 * auth.js - Zitadel Authentication Service for DynamicSite
 * 
 * This service handles all authentication operations using Zitadel Cloud.
 * Update the settings below with your actual Zitadel instance details.
 */

import { UserManager, WebStorageStateStore } from 'oidc-client-ts';

// TODO: Replace these with your actual Zitadel instance values
const ZITADEL_DOMAIN = 'https://dynamicsite.us1.zitadel.cloud';  // <-- UPDATE THIS
const CLIENT_ID = '339931209931003985';                            // <-- UPDATE THIS

const settings = {
  authority: ZITADEL_DOMAIN,
  client_id: CLIENT_ID,
  redirect_uri: window.location.origin + '/auth/callback',
  post_logout_redirect_uri: window.location.origin,
  response_type: 'code',
  scope: 'openid profile email',
  loadUserInfo: true,
  automaticSilentRenew: true,
  userStore: new WebStorageStateStore({ store: window.localStorage })
};

export const authManager = new UserManager(settings);

// Set up automatic token renewal
authManager.events.addAccessTokenExpiring(() => {
  console.log('[Auth] Token expiring, attempting silent renewal...');
});

authManager.events.addAccessTokenExpired(() => {
  console.log('[Auth] Token expired, redirecting to login...');
  authService.login();
});

export const authService = {
  /**
   * Redirect to Zitadel login page
   */
  login: () => {
    console.log('[Auth] Redirecting to login...');
    return authManager.signinRedirect();
  },

  /**
   * Handle the callback after login
   */
  handleCallback: async () => {
    try {
      const user = await authManager.signinRedirectCallback();
      console.log('[Auth] Login successful:', user.profile);
      window.location.href = '/';
      return user;
    } catch (error) {
      console.error('[Auth] Callback error:', error);
      throw error;
    }
  },

  /**
   * Logout user and redirect to Zitadel logout
   */
  logout: () => {
    console.log('[Auth] Logging out...');
    return authManager.signoutRedirect();
  },

  /**
   * Get current user
   */
  getUser: () => {
    return authManager.getUser();
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: async () => {
    try {
      const user = await authManager.getUser();
      return !!user && !user.expired;
    } catch (error) {
      console.error('[Auth] Error checking authentication:', error);
      return false;
    }
  },

  /**
   * Get user's organization ID (for multi-tenant features)
   */
  getOrgId: async () => {
    const user = await authManager.getUser();
    return user?.profile?.org_id || null;
  },

  /**
   * Get user's roles
   */
  getRoles: async () => {
    const user = await authManager.getUser();
    // Zitadel includes roles in the token metadata
    return user?.profile['urn:zitadel:iam:user:metadata'] || [];
  },

  /**
   * Check if user has a specific role
   */
  hasRole: async (role) => {
    const roles = await authService.getRoles();
    return roles.includes(role);
  },

  /**
   * Get access token for API calls
   */
  getAccessToken: async () => {
    const user = await authManager.getUser();
    return user?.access_token || null;
  }
};

// Debug helper - remove in production
window.authDebug = {
  showUser: async () => {
    const user = await authService.getUser();
    console.log('Current user:', user);
    return user;
  },
  showRoles: async () => {
    const roles = await authService.getRoles();
    console.log('User roles:', roles);
    return roles;
  }
};

export default authService;
