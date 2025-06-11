/**
 * button_component_engine.js
 * 
 * Engine for creating consistent button components that match
 * the slider component architecture exactly. Inherits all root
 * CSS variables and maintains dimensional parity with sliders.
 * 
 * Features:
 * - Circle button when no text provided
 * - Text button with slider-matching dimensions
 * - Complete CSS variable inheritance
 * - Theme-aware gradients
 * 
 * Date: 10-Jun-2025
 */

class button_component_engine {
  constructor(options = {}, clickHandler = null) {
    // Default options
    this.options = {
      id: options.id || `button-${Date.now()}`,
      text: options.text !== undefined ? options.text : '•', // Default to bullet dot
      value: options.value || options.text || 'button',
      disabled: options.disabled || false,
      active: options.active || false,
      ...options
    };
    
    this.clickHandler = clickHandler;
    this.element = null;
    this.container = null;
    
    // Determine if using default dot
    this.isDefaultDot = this.options.text === '•';
    
    console.log(`[button_component_engine] Initialized button with ${this.isDefaultDot ? 'default dot' : 'custom text'}:`, this.options);
  }
  
  /**
   * Ensure button is circular when width < height
   */
  ensureCircular() {
    // Use requestAnimationFrame to ensure DOM has rendered
    requestAnimationFrame(() => {
      if (!this.element) return;
      
      const computed = window.getComputedStyle(this.element);
      const height = this.element.offsetHeight;
      const width = this.element.offsetWidth;
      
      // If height > width, set width = height to make it circular
      if (height > width) {
        this.element.style.width = `${height}px`;
      }
    });
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
    
    // Apply container class to existing container (matches slider approach)
    containerEl.classList.add('button-container');
    this.container = containerEl;
    
    // Create button element (matches slider structure)
    this.element = document.createElement('div');
    const buttonClasses = ['button-component'];
    if (this.isDefaultDot) {
      buttonClasses.push('button-default-dot');
    } else {
      buttonClasses.push('button-text');
    }
    this.element.className = buttonClasses.join(' ');
    this.element.id = this.options.id;
    
    // Border container for animations (matches slider)
    const borderContainer = document.createElement('div');
    borderContainer.className = 'border-container';
    
    // Border segments
    const borderTop = document.createElement('div');
    borderTop.className = 'border-segment border-top';
    borderContainer.appendChild(borderTop);
    
    const borderBottom = document.createElement('div');
    borderBottom.className = 'border-segment border-bottom';
    borderContainer.appendChild(borderBottom);
    
    // Add border container to button
    this.element.appendChild(borderContainer);
    
    // Content layer
    const content = document.createElement('div');
    content.className = 'button-content';
    
    // Add text
    const h3 = document.createElement('h3');
    h3.textContent = this.options.text;
    content.appendChild(h3);
    
    // Build DOM structure
    this.element.appendChild(content);
    
    // Add event listeners
    this.attachEventListeners();
    
    // Add to container
    this.container.appendChild(this.element);
    
    // For default dot, ensure circular shape if height > width
    if (this.isDefaultDot) {
      this.ensureCircular();
    }
    
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
      
      // Toggle active state on click
      this.setActive(!this.options.active);
      
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
    
    // Update button type flag
    const wasDefaultDot = this.isDefaultDot;
    this.isDefaultDot = text === '•';
    
    // Update classes if type changed
    if (wasDefaultDot !== this.isDefaultDot) {
      this.element.classList.remove('button-default-dot', 'button-text');
      if (this.isDefaultDot) {
        this.element.classList.add('button-default-dot');
        this.ensureCircular(); // Make circular if needed
      } else {
        this.element.classList.add('button-text');
        this.element.style.width = ''; // Remove fixed width for text buttons
      }
    }
    
    // Update content
    const h3 = this.element.querySelector('.button-content h3');
    if (h3) {
      h3.textContent = text;
    }
  }
  
  /**
   * Get current text
   * @returns {string} Current button text
   */
  getText() {
    return this.options.text;
  }
  
  /**
   * Destroy the component
   */
  destroy() {
    // Remove the button element from container
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    
    // Remove the button-container class we added
    if (this.container) {
      this.container.classList.remove('button-container');
    }
    
    this.element = null;
    this.container = null;
    console.log(`[button_component_engine] Destroyed:`, this.options.id);
  }
}

// Export for ES6 modules
export { button_component_engine };
