/**
 * security-config.js
 *
 * Fetches and caches the client-side security configuration from
 * security-config.json (deployed to S3 per environment).
 *
 * This config controls values that the developer sets on the
 * Security Settings page and pushes to each environment:
 *   - Session timeout options shown to users (the slider values)
 *   - Warning countdown duration
 *   - Default inactivity timeout
 *
 * Falls back to hardcoded defaults if the JSON is missing or
 * the fetch fails (first deploy, offline, etc.).
 */

const DEFAULTS = {
  sessionTimeoutOptions: [
    { text: '30 sec', value: 0.5 },
    { text: '10 min', value: 10 },
    { text: '20 min', value: 20 }
  ],
  defaultTimeoutMinutes: 0.5,
  countdownSeconds: 30,
  tokenRefreshBufferMs: 300000  // 5 minutes
};

let _config = null;
let _fetchPromise = null;

/**
 * Load the security config from S3 (or cache).
 * Safe to call multiple times — deduplicates the fetch.
 */
export async function loadSecurityConfig() {
  if (_config) return _config;
  if (_fetchPromise) return _fetchPromise;

  _fetchPromise = (async () => {
    try {
      const resp = await fetch('/security-config.json', {
        cache: 'no-cache'
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      _config = { ...DEFAULTS, ...json };
      console.log('[SecurityConfig] Loaded from server:', _config);
    } catch (err) {
      console.warn('[SecurityConfig] Failed to load security-config.json, using defaults:', err.message);
      _config = { ...DEFAULTS };
    }
    _fetchPromise = null;
    return _config;
  })();

  return _fetchPromise;
}

/**
 * Get the cached config synchronously. Returns defaults if not yet loaded.
 */
export function getSecurityConfig() {
  return _config || { ...DEFAULTS };
}

/**
 * Get the session timeout options for the user-facing slider.
 */
export function getSessionTimeoutOptions() {
  const config = getSecurityConfig();
  return config.sessionTimeoutOptions;
}

/**
 * Get the warning countdown duration in seconds.
 */
export function getCountdownSeconds() {
  const config = getSecurityConfig();
  return config.countdownSeconds;
}
