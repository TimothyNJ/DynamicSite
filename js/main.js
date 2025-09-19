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
import { multi_select_component_engine } from './engines/multi_select_component_engine.js';
import { file_upload_input_component_engine } from './engines/file_upload_input_component_engine.js';
import { wheel_time_selector_component_engine } from './engines/wheel_time_selector_component_engine.js';
import { wheel_date_picker_component_engine } from './engines/wheel_date_picker_component_engine.js';
import { calendar_picker_component_engine } from './engines/calendar_picker_component_engine.js';
import { wheel_selector_component_engine } from './engines/wheel_selector_component_engine.js';
import { ThreeD_component_engine } from './engines/3_D_component_engine.js';
import { ComponentFactory, componentFactory } from './factory/ComponentFactory.js';
import { initializeComponents } from './loader/component-loader.js';
import { initializeNavbar } from './navigation/navbar.js';
import { initRouter } from './navigation/router.js';

// Make factory available for pages that need it
window.componentFactory = componentFactory;

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
  
  // 5.5. ThreeD_Drum_Selector - Production-Ready Engine
  // Dynamically import the new ThreeD_Drum_Selector engine
  import('./engines/ThreeD_Drum_Selector.js').then(module => {
    const ThreeD_Drum_Selector = module.default;
    
    // Create the production drum selector
    const demoThreeDDrumSelector = new ThreeD_Drum_Selector('demo-threed-drum-selector-container', {
      responsive: true,  // Same responsive sizing
      rotationSpeed: 0,  // Start with no rotation
      textDepth: 0,  // FLAT TEXT - no depth
      addBlockingCylinder: true,  // ADD BLACK BLOCKING CYLINDER
      restrictRotationAxis: 'x'  // Only allow X-axis rotation (forward/backward roll)
    });
    
    // Initialize the component
    demoThreeDDrumSelector.init();
    
    console.log('[Demo] ThreeD_Drum_Selector initialized:', demoThreeDDrumSelector);
    
    // Add value change listener
    demoThreeDDrumSelector.addEventListener('valueChange', (event) => {
      console.log('ThreeD_Drum_Selector value changed to:', event.detail.value);
    });
    
    // Create rotation speed slider for ThreeD_Drum_Selector demo
    componentFactory.createSlider({
      containerId: 'demo-threed-drum-selector-rotation-slider-container',
      sliderClass: 'demo-threed-drum-selector-rotation-slider',
      options: [
        { text: 'Still', value: '0', position: 1, active: true, dataAttributes: 'data-value="0"' },
        { text: 'Slow', value: '0.25', position: 2, dataAttributes: 'data-value="0.25"' },
        { text: 'Normal', value: '0.5', position: 3, dataAttributes: 'data-value="0.5"' },
        { text: 'Fast', value: '0.75', position: 4, dataAttributes: 'data-value="0.75"' },
        { text: 'Wild!', value: '1', position: 5, dataAttributes: 'data-value="1"' }
      ]
    }, (selectedOption) => {
      const speed = parseFloat(selectedOption.getAttribute('data-value'));
      console.log('[Demo ThreeD_Drum_Selector Rotation Speed] Selected:', speed);
      if (demoThreeDDrumSelector && demoThreeDDrumSelector.setRotationSpeed) {
        demoThreeDDrumSelector.setRotationSpeed(speed);
      }
    });
  }).catch(error => {
    console.error('Failed to load ThreeD_Drum_Selector:', error);
  });
  
  // 5.9. ThreeD Component Engine TextGeometry Drum Selector
  // Using the main engine in textgeometry mode to create a production drum selector
  const drumContainer = document.getElementById('demo-3d-textgeometry-drum-container');
  if (!drumContainer) {
    console.error('[Demo] Container demo-3d-textgeometry-drum-container not found');
  } else {
    const demoThreeDTextGeometryDrum = new ThreeD_component_engine(drumContainer, {
    mode: 'textgeometry',  // Use TextGeometry mode
    responsive: true,      // Same responsive sizing
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
    responsive: true,  // Enable viewport-based sizing
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
    responsive: true,  // Same responsive sizing as cube
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
    responsive: true,  // Same responsive sizing
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
    responsive: true,  // Same responsive sizing
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
  const demoTextGeometry3D = new ThreeD_component_engine('demo-3d-textgeometry-container', {
    mode: 'textgeometry',  // Use TextGeometry mode
    responsive: true,
    rotationSpeed: 0,
    restrictRotationAxis: 'x',
    texture: 'none',
    backgroundColor: 0x1a1a1a
  });
  demoTextGeometry3D.init();
  
  console.log('[Demo] ThreeD Component Engine TextGeometry initialized:', demoTextGeometry3D);
  
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
  
  // 7.10. ThreeD Engine TextGeometry 0-9 (with flat text - depth: 0)
  const demoTextGeometry09_3D = new ThreeD_component_engine('demo-3d-textgeometry-09-container', {
    mode: 'textgeometry',  // Use TextGeometry mode
    responsive: true,
    rotationSpeed: 0,
    textDepth: 0,  // FLAT TEXT - no depth as originally requested
    restrictRotationAxis: 'x',
    texture: 'none',
    backgroundColor: 0x1a1a1a
  });
  demoTextGeometry09_3D.init();
  
  console.log('[Demo] ThreeD Engine TextGeometry 0-9 initialized:', demoTextGeometry09_3D);
  
  // Create rotation speed slider for TextGeometry 0-9 demo
  componentFactory.createSlider({
    containerId: 'demo-3d-textgeometry-09-rotation-slider-container',
    sliderClass: 'demo-3d-textgeometry-09-rotation-slider',
    options: [
      { text: 'Still', value: '0', position: 1, active: true, dataAttributes: 'data-value="0"' },
      { text: 'Slow', value: '0.25', position: 2, dataAttributes: 'data-value="0.25"' },
      { text: 'Normal', value: '0.5', position: 3, dataAttributes: 'data-value="0.5"' },
      { text: 'Fast', value: '0.75', position: 4, dataAttributes: 'data-value="0.75"' },
      { text: 'Wild!', value: '1', position: 5, dataAttributes: 'data-value="1"' }
    ]
  }, (selectedOption) => {
    const speed = parseFloat(selectedOption.getAttribute('data-value'));
    console.log('[Demo ThreeD TextGeometry 0-9 Rotation Speed] Selected:', speed);
    if (demoTextGeometry09_3D && demoTextGeometry09_3D.setRotationSpeed) {
      demoTextGeometry09_3D.setRotationSpeed(speed);
    }
  });
  
  // 7.10b. ThreeD Engine TextGeometry 0-9 with Black Blocker
  const demoTextGeometry09Blocker_3D = new ThreeD_component_engine('demo-3d-textgeometry-09-blocker-container', {
    mode: 'textgeometry',  // Use TextGeometry mode
    responsive: true,
    rotationSpeed: 0,
    textDepth: 0,  // FLAT TEXT - no depth
    addBlockingCylinder: true,  // ADD BLACK BLOCKING CYLINDER
    restrictRotationAxis: 'x',  // Only allow X-axis rotation (forward/backward roll)
    texture: 'none',
    backgroundColor: 0x1a1a1a
  });
  demoTextGeometry09Blocker_3D.init();
  
  console.log('[Demo] ThreeD Engine TextGeometry 0-9 with Black Blocker initialized:', demoTextGeometry09Blocker_3D);
  
  // Create rotation speed slider for TextGeometry 0-9 Black Blocker demo
  componentFactory.createSlider({
    containerId: 'demo-3d-textgeometry-09-blocker-rotation-slider-container',
    sliderClass: 'demo-3d-textgeometry-09-blocker-rotation-slider',
    options: [
      { text: 'Still', value: '0', position: 1, active: true, dataAttributes: 'data-value="0"' },
      { text: 'Slow', value: '0.25', position: 2, dataAttributes: 'data-value="0.25"' },
      { text: 'Normal', value: '0.5', position: 3, dataAttributes: 'data-value="0.5"' },
      { text: 'Fast', value: '0.75', position: 4, dataAttributes: 'data-value="0.75"' },
      { text: 'Wild!', value: '1', position: 5, dataAttributes: 'data-value="1"' }
    ]
  }, (selectedOption) => {
    const speed = parseFloat(selectedOption.getAttribute('data-value'));
    console.log('[Demo ThreeD TextGeometry 0-9 Black Blocker Rotation Speed] Selected:', speed);
    if (demoTextGeometry09Blocker_3D && demoTextGeometry09Blocker_3D.setRotationSpeed) {
      demoTextGeometry09Blocker_3D.setRotationSpeed(speed);
    }
  });
  
  // 7.11. ThreeD Engine DecalGeometry 0-9 - True decal projection implementation
  // Create a 3D cylinder with numbers projected as decals
  const demoDecalGeometry09_3D = componentFactory.create3DObject('demo-3d-decalgeometry-09-container', {
    responsive: true,
    geometry: 'cylinder',
    geometryParams: {
      cylinderRadiusTop: 0.5,
      cylinderRadiusBottom: 0.5,
      cylinderHeight: 1.0,
      cylinderRadialSegments: 32  // Smooth cylinder for better decal projection
    },
    texture: 'solid',
    textureParams: {
      solidColor: 0x303030  // Dark gray base
    },
    materialParams: {
      color: 0x404040,
      metalness: 0.3,
      roughness: 0.7
    },
    enableInteraction: true,
    rotationSpeed: 0
  });
  
  // Wait for initialization then add decals for numbers 0-9
  // The 3D engine needs a moment to fully initialize
  setTimeout(() => {
    if (demoDecalGeometry09_3D && demoDecalGeometry09_3D.isInitialized) {
      const numbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
      
      // Clear any existing decals first
      if (demoDecalGeometry09_3D.clearDecals) {
        demoDecalGeometry09_3D.clearDecals();
      }
      
      // Create circular decals for numbers 0-9
      demoDecalGeometry09_3D.createCircularDecals(numbers, {
        radius: 0.52,  // Slightly outside cylinder surface
        textStyle: {
          fontSize: 72,
          fontFamily: 'Arial, sans-serif',
          color: '#ffffff',
          backgroundColor: '#000000',  // Black background for contrast
          padding: 15
        },
        decalSize: (typeof THREE !== 'undefined' && THREE.Vector3) 
          ? new THREE.Vector3(0.2, 0.2, 0.1)  // Use THREE if available
          : { x: 0.2, y: 0.2, z: 0.1 }  // Fallback to plain object
      });
      console.log('[Demo] ThreeD Engine DecalGeometry 0-9 initialized with projected number decals');
    } else {
      console.warn('[Demo] ThreeD Engine DecalGeometry 0-9 not initialized yet');
    }
  }, 200);  // Give it 200ms to initialize
  
  // Create rotation speed slider for DecalGeometry 0-9 demo
  componentFactory.createSlider({
    containerId: 'demo-3d-decalgeometry-09-rotation-slider-container',
    sliderClass: 'demo-3d-decalgeometry-09-rotation-slider',
    options: [
      { text: 'Still', value: '0', position: 1, active: true, dataAttributes: 'data-value="0"' },
      { text: 'Slow', value: '0.25', position: 2, dataAttributes: 'data-value="0.25"' },
      { text: 'Normal', value: '0.5', position: 3, dataAttributes: 'data-value="0.5"' },
      { text: 'Fast', value: '0.75', position: 4, dataAttributes: 'data-value="0.75"' },
      { text: 'Wild!', value: '1', position: 5, dataAttributes: 'data-value="1"' }
    ]
  }, (selectedOption) => {
    const speed = parseFloat(selectedOption.getAttribute('data-value'));
    console.log('[Demo ThreeD DecalGeometry 0-9 Rotation Speed] Selected:', speed);
    if (demoDecalGeometry09_3D && demoDecalGeometry09_3D.setRotationSpeed) {
      demoDecalGeometry09_3D.setRotationSpeed(speed);
    }
  });
  
  // 8. 3D Component demo (sphere)
  const demoSphere3D = componentFactory.create3DObject('demo-3d-sphere-container', {
    responsive: true,  // Same responsive sizing
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

  // 8.5. Drum_Selector_Engine (exact copy of drum wheel)
  const demoDrumSelector = componentFactory.createDrumSelector('demo-drum-selector-container', {
    responsive: true,  // Same responsive sizing
    geometry: 'cylinder',  // Cylinder (drum shape)
    geometryParams: {
      cylinderRadiusTop: 0.5,    // Radius 0.5 = diameter 1.0
      cylinderRadiusBottom: 0.5,  // Same top and bottom for uniform cylinder
      cylinderHeight: 1.0,        // Height 1.0
      cylinderRadialSegments: 32  // Smooth cylinder surface
    },
    texture: 'animated',  // Same animated texture
    enableInteraction: true,  // Same interaction capabilities
    rotationSpeed: 0  // Start with no rotation
  });
  
  console.log('[Demo] Drum_Selector_Engine initialized:', demoDrumSelector);
  
  // Create rotation speed slider for drum selector
  componentFactory.createSlider({
    containerId: 'demo-drum-selector-rotation-slider-container',
    sliderClass: 'demo-drum-selector-rotation-slider',
    options: [
      { text: 'Still', value: '0', position: 1, active: true, dataAttributes: 'data-value="0"' },
      { text: 'Slow', value: '0.25', position: 2, dataAttributes: 'data-value="0.25"' },
      { text: 'Normal', value: '0.5', position: 3, dataAttributes: 'data-value="0.5"' },
      { text: 'Fast', value: '0.75', position: 4, dataAttributes: 'data-value="0.75"' },
      { text: 'Wild!', value: '1', position: 5, dataAttributes: 'data-value="1"' }
    ]
  }, (selectedOption) => {
    const speed = parseFloat(selectedOption.getAttribute('data-value'));
    console.log('[Demo Drum Selector Rotation Speed] Selected:', speed);
    if (demoDrumSelector && demoDrumSelector.setRotationSpeed) {
      demoDrumSelector.setRotationSpeed(speed);
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
  
} catch (error) {
  console.error('[Engines Page] Error initializing components:', error);
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
    
    try {
    
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
    componentFactory.createButton('borders-toggle-button-container', {
      id: 'borders-toggle-button',
      text: 'Size Guides and Borders',
      value: 'toggle-borders',
      onClick: () => {
        // Call the global toggleBorders function from script.js
        if (window.toggleBorders) {
          window.toggleBorders();
          
          // Save the state - check if borders are currently hidden
          const siteContainer = document.querySelector('.site-container');
          const bordersHidden = siteContainer && siteContainer.classList.contains('borders-hidden');
          localStorage.setItem('showBorders', bordersHidden ? 'false' : 'true');
          console.log('[Borders Toggle] Borders are now:', bordersHidden ? 'hidden' : 'visible');
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
  initializeComponentEnginesDemos();
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
  } else if (pageName === 'settings') {
    // Call the settings initialization directly
    console.log('[main.js] Initializing settings components');
    initializeSettingsComponents();
  } else if (pageName === 'engines') {
    // Initialize engines view components
    console.log('[main.js] Initializing engines components');
    initializeEnginesViewComponents();
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
  if (hash.includes('engines-view')) return 'engines-view';
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
  
  // Initialize borders based on saved preference (default to true)
  const bordersEnabled = localStorage.getItem('showBorders') !== 'false';
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
