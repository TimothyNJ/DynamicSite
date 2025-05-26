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
      multiline: options.multiline || false,
      minHeight: options.minHeight || 'auto', // Start at natural single-line height
      maxHeight: options.maxHeight || '200px',
      storageKey: options.storageKey || null,
      ...options
    };
    
    this.changeHandler = changeHandler;
    this.element = null;
    this.wrapper = null;
    
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
    
    // Create wrapper div with minimal styling (like slider-container)
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'dynamic-input-wrapper';
    this.wrapper.style.cssText = `
      position: relative;
      width: 100%;
      margin: 5px 0;
      display: flex;
      justify-content: center;
    `;
    
    // Create the appropriate element based on options
    if (this.options.multiline || this.options.expandable) {
      this.element = document.createElement('textarea');
      this.element.rows = 1; // Single line to start
      this.element.style.cssText = `
        resize: none;
        overflow-y: hidden;
        line-height: 1.4;
        text-align: ${this.options.textAlign || 'left'};
      `;
      
      // Only set min-height if explicitly provided
      if (this.options.minHeight !== 'auto') {
        this.element.style.minHeight = this.options.minHeight;
      }
    } else {
      this.element = document.createElement('input');
      this.element.type = this.options.type;
      this.element.style.textAlign = this.options.textAlign || 'left';
    }
    
    // Common properties
    this.element.id = this.options.id;
    this.element.name = this.options.name;
    this.element.className = 'dynamic-text-input';
    this.element.placeholder = this.options.placeholder;
    this.element.value = this.options.value;
    
    // Apply minimal, slider-matching styles
    this.applyStyles();
    
    if (this.options.required) {
      this.element.required = true;
    }
    
    if (this.options.maxLength && !this.options.expandable) {
      this.element.maxLength = this.options.maxLength;
    }
    
    // Apply stored value if storage key provided
    if (this.options.storageKey) {
      this.applyStoredValue();
    }
    
    // Add event listeners
    this.attachEventListeners();
    
    // Add to wrapper and container
    this.wrapper.appendChild(this.element);
    containerEl.appendChild(this.wrapper);
    
    // Initial height adjustment for expandable inputs
    if (this.options.expandable) {
      setTimeout(() => this.adjustHeight(), 0);
    }
    
    console.log(`[text_input_component_engine] Rendered input:`, this.options.id);
    
    return this.element;
  }
  
  /**
   * Apply minimal styles matching slider aesthetic
   */
  applyStyles() {
    // Base styles matching slider components
    const baseStyles = `
      background: linear-gradient(
        -25deg,
        var(--light-slider-start) 0%,
        var(--light-slider-end) 100%
      );
      border: none;
      border-radius: 9999px;
      padding: 2px 16px;
      font-size: clamp(0.5rem, 1.2vw, 2.3rem);
      font-weight: bold;
      color: #ffffff;
      width: 100%;
      transition: box-shadow 0.3s ease, height 0.2s ease;
      font-family: inherit;
      outline: none;
      display: block;
    `;
    
    // Add dark theme support
    const darkThemeCheck = () => {
      if (document.body.getAttribute('data-theme') === 'dark') {
        this.element.style.background = `linear-gradient(
          -25deg,
          var(--dark-slider-start) 0%,
          var(--dark-slider-end) 100%
        )`;
      }
    };
    
    // Apply styles
    this.element.style.cssText += baseStyles;
    darkThemeCheck();
    
    // Watch for theme changes
    const observer = new MutationObserver(darkThemeCheck);
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
    
    // Hover and focus styles via dynamic style injection
    if (!document.getElementById('dynamic-input-styles')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'dynamic-input-styles';
      styleSheet.textContent = `
        /* Container wrapper for input */
        .dynamic-input-wrapper {
          position: relative;
          overflow: visible;
        }
        
        /* Border container for inputs */
        .dynamic-input-wrapper::before,
        .dynamic-input-wrapper::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(
            to right,
            var(--active-button-start),
            var(--active-button-end)
          );
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
        }
        
        .dynamic-input-wrapper::before {
          top: 0;
          border-radius: 9999px 9999px 0 0;
        }
        
        .dynamic-input-wrapper::after {
          bottom: 0;
          border-radius: 0 0 9999px 9999px;
        }
        
        /* Show borders on hover and focus */
        .dynamic-input-wrapper:hover::before,
        .dynamic-input-wrapper:hover::after,
        .dynamic-text-input:focus ~ .dynamic-input-wrapper::before,
        .dynamic-text-input:focus ~ .dynamic-input-wrapper::after {
          opacity: 1;
        }
        
        .dynamic-text-input:hover {
          box-shadow: 0 0 0 1px var(--active-button-start);
        }
        
        .dynamic-text-input:focus {
          box-shadow: 0 0 0 2px var(--active-button-start);
        }
        
        .dynamic-text-input::placeholder {
          color: rgba(255, 255, 255, 0.5);
          font-weight: normal;
        }
        
        body[data-theme="dark"] .dynamic-text-input {
          background: linear-gradient(
            -25deg,
            var(--dark-slider-start) 0%,
            var(--dark-slider-end) 100%
          );
        }
        
        /* Scrollbar styling for expandable inputs */
        .dynamic-text-input::-webkit-scrollbar {
          width: 4px;
        }
        
        .dynamic-text-input::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
        }
        
        .dynamic-text-input::-webkit-scrollbar-thumb {
          background: var(--active-button-start);
          border-radius: 2px;
        }
        
        /* Remove textarea resize handle */
        .dynamic-text-input {
          resize: none;
        }
      `;
      document.head.appendChild(styleSheet);
    }
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
   * Adjust height for expandable inputs
   */
  adjustHeight() {
    if (!this.element || this.element.tagName !== 'TEXTAREA') return;
    
    // Reset height to calculate new height
    this.element.style.height = 'auto';
    
    // Calculate new height based on content
    const scrollHeight = this.element.scrollHeight;
    const computedStyle = window.getComputedStyle(this.element);
    const lineHeight = parseFloat(computedStyle.lineHeight);
    
    // For auto min-height, use the natural single-line height
    let minHeight;
    if (this.options.minHeight === 'auto') {
      minHeight = lineHeight + parseFloat(computedStyle.paddingTop) + parseFloat(computedStyle.paddingBottom);
    } else {
      minHeight = parseInt(this.options.minHeight);
    }
    
    const maxHeight = parseInt(this.options.maxHeight);
    
    // Clamp height between min and max
    const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
    
    // Apply new height
    this.element.style.height = newHeight + 'px';
    
    // Show/hide scrollbar based on content
    if (scrollHeight > maxHeight) {
      this.element.style.overflowY = 'auto';
      this.element.style.borderRadius = '20px'; // Less rounded when scrolling
    } else {
      this.element.style.overflowY = 'hidden';
      this.element.style.borderRadius = '9999px'; // Fully rounded when not scrolling
    }
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
      
      // Adjust height if expandable
      if (this.options.expandable) {
        this.adjustHeight();
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
    if (this.wrapper && this.wrapper.parentNode) {
      this.wrapper.parentNode.removeChild(this.wrapper);
    }
    this.element = null;
    this.wrapper = null;
    console.log(`[text_input_component_engine] Destroyed:`, this.options.id);
  }
}

// Export for ES6 modules
export { text_input_component_engine };
