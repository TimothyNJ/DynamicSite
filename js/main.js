/**
 * main.js - Webpack Entry Point
 * 
 * This file imports all ES6 modules and initializes the complete SPA.
 * Includes navigation system and all component engines.
 * 
 * Date: 25-May-2025 18:36
 * Deployment Timestamp: 20250525183605
 */

console.log('[main.js] Starting application initialization [Deployment: 20250525205916]');

// Import component system modules
import { slider_component_engine } from './engines/slider_component_engine.js';
import { text_input_component_engine } from './engines/text_input_component_engine.js';
import { button_component_engine } from './engines/button_component_engine.js';
import { multi_select_component_engine } from './engines/multi_select_component_engine.js';
import { file_upload_input_component_engine } from './engines/file_upload_input_component_engine.js';
import { wheel_time_selector_component_engine } from './engines/wheel_time_selector_component_engine.js';
import { wheel_date_picker_component_engine } from './engines/wheel_date_picker_component_engine.js';
import { calendar_picker_component_engine } from './engines/calendar_picker_component_engine.js';
import { wheel_selector_component_engine } from './engines/wheel_selector_component_engine.js';
import { ComponentFactory, componentFactory } from './factory/ComponentFactory.js';
import { initializeComponents } from './loader/component-loader.js';
import { initializeNavbar } from './navigation/navbar.js';
import { initRouter } from './navigation/router.js';

// Make factory available for pages that need it
window.componentFactory = componentFactory;

// Component initialization function for router
window.initializePageComponents = function(pageName) {
  console.log(`[main.js] Initializing components for page: ${pageName}`);
  
  if (pageName === 'settings') {
    // Settings page needs componentFactory which is already global
    console.log('[main.js] ComponentFactory available for settings page');
    
    // Call the settings page initialization function if it exists
    if (typeof window.initializeSettingsComponents === 'function') {
      console.log('[main.js] Calling initializeSettingsComponents');
      window.initializeSettingsComponents();
    } else {
      console.log('[main.js] initializeSettingsComponents not found - waiting for page script to load');
      // Give the page script time to load and define the function
      setTimeout(() => {
        if (typeof window.initializeSettingsComponents === 'function') {
          console.log('[main.js] Calling initializeSettingsComponents after delay');
          window.initializeSettingsComponents();
        }
      }, 100);
    }
  }
  
  // Add other page-specific initialization as needed
};

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
  console.log('[main.js] DOM ready, initializing application');
  
  // Initialize navigation system first
  console.log('[main.js] Initializing navigation system');
  initializeNavbar();
  initRouter();
  
  // Router will handle page loading and component initialization
  console.log('[main.js] Navigation system initialized');
}

// Set up initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  // DOM already loaded
  initializeApp();
}

console.log('[main.js] Application setup complete [Deployment: 20250525205916]');
