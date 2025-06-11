/**
 * text_button_component_engine.js
 * 
 * Engine for creating text-based button components with sliding border animations.
 * Matches the slider component architecture for consistency.
 * Features dynamic width based on text content and theme-aware styling.
 * 
 * Date: 10-Jun-2025
 */

import { globalMouseTracker } from '../core/mouse-tracker.js';

class text_button_component_engine {
  constructor(options = {}, clickHandler = null) {
    // Default options
    this.options = {
      id: options.id || `text-button-${Date.now()}`,
      text: options.text || 'Button',
      value: options.value || options.text || 'button',
      disabled: options.disabled || false,
      active: options.active || false,
      ...options
    };
    
    this.clickHandler = clickHandler;
    this.element = null;
    this.container = null;
    
    // Hover animation state (from slider engine)
    this.hoverState = {
      isHovering: false,
      isAnimating: false,
      mouseEnteredFromRight: null,
      entryDirection: null,
      lastCheckTime: 0
    };
    
    // Animation constants
    this.ANIMATION_DURATION = 800;
    this.MONITOR_INTERVAL = 100;
    
    // Element references for borders
    this._borderTop = null;
    this._borderBottom = null;
    
    // Bound method for mouse tracking
    this.handleMousePositionUpdate = this.handleMousePositionUpdate.bind(this);
    
    console.log(`[text_button_component_engine] Initialized with text:`, this.options.text);
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
      console.error(`[text_button_component_engine] Container not found:`, container);
      return null;
    }
    
    // Apply container class to existing container
    containerEl.classList.add('text-button-container');
    this.container = containerEl;
    
    // Create button element
    this.element = document.createElement('div');
    this.element.className = 'text-button-component';
    this.element.id = this.options.id;
    
    // Border container for animations (matches slider)
    const borderContainer = document.createElement('div');
    borderContainer.className = 'border-container';
    
    // Border segments
    const borderTop = document.createElement('div');
    borderTop.className = 'border-segment border-top';
    borderContainer.appendChild(borderTop);
    this._borderTop = borderTop;
    
    const borderBottom = document.createElement('div');
    borderBottom.className = 'border-segment border-bottom';
    borderContainer.appendChild(borderBottom);
    this._borderBottom = borderBottom;
    
    // Add border container to button
    this.element.appendChild(borderContainer);
    
    // Content layer
    const content = document.createElement('div');
    content.className = 'text-button-content';
    
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
    
    // Set initial state
    if (this.options.active) {
      this.setActive(true);
    }
    
    if (this.options.disabled) {
      this.disable();
    }
    
    // Initialize hover animations
    this.initializeHoverAnimations();
    
    console.log(`[text_button_component_engine] Rendered button:`, this.options.id);
    
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
      
      console.log(`[text_button_component_engine] Button clicked:`, this.options.id);
      
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
    
    const h3 = this.element.querySelector('.text-button-content h3');
    if (h3) {
      h3.textContent = text;
    }
    
