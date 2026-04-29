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
 * View/Edit toggle: View mode hides inputs, unit row, static columns, and
 * all buttons — only the LIVE column displays in a tight table. Edit mode
 * shows everything.
 *
 * Push Changes: collects all current values, stores the before/after state
 * on the server (S3), then updates _variables.scss via GitHub API and
 * triggers a deploy.
 *
 * Reset: discards unpushed edits, restores inputs to current TIERS defaults.
 *
 * Revert Push: fetches the previous state from server memory, pushes those
 * values as the new state (a forward push that restores old fonts).
 *
 * Created: 18-Apr-2026
 */

import { getAccessToken, isAuthenticated, refreshToken, isTokenExpired } from '../auth/zitadel-auth.js';
import { AUTH_API } from '../core/env.js';

// Per-environment API Gateway, resolved by core/env.js based on the
// current hostname. dev → auth-dev.dynamicsite.io, sandbox →
// auth-sandbox.dynamicsite.io, prod → api.dynamicsite.io.
const API_BASE = AUTH_API;

// ─── Font tier definitions ──────────────────────────────────────────────────
// Current defaults from _variables.scss — used as initial input values.
// Units: min = rem, pref = vw, max = rem.

// Note: min/pref/max here are only used as a fallback if readDeployedValues()
// can't parse a tier's CSS variable. At runtime the editor is always seeded
// from the live --h*-font-size values, so these defaults should mirror what's
// in _variables.scss to avoid confusion.
const TIERS = [
  { tag: 'h1', min: 1.125, pref: 1.6, max: 4,   weight: 'bold'   },
  { tag: 'h2', min: 0.875, pref: 1.4, max: 3.5, weight: 'bold'   },
  { tag: 'h3', min: 0.7,   pref: 1.2, max: 2.6, weight: 'bold'   },
  { tag: 'h4', min: 0.6,   pref: 1.2, max: 2.5, weight: 'normal' },
  { tag: 'p',  min: 0.5,   pref: 1,   max: 2.3, weight: 'normal' },
];

// Units per param — used when building the clamp() string and inline styles
const UNITS = { min: 'rem', pref: 'vw', max: 'rem' };

// Live state — current values as the user edits them
const liveValues = {};

// Snapshot of the values that were actually deployed when the editor first
// loaded. Used by Reset. We can't re-read CSS variables on demand because
// every edit writes an inline override onto document.documentElement.style —
// getComputedStyle() returns the override, not the stylesheet value, so a
// re-read would just give back the user's latest edits.
const deployedValues = {};

// Current environment — set during initialisation
let currentEnv = 'development';

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildClamp(tier) {
  const v = liveValues[tier];
  return `clamp(${v.min}rem, ${v.pref}vw, ${v.max}rem)`;
}

function updateLiveColumn(tier) {
  const varName = `--${tier}-font-size`;
  document.documentElement.style.setProperty(varName, buildClamp(tier));
}

