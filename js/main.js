/**
 * main.js - Webpack Entry Point
 * 
 * This file imports all ES6 modules and initializes the complete SPA.
 * Includes navigation system and all component engines.
 * 
 * Date: Dynamic - set at build time
 * Deployment Timestamp: See console logs
 */

// BUILD_TIMESTAMP will be replaced by webpack at build time
const DEPLOYMENT_TIMESTAMP = typeof BUILD_TIMESTAMP !== 'undefined' ? BUILD_TIMESTAMP : 'UNKNOWN';

console.log(`[main.js] Starting application initialization [Deployment: ${DEPLOYMENT_TIMESTAMP}]`);

// Import styles - Single source of truth (SCSS)
import '../styles/styles.scss';

// Import Three.js subdivision library for better cube symmetry
import { LoopSubdivision } from 'three-subdivide';

// Import core modules
import { globalMouseTracker } from './core/mouse-tracker.js';

// Import layout modules that were missing
import { initializeBuffers } from './layout/buffers.js';
import { updateDimensions } from './layout/dimensions.js';

// Import component system modules
import { slider_component_engine } from './engines/slider_component_engine.js';
import { text_input_component_engine } from './engines/text_input_component_engine.js';

import { button_component_engine } from './engines/button_component_engine.js';
import { text_button_component_engine } from './engines/text_button_component_engine.js';
import { circle_button_component_engine } from './engines/circle_button_component_engine.js';
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

// Ensure global mouse tracker is initialized
console.log('[main.js] Global mouse tracker ready');