    // Recalculate border width
    if (this._borderTop && this._borderBottom) {
      const borderWidth = this.calculateBorderWidth();
      this._borderTop.style.width = `${borderWidth}px`;
      this._borderBottom.style.width = `${borderWidth}px`;
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
   * Initialize hover animations
   */
  initializeHoverAnimations() {
    if (!this.element || !this._borderTop || !this._borderBottom) return;
    
    // Set initial border positions off-screen
    this.resetBorderAnimation();
    
    // Setup mouse events
    this.setupMouseEvents();
    
    // Start continuous monitoring
    this.startContinuousMonitoring();
  }
  
  /**
   * Calculate border width based on button text
   */
  calculateBorderWidth() {
    // For buttons, use 90% of text width
    const h3 = this.element.querySelector('.text-button-content h3');
    if (!h3) return 50;
    
    // Create temporary span to measure text
    const tempSpan = document.createElement('span');
    tempSpan.style.visibility = 'hidden';
    tempSpan.style.position = 'absolute';
    tempSpan.style.whiteSpace = 'nowrap';
    tempSpan.style.font = getComputedStyle(h3).font;
    tempSpan.textContent = h3.textContent;
    
    document.body.appendChild(tempSpan);
    const width = tempSpan.offsetWidth;
    document.body.removeChild(tempSpan);
    
    return Math.max(width * 0.9, 20); // Minimum 20px
  }
  
  /**
   * Reset border animation
   */
  resetBorderAnimation() {
    if (!this.element || !this._borderTop || !this._borderBottom) return;
    
    const rect = this.element.getBoundingClientRect();
    const direction = this.hoverState.entryDirection || 'left';
    
    // Set border width
    const borderWidth = this.calculateBorderWidth();
    this._borderTop.style.width = `${borderWidth}px`;
    this._borderBottom.style.width = `${borderWidth}px`;
    
    // Instantly position off-screen
    this.setBorderTransition(true);
    
    if (direction === 'left') {
      this._borderTop.style.transform = 'translateX(-100%)';
      this._borderBottom.style.transform = 'translateX(-100%)';
    } else {
      this._borderTop.style.transform = `translateX(${rect.width}px)`;
      this._borderBottom.style.transform = `translateX(${rect.width}px)`;
    }
    
    // Restore transition
    this.setBorderTransition(false);
    
    this.hoverState.isHovering = false;
    this.hoverState.isAnimating = false;
  }
  
  /**
   * Set border transition state
   */
  setBorderTransition(immediate = false) {
    if (!this._borderTop || !this._borderBottom) return;
    
    this._borderTop.style.transition = immediate
      ? 'none'
      : 'transform 0.8s cubic-bezier(0.1, 0.8, 0.2, 1)';
    this._borderBottom.style.transition = immediate
      ? 'none'
      : 'transform 0.8s cubic-bezier(0.1, 0.8, 0.2, 1)';
    
    if (immediate) {
      // Force reflow
      void this._borderTop.offsetWidth;
    }
  }
  
  /**
   * Animate borders in
   */
  animateBordersIn(fromDirection) {
    if (!this.element || this.hoverState.isAnimating) return;
    
    this.hoverState.isAnimating = true;
    this.hoverState.entryDirection = fromDirection;
    
    // Get button dimensions
    const rect = this.element.getBoundingClientRect();
    const borderWidth = this.calculateBorderWidth();
    
    // Calculate centered position
    const centerX = (rect.width - borderWidth) / 2;
    
    // Reset borders to entry position
    this.resetBorderAnimation();
    
    // Animate to center
    this._borderTop.style.transform = `translateX(${centerX}px)`;
    this._borderBottom.style.transform = `translateX(${centerX}px)`;
    
    // After animation completes
    setTimeout(() => {
      this.hoverState.isAnimating = false;
    }, this.ANIMATION_DURATION);
  }
  
  /**
   * Animate borders out
   */
  animateBordersOut() {
    if (this.hoverState.isAnimating || !this.element) return;
    
    this.hoverState.isAnimating = true;
    
    const rect = this.element.getBoundingClientRect();
    const direction = this.hoverState.entryDirection || 'left';
    
    // Animate off-screen
    if (direction === 'left') {
      this._borderTop.style.transform = 'translateX(-100%)';
      this._borderBottom.style.transform = 'translateX(-100%)';
    } else {
      this._borderTop.style.transform = `translateX(${rect.width}px)`;
      this._borderBottom.style.transform = `translateX(${rect.width}px)`;
    }
    
    // After animation completes
    setTimeout(() => {
      this.hoverState.isAnimating = false;
      this.hoverState.isHovering = false;
    }, this.ANIMATION_DURATION);
  }
  
  /**
   * Setup mouse events
   */
  setupMouseEvents() {
    if (!this.element) return;
    
    this.element.addEventListener('mouseenter', () => {
      this.updateHoverState(true);
      
      if (!this.hoverState.isAnimating) {
        const rect = this.element.getBoundingClientRect();
        const direction = globalMouseTracker.getRelativeDirection(rect);
        this.hoverState.mouseEnteredFromRight = direction === 'right';
        const fromDirection = direction === 'right' ? 'right' : 'left';
        this.animateBordersIn(fromDirection);
      }
    });
    
    this.element.addEventListener('mouseleave', () => {
      this.updateHoverState(false);
    });
  }
  
  /**
   * Update hover state
   */
  updateHoverState(isInside) {
    this.hoverState.isHovering = isInside;
    
    if (!isInside && !this.hoverState.isAnimating) {
      this.animateBordersOut();
    }
  }
  
  /**
   * Handle mouse position update
   */
  handleMousePositionUpdate() {
    const now = Date.now();
    if (now - this.hoverState.lastCheckTime < this.MONITOR_INTERVAL) {
      return;
    }
    
    this.hoverState.lastCheckTime = now;
    
    if (!this.element) return;
    
    const rect = this.element.getBoundingClientRect();
    const isInside = globalMouseTracker.isInsideBounds(rect);
    
    if (isInside !== this.hoverState.isHovering) {
      this.updateHoverState(isInside);
    }
  }
  
  /**
   * Start continuous monitoring
   */
  startContinuousMonitoring() {
    setInterval(() => {
      this.handleMousePositionUpdate();
    }, this.MONITOR_INTERVAL);
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
      this.container.classList.remove('text-button-container');
    }
    
    this.element = null;
    this.container = null;
    this._borderTop = null;
    this._borderBottom = null;
    console.log(`[text_button_component_engine] Destroyed:`, this.options.id);
  }
}

// Export for ES6 modules
export { text_button_component_engine };
