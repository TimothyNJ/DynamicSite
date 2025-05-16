/**
 * ComponentFactory
 *
 * A factory system for registering, creating, and managing GenericSelector
 * and TextInput components. This enables easy configuration and initialization
 * of components that replace hardcoded main branch UI elements.
 */
class ComponentFactory {
  // Static storage for registered components
  static components = {
    selector: new Map(),
    input: new Map()
  };
  
  // Track initialized components for cleanup
  static instances = {
    selectors: new Map(),
    inputs: new Map()
  };
  
  // Debug mode for extra logging
  static debug = false;
  
  /**
   * Register a selector configuration
   * @param {string} name - Unique name for the selector
   * @param {Object} config - Configuration object for GenericSelector
   * @param {Array} config.options - Array of option values
   * @param {Array} [config.labels] - Display labels for options
   * @param {string} [config.defaultValue] - Default selected value
   * @param {string} [config.storageKey] - localStorage key
   * @param {string} [config.container] - CSS selector for container
   * @param {Function} [config.onValueChange] - Callback function
   * @returns {boolean} - Success status
   */
  static registerSelector(name, config) {
    try {
      // Validate required parameters
      if (!name || typeof name !== 'string') {
        throw new Error('Selector name must be a non-empty string');
      }
      
      if (!config || !config.options || !Array.isArray(config.options)) {
        throw new Error('Selector config must include an options array');
      }
      
      // Check for duplicate registration
      if (this.components.selector.has(name)) {
        console.warn(`Selector '${name}' is already registered, overwriting...`);
      }
      
      // Store the configuration with name
      const fullConfig = { name, ...config };
      this.components.selector.set(name, fullConfig);
      
      if (this.debug) {
        console.log(`Registered selector: ${name}`, fullConfig);
      }
      
      return true;
    } catch (error) {
      console.error(`Failed to register selector '${name}':`, error);
      return false;
    }
  }
  
  /**
   * Register an input configuration
   * @param {string} name - Unique name for the input
   * @param {Object} config - Configuration object for TextInput
   * @param {string} config.id - HTML id for the input
   * @param {string} [config.type='text'] - Input type
   * @param {string} [config.placeholder=''] - Placeholder text
   * @param {boolean} [config.required=false] - Whether required
   * @param {string} [config.storageKey] - localStorage key
   * @param {Function} [config.onValueChange] - Callback function
   * @param {Function} [config.validator] - Validation function
   * @returns {boolean} - Success status
   */
  static registerInput(name, config) {
    try {
      // Validate required parameters
      if (!name || typeof name !== 'string') {
        throw new Error('Input name must be a non-empty string');
      }
      
      if (!config || !config.id) {
        throw new Error('Input config must include an id');
      }
      
      // Check for duplicate registration
      if (this.components.input.has(name)) {
        console.warn(`Input '${name}' is already registered, overwriting...`);
      }
      
      // Store the configuration with name
      const fullConfig = { name, ...config };
      this.components.input.set(name, fullConfig);
      
      if (this.debug) {
        console.log(`Registered input: ${name}`, fullConfig);
      }
      
      return true;
    } catch (error) {
      console.error(`Failed to register input '${name}':`, error);
      return false;
    }
  }
  
  /**
   * Create a selector instance from registered configuration
   * @param {string} name - Name of registered selector
   * @returns {GenericSelector|null} - Created selector instance or null
   */
  static createSelector(name) {
    try {
      const config = this.components.selector.get(name);
      if (!config) {
        throw new Error(`Selector '${name}' not registered`);
      }
      
      // Ensure GenericSelector is available
      if (typeof window.GenericSelector !== 'function') {
        throw new Error('GenericSelector class not available');
      }
      
      // Create the instance
      const instance = new window.GenericSelector(config);
      
      // Store reference for management
      this.instances.selectors.set(name, instance);
      
      if (this.debug) {
        console.log(`Created selector: ${name}`);
      }
      
      return instance;
    } catch (error) {
      console.error(`Failed to create selector '${name}':`, error);
      return null;
    }
  }
  
  /**
   * Create an input instance from registered configuration
   * @param {string} name - Name of registered input
   * @returns {TextInput|null} - Created input instance or null
   */
  static createInput(name) {
    try {
      const config = this.components.input.get(name);
      if (!config) {
        throw new Error(`Input '${name}' not registered`);
      }
      
      // Ensure TextInput is available
      if (typeof window.TextInput !== 'function') {
        throw new Error('TextInput class not available');
      }
      
      // Create the instance
      const instance = new window.TextInput(config);
      
      // Store reference for management
      this.instances.inputs.set(name, instance);
      
      if (this.debug) {
        console.log(`Created input: ${name}`);
      }
      
      return instance;
    } catch (error) {
      console.error(`Failed to create input '${name}':`, error);
      return null;
    }
  }
  
