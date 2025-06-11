/**
 * circle_button_component_engine.js
 * 
 * Engine for creating circular icon/symbol button components.
 * Handles perfect circle buttons with single character or icon content.
 * Features gradient ring hover effect and theme-aware styling.
 * 
 * Date: 10-Jun-2025
 */

import { globalMouseTracker } from '../core/mouse-tracker.js';

class circle_button_component_engine {
  constructor(options = {}, clickHandler = null) {
    // Default options
    this.options = {
      id: options.id || `circle-button-${Date.now()}`,
      icon: options.icon || '•', // Default to bullet dot
      value: options.value || 'circle-button',
      disabled: options.disabled || false,
      active: options.active || false,
      ...options
    };
    
    this.clickHandler = clickHandler;
    this.element = null;
    this.container = null;
    
    console.log(`[circle_button_component_engine] Initialized with icon:`, this.options.icon);
  }
  
  /**
   * Ensure button is perfectly circular
   */
  ensureCircular() {
    requestAnimationFrame(() => {
      if (!this.element) return;
      
      const height = this.element.offsetHeight;
      const width = this.element.offsetWidth;
      
      // Make it circular by setting width = height
      if (height !== width) {
        const size = Math.max(height, width);
        this.element.style.width = `${size}px`;
        this.element.style.height = `${size}px`;
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
      console.error(`[circle_button_component_engine] Container not found:`, container);
      return null;
    }
    
    // Apply container class to existing container
    containerEl.classList.add('circle-button-container');
    this.container = containerEl;
    
    // Create button element
    this.element = document.createElement('div');
    this.element.className = 'circle-button-component';
    this.element.id = this.options.id;
    
    // Create hover ring element
    const hoverRing = document.createElement('div');
    hoverRing.className = 'hover-ring';
    this.element.appendChild(hoverRing);
    
    // Content layer
    const content = document.createElement('div');
    content.className = 'circle-button-content';
    
    // Add icon
    const h3 = document.createElement('h3');
    h3.textContent = this.options.icon;
    content.appendChild(h3);
    
    // Build DOM structure
    this.element.appendChild(content);
    
    // Add event listeners
    this.attachEventListeners();
    
    // Add to container
    this.container.appendChild(this.element);
    
    // Ensure circular shape
    this.ensureCircular();
    
    // Set initial state
    if (this.options.active) {
      this.setActive(true);
    }
    
    if (this.options.disabled) {
      this.disable();
    }
    
    console.log(`[circle_button_component_engine] Rendered button:`, this.options.id);
    
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
      
      console.log(`[circle_button_component_engine] Button clicked:`, this.options.id);
      
      // Toggle active state on click
      this.setActive(!this.options.active);
      
      // Call click handler
      if (this.clickHandler) {
        this.clickHandler(this.options.value, this.options.id);
      }
    });
    
    // Hover handlers for gradient ring effect
    this.element.addEventListener('mouseenter', () => {
      if (!this.options.disabled) {
        this.element.classList.add('hover-ring-active');
      }
    });
    
    this.element.addEventListener('mouseleave', () => {
      this.element.classList.remove('hover-ring-active');
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
   * Update button icon
   * @param {string} icon - New button icon/character
   */
  setIcon(icon) {
    this.options.icon = icon;
    
    const h3 = this.element.querySelector('.circle-button-content h3');
    if (h3) {
      h3.textContent = icon;
    }
  }
  
  /**
   * Get current icon
   * @returns {string} Current button icon
   */
  getIcon() {
    return this.options.icon;
  }
  
  /**
   * Destroy the component
   */
  destroy() {
    // Remove the button element from container
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    
    // Remove the container class we added
    if (this.container) {
      this.container.classList.remove('circle-button-container');
    }
    
    this.element = null;
    this.container = null;
    console.log(`[circle_button_component_engine] Destroyed:`, this.options.id);
  }
}

// Export for ES6 modules
export { circle_button_component_engine };
