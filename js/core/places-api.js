/**
 * places-api.js — thin client for the OCI-hosted /v1/places/* service.
 *
 * Exposes async functions the address validator (and any future caller)
 * uses instead of hardcoding fetch logic. Each function returns the
 * payload on success and throws on network/HTTP error so the caller can
 * fall back to libaddressinput.
 *
 * The PLACES_API host is resolved per environment in core/env.js. The
 * X-Places-Key is bundled into the SPA at build time (compile-time
 * constant via webpack DefinePlugin or env injection) — set window
 * variable PLACES_KEY before this module loads, OR pass via CONFIG.
 *
 * Display-language resolution
 * ---------------------------
 * Each list endpoint accepts ?lang=xx. The server returns:
 *   canonical_name — internal/audit
 *   display_name   — the row in the requested language with fallback
 *   matched_name   — (cities only) the form the user's `q` matched
 *   matched_status — (cities only) current/historical/alternate/...
 *
 * The default language comes from the SPA's <html lang="..."> attribute.
 * Override per call by passing `lang`.
 */

import { PLACES_API } from './env.js';

const DEFAULT_TIMEOUT_MS = 5000;

// X-Places-Key — read at module load. The SPA build can substitute this
// at compile time, or set window.__PLACES_KEY before bundle init. Empty
// is acceptable: the API server tolerates missing keys in dev.
const PLACES_KEY =
  (typeof window !== 'undefined' && window.__PLACES_KEY) || '';

/** Returns the SPA's current display language (ISO 639-1). */
function defaultLang() {
  if (typeof document === 'undefined') return 'en';
  const raw = (document.documentElement && document.documentElement.lang) || 'en';
  return raw.split(/[-_]/)[0].toLowerCase();
}

/**
 * Issue a GET request to the places API. Throws on:
 *   * Network failure
 *   * Timeout (DEFAULT_TIMEOUT_MS exceeded)
 *   * HTTP status outside 2xx
 *
 * Caller is expected to catch and fall back to libaddressinput.
 */
async function get(path, params = {}) {
  const url = new URL(path, PLACES_API);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.set(k, String(v));
    }
  }
  const ctrl = new AbortController();
  const timeoutId = setTimeout(() => ctrl.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const headers = { Accept: 'application/json' };
    if (PLACES_KEY) headers['X-Places-Key'] = PLACES_KEY;
    const resp = await fetch(url.toString(), {
      headers,
      signal: ctrl.signal,
      credentials: 'omit',
    });
    if (!resp.ok) {
      throw new Error(`places-api ${path}: HTTP ${resp.status}`);
    }
    return await resp.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

/** GET /v1/places/countries */
export async function listCountries({ lang } = {}) {
  return get('/v1/places/countries', { lang: lang || defaultLang() });
}

/** GET /v1/places/admin1?country=XX */
export async function listAdmin1({ country, lang } = {}) {
  if (!country) throw new Error('listAdmin1: country is required');
  return get('/v1/places/admin1', { country, lang: lang || defaultLang() });
}

/** GET /v1/places/admin2?country=XX&admin1=YY */
export async function listAdmin2({ country, admin1, lang } = {}) {
  if (!country || !admin1) {
    throw new Error('listAdmin2: country and admin1 are required');
  }
  return get('/v1/places/admin2', { country, admin1, lang: lang || defaultLang() });
}

/**
 * GET /v1/places/cities?country=XX&admin1=YY&q=san&limit=10
 *
 * Empty `q` returns the top-N cities by population in the scope (good
 * for "show me a starter list to pick from"). A non-empty `q` matches
 * against every name form via trigram + prefix.
 */
export async function autocompleteCities({ country, admin1, q, limit, lang } = {}) {
  if (!country) throw new Error('autocompleteCities: country is required');
  return get('/v1/places/cities', {
    country,
    admin1,
    q: q || '',
    limit: limit || 10,
    lang: lang || defaultLang(),
  });
}

/** GET /v1/places/postcode?country=XX&code=NNNNN */
export async function lookupPostcode({ country, code } = {}) {
  if (!country || !code) {
    throw new Error('lookupPostcode: country and code are required');
  }
  return get('/v1/places/postcode', { country, code });
}

/**
 * GET /v1/places/postal/explain?country=XX&code=NNNNN
 *
 * Returns every postal_patterns row that matches the user's typed code
 * for this country (and optional admin1). The SPA shows the matches to
 * the user with their statuses — current / historical / auxiliary /
 * unofficial / alternate — and lets them confirm or update.
 *
 * Also returns documented old→new code remappings where available.
 */
export async function explainPostal({ country, code, admin1 } = {}) {
  if (!country || !code) {
    throw new Error('explainPostal: country and code are required');
  }
  return get('/v1/places/postal/explain', { country, code, admin1 });
}

/**
 * Simple feature-detect: returns true if the API is reachable. Useful
 * for the address validator to decide whether to attempt API-backed
 * autocomplete or fall through to libaddressinput.
 */
export async function isReachable({ timeoutMs = 1500 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const resp = await fetch(new URL('/healthz', PLACES_API).toString(), {
      signal: ctrl.signal,
      credentials: 'omit',
    });
    return resp.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}
