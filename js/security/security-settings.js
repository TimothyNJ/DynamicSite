/**
 * security-settings.js
 *
 * Fetches and displays security configuration for each environment
 * on the Development > Security Settings page.
 *
 * Server-side values (Zitadel OIDC settings, login policy) are fetched
 * via the API proxy lambda. Client-side values (inactivity timeout,
 * countdown, user-facing slider options) are read from localStorage
 * and the security-config.json on S3.
 *
 * Push functionality: edits are sent back through the lambda to
 * update Zitadel settings and/or write config JSON to S3.
 */

import { getAccessToken, isAuthenticated, refreshToken, isTokenExpired } from '../auth/zitadel-auth.js';
import { AUTH_API } from '../core/env.js';

// Per-environment API Gateway, resolved by core/env.js based on the
// current hostname. dev → auth-dev.dynamicsite.io, sandbox →
// auth-sandbox.dynamicsite.io, prod → api.dynamicsite.io.
const API_BASE = AUTH_API;

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDuration(seconds) {
  if (seconds >= 86400) {
    const days = seconds / 86400;
    return `${days} day${days === 1 ? '' : 's'}`;
  }
  if (seconds >= 3600) {
    const hours = seconds / 3600;
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }
  if (seconds >= 60) {
    const minutes = seconds / 60;
    return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  }
  return `${seconds} second${seconds === 1 ? '' : 's'}`;
}

function parseZitadelDuration(str) {
  // Zitadel returns durations like "43200s"
  if (!str) return 0;
  return parseInt(str.replace('s', ''), 10);
}

async function authenticatedFetch(path, options = {}) {
  if (!isAuthenticated()) {
    throw new Error('[Security Settings] Not authenticated');
  }
  if (isTokenExpired()) {
    await refreshToken();
  }
  const token = getAccessToken();
  const resp = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options.headers || {})
    }
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`[Security Settings] ${resp.status}: ${body}`);
  }
  return resp.json();
}

// ─── Value Rendering ────────────────────────────────────────────────────────

function renderValue(containerId, text, rawSeconds) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const p = document.createElement('p');
  p.textContent = text;
  if (rawSeconds !== undefined) {
    p.dataset.rawSeconds = rawSeconds;
  }
  el.innerHTML = '';
  el.appendChild(p);
}

function renderBugStatus(containerId, isFixed) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const p = document.createElement('p');
  p.textContent = isFixed ? 'FIXED' : 'BROKEN — no wall-clock check';
  p.classList.add(isFixed ? 'security-status-fixed' : 'security-status-broken');
  el.innerHTML = '';
  el.appendChild(p);
}

// ─── Fetch and Render ───────────────────────────────────────────────────────

export async function initializeSecuritySettings(env) {
  console.log(`[Security Settings] Initializing for environment: ${env}`);

  // Fetch Zitadel settings via lambda proxy
  try {
    const data = await authenticatedFetch(`/security-settings/${env}`);
    const oidc = data.oidcSettings || {};
    const login = data.loginPolicy || {};

    // Token & Auth Lifetimes
    const tokenLifetime = parseZitadelDuration(oidc.accessTokenLifetime);
    renderValue(`sec-token-lifetime-value-${env}`, formatDuration(tokenLifetime), tokenLifetime);

    const idTokenLifetime = parseZitadelDuration(oidc.idTokenLifetime);
    renderValue(`sec-id-token-lifetime-value-${env}`, formatDuration(idTokenLifetime), idTokenLifetime);

    const refreshIdle = parseZitadelDuration(oidc.refreshTokenIdleExpiration);
    renderValue(`sec-refresh-idle-value-${env}`, formatDuration(refreshIdle), refreshIdle);

    const refreshAbsolute = parseZitadelDuration(oidc.refreshTokenExpiration);
    renderValue(`sec-refresh-absolute-value-${env}`, formatDuration(refreshAbsolute), refreshAbsolute);

    const passwordCheck = parseZitadelDuration(login.passwordCheckLifetime);
    renderValue(`sec-password-check-value-${env}`, formatDuration(passwordCheck), passwordCheck);

  } catch (err) {
    console.error('[Security Settings] Failed to fetch Zitadel settings:', err);
    renderValue(`sec-token-lifetime-value-${env}`, 'Error loading');
    renderValue(`sec-id-token-lifetime-value-${env}`, 'Error loading');
    renderValue(`sec-refresh-idle-value-${env}`, 'Error loading');
    renderValue(`sec-refresh-absolute-value-${env}`, 'Error loading');
    renderValue(`sec-password-check-value-${env}`, 'Error loading');
  }

  // Client-side settings — read from localStorage / hardcoded defaults
  const timeoutMinutes = parseFloat(localStorage.getItem('sessionTimeoutMinutes') || '0.5');
  renderValue(`sec-inactivity-timeout-value-${env}`, formatDuration(timeoutMinutes * 60), timeoutMinutes * 60);

  const countdownSeconds = 30; // Hardcoded in session-timeout.js
  renderValue(`sec-countdown-duration-value-${env}`, formatDuration(countdownSeconds), countdownSeconds);

  // User-facing timeout options (the values the user can pick from on Settings page)
  const options = ['30 sec (0.5 min)', '10 min', '20 min'];
  renderValue(`sec-timeout-options-value-${env}`, options.join('  |  '));

  // Token refresh buffer
  renderValue(`sec-token-refresh-buffer-value-${env}`, '5 minutes before expiry', 300);

  // Sleep bug status — fixed: resetInactivityTimer now checks wall clock
  renderBugStatus(`sec-sleep-bug-value-${env}`, true);

  // Create push button
  if (window.componentFactory) {
    const pushContainerId = `sec-push-button-${env}`;
    if (document.getElementById(pushContainerId)) {
      window.componentFactory.createButton(pushContainerId, {
        id: `sec-push-action-${env}`,
        text: `Push to ${env.charAt(0).toUpperCase() + env.slice(1)}`,
        active: true,
        onClick: () => pushSecuritySettings(env)
      });
    }
  }
}

