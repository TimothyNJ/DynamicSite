/**
 * site-blocker.js
 *
 * Full-screen authentication gate. Covers the entire page — navbar, content,
 * background, everything — with an opaque overlay until the user logs in.
 *
 * The overlay is a gradient matching the site theme (same as session-timeout
 * and update-notifier overlays). A "Sign In" button triggers the Zitadel
 * PKCE login flow. Once authenticated, the overlay is removed and the site
 * is fully visible.
 *
 * Styling: _site_blocker.scss — no inline styles here.
 *
 * Created: 18-Apr-2026
 */

import { isAuthenticated, login } from './zitadel-auth.js';

let overlayEl = null;

// ─── Build ──────────────────────────────────────────────────────────────────

function buildOverlay() {
  const overlay = document.createElement( 'div' );
  overlay.id = 'site-blocker-overlay';
  overlay.className = 'site-blocker-overlay';

  const box = document.createElement( 'div' );
  box.className = 'site-blocker-box';

  const h1 = document.createElement( 'h1' );
  h1.textContent = 'DynamicSite.io';

  const h2 = document.createElement( 'h2' );
  h2.textContent = 'Sign in to continue.';

  const buttonContainer = document.createElement( 'div' );
  buttonContainer.id = 'site-blocker-button-container';
  buttonContainer.className = 'site-blocker-buttons';

  box.appendChild( h1 );
  box.appendChild( h2 );
  box.appendChild( buttonContainer );
  overlay.appendChild( box );
  return overlay;
}

// ─── Show / Dismiss ─────────────────────────────────────────────────────────

function show() {
  if ( overlayEl ) return;          // already showing
  overlayEl = buildOverlay();
  document.body.appendChild( overlayEl );

  // Create the Sign In button via componentFactory
  if ( window.componentFactory ) {
    window.componentFactory.createButton( 'site-blocker-button-container', {
      id: 'site-blocker-sign-in-button',
      text: 'Sign In.',
      active: true,
      onClick: () => login()
    } );
  }

  console.log( '[SiteBlocker] Overlay shown — waiting for authentication' );
}

function dismiss() {
  if ( overlayEl && overlayEl.parentNode ) {
    overlayEl.parentNode.removeChild( overlayEl );
  }
  overlayEl = null;
  console.log( '[SiteBlocker] Overlay dismissed — user authenticated' );
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Check auth state and show/dismiss the blocker accordingly.
 * Called once during app init, and again after successful login.
 */
export function enforceSiteBlocker() {
  if ( isAuthenticated() ) {
    dismiss();
  } else {
    show();
  }
}
