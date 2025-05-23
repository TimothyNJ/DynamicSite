/**
 * main.js - Webpack Entry Point
 * 
 * This file imports all ES6 modules and initializes the component system.
 * It serves as the single entry point for webpack bundling.
 * 
 * Date: 22-May-2025 21:16
 * Deployment Timestamp: 20250522211634
 */

console.log('[main.js] Starting application initialization [Deployment: 20250522211634]');

// Import component system modules
import { slider_component_engine } from './engines/slider_component_engine.js';
import { text_input_component_engine } from './engines/text_input_component_engine.js';
import { button_component_engine } from './engines/button_component_engine.js';
import { multi_select_component_engine } from './engines/multi_select_component_engine.js';
import { file_upload_input_component_engine } from './engines/file_upload_input_component_engine.js';
import { wheel_time_selector_component_engine } from './engines/wheel_time_selector_component_engine.js';
import { wheel_date_picker_component_engine } from './engines/wheel_date_picker_component_engine.js';
import { calendar_picker_component_engine } from './engines/calendar_picker_component_engine.js';
import { dropdown_menu_component_engine } from './engines/dropdown_menu_component_engine.js';
import { ComponentFactory, componentFactory } from './factory/ComponentFactory.js';
import { initializeComponents } from './loader/component-loader.js';

// Make key components available globally for backward compatibility
window.slider_component_engine = slider_component_engine;
window.text_input_component_engine = text_input_component_engine;
window.button_component_engine = button_component_engine;
window.multi_select_component_engine = multi_select_component_engine;
window.file_upload_input_component_engine = file_upload_input_component_engine;
window.wheel_time_selector_component_engine = wheel_time_selector_component_engine;
window.wheel_date_picker_component_engine = wheel_date_picker_component_engine;
window.calendar_picker_component_engine = calendar_picker_component_engine;
window.dropdown_menu_component_engine = dropdown_menu_component_engine;
window.ComponentFactory = ComponentFactory;
window.componentFactory = componentFactory;

console.log('[main.js] ES6 modules imported successfully');

// Function to determine current page from URL hash
function getCurrentPage() {
  const hash = window.location.hash;
  if (hash.includes('settings')) return 'settings';
  if (hash.includes('create-vendor-request')) return 'create-vendor-request';
  if (hash.includes('data-entry-forms')) return 'data-entry-forms';
  if (hash.includes('progress-view')) return 'progress-view';
  return 'home';
}

// Initialize components when DOM is ready
function initializeApp() {
  console.log('[main.js] DOM ready, initializing components');
  const currentPage = getCurrentPage();
  console.log(`[main.js] Current page: ${currentPage}`);
  
  // Initialize components for current page
  initializeComponents(currentPage).then(() => {
    console.log('[main.js] Component initialization complete');
  }).catch(error => {
    console.error('[main.js] Error during initialization:', error);
  });
}

// Set up initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  // DOM already loaded
  initializeApp();
}

// Handle hash changes for single-page navigation
window.addEventListener('hashchange', () => {
  console.log('[main.js] Hash changed, reinitializing components');
  initializeApp();
});

console.log('[main.js] Application setup complete [Deployment: 20250522211634]');