// Define settings component initialization function
function initializeSettingsComponents() {
  if (!window.componentFactory) {
    console.error('[Settings Page] ComponentFactory not available');
    return;
  }
  
  console.log('[Settings Page] Initializing all components...');
  
  // Apply theme BEFORE creating components so CSS selectors work correctly
  const savedTheme = localStorage.getItem('userThemePreference') || 'dark';
  if (!document.body.hasAttribute('data-theme')) {
      document.body.setAttribute('data-theme', savedTheme);
    }
    
    try {
      // Demo Components - Base Models
      console.log('[Settings Page] Initializing demo components...');
    
    // 1. Slider demo
    componentFactory.createSlider({
      containerId: 'demo-slider-container',
      sliderClass: 'demo-slider',
      options: [
        { text: 'Option 1', value: 'option1', position: 1, active: true },
        { text: 'Option 2', value: 'option2', position: 2 },
        { text: 'Option 3', value: 'option3', position: 3 }
      ]
    }, (selectedOption) => {
      console.log('[Demo] Slider selected:', selectedOption.querySelector('h3').textContent);
    });
    
    // 2. Text Input demo
    componentFactory.createTextInput('demo-text-input-container', {
      id: 'demo-text-input',
      label: 'Text Input',
      placeholder: 'Text Input',
      expandable: true,
      onChange: (value) => console.log('[Demo] Text input:', value)
    });
    

    
    // 3. Text Button demo
    componentFactory.createTextButton('demo-text-button-container', {
      id: 'demo-text-button',
      text: 'Click Me',
      onClick: () => console.log('[Demo] Text button clicked')
    });
    
    // 4. Circle Button demo
    componentFactory.createCircleButton('demo-circle-button-container', {
      id: 'demo-circle-button',
      icon: '•', // Default dot
      onClick: () => console.log('[Demo] Circle button clicked')
    });
    
    // 5. Multi Select demo
    componentFactory.createMultiSelect('demo-multi-select-container', {
      id: 'demo-multi-select',
      label: 'Multi Select',
      options: [
        { value: 'check1', text: 'Check 1' },
        { value: 'check2', text: 'Check 2' },
        { value: 'check3', text: 'Check 3' }
      ],
      defaultValues: ['check1'],
      onChange: (values) => console.log('[Demo] Multi-select values:', values)
    });
    
    // 6. Wheel Selector demo (casino-style wheel with numbers 1-10)
    componentFactory.createWheelSelector('demo-wheel-selector-container', {
      id: 'demo-wheel-selector',
      options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
      defaultValue: '1',
      placeholder: 'Roll the wheel',
      showOnHover: true, // Enable hover to show wheel
      onChange: (value) => console.log('[Demo] Wheel selected:', value)
    });
    
    // 7. Calendar Picker demo
    componentFactory.createCalendarPicker('demo-calendar-picker-container', {
      id: 'demo-calendar-picker',
      label: 'Calendar Picker',
      onChange: (date) => console.log('[Demo] Calendar date selected:', date)
    });
    
    // 8. Wheel Time Selector demo
    componentFactory.createWheelTimeSelector('demo-wheel-time-selector-container', {
      id: 'demo-wheel-time-selector',
      label: 'Time Selector',
      defaultTime: '12:00',
      onChange: (time) => console.log('[Demo] Time selected:', time)
    });
    
    // 9. Wheel Date Picker demo
    componentFactory.createWheelDatePicker('demo-wheel-date-picker-container', {
      id: 'demo-wheel-date-picker',
      label: 'Date Picker',
      format: 'dd-mm-yyyy',
      onChange: (date) => console.log('[Demo] Date selected:', date)
    });
    
    // 10. File Upload demo
    componentFactory.createFileUpload('demo-file-upload-container', {
      id: 'demo-file-upload',
      label: 'File Upload',
      onChange: (files) => console.log('[Demo] Files selected:', files)
    });
    
    console.log('[Settings Page] Demo components initialized');
    
    // User Settings Components
    console.log('[Settings Page] Initializing User Settings components...');
    
    // Time Format Slider (12-hour / 24-hour) with live time display
    const savedTimeFormat = localStorage.getItem('userTimeFormatPreference') || '12';
    let timeUpdateInterval = null;
    
    // Utility function to format current time
    function formatCurrentTime(use24Hour = false) {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');

      if (use24Hour) {
        // 24-hour format
        hours = hours.toString().padStart(2, '0');
        return `24h ${hours}:${minutes}`;
      } else {
        // 12-hour format with AM/PM
        const period = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12;
        hours = hours ? hours : 12; // Convert 0 to 12 for 12 AM
        return `12h ${hours}:${minutes}${period}`;
      }
    }
    
    // Function to update time displays
    function updateTimeDisplay() {
      const option12h = document.querySelector('.time-format-slider .option[data-format="12"] h3');
      const option24h = document.querySelector('.time-format-slider .option[data-format="24"] h3');
      
      if (option12h) {
        option12h.textContent = formatCurrentTime(false);
      }
      if (option24h) {
        option24h.textContent = formatCurrentTime(true);
      }
    }
    
    componentFactory.createSlider({
      containerId: 'time-format-slider-container',
      sliderClass: 'time-format-slider',
      options: [
        { text: formatCurrentTime(true), value: '24', position: 1, active: savedTimeFormat === '24', dataAttributes: 'data-format="24"' },
        { text: formatCurrentTime(false), value: '12', position: 2, active: savedTimeFormat === '12', dataAttributes: 'data-format="12"' }
      ]
    }, (selectedOption) => {
      const format = selectedOption.getAttribute('data-format');
      console.log('[Time Format] Selected:', format);
      localStorage.setItem('userTimeFormatPreference', format);
    });
    
    // Start updating time display
    updateTimeDisplay();
    timeUpdateInterval = setInterval(updateTimeDisplay, 1000);
    
    // Theme Selector Slider (Light / System / Dark) with proper theme application
    // savedTheme already declared at the top of the function
    
    // Utility function for theme application
    function applyThemeByName(themeName) {
      console.log('[Theme] Applying theme:', themeName);
      const body = document.body;

      if (themeName === 'light') {
        console.log('[Theme] Setting light theme attributes');
        body.setAttribute('data-theme', 'light');
        // Remove inline style - let CSS handle the background
        body.style.removeProperty('background-image');
      } else if (themeName === 'dark') {
        console.log('[Theme] Setting dark theme attributes');
        body.setAttribute('data-theme', 'dark');
        // Remove inline style - let CSS handle the background
        body.style.removeProperty('background-image');
      }
    }
    
    componentFactory.createSlider({
      containerId: 'theme-selector-slider-container',
      sliderClass: 'theme-slider',
      options: [
        { text: 'Dark Theme', value: 'dark', position: 1, active: savedTheme === 'dark', dataAttributes: 'data-theme="dark"' },
        { text: 'Light Theme', value: 'light', position: 2, active: savedTheme === 'light', dataAttributes: 'data-theme="light"' }
      ]
    }, (selectedOption) => {
      const themeName = selectedOption.getAttribute('data-theme') || selectedOption.querySelector('h3').textContent.toLowerCase();
      console.log('[Theme] Selected:', themeName);
      
      // Apply the selected theme
      applyThemeByName(themeName);
      
      // Save preference
      localStorage.setItem('userThemePreference', themeName);
    });
    
    // Apply initial theme
    applyThemeByName(savedTheme);
    
    // Size Guides and Borders Button
    // Check if borders are enabled (default to true)
    const bordersEnabled = localStorage.getItem('showBorders') !== 'false';
    if (bordersEnabled && window.toggleBorders) {
      // Toggle borders on if they should be enabled
      window.toggleBorders();
    }
    
    componentFactory.createTextButton('borders-toggle-button-container', {
      id: 'borders-toggle-button',
      text: 'Size Guides and Borders',
      onClick: () => {
        // Call the global toggleBorders function from script.js
        if (window.toggleBorders) {
          window.toggleBorders();
        } else {
          console.error('[Borders Toggle] toggleBorders function not found');
        }
      }
    });
    
    console.log('[Settings Page] All components initialized successfully');
    
  } catch (error) {
    console.error('[Settings Page] Error initializing components:', error);
  }
}

