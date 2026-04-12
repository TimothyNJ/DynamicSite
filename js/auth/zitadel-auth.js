/**
 * zitadel-auth.js - Zitadel PKCE Authentication
 *
 * Handles the full PKCE OAuth2 flow for DynamicSite:
 * - Login redirect to Zitadel
 * - Callback handling and token exchange
 * - Token storage and refresh
 * - Logout
 *
 * Instance: dynamicsite-hgyhhz.us1.zitadel.cloud
 * Client ID: 339931209931003985
 */

// ─── Configuration ────────────────────────────────────────────────────────────

const ZITADEL_ISSUER = 'https://dynamicsite-hgyhhz.us1.zitadel.cloud';
const CLIENT_ID = '339931209931003985';
const SCOPES = 'openid profile email offline_access urn:zitadel:iam:org:project:id:339930261431031889:aud';

function getRedirectUri() {
  return `${window.location.origin}/callback.html`;
}

function getPostLogoutUri() {
  return `${window.location.origin}/index.html`;
}

// ─── PKCE Helpers ─────────────────────────────────────────────────────────────

function generateRandomString(length = 64) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const randomValues = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(randomValues).map(v => chars[v % chars.length]).join('');
}

async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest('SHA-256', data);
}

function base64URLEncode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function generateCodeChallenge(verifier) {
  const hashed = await sha256(verifier);
  return base64URLEncode(hashed);
}

// ─── OIDC Discovery ───────────────────────────────────────────────────────────

let oidcConfig = null;

async function getOidcConfig() {
  if (oidcConfig) return oidcConfig;
  const response = await fetch(`${ZITADEL_ISSUER}/.well-known/openid-configuration`);
  if (!response.ok) throw new Error('Failed to fetch OIDC configuration');
  oidcConfig = await response.json();
  return oidcConfig;
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function login() {
  try {
    // Clear any stale auth state before starting fresh login
    clearAuthState();
    
    const config = await getOidcConfig();
    const codeVerifier = generateRandomString(64);
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateRandomString(32);

    sessionStorage.setItem('pkce_code_verifier', codeVerifier);
    sessionStorage.setItem('pkce_state', state);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: CLIENT_ID,
      redirect_uri: getRedirectUri(),
      scope: SCOPES,
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    console.log('[Auth] Redirecting to Zitadel login...');
    window.location.href = `${config.authorization_endpoint}?${params.toString()}`;
  } catch (error) {
    console.error('[Auth] Login failed:', error);
    throw error;
  }
}

// ─── Callback Handler ─────────────────────────────────────────────────────────

export async function handleCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');
  const error = params.get('error');

  if (error) {
    throw new Error(`Auth error: ${error} - ${params.get('error_description')}`);
  }
  if (!code) throw new Error('[Auth] No authorization code in callback');

  const storedState = sessionStorage.getItem('pkce_state');
  if (state !== storedState) throw new Error('[Auth] State mismatch - possible CSRF attack');

  const codeVerifier = sessionStorage.getItem('pkce_code_verifier');
  if (!codeVerifier) throw new Error('[Auth] No code verifier found');

  try {
    const config = await getOidcConfig();
    const tokenResponse = await fetch(config.token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        redirect_uri: getRedirectUri(),
        code: code,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      const err = await tokenResponse.json();
      throw new Error(`Token exchange failed: ${err.error_description || err.error}`);
    }

    const tokens = await tokenResponse.json();
    storeTokens(tokens);
    sessionStorage.removeItem('pkce_code_verifier');
    sessionStorage.removeItem('pkce_state');
    console.log('[Auth] Login successful');
    return tokens;
  } catch (error) {
    console.error('[Auth] Token exchange failed:', error);
    throw error;
  }
}

// ─── Token Storage ────────────────────────────────────────────────────────────

function decodeJwtPayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch { return null; }
}

function storeTokens(tokens) {
  const expiresAt = Date.now() + (tokens.expires_in * 1000);
  localStorage.setItem('auth_access_token', tokens.access_token);
  localStorage.setItem('auth_expires_at', expiresAt.toString());
  if (tokens.refresh_token) localStorage.setItem('auth_refresh_token', tokens.refresh_token);
  if (tokens.id_token) {
    localStorage.setItem('auth_id_token', tokens.id_token);
    const userInfo = decodeJwtPayload(tokens.id_token);
    if (userInfo) localStorage.setItem('auth_user', JSON.stringify(userInfo));
  }
  localStorage.setItem('isAuthenticated', 'true');
}

// ─── Token Access ─────────────────────────────────────────────────────────────