  /**
   * Initialize all registered components
   * @param {Object} [options] - Initialization options
   * @param {boolean} [options.skipSelectors=false] - Skip selector initialization
   * @param {boolean} [options.skipInputs=false] - Skip input initialization
   * @param {number} [options.delay=0] - Delay before initialization (ms)
   * @returns {Promise<Object>} - Results of initialization
   */
  static async initializeAll(options = {}) {
    const {
      skipSelectors = false,
      skipInputs = false,
      delay = 0
    } = options;
    
    // Add delay if requested
    if (delay > 0) {
      console.log(`Waiting ${delay}ms before initialization...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    console.log('Initializing all registered components...');
    
    const results = {
      selectors: { success: 0, failed: 0, errors: [] },
      inputs: { success: 0, failed: 0, errors: [] }
    };
    
    // Initialize selectors
    if (!skipSelectors) {
      console.log(`Initializing ${this.components.selector.size} selectors...`);
      
      for (const [name, config] of this.components.selector) {
        try {
          console.log(`Initializing selector: ${name}`);
          
          const instance = this.createSelector(name);
          if (instance && await instance.init()) {
            results.selectors.success++;
            console.log(`✅ Selector '${name}' initialized successfully`);
          } else {
            results.selectors.failed++;
            const error = `Failed to initialize selector '${name}'`;
            results.selectors.errors.push(error);
            console.error(`❌ ${error}`);
          }
        } catch (error) {
          results.selectors.failed++;
          const errorMsg = `Error initializing selector '${name}': ${error.message}`;
          results.selectors.errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }
    }
    
    // Initialize inputs
    if (!skipInputs) {
      console.log(`Initializing ${this.components.input.size} inputs...`);
      
      for (const [name, config] of this.components.input) {
        try {
          console.log(`Initializing input: ${name}`);
          
          const instance = this.createInput(name);
          if (instance && instance.init()) {
            results.inputs.success++;
            console.log(`✅ Input '${name}' initialized successfully`);
          } else {
            results.inputs.failed++;
            const error = `Failed to initialize input '${name}'`;
            results.inputs.errors.push(error);
            console.error(`❌ ${error}`);
          }
        } catch (error) {
          results.inputs.failed++;
          const errorMsg = `Error initializing input '${name}': ${error.message}`;
          results.inputs.errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }
    }
    
    // Summary
    console.log('Initialization complete:', results);
    
    return results;
  }
  
  /**
   * Get a created instance by name
   * @param {string} type - 'selector' or 'input'
   * @param {string} name - Name of the component
   * @returns {GenericSelector|TextInput|null} - The instance or null
   */
  static getInstance(type, name) {
    if (type === 'selector') {
      return this.instances.selectors.get(name) || null;
    } else if (type === 'input') {
      return this.instances.inputs.get(name) || null;
    }
    return null;
  }
  
  /**
   * Get all registered configurations
   * @returns {Object} - All registered configurations
   */
  static getRegistered() {
    return {
      selectors: Array.from(this.components.selector.entries()),
      inputs: Array.from(this.components.input.entries())
    };
  }
  
  /**
   * Clear all registrations and instances
   * @param {boolean} [destroyInstances=true] - Whether to destroy component instances
   */
  static clear(destroyInstances = true) {
    if (destroyInstances) {
      // Destroy selector instances if they have a destroy method
      this.instances.selectors.forEach((instance, name) => {
        if (typeof instance.destroy === 'function') {
          instance.destroy();
        }
      });
      
      // Destroy input instances if they have a destroy method
      this.instances.inputs.forEach((instance, name) => {
        if (typeof instance.destroy === 'function') {
          instance.destroy();
        }
      });
    }
    
    // Clear registrations
    this.components.selector.clear();
    this.components.input.clear();
    
    // Clear instances
    this.instances.selectors.clear();
    this.instances.inputs.clear();
    
    console.log('ComponentFactory cleared');
  }
  
  /**
   * Enable/disable debug mode
   * @param {boolean} enabled - Whether to enable debug mode
   */
  static setDebug(enabled) {
    this.debug = !!enabled;
    console.log(`ComponentFactory debug mode: ${this.debug ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Get factory statistics
   * @returns {Object} - Factory statistics
   */
  static getStats() {
    return {
      registered: {
        selectors: this.components.selector.size,
        inputs: this.components.input.size
      },
      instances: {
        selectors: this.instances.selectors.size,
        inputs: this.instances.inputs.size
      },
      debug: this.debug
    };
  }
}

// Make globally available
window.ComponentFactory = ComponentFactory;

// Also add to components namespace
if (!window.Components) {
  window.Components = {};
}
window.Components.Factory = ComponentFactory;

// Initialize debug mode based on URL parameter or localStorage
if (window.location.search.includes('debug=true') || localStorage.getItem('componentDebug') === 'true') {
  ComponentFactory.setDebug(true);
}
