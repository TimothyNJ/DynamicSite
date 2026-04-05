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
 * Styling: entirely via _session_timeout.scss — no inline styles here.
 * Button: uses site button classes (.button-component, .button-content etc.)
 * Countdown: updates h3 text every second via setInterval (same pattern as
 *            the time format display in settings).
 */

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
let isWarningVisible = false;

// ─── Activity Detection ───────────────────────────────────────────────────────

function resetInactivityTimer() {
  if (isWarningVisible) return;
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(showWarningModal, getInactivityLimit());
}

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];

function attachActivityListeners() {
  ACTIVITY_EVENTS.forEach(event => {
    document.addEventListener(event, resetInactivityTimer, { passive: true });
  });
}

function detachActivityListeners() {
  ACTIVITY_EVENTS.forEach(event => {
    document.removeEventListener(event, resetInactivityTimer);
  });
}

// ─── Heading Text ─────────────────────────────────────────────────────────────

function getHeadingText(seconds) {
  return `Session Time Out in ${seconds} Second${seconds === 1 ? '' : 's'}`;
}

// ─── Warning Modal ────────────────────────────────────────────────────────────

function buildModal() {
  // Overlay
  const overlay = document.createElement('div');
  overlay.id = 'session-timeout-overlay';
  overlay.className = 'session-timeout-overlay';

  // Box
  const box = document.createElement('div');
  box.className = 'session-timeout-box';

  // Heading — updates every second like the time format display
  headingEl = document.createElement('h3');
  headingEl.textContent = getHeadingText(COUNTDOWN_SECONDS);

  // Button container — ID so componentFactory can find it
  const buttonContainer = document.createElement('div');
  buttonContainer.id = 'session-timeout-button-container';

  box.appendChild(headingEl);
  box.appendChild(buttonContainer);
  overlay.appendChild(box);
  return overlay;
}

function showWarningModal() {
  if (isWarningVisible) return;
  isWarningVisible = true;
  countdownSeconds = COUNTDOWN_SECONDS;

  modalEl = buildModal();
  document.body.appendChild(modalEl);

  // Create button via componentFactory — same as every other button on the site
  if (window.componentFactory) {
    window.componentFactory.createButton('session-timeout-button-container', {
      id: 'session-timeout-continue-button',
      text: 'Continue Session',
      onClick: dismissWarning
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

function dismissWarning() {
  if (!isWarningVisible) return;
  clearInterval(countdownTimer);
  isWarningVisible = false;

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
  isWarningVisible = false;
  if (modalEl && modalEl.parentNode) {
    modalEl.parentNode.removeChild(modalEl);
  }
  modalEl = null;
  headingEl = null;
  console.log('[SessionTimeout] Stopped');
}