// Vendor Request page initialization
function initializeVendorRequestComponents() {
  console.log('[Vendor Request] Initializing 3D component demo...');
  console.log('[Vendor Request] THREE available?', typeof THREE !== 'undefined');
  
  if (typeof THREE === 'undefined') {
    console.error('[Vendor Request] Three.js not loaded!');
    return;
  }
  
  if (!window.componentFactory) {
    console.error('[Vendor Request] ComponentFactory not available');
    return;
  }
  
  // Create 3D component demonstration
  const threeDObject = componentFactory.create3DObject('vendor-3d-demo-container', {
    width: 300,
    height: 300,
    geometry: 'roundedBox',
    geometryParams: {
      width: 1.0,
      height: 1.0,
      depth: 1.0,
      radius: 0.15,
      smoothness: 32
    },
    texture: 'animated',
    enableInteraction: true,
    rotationSpeed: 0  // Start with no rotation
  });
  
  console.log('[Vendor Request] 3D component initialized:', threeDObject);
  
  // Create rotation speed slider
  console.log('[Vendor Request] Creating rotation speed slider...');
  
  componentFactory.createSlider({
    containerId: 'rotation-speed-slider-container',
    sliderClass: 'rotation-speed-slider',
    options: [
      { text: 'Still', value: '0', position: 1, active: true, dataAttributes: 'data-value="0"' },
      { text: 'Slow', value: '0.25', position: 2, dataAttributes: 'data-value="0.25"' },
      { text: 'Normal', value: '0.5', position: 3, dataAttributes: 'data-value="0.5"' },
      { text: 'Fast', value: '0.75', position: 4, dataAttributes: 'data-value="0.75"' },
      { text: 'Wild!', value: '1', position: 5, dataAttributes: 'data-value="1"' }
    ]
  }, (selectedOption) => {
    const speed = parseFloat(selectedOption.getAttribute('data-value') || selectedOption.querySelector('h3').textContent);
    console.log('[Rotation Speed] Selected:', speed);
    if (threeDObject && threeDObject.setRotationSpeed) {
      threeDObject.setRotationSpeed(speed);
    }
  });
}

// Data Entry page initialization
function initializeDataEntryComponents() {
  console.log('[Data Entry] Page initialized with centered text only');
  // No components to initialize - just centered text
}


// Progress View page initialization
function initializeProgressViewComponents() {
  if (!window.componentFactory) {
    console.error('[Progress View] ComponentFactory not available');
    return;
  }
  
  console.log('[Progress View] Initializing wheel selector test with year picker...');
  
  // Generate years array (100 years back from 2025)
  const years = Array.from({length: 100}, (_, i) => 2025 - i);
  
  // Create wheel selector with years
  componentFactory.createWheelSelector('wheel-selector-test-container', {
    id: 'wheel-selector-test',
    options: years,
    defaultValue: 2025,
    label: 'Select Year',
    storageKey: 'selectedYear',
    onChange: (value) => {
      console.log('[Progress View] Year selected:', value);
      // Update display if element exists
      const displayElement = document.getElementById('selectedYear');
      if (displayElement) {
        displayElement.textContent = value;
      }
    }
  });
  
  console.log('[Progress View] Year wheel selector initialized');
}

// Component initialization function for router
window.initializePageComponents = function(pageName) {
  console.log(`[main.js] Initializing components for page: ${pageName}`);
  
  if (pageName === 'settings') {
    // Call the settings initialization directly
    console.log('[main.js] Initializing settings components');
    initializeSettingsComponents();
  } else if (pageName === 'progress') {
    // Initialize progress view components
    console.log('[main.js] Initializing progress components');
    initializeProgressViewComponents();
  } else if (pageName === 'data-entry') {
    // Initialize data entry components
    console.log('[main.js] Initializing data entry components');
    initializeDataEntryComponents();
  } else if (pageName === 'vendor-request') {
    // Initialize vendor request components
    console.log('[main.js] Initializing vendor request components');
    initializeVendorRequestComponents();
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
  
  // Initialize layout first (this was missing!)
  console.log('[main.js] Initializing layout system');
  initializeBuffers();
  updateDimensions();
  
  // Initialize navigation system
  console.log('[main.js] Initializing navigation system');
  initializeNavbar();
  initRouter();
  
  // Apply saved theme preference if it exists, default to dark
  const savedTheme = localStorage.getItem("userThemePreference");
  if (savedTheme) {
    document.body.setAttribute("data-theme", savedTheme);
  } else {
    // No saved preference - default to dark theme
    document.body.setAttribute("data-theme", "dark");
  }
  // Background is now handled by CSS pseudo-element based on data-theme attribute
  
  // Add resize listener for dimension updates
  window.addEventListener("resize", updateDimensions);
  
  // Router will handle page loading and component initialization
  console.log('[main.js] Application initialized');
  
  // Show the body now that styles are loaded (prevent FOUC)
  document.body.style.visibility = 'visible';
  document.body.style.opacity = '1';
}

// Set up initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  // DOM already loaded
  initializeApp();
}

// Force reflow on page load to ensure proper layout calculations
window.addEventListener("load", () => {
  updateDimensions();
});

// Update dimensions when a page loads
document.addEventListener("pageLoaded", updateDimensions);

console.log(`[main.js] Application setup complete [Deployment: ${DEPLOYMENT_TIMESTAMP}]`);
