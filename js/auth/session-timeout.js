/**
 * session-timeout.js
 *
 * Monitors user activity within the DynamicSite tab.
 * After 5 minutes of inactivity, shows a warning modal with a 30-second
 * countdown. If the user does not respond, they are automatically logged out.
 *
 * Activity events monitored: mousemove, mousedown, keypress, scroll, touchstart
 * These are scoped to the current document only — other tabs/apps are ignored.
 */

const INACTIVITY_LIMIT_MS  = 5 * 60 * 1000; // 5 minutes
const WARNING_DURATION_MS  = 30 * 1000;      // 30 seconds
const COUNTDOWN_SECONDS    = 30;

let inactivityTimer  = null;
let countdownTimer   = null;
let countdownSeconds = COUNTDOWN_SECONDS;
let modalEl          = null;
let countdownEl      = null;
let isWarningVisible = false;

// ─── Activity Detection ───────────────────────────────────────────────────────

function resetInactivityTimer() {
  if (isWarningVisible) return; // Don't reset while warning is showing
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(showWarningModal, INACTIVITY_LIMIT_MS);
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

// ─── Warning Modal ────────────────────────────────────────────────────────────

function buildModal() {
  const overlay = document.createElement('div');
  overlay.id = 'session-timeout-overlay';
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.65);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999;
    font-family: inherit;
  `;

  const box = document.createElement('div');
  box.style.cssText = `
    background: var(--color-background, #1a1a1a);
    color: var(--color-text, #ffffff);
    border: 1px solid var(--color-border, #333);
    border-radius: 12px;
    padding: 40px 48px;
    text-align: center;
    max-width: 380px;
    width: 90%;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  `;

  const heading = document.createElement('h2');
  heading.textContent = 'Still there?';
  heading.style.cssText = 'margin: 0 0 12px; font-size: 1.4rem;';

  const message = document.createElement('p');
  message.textContent = 'You\'ve been inactive. You will be logged out in:';
  message.style.cssText = 'margin: 0 0 24px; opacity: 0.8; font-size: 0.95rem;';

  countdownEl = document.createElement('div');
  countdownEl.textContent = COUNTDOWN_SECONDS;
  countdownEl.style.cssText = `
    font-size: 4rem;
    font-weight: bold;
    line-height: 1;
    margin-bottom: 32px;
    color: var(--color-accent, #e06c75);
  `;

  const button = document.createElement('button');
  button.textContent = 'Stay Logged In';
  button.style.cssText = `
    background: var(--color-accent, #e06c75);
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 12px 32px;
    font-size: 1rem;
    cursor: pointer;
    font-family: inherit;
    transition: opacity 0.2s;
  `;
  button.addEventListener('mouseover', () => button.style.opacity = '0.85');
  button.addEventListener('mouseout',  () => button.style.opacity = '1');
  button.addEventListener('click', dismissWarning);

  box.appendChild(heading);
  box.appendChild(message);
  box.appendChild(countdownEl);
  box.appendChild(button);
  overlay.appendChild(box);
  return overlay;
}

function showWarningModal() {
  if (isWarningVisible) return;
  isWarningVisible = true;
  countdownSeconds = COUNTDOWN_SECONDS;

  modalEl = buildModal();
  document.body.appendChild(modalEl);

  countdownTimer = setInterval(() => {
    countdownSeconds -= 1;
    if (countdownEl) countdownEl.textContent = countdownSeconds;
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
  countdownEl = null;

  // Restart inactivity timer
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
  stop(); // Clear any existing timers first
  attachActivityListeners();
  resetInactivityTimer();
  console.log('[SessionTimeout] Started — inactivity limit: 5 min, warning: 30 sec');
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
  countdownEl = null;
  console.log('[SessionTimeout] Stopped');
}
