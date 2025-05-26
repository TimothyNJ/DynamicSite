/**
 * button_component_engine.js
 * 
 * Engine for creating consistent button components that match
 * the DynamicSite design language. Buttons are styled like
 * single-option sliders for visual consistency.
 * 
 * Date: 22-May-2025
 * Deployment Timestamp: [TO BE UPDATED ON DEPLOYMENT]
 */

class button_component_engine {
  constructor(options = {}, clickHandler = null) {
    // Default options
    this.options = {
      id: options.id || `button-${Date.now()}`,
      text: options.text || 'Button',
      value: options.value || options.text || 'button',
      type: options.type || 'primary', // primary, secondary, danger
      size: options.size || 'medium', // small, medium, large
      disabled: options.disabled || false,
      active: options.active || false,
      icon: options.icon || null,
      ...options
    };
    
    this.clickHandler = clickHandler;
    this.element = null;
    this.container = null;
    
    console.log(`[button_component_engine] Initialized with options:`, this.options);
  }
  
  /**
   * Render the button into the specified container
   * @param {string|HTMLElement} container - Container ID or element
   * @returns {HTMLElement} The created button element
   */
  render(container) {
    // Get container element
    const containerEl = typeof container === 'string' 
      ? document.getElementById(container)
      : container;
      
    if (!containerEl) {
      console.error(`[button_component_engine] Container not found:`, container);
      return null;
    }
    
    // Create button container (like slider container)
    this.container = document.createElement('div');
    this.container.className = 'button-container';
    this.container.style.cssText = `
      display: flex;
      justify-content: center;
      margin: 5px 0;
    `;
    
    // Create button element (styled like a single-option slider)
    this.element = document.createElement('div');
    this.element.className = 'button-selector';
    this.element.id = this.options.id;
    
    // Apply slider-like styles
    this.applyStyles();
    
    // Create inner structure matching slider
    this.element.innerHTML = `
      <div class="border-container">
        <div class="border-segment border-top"></div>
        <div class="border-segment border-bottom"></div>
      </div>
      <div class="button-background"></div>
      <div class="button-content">
        ${this.options.icon ? `<span class="button-icon">${this.options.icon}</span>` : ''}
        <h3>${this.options.text}</h3>
      </div>
    `;
    
    // Add event listeners
    this.attachEventListeners();
    
    // Add to container
    this.container.appendChild(this.element);
    containerEl.appendChild(this.container);
    
    // Set initial state
    if (this.options.active) {
      this.setActive(true);
    }
    
    if (this.options.disabled) {
      this.disable();
    }
    
    console.log(`[button_component_engine] Rendered button:`, this.options.id);
    
    return this.element;
  }
  
