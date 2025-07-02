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

// Data Entry page initialization
function initializeDataEntryComponents() {
  console.log('[Data Entry] Initializing Three.js Lottie example...');
  console.log('[Data Entry] THREE available?', typeof THREE !== 'undefined');
  
  if (typeof THREE === 'undefined') {
    console.error('[Data Entry] Three.js not loaded!');
    return;
  }
  
  const container = document.getElementById('threejs-drum-container');
  if (!container) {
    console.error('[Data Entry] Container not found!');
    return;
  }
  
  // Initialize Three.js Lottie-style example
  const lottieControls = initializeLottieExample(container);
  
  // Create rotation speed slider
  if (window.componentFactory) {
    console.log('[Data Entry] Creating rotation speed slider...');
    
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
      if (lottieControls && lottieControls.setRotationSpeed) {
        lottieControls.setRotationSpeed(speed);
      }
    });
    
    // Helper function to create light position sliders
    function createLightSlider(lightName, lightLabel, axis, defaultValue) {
      const containerId = `${lightName}-light-${axis}-slider-container`;
      
      componentFactory.createSlider({
        containerId: containerId,
        sliderClass: `${lightName}-light-${axis}-slider`,
        options: [
          { text: '-3', value: '-3', position: 1, dataAttributes: 'data-value="-3"', active: defaultValue === -3 },
          { text: '-2', value: '-2', position: 2, dataAttributes: 'data-value="-2"', active: defaultValue === -2 },
          { text: '-1', value: '-1', position: 3, dataAttributes: 'data-value="-1"', active: defaultValue === -1 },
          { text: '0', value: '0', position: 4, dataAttributes: 'data-value="0"', active: defaultValue === 0 },
          { text: '1', value: '1', position: 5, dataAttributes: 'data-value="1"', active: defaultValue === 1 },
          { text: '2', value: '2', position: 6, dataAttributes: 'data-value="2"', active: defaultValue === 2 },
          { text: '3', value: '3', position: 7, dataAttributes: 'data-value="3"', active: defaultValue === 3 }
        ]
      }, (selectedOption) => {
        const value = parseFloat(selectedOption.getAttribute('data-value'));
        console.log(`[${lightLabel} ${axis.toUpperCase()}] Selected:`, value);
        if (lottieControls && lottieControls.setLightPosition) {
          lottieControls.setLightPosition(lightName, axis, value);
        }
      });
    }
    
    // Create all light position sliders
    // Main light (default: -1.5, 1.7, 2)
    // Special case for main light X (-1.5)
    componentFactory.createSlider({
      containerId: 'main-light-x-slider-container',
      sliderClass: 'main-light-x-slider',
      options: [
        { text: '-3', value: '-3', position: 1, dataAttributes: 'data-value="-3"' },
        { text: '-2', value: '-2', position: 2, dataAttributes: 'data-value="-2"' },
        { text: '-1.5', value: '-1.5', position: 3, dataAttributes: 'data-value="-1.5"', active: true },
        { text: '-1', value: '-1', position: 4, dataAttributes: 'data-value="-1"' },
        { text: '0', value: '0', position: 5, dataAttributes: 'data-value="0"' },
        { text: '1', value: '1', position: 6, dataAttributes: 'data-value="1"' },
        { text: '2', value: '2', position: 7, dataAttributes: 'data-value="2"' },
        { text: '3', value: '3', position: 8, dataAttributes: 'data-value="3"' }
      ]
    }, (selectedOption) => {
      const value = parseFloat(selectedOption.getAttribute('data-value'));
      console.log('[Main Light X] Selected:', value);
      if (lottieControls && lottieControls.setLightPosition) {
        lottieControls.setLightPosition('main', 'x', value);
      }
    });
    
    // Special case for main light Y (1.7)
    componentFactory.createSlider({
      containerId: 'main-light-y-slider-container',
      sliderClass: 'main-light-y-slider',
      options: [
        { text: '-3', value: '-3', position: 1, dataAttributes: 'data-value="-3"' },
        { text: '-2', value: '-2', position: 2, dataAttributes: 'data-value="-2"' },
        { text: '-1', value: '-1', position: 3, dataAttributes: 'data-value="-1"' },
        { text: '0', value: '0', position: 4, dataAttributes: 'data-value="0"' },
        { text: '1', value: '1', position: 5, dataAttributes: 'data-value="1"' },
        { text: '1.7', value: '1.7', position: 6, dataAttributes: 'data-value="1.7"', active: true },
        { text: '2', value: '2', position: 7, dataAttributes: 'data-value="2"' },
        { text: '3', value: '3', position: 8, dataAttributes: 'data-value="3"' }
      ]
    }, (selectedOption) => {
      const value = parseFloat(selectedOption.getAttribute('data-value'));
      console.log('[Main Light Y] Selected:', value);
      if (lottieControls && lottieControls.setLightPosition) {
        lottieControls.setLightPosition('main', 'y', value);
      }
    });
    
    // Main light Z stays at 2
    createLightSlider('main', 'Main Light', 'z', 2);
    
    // Front light (default: 0.5, 0.5, 3)
    // Special case for front light X and Y (0.5)
    componentFactory.createSlider({
      containerId: 'front-light-x-slider-container',
      sliderClass: 'front-light-x-slider',
      options: [
        { text: '-3', value: '-3', position: 1, dataAttributes: 'data-value="-3"' },
        { text: '-2', value: '-2', position: 2, dataAttributes: 'data-value="-2"' },
        { text: '-1', value: '-1', position: 3, dataAttributes: 'data-value="-1"' },
        { text: '0', value: '0', position: 4, dataAttributes: 'data-value="0"' },
        { text: '0.5', value: '0.5', position: 5, dataAttributes: 'data-value="0.5"', active: true },
        { text: '1', value: '1', position: 6, dataAttributes: 'data-value="1"' },
        { text: '2', value: '2', position: 7, dataAttributes: 'data-value="2"' },
        { text: '3', value: '3', position: 8, dataAttributes: 'data-value="3"' }
      ]
    }, (selectedOption) => {
      const value = parseFloat(selectedOption.getAttribute('data-value'));
      console.log('[Front Light X] Selected:', value);
      if (lottieControls && lottieControls.setLightPosition) {
        lottieControls.setLightPosition('front', 'x', value);
      }
    });
    
    componentFactory.createSlider({
      containerId: 'front-light-y-slider-container',
      sliderClass: 'front-light-y-slider',
      options: [
        { text: '-3', value: '-3', position: 1, dataAttributes: 'data-value="-3"' },
        { text: '-2', value: '-2', position: 2, dataAttributes: 'data-value="-2"' },
        { text: '-1', value: '-1', position: 3, dataAttributes: 'data-value="-1"' },
        { text: '0', value: '0', position: 4, dataAttributes: 'data-value="0"' },
        { text: '0.5', value: '0.5', position: 5, dataAttributes: 'data-value="0.5"', active: true },
        { text: '1', value: '1', position: 6, dataAttributes: 'data-value="1"' },
        { text: '2', value: '2', position: 7, dataAttributes: 'data-value="2"' },
        { text: '3', value: '3', position: 8, dataAttributes: 'data-value="3"' }
      ]
    }, (selectedOption) => {
      const value = parseFloat(selectedOption.getAttribute('data-value'));
      console.log('[Front Light Y] Selected:', value);
      if (lottieControls && lottieControls.setLightPosition) {
        lottieControls.setLightPosition('front', 'y', value);
      }
    });
    
    createLightSlider('front', 'Front Light', 'z', 3);
    
    // Left light (default: -3, 0, 1)
    createLightSlider('left', 'Left Light', 'x', -3);
    createLightSlider('left', 'Left Light', 'y', 0);
    createLightSlider('left', 'Left Light', 'z', 1);
    
    // Right light (default: 3, -0.5, 1)
    createLightSlider('right', 'Right Light', 'x', 3);
    // Special case for right light Y (-0.5)
    componentFactory.createSlider({
      containerId: 'right-light-y-slider-container',
      sliderClass: 'right-light-y-slider',
      options: [
        { text: '-3', value: '-3', position: 1, dataAttributes: 'data-value="-3"' },
        { text: '-2', value: '-2', position: 2, dataAttributes: 'data-value="-2"' },
        { text: '-1', value: '-1', position: 3, dataAttributes: 'data-value="-1"' },
        { text: '-0.5', value: '-0.5', position: 4, dataAttributes: 'data-value="-0.5"', active: true },
        { text: '0', value: '0', position: 5, dataAttributes: 'data-value="0"' },
        { text: '1', value: '1', position: 6, dataAttributes: 'data-value="1"' },
        { text: '2', value: '2', position: 7, dataAttributes: 'data-value="2"' },
        { text: '3', value: '3', position: 8, dataAttributes: 'data-value="3"' }
      ]
    }, (selectedOption) => {
      const value = parseFloat(selectedOption.getAttribute('data-value'));
      console.log('[Right Light Y] Selected:', value);
      if (lottieControls && lottieControls.setLightPosition) {
        lottieControls.setLightPosition('right', 'y', value);
      }
    });
    createLightSlider('right', 'Right Light', 'z', 1);
    
    // Back light (default: 0, 1, -3)
    createLightSlider('back', 'Back Light', 'x', 0);
    createLightSlider('back', 'Back Light', 'y', 1);
    createLightSlider('back', 'Back Light', 'z', -3);
    
    // Rim light (default: 0, -2, -2)
    createLightSlider('rim', 'Rim Light', 'x', 0);
    createLightSlider('rim', 'Rim Light', 'y', -2);
    createLightSlider('rim', 'Rim Light', 'z', -2);
  }
}

