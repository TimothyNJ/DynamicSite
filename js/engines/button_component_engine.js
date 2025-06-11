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
 * - Border hover animations matching slider behavior
 * 
 * Date: 10-Jun-2025
 * Updated: 10-Jun-2025 - Added border hover animations
 */

import { globalMouseTracker } from '../core/mouse-tracker.js';

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
    this._borderTop = borderTop;
    
    const borderBottom = document.createElement('div');
    borderBottom.className = 'border-segment border-bottom';
    borderContainer.appendChild(borderBottom);
    this._borderBottom = borderBottom;
    
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
    
    // Initialize hover animations
    this.initializeHoverAnimations();
    
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
   * Initialize hover animations
   */
  initializeHoverAnimations() {
    if (!this.element || !this._borderTop || !this._borderBottom) return;
    
    // Set initial border positions off-screen (only for non-circular buttons)
    if (!this.isDefaultDot) {
      this.resetBorderAnimation();
    }
    
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
    const h3 = this.element.querySelector('.button-content h3');
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
    
    // Check if this is a default dot button (circular)
    if (this.isDefaultDot) {
      this.animateCircularBorderIn();
      return;
    }
    
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
   * Animate circular border in for default dot button
   */
  animateCircularBorderIn() {
    if (!this.element) return;
    
    this.hoverState.isAnimating = true;
    
    // Add a CSS class to trigger circular border
    this.element.classList.add('hover-ring');
    
    // Animation completes quickly for border
    setTimeout(() => {
      this.hoverState.isAnimating = false;
    }, 300);
  }
  
  /**
   * Animate borders out
   */
  animateBordersOut() {
    if (this.hoverState.isAnimating || !this.element) return;
    
    // Check if this is a default dot button (circular)
    if (this.isDefaultDot) {
      this.animateCircularBorderOut();
      return;
    }
    
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
   * Animate circular border out for default dot button
   */
  animateCircularBorderOut() {
    if (!this.element) return;
    
    this.hoverState.isAnimating = true;
    
    // Remove the CSS class to hide circular border
    this.element.classList.remove('hover-ring');
    
    // Animation completes quickly
    setTimeout(() => {
      this.hoverState.isAnimating = false;
      this.hoverState.isHovering = false;
    }, 300);
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
    
    // Remove the button-container class we added
    if (this.container) {
      this.container.classList.remove('button-container');
    }
    
    this.element = null;
    this.container = null;
    this._borderTop = null;
    this._borderBottom = null;
    console.log(`[button_component_engine] Destroyed:`, this.options.id);
  }
}

// Export for ES6 modules
export { button_component_engine };
