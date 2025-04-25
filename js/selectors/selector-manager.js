/**
 * Selector Manager
 *
 * Manages the initialization and lifecycle of all selectors.
 * Dynamically creates selectors based on configuration and page content.
 */
window.SelectorManager = (function() {
    // Store instances of created selectors
    const instances = new Map();
    
    // Initialize selectors based on configuration
    function initializeSelectors() {
      // Skip if configuration is not available
      if (!window.SelectorConfig) {
        console.error('Selector configuration not found');
        return;
      }
      
      // Skip if factory is not available
      if (!window.SelectorFactory) {
        console.error('Selector factory not found');
        return;
      }
      
      console.log('Initializing selectors from configuration...');
      
      // Process each selector configuration
      Object.entries(window.SelectorConfig).forEach(([key, config]) => {
        // Check if already initialized
        if (instances.has(key)) {
          return;
        }
        
        // Find container element
        const container = document.querySelector(`.${key}-container`);
        if (!container) {
          console.log(`Container for ${key} not found in the DOM, skipping`);
          return;
        }
        
        console.log(`Creating selector: ${key}`);
        
        // Determine selector class based on type
        let SelectorClass;
        
        switch (config.type) {
          case 'time-format':
            SelectorClass = window.TimeFormatSelector;
            break;
          case 'generic':
          default:
            SelectorClass = window.GenericSelector;
        }
        
        // Skip if class not available
        if (!SelectorClass) {
          console.error(`Selector class for type ${config.type} not found`);
          return;
        }
        
        // Register with factory
        const instance = window.SelectorFactory.register(
          config.name,
          SelectorClass,
          config.selector,
          config
        );
        
        // Store instance
        if (instance) {
          instances.set(key, instance);
        }
      });
    }
    
    // Generate HTML for all configured selectors
    function generateSelectorsHTML() {
      // Skip if configuration is not available
      if (!window.SelectorConfig) {
        return '';
      }
      
      let html = '';
      
      // Process each selector configuration
      Object.entries(window.SelectorConfig).forEach(([key, config]) => {
        // Skip if no GenericSelector class
        if (!window.GenericSelector) {
          return;
        }
        
        // Create temporary instance to generate HTML
        const temp = new window.GenericSelector(config.selector, config.name, config);
        
        // Add section HTML WITHOUT heading
        html += `
          <div class="settings-section">
            <div class="slider-container ${key}-container">
              ${temp.generateHTML()}
            </div>
          </div>
        `;
      });
      
      return html;
    }
    
    // Public API
    return {
      init: initializeSelectors,
      generateHTML: generateSelectorsHTML,
      getInstance: (name) => instances.get(name)
    };
  })();
  
  // Listen for page load to initialize selectors
  document.addEventListener('pageLoaded', function(event) {
    if (event.detail && event.detail.pageName === 'settings') {
      // Wait for core modules to load
      setTimeout(() => {
        window.SelectorManager.init();
      }, 100);
    }
  });