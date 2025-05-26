/**
 * component-loader.js
 * 
 * Dynamic ES6 module loader for component system.
 * Handles on-demand loading of component engines and factory.
 * 
 * Date: 22-May-2025 20:10
 * Deployment Timestamp: 20250522201023
 */

console.log('[component-loader] Component loader initializing');

// Page to component mapping
const pageComponents = {
  'settings': ['ComponentFactory']
};

// Component module paths
const componentPaths = {
  'ComponentFactory': '/js/factory/ComponentFactory.js',
  'slider_component_engine': '/js/engines/slider_component_engine.js'
};

/**
 * Load required components for a specific page
 * @param {string} pageName - Name of the page
 * @returns {Promise<Object>} Loaded component modules
 */
async function loadPageComponents(pageName) {
  console.log(`[component-loader] Loading components for page: ${pageName}`);
  
  const requiredComponents = pageComponents[pageName] || [];
  const loadedModules = {};
  
  for (const componentName of requiredComponents) {
    const path = componentPaths[componentName];
    if (path) {
      try {
        console.log(`[component-loader] Loading module: ${componentName} from ${path}`);
        const module = await import(path);
        loadedModules[componentName] = module;
        console.log(`[component-loader] Successfully loaded: ${componentName}`);
      } catch (error) {
        console.error(`[component-loader] Failed to load ${componentName}:`, error);
      }
    }
  }
  
  return loadedModules;
}

/**
 * Initialize components after page load
 * @param {string} pageName - Name of the page
 */
async function initializeComponents(pageName) {
  console.log(`[component-loader] Initializing components for: ${pageName}`);
  
  try {
    const modules = await loadPageComponents(pageName);
    
    // Special handling for ComponentFactory
    if (modules.ComponentFactory) {
      const { componentFactory } = modules.ComponentFactory;
      
      // Make factory available globally for backward compatibility
      window.componentFactory = componentFactory;
      
      console.log('[component-loader] ComponentFactory available as window.componentFactory');
      
      // Auto-initialize if containers exist
      if (document.getElementById('test1-container') || document.getElementById('test2-container')) {
        console.log('[component-loader] Test containers found, initializing test sliders');
        
        // Initialize test sliders
        setTimeout(() => {
          initializeTestSliders(componentFactory);
        }, 100);
      }
    }
    
    console.log('[component-loader] Component initialization complete');
  } catch (error) {
    console.error('[component-loader] Error during initialization:', error);
  }
}

/**
 * Initialize test sliders for verification
 * @param {Object} factory - ComponentFactory instance
 */
function initializeTestSliders(factory) {
  console.log('[component-loader] Initializing test sliders');
  
  // Test1: Engine Theme Selector
  const test1Container = document.getElementById('test1-container');
  if (test1Container) {
    console.log('[component-loader] Creating test1 theme selector');
    const test1Slider = factory.createThemeSelector('test1-container');
    if (test1Slider) {
      console.log('[component-loader] Test1 theme selector created successfully');
    } else {
      console.error('[component-loader] Failed to create test1 theme selector');
    }
  }
  
  // Test2: Engine Time Format Selector
  const test2Container = document.getElementById('test2-container');
  if (test2Container) {
    console.log('[component-loader] Creating test2 time format selector');
    const test2Slider = factory.createTimeFormatSelector('test2-container');
    if (test2Slider) {
      console.log('[component-loader] Test2 time format selector created successfully');
    } else {
      console.error('[component-loader] Failed to create test2 time format selector');
    }
  }
  
  console.log('[component-loader] Test slider initialization complete');
}

// Export for use in pages
export { initializeComponents, loadPageComponents };

console.log('[component-loader] Component loader ready');