export function getAccessToken() {
  return localStorage.getItem('auth_access_token');
}

export function isTokenExpired() {
  const expiresAt = localStorage.getItem('auth_expires_at');
  if (!expiresAt) return true;
  return Date.now() > parseInt(expiresAt) - 60000; // 60s buffer
}

export function getUserInfo() {
  const user = localStorage.getItem('auth_user');
  return user ? JSON.parse(user) : null;
}

export function isAuthenticated() {
  return localStorage.getItem('isAuthenticated') === 'true'
    && !!getAccessToken()
    && !isTokenExpired();
}

// ─── Role Management ─────────────────────────────────────────────────────────

const ROLE_HIERARCHY = ['06_guest_user', '05_org_admin', '04_org_audit_admin', '03_org_super_admin', '02_org_owner', '01_system_admin'];

export function getUserRoles() {
  const user = getUserInfo();
  if (!user) return [];
  const projectId = '339930261431031889';
  const roleClaims =
    user[`urn:zitadel:iam:org:project:${projectId}:roles`] ||
    user['urn:zitadel:iam:org:project:roles'] ||
    user[`urn:zitadel:iam:org:projects`]?.[projectId] ||
    {};
  return Object.keys(roleClaims);
}

export function getHighestRole() {
  const roles = getUserRoles();
  if (roles.length === 0) return null;
  let highest = null, highestIndex = -1;
  for (const role of roles) {
    const index = ROLE_HIERARCHY.indexOf(role);
    if (index > highestIndex) { highestIndex = index; highest = role; }
  }
  return highest;
}

export function hasRole(role) {
  return getUserRoles().includes(role);
}

export function hasMinimumRole(minimumRole) {
  const minimumIndex = ROLE_HIERARCHY.indexOf(minimumRole);
  if (minimumIndex === -1) return false;
  return getUserRoles().some(role => ROLE_HIERARCHY.indexOf(role) >= minimumIndex);
}

// ─── Token Refresh ────────────────────────────────────────────────────────────

// ─── Token Refresh ────────────────────────────────────────────────────────────

export async function refreshToken() {
  const storedRefreshToken = localStorage.getItem('auth_refresh_token');
  if (!storedRefreshToken) throw new Error('[Auth] No refresh token available');

  try {
    const config = await getOidcConfig();
    const response = await fetch(config.token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: CLIENT_ID,
        refresh_token: storedRefreshToken,
      }),
    });
    if (!response.ok) throw new Error('Token refresh failed');
    const tokens = await response.json();
    storeTokens(tokens);
    console.log('[Auth] Token refreshed successfully');
    return tokens;
  } catch (error) {
    console.error('[Auth] Token refresh failed:', error);
    clearAuthState();
    throw error;
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logout() {
  const idToken = localStorage.getItem('auth_id_token');
  clearAuthState();
  try {
    const config = await getOidcConfig();
    if (config.end_session_endpoint) {
      const params = new URLSearchParams({
        post_logout_redirect_uri: getPostLogoutUri(),
        client_id: CLIENT_ID,
      });
      if (idToken) params.set('id_token_hint', idToken);
      window.location.href = `${config.end_session_endpoint}?${params.toString()}`;
    } else {
      window.location.href = getPostLogoutUri();
    }
  } catch {
    window.location.href = getPostLogoutUri();
  }
}

export function clearAuthState() {
  ['auth_access_token','auth_refresh_token','auth_id_token','auth_expires_at','auth_user']
    .forEach(k => localStorage.removeItem(k));
  localStorage.setItem('isAuthenticated', 'false');
  console.log('[Auth] Auth state cleared');
}

// ─── Auto Refresh Timer ───────────────────────────────────────────────────────

let refreshTimer = null;

export function startTokenRefreshTimer() {
  if (refreshTimer) clearTimeout(refreshTimer);
  const expiresAt = localStorage.getItem('auth_expires_at');
  if (!expiresAt) return;
  const refreshIn = parseInt(expiresAt) - Date.now() - (5 * 60 * 1000);
  if (refreshIn <= 0) { refreshToken().catch(() => {}); return; }
  refreshTimer = setTimeout(async () => {
    try {
      await refreshToken();
      startTokenRefreshTimer();
    } catch { console.error('[Auth] Auto refresh failed'); }
  }, refreshIn);
  console.log(`[Auth] Token refresh scheduled in ${Math.round(refreshIn / 60000)} minutes`);
}

export function stopTokenRefreshTimer() {
  if (refreshTimer) { clearTimeout(refreshTimer); refreshTimer = null; }
}
