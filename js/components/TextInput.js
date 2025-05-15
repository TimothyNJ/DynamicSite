/**
 * TextInput Component
 *
 * This class extends InputBase to create a universal text input component
 * that can be configured to replace any hardcoded text input from the main branch
 * (firstName, lastName, nickname, etc.)
 */
class TextInput extends InputBase {
  /**
   * Create a new generic text input
   * @param {Object} config - Configuration object
   * @param {string} config.id - HTML id attribute for the input
   * @param {string} [config.name] - Name for the input (defaults to id)
   * @param {string} [config.type='text'] - Input type (text, email, password, etc.)
   * @param {string} [config.placeholder=''] - Placeholder text
   * @param {boolean} [config.required=false] - Whether input is required
   * @param {string} [config.storageKey] - localStorage key (auto-generated if not provided)
   * @param {Function} [config.onValueChange] - Callback when value changes
   * @param {Function} [config.validator] - Custom validation function
   * @param {Object} [config.extraOptions] - Additional options passed to parent
   */
  constructor(config) {
    // Validate required configuration
    if (!config || !config.id) {
      throw new Error('TextInput requires an id in config');
    }
    
    // Prepare options for parent constructor
    const inputName = config.name || config.id;
    const parentOptions = {
      type: config.type || 'text',
      placeholder: config.placeholder || '',
      required: config.required || false,
      storageKey: config.storageKey || `user${config.id.charAt(0).toUpperCase() + config.id.slice(1)}`,
      ...config.extraOptions
    };
    
    // Call parent constructor (id, name, options)
    super(config.id, inputName, parentOptions);
    
    // Store additional configuration
    this.onValueChange = config.onValueChange;
    this.validator = config.validator;
    
    // Log creation for debugging
    console.log(`TextInput created for: ${config.id}`);
  }
  
  /**
   * Initialize the input
   * Override to add extra functionality
   * @returns {boolean} - Success status
   */
  init() {
    console.log(`Initializing TextInput: ${this.id}`);
    
    // Call parent initialization
    const result = super.init();
    
    if (result) {
      // Add additional event listeners
      this.setupAdditionalEvents();
      console.log(`TextInput successfully initialized: ${this.id}`);
    } else {
      console.error(`Failed to initialize TextInput: ${this.id}`);
    }
    
    return result;
  }
  
  /**
   * Set up additional event listeners
   */
  setupAdditionalEvents() {
    if (!this.element) return;
    
    // Add real-time validation on input
    this.element.addEventListener('input', (event) => {
      this.handleRealtimeValidation(event.target.value);
    });
    
    // Add focus/blur events for additional styling
    this.element.addEventListener('focus', () => {
      this.element.parentElement?.classList.add('focused');
    });
    
    this.element.addEventListener('blur', () => {
      this.element.parentElement?.classList.remove('focused');
    });
  }
  
  /**
   * Handle change event with custom callback
   * Override parent method to add custom behavior
   * @param {Event} event - Change event
   */
  handleChange(event) {
    const value = event.target.value;
    
    // Perform validation if validator is provided
    if (this.validator && typeof this.validator === 'function') {
      const validationResult = this.validator(value);
      if (!validationResult.isValid) {
        console.warn(`Validation failed for ${this.id}:`, validationResult.message);
        // Could add visual feedback here
        return;
      }
    }
    
    // Call parent method to save value
    super.handleChange(event);
    
    // Execute custom callback if provided
    if (this.onValueChange && typeof this.onValueChange === 'function') {
      try {
        console.log(`Executing custom callback for ${this.id} with value: ${value}`);
        this.onValueChange(value, this);
      } catch (error) {
        console.error(`Error in onValueChange callback for ${this.id}:`, error);
      }
    }
  }
  
  /**
   * Handle real-time validation (on input, not just change)
   * @param {string} value - Current input value
   */
  handleRealtimeValidation(value) {
    if (this.validator && typeof this.validator === 'function') {
      const result = this.validator(value);
      
      // Add/remove validation classes
      if (this.element) {
        this.element.classList.toggle('invalid', !result.isValid);
        this.element.classList.toggle('valid', result.isValid && value.length > 0);
      }
    }
  }
  
  /**
   * Get current configuration for debugging
   * @returns {Object} - Current configuration summary
   */
  getConfig() {
    return {
      id: this.id,
      name: this.name,
      type: this.options.type,
      placeholder: this.options.placeholder,
      required: this.options.required,
      storageKey: this.options.storageKey,
      currentValue: this.getValue(),
      isInitialized: !!this.element
    };
  }
  
  /**
   * Set value programmatically
   * @param {string} value - Value to set
   * @param {boolean} [skipCallback=false] - Whether to skip the callback
   * @returns {boolean} - Success status
   */
  setValue(value, skipCallback = false) {
    if (!this.element) {
      console.error(`Cannot setValue on ${this.id}: element not initialized`);
      return false;
    }
    
    // Validate if validator is present
    if (this.validator && typeof this.validator === 'function') {
      const validationResult = this.validator(value);
      if (!validationResult.isValid) {
        console.error(`Cannot setValue on ${this.id}: validation failed`, validationResult.message);
        return false;
      }
    }
    
    // Skip callback temporarily if requested
    const originalCallback = this.onValueChange;
    if (skipCallback) {
      this.onValueChange = null;
    }
    
    // Set the value
    super.setValue(value);
    
    // Save to localStorage
    this.saveValue(value);
    
    // Restore callback
    if (skipCallback) {
      this.onValueChange = originalCallback;
    }
    
    console.log(`Value set for ${this.id}: ${value}`);
    return true;
  }
  
  /**
   * Create validation function for common patterns
   * @param {string} type - Type of validation ('email', 'phone', 'required', etc.)
   * @returns {Function} - Validation function
   */
  static createValidator(type) {
    const validators = {
      required: (value) => ({
        isValid: value.trim().length > 0,
        message: 'This field is required'
      }),
      
      email: (value) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return {
          isValid: !value || emailRegex.test(value),
          message: 'Please enter a valid email address'
        };
      },
      
      phone: (value) => {
        const phoneRegex = /^[\d\s\-\+\(\)]+$/;
        return {
          isValid: !value || (phoneRegex.test(value) && value.length >= 10),
          message: 'Please enter a valid phone number'
        };
      },
      
      nickname: (value) => ({
        isValid: !value || value.length <= 50,
        message: 'Nickname must be 50 characters or less'
      })
    };
    
    return validators[type] || validators.required;
  }
}

// Make globally available
window.TextInput = TextInput;

// Also add to components namespace
if (!window.Components) {
  window.Components = {};
}
window.Components.TextInput = TextInput;
