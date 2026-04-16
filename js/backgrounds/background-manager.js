/**
 * background-manager.js — Manages the active Home page background
 *
 * Reads/writes the user's selection to localStorage and coordinates
 * between the water simulation and the CSS gradient.
 *
 * Three modes:
 *   'water'          — Three.js WebGPU water simulation (default)
 *   'water-gradient'  — placeholder for future combined mode
 *   'gradient'        — standard CSS gradient from theme settings
 */

import * as WaterBackground from './water-background.js';

const STORAGE_KEY = 'homeBackgroundMode';
const VALID_MODES = [ 'water', 'water-gradient', 'gradient' ];

let currentMode = null;
let waterInitPromise = null;
let isOnHomePage = false;

// ─── Public API ────────────────────────────────────────────────────────────

export function getMode() {
  if ( currentMode ) return currentMode;
  const stored = localStorage.getItem( STORAGE_KEY );
  return VALID_MODES.includes( stored ) ? stored : 'water';
}

export function setMode( mode ) {
  if ( ! VALID_MODES.includes( mode ) ) return;
  currentMode = mode;
  localStorage.setItem( STORAGE_KEY, mode );
  applyMode();
}

/**
 * Called when the router navigates to the home page.
 * Starts the water background if the mode requires it.
 */
export async function onEnterHome() {
  isOnHomePage = true;
  await applyMode();
}

/**
 * Called when the router navigates away from the home page.
 * Hides the water canvas but keeps it alive.
 */
export function onLeaveHome() {
  isOnHomePage = false;
  // Hide water canvas — keeps running in memory
  WaterBackground.hide();
  // Restore gradient so other pages have a background
  showGradient();
}

/**
 * Initialise the background system. Called once from main.js on app start.
 */
export async function initBackgroundSystem() {
  currentMode = getMode();
  console.log( '[BackgroundManager] Init with mode:', currentMode );
}

// ─── Internal ──────────────────────────────────────────────────────────────

async function applyMode() {
  const mode = getMode();

  if ( mode === 'water' && isOnHomePage ) {
    // Ensure water is initialised (one-time)
    if ( WaterBackground.isAvailable() && ! WaterBackground.isReady() ) {
      if ( ! waterInitPromise ) {
        waterInitPromise = WaterBackground.init();
      }
      await waterInitPromise;
    }
    if ( WaterBackground.isReady() ) {
      WaterBackground.show();
      hideGradient();
    } else {
      // WebGPU not available — fall back to gradient
      showGradient();
    }
  } else if ( mode === 'water-gradient' ) {
    // Placeholder — for now behave like gradient
    WaterBackground.hide();
    showGradient();
  } else {
    // 'gradient' or not on home page
    WaterBackground.hide();
    showGradient();
  }
}

function hideGradient() {
  document.body.classList.add( 'water-bg-active' );
}

function showGradient() {
  document.body.classList.remove( 'water-bg-active' );
}
