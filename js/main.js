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

// Authentication - Zitadel PKCE
import {
  login,
  logout,
  isAuthenticated,
  getUserInfo,
  getAccessToken,
  startTokenRefreshTimer,
  clearAuthState,
  handleCallback,
  getUserRoles,
  getHighestRole,
  hasMinimumRole
} from './auth/zitadel-auth.js';

import { start as startSessionTimeout, stop as stopSessionTimeout, restart as restartSessionTimeout } from './auth/session-timeout.js';
import { start as startUpdateNotifier, stop as stopUpdateNotifier } from './update-notifier.js';

// Zitadel Management API
import { fetchProjectRoles } from './api/zitadel-api.js';

// Display Settings — font editor
import { initializeFontEditor } from './display/font-editor.js';

// Security Settings
import { initializeSecuritySettings } from './security/security-settings.js';

// Vendor Request — Address Validations subpage
import { initializeAddressValidations } from './vendor-request/address-validations.js';

function isUserAuthenticated() {
  return isAuthenticated();
}

// Make auth functions available globally
window.isUserAuthenticated = isUserAuthenticated;
window.logout = logout;
window.login = login;
window.getUserInfo = getUserInfo;
window.getAccessToken = getAccessToken;
window.getUserRoles = getUserRoles;
window.getHighestRole = getHighestRole;
window.hasMinimumRole = hasMinimumRole;
window.restartSessionTimeout = restartSessionTimeout;

// Start token refresh timer if already authenticated
if (isAuthenticated()) {
  startTokenRefreshTimer();
  startSessionTimeout();
}

// Start update notifier — polls version.json to detect new deployments
startUpdateNotifier();

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
import { multi_select_component_engine } from './engines/multi_select_component_engine.js';
import { file_upload_input_component_engine } from './engines/file_upload_input_component_engine.js';
import { wheel_time_selector_component_engine } from './engines/wheel_time_selector_component_engine.js';
import { wheel_date_picker_component_engine } from './engines/wheel_date_picker_component_engine.js';
import { calendar_picker_component_engine } from './engines/calendar_picker_component_engine.js';
import { wheel_selector_component_engine } from './engines/wheel_selector_component_engine.js';
import { ThreeD_component_engine } from './engines/threed_component_engine.js';
import { ComponentFactory, componentFactory } from './factory/ComponentFactory.js';
import { initializeComponents } from './loader/component-loader.js';
import { initializeNavbar } from './navigation/navbar.js';
import { initRouter, registerPageCleanup, pagePathMap, sidenavConfig } from './navigation/router.js';
import { startPrefetch } from './navigation/page-prefetch.js';

// Background system
import * as BackgroundManager from './backgrounds/background-manager.js';
import * as WaterBackground from './backgrounds/water-background.js';

// Deployment Index — JSON-driven client-side renderer
import { renderDeploymentIndex } from './deployment-index-renderer.js';

// Make factory and cleanup registration available for pages that need it
window.componentFactory = componentFactory;
window.registerPageCleanup = registerPageCleanup;

// Ensure global mouse tracker is initialized
console.log('[main.js] Global mouse tracker ready');

