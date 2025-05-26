/**
 * main.js - Webpack Entry Point
 * 
 * This file imports all ES6 modules and initializes the complete SPA.
 * Includes navigation system and all component engines.
 * 
 * Date: 25-May-2025 18:36
 * Deployment Timestamp: 20250525222336
 */

console.log('[main.js] Starting application initialization [Deployment: 20250525224144]');

// Import CSS files that were dynamically loaded in main branch
import '../styles/slider-buttons.css';
import './core/slider-styles.css';
import './inputs/input-styles.css';

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

// Define settings component initialization function
function initializeSettingsComponents() {
  if (!window.componentFactory) {
    console.error('[Settings Page] ComponentFactory not available');
    return;
  }
  
  console.log('[Settings Page] Initializing all components...');
  
  try {
    // Personal Info
    componentFactory.createFirstNameInput('first-name-container');
    componentFactory.createLastNameInput('last-name-container');
    componentFactory.createNicknameInput('nickname-container');
    
    // Appearance & Language
    componentFactory.createThemeSelector('theme-selector-container');
    componentFactory.createLanguageSelector('language-selector-container');
    
    // Time & Date
    componentFactory.createTimezoneSelector('timezone-selector-container');
    componentFactory.createFirstDayOfWeekSelector('first-day-selector-container');
    componentFactory.createDateFormatSelector('date-format-selector-container');
    componentFactory.createTimeFormatSelector('time-format-selector-container');
    
    // Work Hours
    componentFactory.createMorningHoursSelector('morning-hours-container');
    componentFactory.createAfternoonHoursSelector('afternoon-hours-container');
    
    // Units & Currency
    componentFactory.createCurrencySelector('currency-selector-container');
    
    // Units selector - create a wheel selector for metric/imperial
    componentFactory.createWheelSelector('units-selector-container', {
      id: 'units-selector',
      label: 'Units of Measurement',
      options: [
        { value: 'metric', text: 'Metric' },
        { value: 'imperial', text: 'Imperial' }
      ],
      defaultValue: 'metric',
      storageKey: 'userUnitsPreference',
      onChange: (value) => {
        console.log('[Settings] Units selected:', value);
      }
    });
    
    // Contact Info
    componentFactory.createEmailInput('email-container');
    componentFactory.createPhoneInput('phone-container');
    
    // Notifications
    componentFactory.createNotificationPreferences('notification-preferences-container');
    
    // Profile
    componentFactory.createProfilePictureUpload('profile-picture-container', (files) => {
      console.log('[Settings] Profile picture selected:', files);
    });
    componentFactory.createBirthdatePicker('birthdate-container');
    
    // Action Buttons
    componentFactory.createSaveButton('save-button-container', () => {
      console.log('[Settings] Save clicked - would save all settings');
      // Here you would collect all values and save them
    });
    
    componentFactory.createCancelButton('cancel-button-container', () => {
      console.log('[Settings] Cancel clicked - would revert changes');
      // Here you would revert any unsaved changes
    });
    
    console.log('[Settings Page] All components initialized successfully');
    
  } catch (error) {
    console.error('[Settings Page] Error initializing components:', error);
  }
}

// Component initialization function for router
window.initializePageComponents = function(pageName) {
  console.log(`[main.js] Initializing components for page: ${pageName}`);
  
  if (pageName === 'settings') {
    // Call the settings initialization directly
    console.log('[main.js] Initializing settings components');
    initializeSettingsComponents();
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

console.log('[main.js] Application setup complete [Deployment: 20250525224144]');
