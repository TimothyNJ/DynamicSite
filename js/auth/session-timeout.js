/**
 * session-timeout.js
 *
 * Monitors user activity within the DynamicSite tab.
 * After the configured inactivity period, shows a warning modal with a
 * 30-second countdown. If the user does not respond, they are auto-logged out.
 *
 * Activity events monitored: mousemove, mousedown, keypress, scroll, touchstart
 * Scoped to the current document only — other tabs/apps are ignored.
 *
 * Security: uses wall-clock timestamps (Date.now()) rather than relying
 * solely on setTimeout/setInterval, which freeze during OS sleep. On wake
 * (visibilitychange), the real elapsed time is checked — if it exceeds the
 * inactivity limit the user is logged out immediately with no continue option.
 * The "Continue" button also re-checks the timestamp and validates the auth
 * token before allowing the session to resume.
 *
 * Styling: entirely via _session_timeout.scss — no inline styles here.
 * Button: uses site button classes (.button-component, .button-content etc.)
 * Countdown: updates h3 text every second via setInterval (same pattern as
 *            the time format display in settings).
 */

import { isAuthenticated } from './zitadel-auth.js';

function getInactivityLimit() {
  const minutes = parseFloat(localStorage.getItem('sessionTimeoutMinutes') || '0.5');
  return minutes * 60 * 1000;
}

const COUNTDOWN_SECONDS = 30;

let inactivityTimer  = null;
let countdownTimer   = null;
let countdownSeconds = COUNTDOWN_SECONDS;
let modalEl          = null;
let headingEl        = null;
let isSessionTimeOutVisible = false;
let lastActivityTimestamp    = Date.now();

// ─── Wall-Clock Helpers ──────────────────────────────────────────────────────

function stampActivity() {
  lastActivityTimestamp = Date.now();
}

function hasSessionExpired() {
  return (Date.now() - lastActivityTimestamp) >= getInactivityLimit();
}

// ─── Visibility Change (sleep/wake detection) ────────────────────────────────

function onVisibilityChange() {
  if (document.visibilityState !== 'visible') return;

  // Page just became visible (wake from sleep, tab switch back, etc.).
  // Check real elapsed time — timers may have been frozen for hours.
  if (hasSessionExpired()) {
    console.log('[SessionTimeout] Session expired during sleep/background — logging out');
    performLogout();
    return;
  }

  // Session still valid — check if the auth token is still good
  // (covers the case where another tab logged out while we were away)
  if (!isAuthenticated()) {
    console.log('[SessionTimeout] Auth token expired or revoked — logging out');
    performLogout();
    return;
  }

  // If the warning modal is showing, recalculate the countdown based on
  // real elapsed time rather than the frozen setInterval count.
  if (isSessionTimeOutVisible) {
    const elapsedSinceWarning = Date.now() - lastActivityTimestamp - getInactivityLimit();
    const remainingSeconds = COUNTDOWN_SECONDS - Math.floor(elapsedSinceWarning / 1000);
    if (remainingSeconds <= 0) {
      performLogout();
    } else {
      countdownSeconds = remainingSeconds;
      if (headingEl) headingEl.textContent = getHeadingText(countdownSeconds);
    }
  }
}

// ─── Activity Detection ───────────────────────────────────────────────────────

function resetInactivityTimer() {
  if (isSessionTimeOutVisible) return;
  stampActivity();
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(showSessionTimeOutWarning, getInactivityLimit());
}

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];

function attachActivityListeners() {
  ACTIVITY_EVENTS.forEach(event => {
    document.addEventListener(event, resetInactivityTimer, { passive: true });
  });
  document.addEventListener('visibilitychange', onVisibilityChange);
}

function detachActivityListeners() {
  ACTIVITY_EVENTS.forEach(event => {
    document.removeEventListener(event, resetInactivityTimer);
  });
  document.removeEventListener('visibilitychange', onVisibilityChange);
}