// Three.js Lottie example implementation
function initializeLottieExample(container) {
  let renderer, scene, camera;
  let mesh;
  let rotationSpeedMultiplier = 0; // Start with no auto-rotation
  
  // Declare lights at module level so they can be accessed by control methods
  let mainLight, frontLight, leftFillLight, rightFillLight, backLight, rimLight;
  
  init();
  
  function init() {
    // Renderer with exact settings from Lottie example
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(300, 350);
    container.appendChild(renderer.domElement);
    
    // Camera - perspective camera with closer position
    camera = new THREE.PerspectiveCamera(50, 300 / 350, 0.1, 100);
    camera.position.set(0, 0, 3);
    camera.lookAt(0, 0, 0);
    
    // Scene with dark background like the actual example
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    
    // Primary point light - Apple-style 30° elevation, 30° to left
    mainLight = new THREE.PointLight(0xffffff, 2.5);
    mainLight.position.set(-1.5, 1.7, 2); // 30° up, 30° left
    scene.add(mainLight);
    
    // Front fill light - soft fill from slightly right and lower
    frontLight = new THREE.DirectionalLight(0xffffff, 0.3);
    frontLight.position.set(0.5, 0.5, 3); // Slight right, lower than main
    frontLight.target.position.set(0, 0, 0);
    scene.add(frontLight);
    
    // Subtle side fills for preventing harsh shadows
    leftFillLight = new THREE.DirectionalLight(0xffffff, 0.2);
    leftFillLight.position.set(-3, 0, 1);
    leftFillLight.target.position.set(0, 0, 0);
    scene.add(leftFillLight);
    
    rightFillLight = new THREE.DirectionalLight(0xffffff, 0.15);
    rightFillLight.position.set(3, -0.5, 1);
    rightFillLight.target.position.set(0, 0, 0);
    scene.add(rightFillLight);
    
    // Subtle ambient light to prevent any complete darkness
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
    scene.add(ambientLight);
    
    // Add backlighting for rim glow effect
    backLight = new THREE.DirectionalLight(0xffffff, 2.0);
    backLight.position.set(0, 1, -3); // Behind and slightly above
    backLight.target.position.set(0, 0, 0);
    scene.add(backLight);
    
    // Additional rim light from below-back
    rimLight = new THREE.DirectionalLight(0xffffff, 1.5);
    rimLight.position.set(0, -2, -2); // Below and behind
    rimLight.target.position.set(0, 0, 0);
    scene.add(rimLight);
    
    // Environment for reflections using RoomEnvironment approach
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(createSimpleEnvironment()).texture;
    
    // Create rounded box geometry with maximum smoothness for continuous light flow
    const geometry = createRoundedBoxGeometry(1, 1, 1, 0.15, 32);
    
    // Create Lottie-style animated texture
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Function to update canvas animation
    function updateCanvasTexture(time) {
      // Clear canvas with very dark background
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, 512, 512);
      
      // Create tunnel effect with glowing center
      const phase = time * 0.001;
      
      // Draw tunnels as expanding/contracting holes
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 6; j++) {
          const x = (i + 0.5) * 85;
          const y = (j + 0.5) * 85;
          
          // Pulsing radius for tunnel opening
          const baseRadius = 15;
          const pulseAmount = 10;
          const radius = baseRadius + Math.sin(phase + i * 0.5 + j * 0.5) * pulseAmount;
          
          // Create strong gradient for tunnel depth effect
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
          
          // Center glow color - bright and saturated
          const hue = (phase * 50 + i * 30 + j * 30) % 360;
          
          // Much brighter tunnel gradient with stronger glow
          gradient.addColorStop(0, `hsl(${hue}, 100%, 80%)`); // Bright center glow
          gradient.addColorStop(0.2, `hsl(${hue}, 90%, 70%)`); // Strong mid glow
          gradient.addColorStop(0.4, `hsl(${hue}, 80%, 50%)`); // Mid tunnel
          gradient.addColorStop(0.7, `hsl(${hue}, 70%, 30%)`); // Deeper tunnel
          gradient.addColorStop(0.9, `hsl(${hue}, 60%, 15%)`); // Near edge
          gradient.addColorStop(1, '#0a0a0a'); // Edge matches surface
          
          // Draw tunnel opening
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
          
          // Add bright rim light for 3D effect
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          const rimGradient = ctx.createRadialGradient(x, y, radius * 0.8, x, y, radius);
          rimGradient.addColorStop(0, 'transparent');
          rimGradient.addColorStop(0.8, 'transparent');
          rimGradient.addColorStop(1, `hsla(${hue}, 80%, 60%, 0.6)`);
          ctx.strokeStyle = rimGradient;
          ctx.lineWidth = 3;
          ctx.stroke();
        }
      }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    
    // Material - glossy surface that still catches light
    const material = new THREE.MeshPhysicalMaterial({
      map: texture,
      color: 0x404040,  // Medium gray so it catches light
      metalness: 0.0,
      roughness: 0.0,   // Zero roughness for maximum gloss
      clearcoat: 1.0,
      clearcoatRoughness: 0.0,
      reflectivity: 1.0,
      envMapIntensity: 1.2
    });
    
    // Create mesh
    mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    
    // Interaction variables
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let rotationVelocity = { x: 0, y: 0 };
    let autoRotationTime = 0;
    
    // Animation loop
    function animate(time) {
      requestAnimationFrame(animate);
      
      // Update canvas texture
      updateCanvasTexture(time);
      texture.needsUpdate = true;
      
      if (!isDragging) {
        // Apply velocity-based rotation (momentum)
        mesh.rotation.x += rotationVelocity.x;
        mesh.rotation.y += rotationVelocity.y;
        
        // Dampen velocity
        rotationVelocity.x *= 0.95;
        rotationVelocity.y *= 0.95;
        
        // Only apply auto-rotation if no recent user interaction
        if (Math.abs(rotationVelocity.x) < 0.001 && Math.abs(rotationVelocity.y) < 0.001) {
          autoRotationTime += 0.01 * rotationSpeedMultiplier;
          mesh.rotation.x += Math.sin(autoRotationTime * 0.1) * 0.002 * rotationSpeedMultiplier;
          mesh.rotation.y += autoRotationTime * 0.01 * rotationSpeedMultiplier;
        }
      }
      
      renderer.render(scene, camera);
    }
    
    animate(0);
    
    // Mouse/touch interaction
    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onPointerUp);
    container.addEventListener('pointerleave', onPointerUp);
    
    function onPointerDown(event) {
      isDragging = true;
      const rect = container.getBoundingClientRect();
      previousMousePosition = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
      // Stop any rotation when starting to drag
      rotationVelocity = { x: 0, y: 0 };
      autoRotationTime = 0;
      container.style.cursor = 'grabbing';
    }
    
    function onPointerMove(event) {
      if (!isDragging) return;
      
      const rect = container.getBoundingClientRect();
      const currentMousePosition = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
      
      const deltaX = currentMousePosition.x - previousMousePosition.x;
      const deltaY = currentMousePosition.y - previousMousePosition.y;
      
      // Direct rotation based on drag
      mesh.rotation.y += deltaX * 0.01;
      mesh.rotation.x += deltaY * 0.01;
      
      // Store velocity for momentum
      rotationVelocity.x = deltaY * 0.005;
      rotationVelocity.y = deltaX * 0.005;
      
      previousMousePosition = currentMousePosition;
    }
    
    function onPointerUp() {
      isDragging = false;
      container.style.cursor = 'grab';
    }
    
    // Set initial cursor
    container.style.cursor = 'grab';
  }
  
  // Helper function to create simple environment for reflections
  function createSimpleEnvironment() {
    const envScene = new THREE.Scene();
    
    // Bright environment for reflections
    const envLight1 = new THREE.DirectionalLight(0xffffff, 2);
    envLight1.position.set(1, 1, 1);
    envScene.add(envLight1);
    
    const envLight2 = new THREE.DirectionalLight(0xffffff, 1);
    envLight2.position.set(-1, 1, -1);
    envScene.add(envLight2);
    
    const envAmbient = new THREE.AmbientLight(0xffffff, 1);
    envScene.add(envAmbient);
    
    return envScene;
  }
  
  // Helper function to create rounded box geometry
  function createRoundedBoxGeometry(width, height, depth, radius, smoothness) {
    const shape = new THREE.Shape();
    const eps = 0.00001;
    const radius0 = radius - eps;
    
    shape.absarc(radius0, radius0, radius0, -Math.PI / 2, -Math.PI, true);
    shape.absarc(radius0, height - radius * 2 + radius0, radius0, Math.PI, Math.PI / 2, true);
    shape.absarc(width - radius * 2 + radius0, height - radius * 2 + radius0, radius0, Math.PI / 2, 0, true);
    shape.absarc(width - radius * 2 + radius0, radius0, radius0, 0, -Math.PI / 2, true);
    
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: depth - radius * 2,
      bevelEnabled: true,
      bevelSegments: smoothness * 2,  // Will be 64 segments for ultimate smoothness
      steps: 1,
      bevelSize: radius,
      bevelThickness: radius,
      curveSegments: smoothness  // Will be 32 curve segments
    });
    
    geometry.center();
    
    return geometry;
  }
  
  // Return control interface
  return {
    setRotationSpeed: function(speed) {
      rotationSpeedMultiplier = speed;
      console.log('[Lottie Cube] Rotation speed set to:', speed);
    },
    setLightPosition: function(lightName, axis, value) {
      switch(lightName) {
        case 'main':
          mainLight.position[axis] = value;
          break;
        case 'front':
          frontLight.position[axis] = value;
          break;
        case 'left':
          leftFillLight.position[axis] = value;
          break;
        case 'right':
          rightFillLight.position[axis] = value;
          break;
        case 'back':
          backLight.position[axis] = value;
          break;
        case 'rim':
          rimLight.position[axis] = value;
          break;
      }
      console.log(`[Lottie Cube] ${lightName} light ${axis} set to:`, value);
    }
  };
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
