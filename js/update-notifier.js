/**
 * update-notifier.js
 *
 * Polls a version.json endpoint to detect when a new deployment is live.
 * When a new version is detected, shows a modal overlay prompting the user
 * to refresh now or defer for 30 seconds.
 *
 * Follows the same overlay / componentFactory button pattern as session-timeout.js.
 * Styling: entirely via _update_notifier.scss — no inline styles here.
 *
 * Created: 17-Apr-2026
 * Updated: 18-Apr-2026
 */

const POLL_INTERVAL_MS = 30_000;   // check every 30 seconds
const DEFER_DELAY_MS   = 30_000;   // re-show after 30 seconds if user defers

// BUILD_TIMESTAMP is injected by webpack DefinePlugin at build time
const currentVersion = typeof BUILD_TIMESTAMP !== 'undefined' ? BUILD_TIMESTAMP : null;

let pollTimer   = null;
let deferTimer  = null;
let modalEl     = null;
let isVisible   = false;
let isRunning   = false;

// ─── Version Check ───────────────────────────────────────────────────────────

async function checkForUpdate() {
  if ( isVisible ) return;              // don't poll while modal is showing
  try {
    const res = await fetch( '/version.json', { cache: 'no-store' } );
    if ( ! res.ok ) return;             // silently ignore fetch failures
    const data = await res.json();
    if ( currentVersion && data.timestamp && data.timestamp !== currentVersion ) {
      showUpdateModal();
    }
  } catch ( e ) {
    // Network error, offline, etc. — ignore silently
  }
}

// ─── Modal ───────────────────────────────────────────────────────────────────

function buildUpdateModal() {
  // Overlay
  const overlay = document.createElement( 'div' );
  overlay.id = 'update-notifier-overlay';
  overlay.className = 'update-notifier-overlay';

  // Box
  const box = document.createElement( 'div' );
  box.className = 'update-notifier-box';

  // H1
  const h1 = document.createElement( 'h1' );
  h1.textContent = 'Site Update Available.';

  // H2
  const h2 = document.createElement( 'h2' );
  h2.textContent = 'Save your work before refreshing. Unsaved data will be lost.';

  // Button container
  const buttonContainer = document.createElement( 'div' );
  buttonContainer.id = 'update-notifier-button-container';
  buttonContainer.className = 'update-notifier-buttons';

  box.appendChild( h1 );
  box.appendChild( h2 );
  box.appendChild( buttonContainer );
  overlay.appendChild( box );
  return overlay;
}

function showUpdateModal() {
  if ( isVisible ) return;
  isVisible = true;

  // Pause polling while modal is visible
  clearInterval( pollTimer );
  pollTimer = null;

  modalEl = buildUpdateModal();
  const siteContainer = document.querySelector( '.site-container' ) || document.body;
  siteContainer.appendChild( modalEl );

  // Create buttons via componentFactory
  if ( window.componentFactory ) {
    window.componentFactory.createButton( 'update-notifier-button-container', {
      id: 'update-notifier-refresh-button',
      text: 'Refresh Now.',
      active: true,
      onClick: refreshNow
    } );
    window.componentFactory.createButton( 'update-notifier-button-container', {
      id: 'update-notifier-defer-button',
      text: 'Refresh in 30 Seconds.',
      active: false,
      onClick: deferRefresh
    } );
  }
}

function dismissModal() {
  isVisible = false;
  if ( modalEl && modalEl.parentNode ) {
    modalEl.parentNode.removeChild( modalEl );
  }
  modalEl = null;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

function refreshNow() {
  window.location.reload();
}

function deferRefresh() {
  dismissModal();
  // Re-show after 30 seconds
  clearTimeout( deferTimer );
  deferTimer = setTimeout( () => {
    showUpdateModal();
  }, DEFER_DELAY_MS );
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function start() {
  if ( isRunning ) return;
  if ( ! currentVersion ) {
    console.warn( '[UpdateNotifier] No BUILD_TIMESTAMP — update detection disabled' );
    return;
  }
  isRunning = true;
  // Start polling
  pollTimer = setInterval( checkForUpdate, POLL_INTERVAL_MS );
  // Also check immediately (after a short delay to let the page settle)
  setTimeout( checkForUpdate, 5000 );
  console.log( `[UpdateNotifier] Started — current version: ${currentVersion}, polling every ${POLL_INTERVAL_MS / 1000}s` );
}

export function stop() {
  isRunning = false;
  clearInterval( pollTimer );
  clearTimeout( deferTimer );
  pollTimer = null;
  deferTimer = null;
  dismissModal();
  console.log( '[UpdateNotifier] Stopped' );
}
