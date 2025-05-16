/**
 * GenericSelector Component
 *
 * This class extends SelectorBase to create a universal selector component
 * that can be configured to replace any hardcoded slider-type selector
 * from the main branch (theme, time format, etc.)
 */
class GenericSelector extends SelectorBase {
  /**
   * Create a new generic selector
   * @param {Object} config - Configuration object
   * @param {string} config.name - Unique identifier for this selector
   * @param {Array} config.options - Array of values for selector options
   * @param {Array} [config.labels] - Display labels for options (defaults to options)
   * @param {string} [config.defaultValue] - Default selected value
   * @param {string} [config.storageKey] - localStorage key for persistence
   * @param {string} [config.container] - CSS selector for container element
   * @param {Function} [config.onValueChange] - Callback when value changes
   * @param {Object} [config.extraOptions] - Additional options passed to parent
   */
  constructor(config) {
    // Validate required configuration
    if (!config || !config.name) {
      throw new Error('GenericSelector requires a name in config');
    }
    
    if (!config.options || !Array.isArray(config.options) || config.options.length === 0) {
      throw new Error('GenericSelector requires a non-empty options array in config');
    }
    
    // Generate container selector if not provided
    const containerSelector = config.container || `.${config.name}-selection`;
    
    // Prepare options for parent constructor
    const parentOptions = {
      values: config.options,
      labels: config.labels || config.options,
      defaultValue: config.defaultValue || config.options[0],
      storageKey: config.storageKey || `user${config.name.charAt(0).toUpperCase() + config.name.slice(1)}Preference`,
      ...config.extraOptions
    };
    
    // Call parent constructor with proper parameters
    super(containerSelector, config.name, parentOptions);
    
    // Store callback for value changes
    this.onValueChange = config.onValueChange;
    
    // Log creation for debugging
    this.log(`GenericSelector created for: ${config.name}`);
  }
  
  /**
   * Override applyPreference to add custom behavior
   * @param {string} value - The value to apply
   */
  applyPreference(value) {
    // Call parent method to handle standard behavior
    super.applyPreference(value);
    
    // Execute custom callback if provided
    if (this.onValueChange && typeof this.onValueChange === 'function') {
      try {
        this.log(`Executing custom callback for value: ${value}`);
        this.onValueChange(value);
      } catch (error) {
        this.error(`Error in onValueChange callback:`, error);
      }
    }
  }
  
  /**
   * Initialize the component
   * Override to add extra logging
   * @returns {Promise<boolean>} - Success status
   */
  async init() {
    this.log(`Initializing GenericSelector: ${this.name}`);
    
    // Call parent initialization
    const result = await super.init();
    
    if (result) {
      this.log(`GenericSelector successfully initialized: ${this.name}`);
    } else {
      this.error(`Failed to initialize GenericSelector: ${this.name}`);
    }
    
    return result;
  }
  
  /**
   * Get current configuration for debugging
   * @returns {Object} - Current configuration summary
   */
  getConfig() {
    return {
      name: this.name,
      containerSelector: this.containerSelector,
      values: this.options.values,
      labels: this.options.labels,
      defaultValue: this.options.defaultValue,
      storageKey: this.options.storageKey,
      currentValue: this.currentValue,
      isInitialized: this.isInitialized
    };
  }
  
  /**
   * Manually set value (useful for programmatic control)
   * @param {string} value - Value to set
   * @param {boolean} [skipCallback=false] - Whether to skip the callback
   * @returns {boolean} - Success status
   */
  setValue(value, skipCallback = false) {
    // Check if value is valid
    if (!this.options.values.includes(value)) {
      this.error(`Invalid value '${value}' for ${this.name}. Valid values:`, this.options.values);
      return false;
    }
    
    // Skip callback temporarily if requested
    const originalCallback = this.onValueChange;
    if (skipCallback) {
      this.onValueChange = null;
    }
    
    // Set the active option
    const result = this.setActiveOption(value);
    
    // Restore callback
    if (skipCallback) {
      this.onValueChange = originalCallback;
    }
    
    return result !== null;
  }
}

// Make globally available
window.GenericSelector = GenericSelector;

// Also add to a namespace for organized access
if (!window.Components) {
  window.Components = {};
}
window.Components.GenericSelector = GenericSelector;