// Component Engine Demos initialization function
function initializeComponentEnginesDemos() {
  if (!window.componentFactory) {
    console.error('[Engines Page] ComponentFactory not available');
    return;
  }
  
  console.log('[Engines Page] Initializing component engine demos...');
  
  try {
    // Demo Components - Base Models
    console.log('[Engines Page] Initializing demo components...');
  
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

  // 2b. Text Input Length Capped demo (sibling engine, identical behaviour for now)
  componentFactory.createTextInputLengthCapped('demo-text-input-length-capped-container', {
    id: 'demo-text-input-length-capped',
    label: 'Text Input',
    placeholder: 'Text Input',
    expandable: true,
    onChange: (value) => console.log('[Demo] Text input length capped:', value)
  });

  // 3. Base Button Engine demos (Text Mode)
  componentFactory.createButton('demo-base-button-text-container', {
    id: 'demo-base-button-text',
    text: 'Click Me',
    active: false,
    onClick: (value, id) => {
      console.log('[Demo] Base button (text mode) clicked:', value, id);
    }
  });
  
  // 4. Base Button Engine demos (Circle Mode)
  componentFactory.createButton('demo-base-button-circle-container', {
    id: 'demo-base-button-circle',
    text: '•', // This triggers circle mode
    active: false,
    onClick: (value, id) => {
      console.log('[Demo] Base button (circle mode) clicked:', value, id);
    }
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
  
  // 5.9. ThreeD Component Engine TextGeometry Drum Selector
  // Using the main engine in textgeometry mode to create a production drum selector
  let demoThreeDTextGeometryDrum = null;  // Declare at function scope
  const drumContainer = document.getElementById('demo-3d-textgeometry-drum-container');
  if (!drumContainer) {
    console.error('[Demo] Container demo-3d-textgeometry-drum-container not found');
  } else {
    demoThreeDTextGeometryDrum = new ThreeD_component_engine(drumContainer, {
    mode: 'textgeometry',  // Use TextGeometry mode
    rotationSpeed: 0,      // Start with no rotation
    textDepth: 0,          // FLAT TEXT - no depth
    addBlockingCylinder: true,  // ADD BLACK BLOCKING CYLINDER
    restrictRotationAxis: 'x',  // Only allow X-axis rotation (forward/backward roll)
    texture: 'none',
    backgroundColor: 0x1a1a1a,
    enableInteraction: true
    });
    demoThreeDTextGeometryDrum.init();
    
    console.log('[Demo] ThreeD Component Engine TextGeometry Drum initialized:', demoThreeDTextGeometryDrum);
    
    // Listen for value changes
    demoThreeDTextGeometryDrum.container.addEventListener('valueChanged', (event) => {
      console.log('ThreeD TextGeometry Drum value changed to:', event.detail.value);
    });
    
    // Create rotation speed slider for TextGeometry Drum demo
    componentFactory.createSlider({
      containerId: 'demo-3d-textgeometry-drum-rotation-slider-container',
      sliderClass: 'demo-3d-textgeometry-drum-rotation-slider',
      options: [
        { text: 'Still', value: '0', position: 1, active: true, dataAttributes: 'data-value="0"' },
        { text: 'Slow', value: '0.25', position: 2, dataAttributes: 'data-value="0.25"' },
        { text: 'Normal', value: '0.5', position: 3, dataAttributes: 'data-value="0.5"' },
        { text: 'Fast', value: '0.75', position: 4, dataAttributes: 'data-value="0.75"' },
        { text: 'Wild!', value: '1', position: 5, dataAttributes: 'data-value="1"' }
      ]
    }, (selectedOption) => {
      const speed = parseFloat(selectedOption.getAttribute('data-value'));
      console.log('[Demo ThreeD TextGeometry Drum Rotation Speed] Selected:', speed);
      if (demoThreeDTextGeometryDrum && demoThreeDTextGeometryDrum.setRotationSpeed) {
        demoThreeDTextGeometryDrum.setRotationSpeed(speed);
      }
    });
  }
  
  // 6. 3D Component demo (responsive)
  const demo3D = componentFactory.create3DObject('demo-3d-container', {
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
  
  console.log('[Demo] 3D component initialized:', demo3D);
  
  // Create rotation speed slider for 3D demo
  componentFactory.createSlider({
    containerId: 'demo-3d-rotation-slider-container',
    sliderClass: 'demo-3d-rotation-slider',
    options: [
      { text: 'Still', value: '0', position: 1, active: true, dataAttributes: 'data-value="0"' },
      { text: 'Slow', value: '0.25', position: 2, dataAttributes: 'data-value="0.25"' },
      { text: 'Normal', value: '0.5', position: 3, dataAttributes: 'data-value="0.5"' },
      { text: 'Fast', value: '0.75', position: 4, dataAttributes: 'data-value="0.75"' },
      { text: 'Wild!', value: '1', position: 5, dataAttributes: 'data-value="1"' }
    ]
  }, (selectedOption) => {
    const speed = parseFloat(selectedOption.getAttribute('data-value') || selectedOption.querySelector('h3').textContent);
    console.log('[Demo 3D Rotation Speed] Selected:', speed);
    if (demo3D && demo3D.setRotationSpeed) {
      demo3D.setRotationSpeed(speed);
    }
  });
  
  // 7. 3D Component demo (cylinder)
  const demoCylinder3D = componentFactory.create3DObject('demo-3d-cylinder-container', {
    geometry: 'cylinder',  // Cylinder instead of roundedBox
    geometryParams: {
      cylinderRadiusTop: 0.5,    // Radius 0.5 = diameter 1.0
      cylinderRadiusBottom: 0.5,  // Same top and bottom for uniform cylinder
      cylinderHeight: 1.0,        // Height 1.0 to match cube
      cylinderRadialSegments: 32  // Smooth cylinder surface
    },
    texture: 'animated',  // Same animated texture as cube
    enableInteraction: true,  // Same interaction capabilities
    rotationSpeed: 0  // Start with no rotation like cube
  });
  
  console.log('[Demo] 3D cylinder component initialized:', demoCylinder3D);
  
  // Create rotation speed slider for cylinder demo
  componentFactory.createSlider({
    containerId: 'demo-3d-cylinder-rotation-slider-container',
    sliderClass: 'demo-3d-cylinder-rotation-slider',
    options: [
      { text: 'Still', value: '0', position: 1, active: true, dataAttributes: 'data-value="0"' },
      { text: 'Slow', value: '0.25', position: 2, dataAttributes: 'data-value="0.25"' },
      { text: 'Normal', value: '0.5', position: 3, dataAttributes: 'data-value="0.5"' },
      { text: 'Fast', value: '0.75', position: 4, dataAttributes: 'data-value="0.75"' },
      { text: 'Wild!', value: '1', position: 5, dataAttributes: 'data-value="1"' }
    ]
  }, (selectedOption) => {
    const speed = parseFloat(selectedOption.getAttribute('data-value'));
    console.log('[Demo 3D Cylinder Rotation Speed] Selected:', speed);
    if (demoCylinder3D && demoCylinder3D.setRotationSpeed) {
      demoCylinder3D.setRotationSpeed(speed);
    }
  });
  
  // 7.5. 3D Component demo (cone)
  const demoCone3D = componentFactory.create3DObject('demo-3d-cone-container', {
    geometry: 'cone',  // Cone geometry
    geometryParams: {
      coneRadius: 0.5,        // Base radius
      coneHeight: 1.0,        // Height to match other shapes
      coneRadialSegments: 32  // Smooth cone surface
    },
    texture: 'animated',  // Same animated texture
    enableInteraction: true,  // Same interaction capabilities
    rotationSpeed: 0  // Start with no rotation
  });
  
  console.log('[Demo] 3D cone component initialized:', demoCone3D);
  
  // Create rotation speed slider for cone demo
  componentFactory.createSlider({
    containerId: 'demo-3d-cone-rotation-slider-container',
    sliderClass: 'demo-3d-cone-rotation-slider',
    options: [
      { text: 'Still', value: '0', position: 1, active: true, dataAttributes: 'data-value="0"' },
      { text: 'Slow', value: '0.25', position: 2, dataAttributes: 'data-value="0.25"' },
      { text: 'Normal', value: '0.5', position: 3, dataAttributes: 'data-value="0.5"' },
      { text: 'Fast', value: '0.75', position: 4, dataAttributes: 'data-value="0.75"' },
      { text: 'Wild!', value: '1', position: 5, dataAttributes: 'data-value="1"' }
    ]
  }, (selectedOption) => {
    const speed = parseFloat(selectedOption.getAttribute('data-value'));
    console.log('[Demo 3D Cone Rotation Speed] Selected:', speed);
    if (demoCone3D && demoCone3D.setRotationSpeed) {
      demoCone3D.setRotationSpeed(speed);
    }
  });
  
  // 7.75. 3D Component demo (tube)
  const demoTube3D = componentFactory.create3DObject('demo-3d-tube-container', {
    geometry: 'tube',  // Tube geometry (straight cylinder)
    geometryParams: {
    tubeRadius: 0.5,          // Same radius as cylinder
    tubeLength: 1.0,          // Same height as cylinder
    tubeRadialSegments: 32    // Smooth tube surface
    },
    texture: 'animated',  // Same animated texture
    enableInteraction: true,  // Same interaction capabilities
    rotationSpeed: 0  // Start with no rotation
  });
  
  console.log('[Demo] 3D tube component initialized:', demoTube3D);
  
  // Create rotation speed slider for tube demo
  componentFactory.createSlider({
    containerId: 'demo-3d-tube-rotation-slider-container',
    sliderClass: 'demo-3d-tube-rotation-slider',
    options: [
      { text: 'Still', value: '0', position: 1, active: true, dataAttributes: 'data-value="0"' },
      { text: 'Slow', value: '0.25', position: 2, dataAttributes: 'data-value="0.25"' },
      { text: 'Normal', value: '0.5', position: 3, dataAttributes: 'data-value="0.5"' },
      { text: 'Fast', value: '0.75', position: 4, dataAttributes: 'data-value="0.75"' },
      { text: 'Wild!', value: '1', position: 5, dataAttributes: 'data-value="1"' }
    ]
  }, (selectedOption) => {
    const speed = parseFloat(selectedOption.getAttribute('data-value'));
    console.log('[Demo 3D Tube Rotation Speed] Selected:', speed);
    if (demoTube3D && demoTube3D.setRotationSpeed) {
      demoTube3D.setRotationSpeed(speed);
    }
  });
  
  // 7.9. ThreeD Component Engine TextGeometry
  // Ring of numbers 0-9 that can be rotated in any direction
  const demoTextGeometry3D = new ThreeD_component_engine('demo-3d-textgeometry-container', {
    mode: 'textgeometry',  // Use TextGeometry mode
    rotationSpeed: 0,
    textDepth: 0,          // FLAT TEXT - no depth
    // No restrictRotationAxis - allows rotation in all directions
    // No addBlockingCylinder - visible from all angles
    texture: 'none',
    backgroundColor: 0x1a1a1a,
    enableInteraction: true
  });
  demoTextGeometry3D.init();
  
  console.log('[Demo] ThreeD Component Engine TextGeometry initialized:', demoTextGeometry3D);
  
  // Listen for value changes (for when rotation stops near a number)
  demoTextGeometry3D.container.addEventListener('valueChanged', (event) => {
    console.log('ThreeD TextGeometry value changed to:', event.detail.value);
  });
  
  // Create rotation speed slider for TextGeometry demo
  componentFactory.createSlider({
    containerId: 'demo-3d-textgeometry-rotation-slider-container',
    sliderClass: 'demo-3d-textgeometry-rotation-slider',
    options: [
      { text: 'Still', value: '0', position: 1, active: true, dataAttributes: 'data-value="0"' },
      { text: 'Slow', value: '0.25', position: 2, dataAttributes: 'data-value="0.25"' },
      { text: 'Normal', value: '0.5', position: 3, dataAttributes: 'data-value="0.5"' },
      { text: 'Fast', value: '0.75', position: 4, dataAttributes: 'data-value="0.75"' },
      { text: 'Wild!', value: '1', position: 5, dataAttributes: 'data-value="1"' }
    ]
  }, (selectedOption) => {
    const speed = parseFloat(selectedOption.getAttribute('data-value'));
    console.log('[Demo ThreeD TextGeometry Rotation Speed] Selected:', speed);
    if (demoTextGeometry3D && demoTextGeometry3D.setRotationSpeed) {
      demoTextGeometry3D.setRotationSpeed(speed);
    }
  });
  
  // 8. 3D Component demo (sphere)
  const demoSphere3D = componentFactory.create3DObject('demo-3d-sphere-container', {
    geometry: 'sphere',  // Sphere geometry
    geometryParams: {
      sphereRadius: 0.5,          // Radius 0.5 to match cylinder diameter 1.0
      sphereWidthSegments: 32,    // Smooth sphere surface
      sphereHeightSegments: 16    // Good vertical resolution
    },
    texture: 'animated',  // Same animated texture
    enableInteraction: true,  // Same interaction capabilities
    rotationSpeed: 0  // Start with no rotation
  });
  
  console.log('[Demo] 3D sphere component initialized:', demoSphere3D);
  
  // Create rotation speed slider for sphere demo
  componentFactory.createSlider({
    containerId: 'demo-3d-sphere-rotation-slider-container',
    sliderClass: 'demo-3d-sphere-rotation-slider',
    options: [
      { text: 'Still', value: '0', position: 1, active: true, dataAttributes: 'data-value="0"' },
      { text: 'Slow', value: '0.25', position: 2, dataAttributes: 'data-value="0.25"' },
      { text: 'Normal', value: '0.5', position: 3, dataAttributes: 'data-value="0.5"' },
      { text: 'Fast', value: '0.75', position: 4, dataAttributes: 'data-value="0.75"' },
      { text: 'Wild!', value: '1', position: 5, dataAttributes: 'data-value="1"' }
    ]
  }, (selectedOption) => {
    const speed = parseFloat(selectedOption.getAttribute('data-value'));
    console.log('[Demo 3D Sphere Rotation Speed] Selected:', speed);
    if (demoSphere3D && demoSphere3D.setRotationSpeed) {
      demoSphere3D.setRotationSpeed(speed);
    }
  });

  // 9. Wheel Selector demo (casino-style wheel with numbers 1-10)
  componentFactory.createWheelSelector('demo-wheel-selector-container', {
    id: 'demo-wheel-selector',
    options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
    defaultValue: '1',
    placeholder: 'Roll the wheel',
    showOnHover: true, // Enable hover to show wheel
    onChange: (value) => console.log('[Demo] Wheel selected:', value)
  });
  
  // 10. Calendar Picker demo
  componentFactory.createCalendarPicker('demo-calendar-picker-container', {
    id: 'demo-calendar-picker',
    label: 'Calendar Picker',
    onChange: (date) => console.log('[Demo] Calendar date selected:', date)
  });
  
  // 11. Wheel Time Selector demo
  componentFactory.createWheelTimeSelector('demo-wheel-time-selector-container', {
    id: 'demo-wheel-time-selector',
    label: 'Time Selector',
    defaultTime: '12:00',
    onChange: (time) => console.log('[Demo] Time selected:', time)
  });
  
  // 12. Wheel Date Picker demo
  componentFactory.createWheelDatePicker('demo-wheel-date-picker-container', {
    id: 'demo-wheel-date-picker',
    label: 'Date Picker',
    format: 'dd-mm-yyyy',
    onChange: (date) => console.log('[Demo] Date selected:', date)
  });
  
  // 13. File Upload demo
  componentFactory.createFileUpload('demo-file-upload-container', {
    id: 'demo-file-upload',
    label: 'File Upload',
    onChange: (files) => console.log('[Demo] Files selected:', files)
  });
  
  console.log('[Engines Page] Demo components initialized');
  
  // Return 3D components for cleanup
  return [demo3D, demoCylinder3D, demoCone3D, demoTube3D, demoTextGeometry3D, demoSphere3D, demoThreeDTextGeometryDrum];
  
} catch (error) {
  console.error('[Engines Page] Error initializing components:', error);
  return [];
}
}

// Define settings component initialization function
function initializeSettingsComponents() {
  if (!window.componentFactory) {
    console.error('[Settings Page] ComponentFactory not available');
    return;
  }
  
  console.log('[Settings Page] Initializing User Settings components...');
  
  // Apply theme BEFORE creating components so CSS selectors work correctly
  const savedTheme = localStorage.getItem('userThemePreference') || 'dark';
  if (!document.body.hasAttribute('data-theme')) {
      document.body.setAttribute('data-theme', savedTheme);
    }
  
  // Time Format Slider (12-hour / 24-hour) with live time display
  const savedTimeFormat = localStorage.getItem('userTimeFormatPreference') || '12';
  let timeUpdateInterval = null;  // Declare at function scope for cleanup access
    
    try {
    
    // Logout Button
    componentFactory.createButton('logout-button-container', {
      text: 'Log Out',
      onClick: async () => {
        if (typeof window.logout === 'function') {
          stopSessionTimeout();
          await window.logout();
        }
      }
    });
    
    // User Settings Components
    console.log('[Settings Page] Initializing User Settings components...');
    
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

    // Session Timeout Slider
    const savedTimeout = localStorage.getItem('sessionTimeoutMinutes');
    const timeoutVal = savedTimeout ? parseFloat(savedTimeout) : null;
    componentFactory.createSlider({
      containerId: 'session-timeout-slider-container',
      sliderClass: 'session-timeout-slider',
      options: [
        { text: '30 sec', value: '0.5', position: 1, active: !timeoutVal || timeoutVal === 0.5 },
        { text: '10 min', value: '10',  position: 2, active: timeoutVal === 10  },
        { text: '20 min', value: '20',  position: 3, active: timeoutVal === 20  },
      ]
    }, (selectedOption) => {
      const minutes = selectedOption.querySelector('h3').textContent.includes('sec') ? 0.5 : parseFloat(selectedOption.querySelector('h3').textContent);
      localStorage.setItem('sessionTimeoutMinutes', minutes.toString());
      if (typeof window.restartSessionTimeout === 'function') {
        window.restartSessionTimeout();
      }
    });
    
    // Time Zone (placeholder dropdown — wires the User_Time_Zone module).
    // Dynamic import so the module is only fetched when the Settings page renders.
    const tzSelect = document.getElementById('user-time-zone-select');
    if (tzSelect) {
      import('./settings/userTimeZone.js')
        .then(({ getUserTimeZone, setUserTimeZone }) => {
          tzSelect.value = getUserTimeZone();
          tzSelect.addEventListener('change', (e) => {
            setUserTimeZone(e.target.value);
            console.log('[Settings] User_Time_Zone changed to:', e.target.value);
          });
        })
        .catch((err) => console.error('[Settings] Failed to wire Time Zone dropdown:', err));
    }

    console.log('[Settings Page] All components initialized successfully');

  } catch (error) {
    console.error('[Settings Page] Error initializing components:', error);
  }
  
  // Register cleanup for Settings page
  if (typeof window.registerPageCleanup === 'function') {
    window.registerPageCleanup(() => {
      // Cleanup time update interval
      if (timeUpdateInterval) {
        clearInterval(timeUpdateInterval);
        timeUpdateInterval = null;
        console.log('[Settings Cleanup] Time update interval cleared');
      }
    });
  }
}

// Vendor Request page initialization
function initializeVendorRequestComponents() {
  console.log('[Vendor Request] Initializing vendor request components...');
  
  if (!window.componentFactory) {
    console.error('[Vendor Request] ComponentFactory not available');
    return;
  }
  
  // Vendor request form components will be initialized here
  console.log('[Vendor Request] Page ready for vendor request form components');
}

// Data Entry page initialization
function initializeDataEntryComponents() {
  console.log('[Data Entry] Page initialized with centered text only');
  // No components to initialize - just centered text
}


// Engines View page initialization
function initializeEnginesViewComponents() {
  console.log('[Engines View] Initializing component engine demos');
  // Call the component engines demo function
  const threeDComponents = initializeComponentEnginesDemos();
  
  // Register cleanup for Engines page
  if (typeof window.registerPageCleanup === 'function' && threeDComponents) {
    window.registerPageCleanup(() => {
      threeDComponents.forEach(component => {
        try {
          if (component && component.dispose) {
            component.dispose();
          }
        } catch (e) {
          console.warn('[Engines Cleanup] Dispose error (safe to ignore):', e.message);
        }
      });
      console.log('[Engines Cleanup] Disposed 3D components');
    });
  }
}

// Display Settings page initialization (development/display-settings/<env>)
function initializeDisplaySettingsComponents(env) {
  if (!window.componentFactory) {
    console.error('[Display Settings] ComponentFactory not available');
    return;
  }

  // Idempotency guard — prevent duplicate component creation on first navigation
  const guard = document.getElementById('borders-toggle-button-container');
  if (guard && guard.dataset.initialized === 'true') return;
  if (guard) guard.dataset.initialized = 'true';

  componentFactory.createButton('borders-toggle-button-container', {
    id: 'borders-toggle-button',
    text: 'Size Guides and Borders',
    value: 'toggle-borders',
    onClick: () => {
      if (window.toggleBorders) {
        window.toggleBorders();
        const siteContainer = document.querySelector('.site-container');
        const bordersHidden = siteContainer && siteContainer.classList.contains('borders-hidden');
        localStorage.setItem('showBorders', bordersHidden ? 'false' : 'true');
        console.log('[Borders Toggle] Borders are now:', bordersHidden ? 'hidden' : 'visible');
      } else {
        console.error('[Borders Toggle] toggleBorders function not found');
      }
    }
  });

  // Font editor — text inputs for live clamp() editing + push button
  initializeFontEditor(env);
}

// ─── Backgrounds Page (development/backgrounds) ─────────────────────────────
function initializeBackgroundsPage() {
  if (!window.componentFactory) {
    console.error('[Backgrounds] ComponentFactory not available');
    return;
  }

  console.log('[Backgrounds] Initializing backgrounds page controls...');

  const currentMode = BackgroundManager.getMode();

  // Background mode slider: Water | Water Gradient | Gradient
  componentFactory.createSlider({
    containerId: 'background-mode-slider-container',
    sliderClass: 'background-mode-slider',
    options: [
      { text: 'Water', value: 'water', position: 1, active: currentMode === 'water', dataAttributes: 'data-mode="water"' },
      { text: 'Water Gradient', value: 'water-gradient', position: 2, active: currentMode === 'water-gradient', dataAttributes: 'data-mode="water-gradient"' },
      { text: 'Gradient', value: 'gradient', position: 3, active: currentMode === 'gradient', dataAttributes: 'data-mode="gradient"' }
    ]
  }, (selectedOption) => {
    const mode = selectedOption.getAttribute('data-mode');
    console.log('[Backgrounds] Mode selected:', mode);
    BackgroundManager.setMode(mode);
  });

  // Mouse Size slider — read live state
  const curMouseSize = WaterBackground.getMouseSize();
  componentFactory.createSlider({
    containerId: 'water-mouse-size-slider-container',
    sliderClass: 'water-mouse-size-slider',
    options: [
      { text: '0.1', value: '0.1', position: 1, active: curMouseSize === 0.1, dataAttributes: 'data-value="0.1"' },
      { text: '0.12', value: '0.12', position: 2, active: curMouseSize === 0.12, dataAttributes: 'data-value="0.12"' },
      { text: '0.2', value: '0.2', position: 3, active: curMouseSize === 0.2, dataAttributes: 'data-value="0.2"' },
      { text: '0.3', value: '0.3', position: 4, active: curMouseSize === 0.3, dataAttributes: 'data-value="0.3"' }
    ]
  }, (selectedOption) => {
    const v = parseFloat(selectedOption.getAttribute('data-value'));
    WaterBackground.setMouseSize(v);
  });

  // Mouse Depth slider
  const curMouseDeep = WaterBackground.getMouseDeep();
  componentFactory.createSlider({
    containerId: 'water-mouse-deep-slider-container',
    sliderClass: 'water-mouse-deep-slider',
    options: [
      { text: '0.1', value: '0.1', position: 1, active: curMouseDeep === 0.1, dataAttributes: 'data-value="0.1"' },
      { text: '0.3', value: '0.3', position: 2, active: curMouseDeep === 0.3, dataAttributes: 'data-value="0.3"' },
      { text: '0.5', value: '0.5', position: 3, active: curMouseDeep === 0.5, dataAttributes: 'data-value="0.5"' },
      { text: '1.0', value: '1.0', position: 4, active: curMouseDeep === 1.0, dataAttributes: 'data-value="1.0"' }
    ]
  }, (selectedOption) => {
    const v = parseFloat(selectedOption.getAttribute('data-value'));
    WaterBackground.setMouseDeep(v);
  });

  // Waves slider (wave retention / viscosity)
  const curViscosity = WaterBackground.getViscosity();
  componentFactory.createSlider({
    containerId: 'water-viscosity-slider-container',
    sliderClass: 'water-viscosity-slider',
    options: [
      { text: 'Calm', value: '0.96', position: 1, active: curViscosity <= 0.96, dataAttributes: 'data-value="0.96"' },
      { text: 'Choppy', value: '0.98', position: 2, active: curViscosity > 0.96, dataAttributes: 'data-value="0.98"' }
    ]
  }, (selectedOption) => {
    const v = parseFloat(selectedOption.getAttribute('data-value'));
    WaterBackground.setViscosity(v);
  });

  // Speed slider
  const curSpeed = WaterBackground.getSpeed();
  componentFactory.createSlider({
    containerId: 'water-speed-slider-container',
    sliderClass: 'water-speed-slider',
    options: [
      { text: '1', value: '1', position: 1, active: curSpeed === 1, dataAttributes: 'data-value="1"' },
      { text: '3', value: '3', position: 2, active: curSpeed === 3, dataAttributes: 'data-value="3"' },
      { text: '5', value: '5', position: 3, active: curSpeed === 5, dataAttributes: 'data-value="5"' },
      { text: '6', value: '6', position: 4, active: curSpeed === 6, dataAttributes: 'data-value="6"' }
    ]
  }, (selectedOption) => {
    const v = parseInt(selectedOption.getAttribute('data-value'));
    WaterBackground.setSpeed(v);
  });

  // Ducks toggle — read live state so it persists across page navigation
  const ducksOn = WaterBackground.getDucksEnabled();
  componentFactory.createSlider({
    containerId: 'water-ducks-slider-container',
    sliderClass: 'water-ducks-slider',
    options: [
      { text: 'On', value: 'on', position: 1, active: ducksOn, dataAttributes: 'data-value="true"' },
      { text: 'Off', value: 'off', position: 2, active: !ducksOn, dataAttributes: 'data-value="false"' }
    ]
  }, (selectedOption) => {
    const v = selectedOption.getAttribute('data-value') === 'true';
    WaterBackground.setDucksEnabled(v);
  });

  // Sailboat toggle
  const sailboatOn = WaterBackground.getSailboatEnabled();
  componentFactory.createSlider({
    containerId: 'water-sailboat-slider-container',
    sliderClass: 'water-sailboat-slider',
    options: [
      { text: 'On', value: 'on', position: 1, active: sailboatOn, dataAttributes: 'data-value="true"' },
      { text: 'Off', value: 'off', position: 2, active: !sailboatOn, dataAttributes: 'data-value="false"' }
    ]
  }, (selectedOption) => {
    const v = selectedOption.getAttribute('data-value') === 'true';
    WaterBackground.setSailboatEnabled(v);
  });

  // Wireframe toggle
  const wireframeOn = WaterBackground.getWireframe();
  componentFactory.createSlider({
    containerId: 'water-wireframe-slider-container',
    sliderClass: 'water-wireframe-slider',
    options: [
      { text: 'Off', value: 'off', position: 1, active: !wireframeOn, dataAttributes: 'data-value="false"' },
      { text: 'On', value: 'on', position: 2, active: wireframeOn, dataAttributes: 'data-value="true"' }
    ]
  }, (selectedOption) => {
    const v = selectedOption.getAttribute('data-value') === 'true';
    WaterBackground.setWireframe(v);
  });

  console.log('[Backgrounds] Controls initialized');
}

// Component initialization function for router
window.initializePageComponents = function(pageName) {
  console.log(`[main.js] Initializing components for page: ${pageName}`);
  
  if (pageName === 'home') {
    // Initialize home page with build timestamp
    console.log('[main.js] Initializing home page');

    // Add build timestamp above H1 Font
    const h1Element = document.querySelector('.content-flex-container h1');
    console.log('[main.js] Found h1 element:', h1Element);
    console.log('[main.js] h1 text content:', h1Element ? h1Element.textContent : 'null');

    if (h1Element) {
      const timestampElement = document.createElement('h1');
      timestampElement.textContent = DEPLOYMENT_TIMESTAMP;
      timestampElement.style.marginBottom = '10px';
      h1Element.parentNode.insertBefore(timestampElement, h1Element);
      console.log('[main.js] Build timestamp added:', DEPLOYMENT_TIMESTAMP);
    } else {
      console.error('[main.js] No h1 element found on home page');
    }

    // Activate water background if selected
    BackgroundManager.onEnterHome();
  } else {
    // Leaving home — hide water, restore gradient
    BackgroundManager.onLeaveHome();
    BackgroundManager.onLeavePool();
  }

  if (pageName === 'settings') {
    // Call the settings initialization directly
    console.log('[main.js] Initializing settings components');
    initializeSettingsComponents();
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

// ─── Table (development/table subpage — display-only table for overflow testing) ───

function initializeTablePage() {
  if (!window.componentFactory) {
    console.error('[Table] ComponentFactory not available');
    return;
  }
  const slots = document.querySelectorAll('.table-button-slot');
  slots.forEach((slot) => {
    if (!slot.id) return;
    componentFactory.createButton(slot.id, {
      id: `${slot.id}-btn`,
      text: '•',
      active: false,
    });
  });
  console.log(`[Table] Rendered ${slots.length} circle buttons`);
}

// ─── Deployment Index (development/deployment-index subpage) ────────────────
// Walks every .local-timestamp cell, reads its data-utc ISO instant, and
// formats it into the user's chosen time zone via formatLocalTimestamp().
// The User_Time_Zone module is dynamically imported so this branch carries
// no cost on pages that don't render the Deployment Index.

async function initializeDeploymentIndexPage(subsubpage) {
  try {
    const { formatLocalTimestamp } = await import('./settings/userTimeZone.js');
    const cells = document.querySelectorAll('.local-timestamp');
    cells.forEach((cell) => {
      const iso = cell.dataset.utc;
      if (!iso) return;
      const p = cell.querySelector('.cell-fit > p');
      if (p) p.textContent = formatLocalTimestamp(iso);
    });
    console.log(`[Deployment Index] Formatted ${cells.length} local timestamps`);
  } catch (err) {
    console.error('[Deployment Index] Failed to format local timestamps:', err);
  }

  // ─── Live search bar (all three sub-subpages) ──────────────────────────────
  // Renders a text_input_component_engine into the page's search container,
  // then on every keystroke filters the table rows below to those whose text
  // contains the query (case-insensitive) and wraps each match in <mark> for
  // highlighting. Cleared input restores all rows and removes highlights.
  if (subsubpage) {
    initializeDeploymentIndexSearch(subsubpage);
  }

  // ─── Prose-column pixel-cap measurement ──────────────────────────────────
  // Mirror the sibling text_input_component_engine_length_capped approach:
  // measure the pixel width of the first N characters of each prose cell's
  // text and set that explicit width on the .cell-fit div. This gives an
  // exact character-based cap that `max-width: Nch` and `fit-content(Nch)`
  // can't deliver under table-layout: auto + width: max-content, since the
  // table's column-width algorithm uses cell max-content (no-wrap) widths
  // and ignores max-width on cell descendants.
  //
  // Character cap = 66 — same as the length-capped text-input engine, so
  // wrapped prose in cells reads at the same visual line length as wrapped
  // text-input content.
  applyProseCellPixelCap();
  // Re-measure on viewport resize so font-size changes (zoom, responsive)
  // still produce the right cap.
  if (!window.__deploymentIndexResizeBound) {
    window.addEventListener('resize', () => {
      // Debounce with rAF — one measurement per paint is plenty
      if (window.__deploymentIndexResizePending) return;
      window.__deploymentIndexResizePending = true;
      requestAnimationFrame(() => {
        window.__deploymentIndexResizePending = false;
        applyProseCellPixelCap();
      });
    });
    window.__deploymentIndexResizeBound = true;
  }
}

// ─── Deployment Index search bar (any sub-subpage) ──────────────────────────
// Renders a text_input_component_engine into the per-environment search slot
// (#deployment-index-search-{development|sandbox|production}) and wires its
// live change handler to filter and highlight rows in the adjacent .table-main.
// Idempotent: if the bar is already rendered (e.g. router fires subpageLoaded
// twice), we skip re-init.
function initializeDeploymentIndexSearch(subsubpage) {
  const container = document.getElementById(`deployment-index-search-${subsubpage}`);
  if (!container) return;
  if (container.dataset.initialized === 'true') return;
  container.dataset.initialized = 'true';

  const tbody = document.querySelector(
    `[data-search-scope="${subsubpage}"] .table-main tbody`
  );
  if (!tbody) {
    console.warn(`[Deployment Index] ${subsubpage} tbody not found; search disabled`);
    return;
  }

  // Cache each row's original cell text so we can rebuild .cell-fit > p contents
  // (with or without <mark> wrapping) on every keystroke without losing the source.
  const rows = Array.from(tbody.querySelectorAll('tr.table-body-row'));
  const rowOriginals = rows.map((row) => {
    const proseTargets = row.querySelectorAll('.cell-fit > p, .cell-fit > h3');
    return Array.from(proseTargets).map((el) => ({ el, text: el.textContent }));
  });

  const escRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escHtml = (s) => s.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  const applyFilter = (query) => {
    const q = (query || '').trim();
    if (!q) {
      // Reset: show every row, drop the matched class, restore plain text.
      rows.forEach((row, i) => {
        row.style.display = '';
        row.classList.remove('search-matched');
        rowOriginals[i].forEach(({ el, text }) => { el.textContent = text; });
      });
      return;
    }
    const re = new RegExp(escRegex(q), 'gi');
    rows.forEach((row, i) => {
      const haystack = rowOriginals[i].map((o) => o.text).join(' ');
      const matches = re.test(haystack);
      re.lastIndex = 0; // reset after the test() call
      row.style.display = matches ? '' : 'none';
      if (!matches) {
        // Hidden row: drop the matched class, restore plain text so a future
        // search starts clean.
        row.classList.remove('search-matched');
        rowOriginals[i].forEach(({ el, text }) => { el.textContent = text; });
        return;
      }
      // Visible row: tag it for the size bump and rewrite each prose element
      // with <mark>-wrapped matches.
      row.classList.add('search-matched');
      rowOriginals[i].forEach(({ el, text }) => {
        el.innerHTML = escHtml(text).replace(re, (m) => `<mark class="search-hit">${escHtml(m)}</mark>`);
      });
    });
  };

  // Instantiate the engine. Second arg is the change handler — fires on input.
  const engine = new text_input_component_engine(
    {
      id: `deployment-index-search-input-${subsubpage}`,
      name: `deployment-index-search-${subsubpage}`,
      placeholder: 'Search',
      expandable: false,
      multiline: false,
    },
    (value) => applyFilter(value),
  );
  engine.render(container);
  console.log(`[Deployment Index] Search bar initialised (${subsubpage})`);
}

// ─── Prose-cell pixel-cap helper ─────────────────────────────────────────────
// Measures the first CHAR_CAP characters of each prose cell's <p> text in
// pixels, using a hidden element styled to match <p> inside .cell-fit, and
// sets that width on the surrounding .cell-fit div so the column respects
// the cap under table-layout: auto.
function applyProseCellPixelCap() {
  const CHAR_CAP = 66;
  const cellFits = document.querySelectorAll(
    '.description-cell .cell-fit, .summary-cell .cell-fit'
  );
  if (cellFits.length === 0) return;

  // Hidden measurement helper. Positioned off-screen; white-space: pre so
  // spaces aren't collapsed; visibility hidden so it never paints.
  let helper = document.getElementById('prose-cell-measure-helper');
  if (!helper) {
    helper = document.createElement('span');
    helper.id = 'prose-cell-measure-helper';
    helper.style.position = 'absolute';
    helper.style.visibility = 'hidden';
    helper.style.whiteSpace = 'pre';
    helper.style.left = '-99999px';
    helper.style.top = '0';
    helper.style.pointerEvents = 'none';
    document.body.appendChild(helper);
  }

  cellFits.forEach((cellFit) => {
    const p = cellFit.querySelector('p');
    if (!p) return;
    const text = p.textContent || '';
    if (!text) return;

    // Copy computed font properties from the real <p> so measurement
    // matches exactly what's rendered.
    const cs = window.getComputedStyle(p);
    helper.style.fontFamily = cs.fontFamily;
    helper.style.fontSize = cs.fontSize;
    helper.style.fontWeight = cs.fontWeight;
    helper.style.fontStyle = cs.fontStyle;
    helper.style.letterSpacing = cs.letterSpacing;
    helper.style.textTransform = cs.textTransform;

    // Full-text width — this is what max-content would produce.
    helper.textContent = text;
    const fullWidth = helper.offsetWidth;

    // Char-cap width — pixel width of first CHAR_CAP characters.
    const sample = text.length >= CHAR_CAP ? text.substring(0, CHAR_CAP) : text;
    helper.textContent = sample;
    const capWidth = helper.offsetWidth;

    // If text is shorter than the cap, let it shrink to its natural width;
    // otherwise pin to the cap so the column can't grow past it.
    const finalWidth = Math.min(fullWidth, capWidth);

    // +1px margin to cover sub-pixel rounding on retina/fractional zooms.
    cellFit.style.width = `${Math.ceil(finalWidth) + 1}px`;
  });

  console.log(
    `[Deployment Index] Pixel-capped ${cellFits.length} prose cells at ${CHAR_CAP} chars`
  );
}

// ─── System Roles (Zitadel) ──────────────────────────────────────────────────

async function initializeSystemRoles() {
  const loading = document.getElementById('system-roles-loading');
  const errorEl = document.getElementById('system-roles-error');
  const list = document.getElementById('system-roles-list');

  if (!loading || !list) {
    console.warn('[System Roles] DOM containers not found');
    return;
  }

  try {
    loading.style.display = '';
    errorEl.style.display = 'none';
    list.style.display = 'none';

    const roles = await fetchProjectRoles();
    console.log(`[System Roles] Fetched ${roles.length} roles from Zitadel`);

    list.innerHTML = '';
    if (roles.length === 0) {
      list.innerHTML = '<li class="role-item empty">No roles found in project</li>';
    } else {
      for (const role of roles) {
        const li = document.createElement('li');
        li.className = 'role-item';
        const keySpan = document.createElement('span');
        keySpan.className = 'role-key';
        keySpan.textContent = role.key;
        li.appendChild(keySpan);

        if (role.displayName && role.displayName !== role.key) {
          const nameSpan = document.createElement('span');
          nameSpan.className = 'role-display-name';
          nameSpan.textContent = role.displayName;
          li.appendChild(nameSpan);
        }

        if (role.group) {
          const groupSpan = document.createElement('span');
          groupSpan.className = 'role-group';
          groupSpan.textContent = role.group;
          li.appendChild(groupSpan);
        }

        list.appendChild(li);
      }
    }

    loading.style.display = 'none';
    list.style.display = '';
  } catch (error) {
    console.error('[System Roles] Failed to fetch roles:', error);
    loading.style.display = 'none';
    errorEl.textContent = `Failed to load roles: ${error.message}`;
    errorEl.style.display = '';
  }
}

// ─── Org Roles Above Admin (display-only table) ──────────────────────────────

function initializeOrgRolesAboveAdmin() {
  if (!window.componentFactory) {
    console.error('[Org Roles Above Admin] ComponentFactory not available');
    return;
  }

  // Render a default circle button into each .table-button-slot
  const slots = document.querySelectorAll('.table-button-slot');
  slots.forEach((slot) => {
    if (!slot.id) return;
    componentFactory.createButton(slot.id, {
      id: `${slot.id}-btn`,
      text: '•', // Triggers circle mode in button_component_engine
      active: false,
    });
  });

  console.log(`[Org Roles Above Admin] Rendered ${slots.length} circle buttons`);
}

// Subpage-specific initialization — fires when router loads subpage/sub-subpage content
document.addEventListener('subpageLoaded', (e) => {
  const { page, subpage } = e.detail;

  // Development subpages
  if (page === 'development') {
    // Clean up pool water when switching to a non-pool subpage
    if (subpage !== 'backgrounds') {
      BackgroundManager.onLeavePool();
    }
    requestAnimationFrame(() => {
      if (subpage === 'engines') {
        console.log('[main.js] Initializing engines components (development/engines)');
        initializeEnginesViewComponents();
      } else if (subpage === 'display-settings') {
        const env = e.detail.subsubpage;
        console.log(`[main.js] Initializing Display Settings (${ env })`);
        initializeDisplaySettingsComponents(env);
      } else if (subpage === 'table') {
        console.log('[main.js] Initializing Table page (development/table)');
        initializeTablePage();
      } else if (subpage === 'backgrounds') {
        const subSub = e.detail.subsubpage;
        if (subSub === 'pool') {
          console.log('[main.js] Showing water background on Pool page (development/backgrounds/pool)');
          BackgroundManager.onEnterPool();
        } else if (subSub === 'pool-settings') {
          console.log('[main.js] Initializing Pool Settings (development/backgrounds/pool-settings)');
          BackgroundManager.onLeavePool();
          initializeBackgroundsPage();
        } else {
          BackgroundManager.onLeavePool();
        }
      } else if (subpage === 'deployment-index') {
        const env = e.detail.subsubpage;
        console.log(`[main.js] Rendering Deployment Index (${ env }) from JSON`);
        renderDeploymentIndex( env ).then( () => {
          initializeDeploymentIndexSearch( env );
        } );
      } else if (subpage === 'security-settings') {
        const env = e.detail.subsubpage;
        console.log(`[main.js] Initializing Security Settings (${ env })`);
        initializeSecuritySettings( env );
      } else if (subpage === 'infrastructure') {
        console.log('[main.js] Initializing Infrastructure page');
        applyProseCellPixelCap();
      }
    });
  }

  // Users subpages
  if (page === 'users') {
    requestAnimationFrame(() => {
      if (subpage === 'system-roles') {
        console.log('[main.js] Initializing system roles (users/system-roles)');
        initializeSystemRoles();
      } else if (subpage === 'org-roles-above-admin') {
        console.log('[main.js] Initializing org roles above admin table (users/org-roles-above-admin)');
        initializeOrgRolesAboveAdmin();
      }
    });
  }

  // Vendor Request subpages
  if (page === 'vendor-request') {
    requestAnimationFrame(() => {
      if (subpage === 'create' && e.detail.subsubpage === 'address-validations') {
        console.log('[main.js] Initializing Address Validations (vendor-request/create/address-validations)');
        initializeAddressValidations();
      }
    });
  }
});

console.log('[main.js] ES6 modules imported successfully');

// Function to determine current page from URL hash
function getCurrentPage() {
  const hash = window.location.hash;
  if (hash.includes('settings')) return 'settings';
  if (hash.includes('create-vendor-request')) return 'create-vendor-request';
  if (hash.includes('data-entry-forms')) return 'data-entry-forms';
  return 'home';
}

// Measure buttons and set divider dimensions to the minimum sibling size
function updateDividers() {
  // Navbar: vertical dividers sized to the shortest visible button
  const navContainer = document.querySelector('.nav-container:nth-child(4)');
  if (navContainer) {
    const visibleButtons = Array.from(
      navContainer.querySelectorAll('button[data-page]:not(.auth-hidden):not(.collapsed-navbar)')
    );
    if (visibleButtons.length > 1) {
      const minHeight = Math.min(...visibleButtons.map(btn => btn.offsetHeight));
      navContainer.style.setProperty('--nav-divider-height', `${minHeight}px`);
    }
  }

  // Sidenav: horizontal dividers sized to the narrowest button
  const sidenav = document.querySelector('.sidenav');
  if (sidenav) {
    const sidenavButtons = Array.from(sidenav.querySelectorAll('.sidenav-button'));
    if (sidenavButtons.length > 1) {
      const minWidth = Math.min(...sidenavButtons.map(btn => btn.offsetWidth));
      sidenav.style.setProperty('--sidenav-divider-width', `${minWidth}px`);
    }
  }
}

// Update navigation button visibility based on authentication state and role
// Uses CSS class 'auth-hidden' instead of inline styles to work with navbar system
function updateNavigationForAuthState() {
  const isAuth = isUserAuthenticated();
  const navButtons = document.querySelectorAll('.nav-container button[data-page]');
  
  // Pages requiring only authentication (all logged-in users including guest)
  const adminPages = ['settings', 'vendor-request', 'finance', 'logistics', 'reporting', 'development'];
  const hasAdminAccess = isAuth;

  // Pages requiring minimum '05_org_admin' role (not visible to guest)
  const orgAdminPages = ['users'];
  const hasOrgAdminAccess = isAuth && hasMinimumRole('05_org_admin');
  
  navButtons.forEach(button => {
    const pageName = button.getAttribute('data-page');
    
    // Handle Login button visibility
    if (pageName === 'login') {
      if (isAuth) {
        button.classList.add('auth-hidden');
      } else {
        button.classList.remove('auth-hidden');
      }
      return;
    }
    
    // Handle admin-protected pages - require minimum admin role
    if (adminPages.includes(pageName)) {
      if (hasAdminAccess) {
        button.classList.remove('auth-hidden');
      } else {
        button.classList.add('auth-hidden');
      }
      return;
    }

    // Handle org_admin-protected pages - require minimum org_admin role
    if (orgAdminPages.includes(pageName)) {
      if (hasOrgAdminAccess) {
        button.classList.remove('auth-hidden');
      } else {
        button.classList.add('auth-hidden');
      }
      return;
    }
    
    // Home and other public pages always visible
    button.classList.remove('auth-hidden');
  });
  
  // Update Settings button text to show username when logged in
  const settingsButton = document.querySelector('.nav-container button[data-page="settings"] h3');
  if (settingsButton) {
    if (isAuth) {
      const userInfo = getUserInfo();
      const loginName = userInfo?.preferred_username || userInfo?.email || 'Settings';
      settingsButton.textContent = '';
      const slidersSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      slidersSvg.setAttribute('viewBox', '0 0 5 20');
      slidersSvg.setAttribute('width', '0.9em');
      slidersSvg.setAttribute('height', '0.9em');
      slidersSvg.style.verticalAlign = 'baseline';
      slidersSvg.style.display = 'inline-block';
      slidersSvg.innerHTML = `
        <circle cx="2.5" cy="2.5" r="2.5" fill="currentColor"/>
        <circle cx="2.5" cy="10" r="2.5" fill="currentColor"/>
        <circle cx="2.5" cy="17.5" r="2.5" fill="currentColor"/>
      `;
      settingsButton.appendChild(slidersSvg);
      settingsButton.appendChild(document.createTextNode(' ' + loginName));
    } else {
      settingsButton.textContent = 'Settings';
    }
  }

  // Update Home button with house icon
  const homeButton = document.querySelector('.nav-container button[data-page="home"] h3');
  if (homeButton) {
    homeButton.textContent = '';
    const homeSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    homeSvg.setAttribute('viewBox', '0 3 84 84');
    homeSvg.setAttribute('width', '0.9em');
    homeSvg.setAttribute('height', '0.9em');
    homeSvg.style.verticalAlign = 'baseline';
    homeSvg.style.display = 'inline-block';
    homeSvg.innerHTML = `
      <line x1="4" y1="46" x2="42" y2="6" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>
      <line x1="42" y1="6" x2="80" y2="46" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>
      <polyline points="58,10 68,10 68,28" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <line x1="12" y1="50" x2="12" y2="84" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>
      <line x1="72" y1="50" x2="72" y2="84" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>
      <line x1="12" y1="84" x2="72" y2="84" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>
    `;
    homeButton.appendChild(homeSvg);
    homeButton.appendChild(document.createTextNode(' Home'));
  }

  // Refresh the dropdown menu to respect auth-hidden class
  if (typeof window.updateMenuContent === 'function') {
    window.updateMenuContent();
  }
}

// Initialize components when DOM is ready
function initializeApp() {
  console.log('[main.js] DOM ready, initializing application');
  
  // Check if this is a Zitadel auth callback (code in URL params)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('code')) {
    console.log('[Auth] Detected auth callback - processing...');
    document.body.style.visibility = 'visible';
    document.body.style.opacity = '1';
    handleCallback()
      .then(() => {
        startTokenRefreshTimer();
        startSessionTimeout();
        console.log('[Auth] Callback handled - redirecting to home');
        // Clean URL and navigate to home
        window.history.replaceState({}, '', window.location.pathname);
        window.location.hash = 'home';
        window.location.reload();
      })
      .catch((error) => {
        console.error('[Auth] Callback failed:', error);
        window.history.replaceState({}, '', window.location.pathname);
        window.location.reload();
      });
    return; // Don't initialize the rest of the app during callback
  }
  
  // Update navigation based on authentication state
  updateNavigationForAuthState();
  window.updateNavigationForAuthState = updateNavigationForAuthState;
  
  // Initialize layout first (this was missing!)
  console.log('[main.js] Initializing layout system');
  initializeBuffers();
  updateDimensions();
  updateDividers();
  
  // Initialize navigation system
  console.log('[main.js] Initializing navigation system');
  initializeNavbar();
  initRouter();
  
  // Initialize borders based on saved preference (default to true)
  const bordersEnabled = localStorage.getItem('showBorders') === 'true';
  if (bordersEnabled) {
    console.log('[main.js] Borders should be enabled, waiting for toggleBorders function...');
    // Wait for script.js to load and define toggleBorders
    const checkForToggleBorders = setInterval(() => {
      if (window.toggleBorders) {
        console.log('[main.js] toggleBorders function found, enabling borders');
        window.toggleBorders();
        clearInterval(checkForToggleBorders);
      }
    }, 100); // Check every 100ms
    
    // Stop checking after 5 seconds
    setTimeout(() => clearInterval(checkForToggleBorders), 5000);
  }
  
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
  window.addEventListener("resize", () => {
    updateDimensions();
    updateDividers();
  });
  
  // Initialize background system
  BackgroundManager.initBackgroundSystem();

  // Router will handle page loading and component initialization
  console.log('[main.js] Application initialized');

  // Show the body now that styles are loaded (prevent FOUC)
  document.body.style.visibility = 'visible';
  document.body.style.opacity = '1';

  // Start background prefetch of all pages during idle time
  startPrefetch( pagePathMap, sidenavConfig );
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
  updateDividers();
});

// Update dimensions when a page loads
document.addEventListener("pageLoaded", () => {
  updateDimensions();
  updateDividers();
});

console.log(`[main.js] Application setup complete [Deployment: ${DEPLOYMENT_TIMESTAMP}]`);