function updateStaticSpan(tier, param) {
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

// ─── View / Edit toggle ────────────────────────────────────────────────────

function setMode(mode) {
  const tableBody = document.querySelector('.fe-table-body');
  const buttonRow = document.querySelector('.fe-button-row');
  if (!tableBody) return;

  if (mode === 'view') {
    tableBody.classList.add('fe-view-mode');
    if (buttonRow) buttonRow.style.display = 'none';
  } else {
    tableBody.classList.remove('fe-view-mode');
    if (buttonRow) buttonRow.style.display = '';
  }

  console.log(`[FontEditor] Mode: ${mode}`);
}

// ─── Reset ─────────────────────────────────────────────────────────────────

function resetFontValues() {
  console.log('[FontEditor] Reset — restoring to deployed values');

  // Restore from the snapshot taken at init time. Re-reading CSS would give
  // us the inline overrides applied by edits, not the original deployed
  // values — see deployedValues comment above.
  for (const t of TIERS) {
    liveValues[t.tag] = { ...deployedValues[t.tag] };

    for (const param of ['min', 'pref', 'max']) {
      const val = liveValues[t.tag][param];

      // Update the text input value
      const input = document.querySelector(`#fe-val-${t.tag}-${param}`);
      if (input) input.value = String(val);

      // Update the static span
      updateStaticSpan(t.tag, param);
    }

    // Update the LIVE column CSS variable
    updateLiveColumn(t.tag);
  }
}

// ─── Read deployed CSS variable values ─────────────────────────────────────

function readDeployedValues() {
  const styles = getComputedStyle(document.documentElement);
  const deployed = {};

  for (const t of TIERS) {
    const raw = styles.getPropertyValue(`--${t.tag}-font-size`).trim();
    // Parse clamp(1.125rem, 3.1vw, 4rem)
    const m = raw.match(/clamp\(\s*([\d.]+)rem\s*,\s*([\d.]+)vw\s*,\s*([\d.]+)rem\s*\)/);
    if (m) {
      deployed[t.tag] = {
        min: parseFloat(m[1]),
        pref: parseFloat(m[2]),
        max: parseFloat(m[3])
      };
    } else {
      // Fallback to hardcoded TIERS defaults if CSS variable isn't available
      deployed[t.tag] = { min: t.min, pref: t.pref, max: t.max };
    }
  }

  return deployed;
}

// ─── Initialisation ─────────────────────────────────────────────────────────

export function initializeFontEditor(env) {
  if (!window.componentFactory) {
    console.error('[FontEditor] ComponentFactory not available');
    return;
  }

  // Idempotency guard — prevent duplicate component creation on first navigation
  const container = document.getElementById('fe-input-h1-min');
  if (container && container.dataset.initialized === 'true') return;
  if (container) container.dataset.initialized = 'true';

  currentEnv = env || 'development';

  // Seed live state from the actually deployed CSS variables (not hardcoded defaults)
  // and snapshot them so Reset can restore later (see deployedValues comment).
  const deployed = readDeployedValues();
  for (const t of TIERS) {
    liveValues[t.tag] = { ...deployed[t.tag] };
    deployedValues[t.tag] = { ...deployed[t.tag] };
  }

  // Create text inputs for each tier × param, using deployed values.
  // Also overwrite the hardcoded inline font-size on each static span so it
  // reflects the actually-deployed value, not the stale HTML literal — without
  // this, if someone has pushed new clamp values without regenerating the
  // page HTML, the MIN/PREF/MAX columns lie about what's deployed.
  for (const t of TIERS) {
    for (const param of ['min', 'pref', 'max']) {
      const containerId = `fe-input-${t.tag}-${param}`;
      const currentVal = liveValues[t.tag][param];

      window.componentFactory.createTextInput(containerId, {
        id: `fe-val-${t.tag}-${param}`,
        placeholder: String(currentVal),
        value: String(currentVal),
        onChange: (value) => onValueChange(t.tag, param, value)
      });

      // Sync the static span to the deployed value (overrides stale HTML)
      updateStaticSpan(t.tag, param);
    }
  }

  // View / Edit toggle slider
  window.componentFactory.createSlider({
    containerId: 'fe-view-edit-toggle-container',
    sliderClass: 'fe-view-edit-slider',
    options: [
      { text: 'View', value: 'view', position: 1, active: true },
      { text: 'Edit', value: 'edit', position: 2 }
    ]
  }, (selectedOption) => {
    const mode = selectedOption.getAttribute('data-value')
      || selectedOption.textContent.trim().toLowerCase();
    setMode(mode);
  });

  // Start in View mode
  setMode('view');

  // Reset button
  window.componentFactory.createButton('fe-reset-button-container', {
    id: 'fe-reset-button',
    text: 'Reset',
    onClick: () => resetFontValues()
  });

  // Push Changes button
  window.componentFactory.createButton('fe-push-button-container', {
    id: 'fe-push-button',
    text: 'Push Changes',
    active: true,
    onClick: () => pushFontChanges()
  });

  // Revert Push button
  window.componentFactory.createButton('fe-revert-button-container', {
    id: 'fe-revert-button',
    text: 'Revert Push',
    onClick: () => revertPush()
  });

  console.log('[FontEditor] Initialised — View/Edit toggle, inputs, and buttons created');
}

// ─── Authenticated fetch helper ────────────────────────────────────────────

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

// ─── Push ───────────────────────────────────────────────────────────────────

async function pushFontChanges() {
  console.log(`[FontEditor] Push requested for env: ${currentEnv}`);

  // Build the payload — each tier's three values
  const payload = {};
  for (const t of TIERS) {
    payload[t.tag] = { ...liveValues[t.tag] };
  }

  try {
    const result = await authenticatedFetch('/push-font-variables', {
      method: 'POST',
      body: JSON.stringify({ fontVariables: payload, environment: currentEnv })
    });
    console.log('[FontEditor] Push result:', result);
  } catch (err) {
    console.error('[FontEditor] Push failed:', err);
  }
}

// ─── Revert Push ────────────────────────────────────────────────────────────

async function revertPush() {
  console.log(`[FontEditor] Revert Push requested for env: ${currentEnv}`);

  try {
    const result = await authenticatedFetch('/revert-font-variables', {
      method: 'POST',
      body: JSON.stringify({ environment: currentEnv })
    });
    console.log('[FontEditor] Revert result:', result);

    // If the server returns the reverted values, apply them to the UI
    if (result.revertedTo) {
      for (const t of TIERS) {
        const vals = result.revertedTo[t.tag];
        if (!vals) continue;

        liveValues[t.tag] = { min: vals.min, pref: vals.pref, max: vals.max };

        for (const param of ['min', 'pref', 'max']) {
          const input = document.querySelector(`#fe-val-${t.tag}-${param}`);
          if (input) input.value = String(vals[param]);
          updateStaticSpan(t.tag, param);
        }
        updateLiveColumn(t.tag);
      }
    }
  } catch (err) {
    console.error('[FontEditor] Revert failed:', err);
  }
}
