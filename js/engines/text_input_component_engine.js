/**
 * text_input_component_engine.js
 * 
 * Engine for creating consistent text input components that match
 * the DynamicSite design language. Handles dynamic expansion,
 * localStorage persistence, and consistent styling.
 * 
 * Date: 22-May-2025
 * Deployment Timestamp: [TO BE UPDATED ON DEPLOYMENT]
 */

class text_input_component_engine {
  constructor(options = {}, changeHandler = null) {
    // Default options
    this.options = {
      id: options.id || `input-${Date.now()}`,
      name: options.name || 'input',
      placeholder: options.placeholder || 'Enter text',
      value: options.value || '',
      type: options.type || 'text',
      required: options.required || false,
      maxLength: options.maxLength || null,
      expandable: options.expandable !== false,
      storageKey: options.storageKey || null,
      ...options
    };
    
    this.changeHandler = changeHandler;
    this.element = null;
    
    console.log(`[text_input_component_engine] Initialized with options:`, this.options);
  }
  
  /**
   * Render the text input into the specified container
   * @param {string|HTMLElement} container - Container ID or element
   * @returns {HTMLElement} The created input element
   */
  render(container) {
    // Get container element
    const containerEl = typeof container === 'string' 
      ? document.getElementById(container)
      : container;
      
    if (!containerEl) {
      console.error(`[text_input_component_engine] Container not found:`, container);
      return null;
    }
    
    // Create wrapper div
    const wrapper = document.createElement('div');
    wrapper.className = 'form-field';
    
    // Create input element
    this.element = document.createElement('input');
    this.element.type = this.options.type;
    this.element.id = this.options.id;
    this.element.name = this.options.name;
    this.element.className = 'text-input';
    this.element.placeholder = this.options.placeholder;
    this.element.value = this.options.value;
    
    if (this.options.required) {
      this.element.required = true;
    }
    
    if (this.options.maxLength) {
      this.element.maxLength = this.options.maxLength;
    }
    
    // Apply stored value if storage key provided
    if (this.options.storageKey) {
      this.applyStoredValue();
    }
    
    // Add event listeners
    this.attachEventListeners();
    
    // Add to wrapper and container
    wrapper.appendChild(this.element);
    containerEl.appendChild(wrapper);
    
    console.log(`[text_input_component_engine] Rendered input:`, this.options.id);
    
    return this.element;
  }
  
  /**
   * Apply stored value from localStorage
   */
  applyStoredValue() {
    if (!this.options.storageKey) return;
    
    const storedValue = localStorage.getItem(this.options.storageKey);
    if (storedValue !== null) {
      this.element.value = storedValue;
      this.options.value = storedValue;
      console.log(`[text_input_component_engine] Applied stored value:`, storedValue);
    }
  }
  
  /**
   * Attach event listeners to the input
   */
  attachEventListeners() {
    // Handle input changes
    this.element.addEventListener('input', (e) => {
      const value = e.target.value;
      this.options.value = value;
      
      // Save to localStorage if storage key provided
      if (this.options.storageKey) {
        localStorage.setItem(this.options.storageKey, value);
      }
      
      // Call change handler if provided
      if (this.changeHandler) {
        this.changeHandler(value, this.options.id);
      }
      
      // Handle expandable behavior
      if (this.options.expandable) {
        this.adjustHeight();
      }
    });
    
    // Handle focus/blur for visual feedback
    this.element.addEventListener('focus', () => {
      console.log(`[text_input_component_engine] Input focused:`, this.options.id);
    });
    
    this.element.addEventListener('blur', () => {
      console.log(`[text_input_component_engine] Input blurred:`, this.options.id);
    });
  }
  
  /**
   * Adjust height for expandable inputs (future feature)
   */
  adjustHeight() {
    // TODO: Implement dynamic height adjustment for textarea-like behavior
    // For now, standard inputs don't expand
  }
  
  /**
   * Get current value
   * @returns {string} Current input value
   */
  getValue() {
    return this.element ? this.element.value : this.options.value;
  }
  
  /**
   * Set value programmatically
   * @param {string} value - New value
   */
  setValue(value) {
    if (this.element) {
      this.element.value = value;
      this.options.value = value;
      
      // Save to localStorage if storage key provided
      if (this.options.storageKey) {
        localStorage.setItem(this.options.storageKey, value);
      }
      
      // Trigger change handler
      if (this.changeHandler) {
        this.changeHandler(value, this.options.id);
      }
    }
  }
  
  /**
   * Enable the input
   */
  enable() {
    if (this.element) {
      this.element.disabled = false;
    }
  }
  
  /**
   * Disable the input
   */
  disable() {
    if (this.element) {
      this.element.disabled = true;
    }
  }
  
  /**
   * Destroy the component and clean up
   */
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.remove();
    }
    this.element = null;
    console.log(`[text_input_component_engine] Destroyed:`, this.options.id);
  }
}

// Export for ES6 modules
export { text_input_component_engine };

console.log('[text_input_component_engine] Engine class loaded as ES6 module');
