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
      text: options.text !== undefined ? options.text : 'Button', // Allow empty string
      value: options.value || options.text || 'button',
      disabled: options.disabled || false,
      active: options.active || false,
      ...options
    };
    
    this.clickHandler = clickHandler;
    this.element = null;
    this.container = null;
    this.background = null;
    
    // Determine button type based on text
    this.isCircle = !this.options.text || this.options.text.trim() === '';
    
    console.log(`[button_component_engine] Initialized ${this.isCircle ? 'circle' : 'text'} button:`, this.options);
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
    
    // Create button container (matches slider-container)
    this.container = document.createElement('div');
    this.container.className = 'button-container';
    
    // Create button element (matches slider structure)
    this.element = document.createElement('div');
    this.element.className = `button-component ${this.isCircle ? 'button-circle' : 'button-text'}`;
    this.element.id = this.options.id;
    
    // Create inner structure matching slider
    const borderContainer = document.createElement('div');
    borderContainer.className = 'border-container';
    borderContainer.innerHTML = `
      <div class="border-segment border-top"></div>
      <div class="border-segment border-bottom"></div>
    `;
    
    // Background layer (like selector-background)
    this.background = document.createElement('div');
    this.background.className = 'button-background';
    
    // Content layer
    const content = document.createElement('div');
    content.className = 'button-content';
    
    // Add text if provided
    if (!this.isCircle) {
      const h3 = document.createElement('h3');
      h3.textContent = this.options.text;
      content.appendChild(h3);
    }
    
    // Build DOM structure
    this.element.appendChild(borderContainer);
    this.element.appendChild(this.background);
    this.element.appendChild(content);
    
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
    
    console.log(`[button_component_engine] Rendered ${this.isCircle ? 'circle' : 'text'} button:`, this.options.id);
    
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
    
    // Update button type if needed
    const wasCircle = this.isCircle;
    this.isCircle = !text || text.trim() === '';
    
    // Update classes if type changed
    if (wasCircle !== this.isCircle) {
      this.element.classList.toggle('button-circle', this.isCircle);
      this.element.classList.toggle('button-text', !this.isCircle);
    }
    
    // Update content
    const content = this.element.querySelector('.button-content');
    if (content) {
      if (this.isCircle) {
        // Remove text
        content.innerHTML = '';
      } else {
        // Add or update text
        let h3 = content.querySelector('h3');
        if (!h3) {
          h3 = document.createElement('h3');
          content.appendChild(h3);
        }
        h3.textContent = text;
      }
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
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.element = null;
    this.container = null;
    this.background = null;
    console.log(`[button_component_engine] Destroyed:`, this.options.id);
  }
}

// Export for ES6 modules
export { button_component_engine };