  /**
   * Apply slider-matching styles to button
   */
  applyStyles() {
    // Base styles matching slider selector
    const baseStyles = `
      display: inline-flex;
      position: relative;
      height: auto;
      border-radius: 9999px;
      background: linear-gradient(
        -25deg,
        var(--light-slider-start) 0%,
        var(--light-slider-end) 100%
      );
      overflow: visible;
      padding: 0;
      cursor: pointer;
      transition: all 0.3s ease;
    `;
    
    this.element.style.cssText = baseStyles;
    
    // Add dynamic styles
    if (!document.getElementById('button-engine-styles')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'button-engine-styles';
      styleSheet.textContent = `
        /* Dark theme support */
        body[data-theme="dark"] .button-selector {
          background: linear-gradient(
            -25deg,
            var(--dark-slider-start) 0%,
            var(--dark-slider-end) 100%
          );
        }
        
        /* Border container */
        .button-selector .border-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 1;
          clip-path: inset(0 0 0 0 round 9999px);
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        
        /* Show borders on hover and active */
        .button-selector:hover .border-container,
        .button-selector.active .border-container {
          opacity: 1;
        }
        
        /* Border segments */
        .button-selector .border-segment {
          position: absolute;
          background: linear-gradient(
            to right,
            var(--active-button-start),
            var(--active-button-end)
          );
          height: 1px;
          width: 100%;
          transition: transform 0.3s ease;
        }
        
        .button-selector .border-top {
          top: 0;
        }
        
        .button-selector .border-bottom {
          bottom: 0;
        }
        
        /* Button background (like selector-background) */
        .button-selector .button-background {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          height: 100%;
          width: 100%;
          border-radius: 9999px;
          background: linear-gradient(
            145deg,
            var(--active-button-start),
            var(--active-button-end)
          );
          z-index: 0;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        
        /* Active state shows background */
        .button-selector.active .button-background {
          opacity: 1;
        }
        
        /* Button content */
        .button-selector .button-content {
          display: flex;
          justify-content: center;
          align-items: center;
          position: relative;
          z-index: 2;
          padding: 2px 16px;
          gap: 5px;
        }
        
        .button-selector .button-content h3 {
          white-space: nowrap;
          overflow: visible;
          text-overflow: clip;
          max-width: none;
          font-size: clamp(0.5rem, 1.2vw, 2.3rem);
          margin: 0;
          font-weight: bold;
          color: #ffffff;
          transition: color 0.3s ease;
        }
        
        /* Active text color */
        .button-selector.active .button-content h3 {
          color: #ffffff;
        }
        
        /* Icon styling */
        .button-selector .button-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: inherit;
          color: inherit;
        }
        
        /* Disabled state */
        .button-selector.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .button-selector.disabled .border-container,
        .button-selector.disabled:hover .border-container {
          opacity: 0;
        }
        
        /* Size variations */
        .button-selector.small .button-content {
          padding: 1px 12px;
        }
        
        .button-selector.small .button-content h3 {
          font-size: clamp(0.4rem, 1vw, 2rem);
        }
        
        .button-selector.large .button-content {
          padding: 4px 20px;
        }
        
        .button-selector.large .button-content h3 {
          font-size: clamp(0.6rem, 1.4vw, 2.6rem);
        }
        
        /* Type variations (using opacity/filters for now) */
        .button-selector.secondary {
          filter: hue-rotate(180deg);
        }
        
        .button-selector.danger {
          filter: hue-rotate(320deg);
        }
      `;
      document.head.appendChild(styleSheet);
    }
    
    // Add size class
    if (this.options.size !== 'medium') {
      this.element.classList.add(this.options.size);
    }
    
    // Add type class
    if (this.options.type !== 'primary') {
      this.element.classList.add(this.options.type);
    }
  }
  
  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Click handler
    this.element.addEventListener('click', (e) => {
      if (this.options.disabled) {
        e.preventDefault();
        return;
      }
      
      console.log(`[button_component_engine] Button clicked:`, this.options.id);
      
      // Visual feedback - brief active state
      if (!this.options.active) {
        this.element.classList.add('active');
        setTimeout(() => {
          this.element.classList.remove('active');
        }, 150);
      }
      
      // Call click handler
      if (this.clickHandler) {
        this.clickHandler(this.options.value, this.options.id);
      }
    });
    
    // Prevent text selection on double click
    this.element.addEventListener('selectstart', (e) => {
      e.preventDefault();
    });
  }
  
  /**
   * Set active state
   * @param {boolean} active - Active state
   */
  setActive(active) {
    this.options.active = active;
    if (active) {
      this.element.classList.add('active');
    } else {
      this.element.classList.remove('active');
    }
  }
  
  /**
   * Enable the button
   */
  enable() {
    this.options.disabled = false;
    this.element.classList.remove('disabled');
  }
  
  /**
   * Disable the button
   */
  disable() {
    this.options.disabled = true;
    this.element.classList.add('disabled');
  }
  
  /**
   * Update button text
   * @param {string} text - New button text
   */
  setText(text) {
    this.options.text = text;
    const h3 = this.element.querySelector('.button-content h3');
    if (h3) {
      h3.textContent = text;
    }
  }
  
  /**
   * Update button icon
   * @param {string} icon - New icon HTML/text
   */
  setIcon(icon) {
    this.options.icon = icon;
    const iconEl = this.element.querySelector('.button-icon');
    const content = this.element.querySelector('.button-content');
    
    if (icon && !iconEl) {
      // Add icon
      const newIcon = document.createElement('span');
      newIcon.className = 'button-icon';
      newIcon.innerHTML = icon;
      content.insertBefore(newIcon, content.firstChild);
    } else if (icon && iconEl) {
      // Update icon
      iconEl.innerHTML = icon;
    } else if (!icon && iconEl) {
      // Remove icon
      iconEl.remove();
    }
  }
  
  /**
   * Destroy the component
   */
  destroy() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.element = null;
    this.container = null;
    console.log(`[button_component_engine] Destroyed:`, this.options.id);
  }
}

// Export for ES6 modules
export { button_component_engine };
