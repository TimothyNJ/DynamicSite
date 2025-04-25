/**
 * Input Manager
 *
 * Manages the creation and HTML generation for input fields.
 */
window.InputManager = (function() {
    // Initialize inputs based on configuration
    function initializeInputs() {
      // Skip if configuration is not available
      if (!window.InputConfig) {
        console.error('Input configuration not found');
        return;
      }
      
      // Skip if factory is not available
      if (!window.InputFactory) {
        console.error('Input factory not found');
        return;
      }
      
      console.log('Initializing inputs from configuration...');
      
      // Process each input configuration
      Object.entries(window.InputConfig).forEach(([key, config]) => {
        // Register with factory
        window.InputFactory.register(
          config.id,
          config.name,
          config
        );
      });
      
      // Initialize all inputs
      window.InputFactory.initializeAll();
    }
    
    // Generate HTML for all configured inputs
    function generateInputsHTML() {
      // Skip if configuration is not available
      if (!window.InputConfig) {
        return '';
      }
      
      let html = '<div class="form-container">';
      
      // Process each input configuration
      Object.entries(window.InputConfig).forEach(([key, config]) => {
        // Add form field (without label)
        html += `
          <div class="form-field">
            <input
              type="${config.type || 'text'}"
              id="${config.id}"
              name="${config.name}"
              class="text-input"
              placeholder="${config.placeholder}"
              ${config.required ? 'required' : ''}
            />
          </div>
        `;
      });
      
      html += '</div>';
      return html;
    }
    
    // Public API
    return {
      init: initializeInputs,
      generateHTML: generateInputsHTML
    };
  })();
  
  // Listen for page load to initialize inputs
  document.addEventListener('pageLoaded', function(event) {
    if (event.detail && event.detail.pageName === 'settings') {
      // Wait for core modules to load
      setTimeout(() => {
        window.InputManager.init();
      }, 100);
    }
  });