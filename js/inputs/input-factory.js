/**
 * Input Factory
 *
 * Manages the creation and lifecycle of input fields.
 */
window.InputFactory = (function() {
    // Private registry of registered inputs
    const inputs = new Map();
  
    // Flag to track initialization
    let initialized = false;
  
    /**
     * Register a new input field
     * @param {string} id - Input ID
     * @param {string} name - Input name
     * @param {Object} options - Input options
     * @returns {InputBase} - The created input instance
     */
    function registerInput(id, name, options = {}) {
      // Create instance
      const instance = new InputBase(id, name, options);
      
      // Store in registry
      inputs.set(id, {
        instance,
        initialized: false
      });
      
      return instance;
    }
  
    /**
     * Initialize all registered inputs
     * @returns {boolean} - Success status
     */
    function initializeAll() {
      if (initialized) {
        return true;
      }
      
      let allSucceeded = true;
      
      inputs.forEach((input, id) => {
        if (!input.initialized) {
          const success = input.instance.init();
          input.initialized = success;
          if (!success) {
            allSucceeded = false;
          }
        }
      });
      
      initialized = allSucceeded;
      return allSucceeded;
    }
  
    /**
     * Reset initialization state
     */
    function resetInitialization() {
      initialized = false;
      inputs.forEach(input => {
        input.initialized = false;
      });
    }
  
    /**
     * Get a registered input by ID
     * @param {string} id - The input ID
     * @returns {InputBase} - The input instance
     */
    function getInput(id) {
      const input = inputs.get(id);
      return input ? input.instance : null;
    }
  
    // Initialize on page load
    document.addEventListener("pageLoaded", function(event) {
      if (event.detail && event.detail.pageName === "settings") {
        setTimeout(initializeAll, 100);
      } else {
        resetInitialization();
      }
    });
  
    // Also check on hash change
    window.addEventListener("hashchange", function() {
      if (window.location.hash === "#settings") {
        setTimeout(initializeAll, 100);
      } else {
        resetInitialization();
      }
    });
  
    // Public API
    return {
      register: registerInput,
      initializeAll: initializeAll,
      getInput: getInput,
      getRegistry: () => new Map(inputs)
    };
  })();