// ─── Push Settings ──────────────────────────────────────────────────────────

async function pushSecuritySettings(env) {
  console.log(`[Security Settings] Push requested for environment: ${env}`);

  try {
    // Collect current displayed values from the DOM (raw seconds stored in data attributes)
    const getValue = (id) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const p = el.querySelector('p');
      return p?.dataset?.rawSeconds ? parseInt(p.dataset.rawSeconds, 10) : null;
    };

    const tokenLifetime = getValue(`sec-token-lifetime-value-${env}`);
    const idTokenLifetime = getValue(`sec-id-token-lifetime-value-${env}`);
    const refreshIdle = getValue(`sec-refresh-idle-value-${env}`);
    const refreshAbsolute = getValue(`sec-refresh-absolute-value-${env}`);
    const passwordCheck = getValue(`sec-password-check-value-${env}`);

    // Push Zitadel server-side settings
    const zitadelPayload = {
      oidcSettings: {},
      loginPolicy: {}
    };
    if (tokenLifetime) zitadelPayload.oidcSettings.accessTokenLifetime = `${tokenLifetime}s`;
    if (idTokenLifetime) zitadelPayload.oidcSettings.idTokenLifetime = `${idTokenLifetime}s`;
    if (refreshIdle) zitadelPayload.oidcSettings.refreshTokenIdleExpiration = `${refreshIdle}s`;
    if (refreshAbsolute) zitadelPayload.oidcSettings.refreshTokenExpiration = `${refreshAbsolute}s`;
    if (passwordCheck) zitadelPayload.loginPolicy.passwordCheckLifetime = `${passwordCheck}s`;

    console.log(`[Security Settings] Pushing Zitadel settings for ${env}:`, zitadelPayload);
    const zitadelResult = await authenticatedFetch(`/security-settings/${env}`, {
      method: 'POST',
      body: JSON.stringify(zitadelPayload)
    });
    console.log(`[Security Settings] Zitadel push result:`, zitadelResult);

    // Push client-side config to S3
    const inactivityTimeout = getValue(`sec-inactivity-timeout-value-${env}`);
    const countdownDuration = getValue(`sec-countdown-duration-value-${env}`);
    const clientConfig = {
      clientConfig: {
        sessionTimeoutOptions: [
          { text: '30 sec', value: 0.5 },
          { text: '10 min', value: 10 },
          { text: '20 min', value: 20 }
        ],
        defaultTimeoutMinutes: inactivityTimeout ? inactivityTimeout / 60 : 0.5,
        countdownSeconds: countdownDuration || 30,
        tokenRefreshBufferMs: 300000
      }
    };

    console.log(`[Security Settings] Pushing client config for ${env}:`, clientConfig);
    const clientResult = await authenticatedFetch(`/push-client-config/${env}`, {
      method: 'POST',
      body: JSON.stringify(clientConfig)
    });
    console.log(`[Security Settings] Client config push result:`, clientResult);

    console.log(`[Security Settings] Push to ${env} complete`);

  } catch (err) {
    console.error(`[Security Settings] Push to ${env} failed:`, err);
  }
}