// ─── Heading Text ─────────────────────────────────────────────────────────────

function getHeadingText(seconds) {
  return `Session Time Out in ${seconds} Second${seconds === 1 ? '' : 's'}`;
}

// ─── Warning Modal ────────────────────────────────────────────────────────────

function buildSessionTimeOutModal() {
  // Overlay
  const overlay = document.createElement('div');
  overlay.id = 'session-timeout-overlay';
  overlay.className = 'session-timeout-overlay';

  // Box
  const box = document.createElement('div');
  box.className = 'session-timeout-box';

  // Heading — updates every second like the time format display
  headingEl = document.createElement('h1');
  headingEl.textContent = getHeadingText(COUNTDOWN_SECONDS);

  // Button container — ID so componentFactory can find it
  const buttonContainer = document.createElement('div');
  buttonContainer.id = 'session-timeout-button-container';

  box.appendChild(headingEl);
  box.appendChild(buttonContainer);
  overlay.appendChild(box);
  return overlay;
}

function showSessionTimeOutWarning() {
  if (isSessionTimeOutVisible) return;
  isSessionTimeOutVisible = true;
  countdownSeconds = COUNTDOWN_SECONDS;

  modalEl = buildSessionTimeOutModal();
  const siteContainer = document.querySelector('.site-container') || document.body;
  siteContainer.appendChild(modalEl);

  // Create button via componentFactory — same as every other button on the site
  if (window.componentFactory) {
    window.componentFactory.createButton('session-timeout-button-container', {
      id: 'session-timeout-continue-button',
      text: 'Continue Session',
      active: true,
      onClick: dismissSessionTimeOut
    });
  }

  // Update heading every second — same pattern as updateTimeDisplay() in settings
  countdownTimer = setInterval(() => {
    countdownSeconds -= 1;
    if (headingEl) headingEl.textContent = getHeadingText(countdownSeconds);
    if (countdownSeconds <= 0) {
      clearInterval(countdownTimer);
      performLogout();
    }
  }, 1000);
}

function dismissSessionTimeOut() {
  if (!isSessionTimeOutVisible) return;

  // Fallback check: verify real elapsed time before allowing continue.
  // Handles the case where the modal was shown, the user walked away for
  // hours, came back, and clicked "Continue" out of habit.
  if (hasSessionExpired()) {
    const elapsed = Date.now() - lastActivityTimestamp;
    const limit = getInactivityLimit();
    if ((elapsed - limit) >= (COUNTDOWN_SECONDS * 1000)) {
      console.log('[SessionTimeout] Continue pressed but session expired — logging out');
      performLogout();
      return;
    }
  }

  // Also verify the auth token is still valid (covers cross-tab logout)
  if (!isAuthenticated()) {
    console.log('[SessionTimeout] Continue pressed but auth token invalid — logging out');
    performLogout();
    return;
  }

  clearInterval(countdownTimer);
  isSessionTimeOutVisible = false;

  if (modalEl && modalEl.parentNode) {
    modalEl.parentNode.removeChild(modalEl);
  }
  modalEl = null;
  headingEl = null;

  resetInactivityTimer();
}

function performLogout() {
  stop();
  if (typeof window.logout === 'function') {
    window.logout();
  } else {
    window.location.reload();
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function start() {
  stop();
  stampActivity();
  attachActivityListeners();
  resetInactivityTimer();
  console.log(`[SessionTimeout] Started — inactivity limit: ${localStorage.getItem('sessionTimeoutMinutes') || 5} min, warning: 30 sec`);
}

export function restart() {
  start();
}

export function stop() {
  clearTimeout(inactivityTimer);
  clearInterval(countdownTimer);
  detachActivityListeners();
  isSessionTimeOutVisible = false;
  if (modalEl && modalEl.parentNode) {
    modalEl.parentNode.removeChild(modalEl);
  }
  modalEl = null;
  headingEl = null;
  console.log('[SessionTimeout] Stopped');
}
