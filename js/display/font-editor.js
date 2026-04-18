/**
 * font-editor.js
 *
 * Live-preview font editor for the Display Settings page.
 * Creates text inputs for each clamp() parameter (min, pref, max) per font
 * tier (H1..P). Typing a new value instantly updates:
 *   1. The inline font-size on the static <span> in that cell
 *   2. The CSS variable (--h1-font-size etc.) with a rebuilt clamp() so the
 *      LIVE column reflects the change in real time
 *
 * Push Changes: collects all current values, sends them to the lambda proxy
 * which updates _variables.scss via GitHub API and triggers a deploy.
 *
 * Created: 18-Apr-2026
 */

import { getAccessToken, isAuthenticated, refreshToken, isTokenExpired } from '../auth/zitadel-auth.js';

const API_BASE = 'https://api.dynamicsite.io';

// ─── Font tier definitions ──────────────────────────────────────────────────
// Current defaults from _variables.scss — used as initial input values.
// Units: min = rem, pref = vw, max = rem.

const TIERS = [
  { tag: 'h1', min: 1.125, pref: 1.1,  max: 4,   weight: 'bold'   },
  { tag: 'h2', min: 0.875, pref: 0.95, max: 3.5,  weight: 'bold'   },
  { tag: 'h3', min: 0.7,   pref: 0.8,  max: 2.6,  weight: 'bold'   },
  { tag: 'h4', min: 0.6,   pref: 0.75, max: 2.5,  weight: 'normal' },
  { tag: 'p',  min: 0.5,   pref: 0.7,  max: 2.3,  weight: 'normal' },
];

// Units per param — used when building the clamp() string and inline styles
const UNITS = { min: 'rem', pref: 'vw', max: 'rem' };

// Live state — current values as the user edits them
const liveValues = {};

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildClamp(tier) {
  const v = liveValues[tier];
  return `clamp(${v.min}rem, ${v.pref}vw, ${v.max}rem)`;
}

function updateLiveColumn(tier) {
  // Update the CSS variable so the real <h1>/<h2>/etc. tag re-renders
  const varName = `--${tier}-font-size`;
  document.documentElement.style.setProperty(varName, buildClamp(tier));
}

function updateStaticSpan(tier, param) {
  // Update the inline font-size on the static <span> for this cell
  const span = document.querySelector(`.fe-static[data-tier="${tier}"][data-param="${param}"]`);
  if (span) {
    span.style.fontSize = `${liveValues[tier][param]}${UNITS[param]}`;
  }
}

function onValueChange(tier, param, value) {
  const num = parseFloat(value);
  if (isNaN(num) || num <= 0) return;
  liveValues[tier][param] = num;
  updateStaticSpan(tier, param);
  updateLiveColumn(tier);
}

// ─── Initialisation ─────────────────────────────────────────────────────────

export function initializeFontEditor() {
  if (!window.componentFactory) {
    console.error('[FontEditor] ComponentFactory not available');
    return;
  }

  // Seed live state from defaults
  for (const t of TIERS) {
    liveValues[t.tag] = { min: t.min, pref: t.pref, max: t.max };
  }

  // Create text inputs for each tier × param
  for (const t of TIERS) {
    for (const param of ['min', 'pref', 'max']) {
      const containerId = `fe-input-${t.tag}-${param}`;
      const currentVal = t[param];

      window.componentFactory.createTextInput(containerId, {
        id: `fe-val-${t.tag}-${param}`,
        placeholder: String(currentVal),
        value: String(currentVal),
        onChange: (value) => onValueChange(t.tag, param, value)
      });
    }
  }

  // Create Push Changes button
  window.componentFactory.createButton('fe-push-button-container', {
    id: 'fe-push-button',
    text: 'Push Changes',
    active: true,
    onClick: () => pushFontChanges()
  });

  console.log('[FontEditor] Initialised — text inputs and push button created');
}

// ─── Push ───────────────────────────────────────────────────────────────────

async function authenticatedFetch(path, options = {}) {
  if (!isAuthenticated()) {
    throw new Error('[FontEditor] Not authenticated');
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
    throw new Error(`[FontEditor] ${resp.status}: ${body}`);
  }
  return resp.json();
}

async function pushFontChanges() {
  console.log('[FontEditor] Push requested');

  // Build the payload — each tier's three values
  const payload = {};
  for (const t of TIERS) {
    payload[t.tag] = { ...liveValues[t.tag] };
  }

  try {
    const result = await authenticatedFetch('/push-font-variables', {
      method: 'POST',
      body: JSON.stringify({ fontVariables: payload })
    });
    console.log('[FontEditor] Push result:', result);
  } catch (err) {
    console.error('[FontEditor] Push failed:', err);
  }
}
