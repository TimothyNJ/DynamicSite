/**
 * text_input_component_engine.js
 * 
 * Engine for creating consistent text input components that match
 * the DynamicSite design language. Handles dynamic expansion,
 * localStorage persistence, and sophisticated hover animations.
 * 
 * Date: 26-May-2025
 * Features slider-style border animations
 * Updated to use global mouse tracker for performance
 */

import { globalMouseTracker } from '../core/mouse-tracker.js';

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
    this.borderTop = null;
    this.borderBottom = null;
    
    // Animation state (similar to slider)
    this.animationState = {
      isAnimating: false,
      currentlyHovered: false,
      entryDirection: null,
      insideInput: false,
      lastCheckTime: 0,
      inputWidth: 0
    };
    
    // Animation constants
    this.ANIMATION_DURATION = 800; // Match slider exactly
    this.MONITOR_INTERVAL = 100;
    
    // Bound methods
    this.handleMousePositionUpdate = this.handleMousePositionUpdate.bind(this);
    
    console.log(`[text_input_component_engine] Initialized with hover animations:`, this.options);
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
    
    // Create wrapper div with border container
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'dynamic-input-wrapper';
    this.wrapper.style.cssText = `
      position: relative;
      width: 100%;
      margin: 5px 0;
      display: flex;
      justify-content: center;
    `;
    
    // Create border container
    const borderContainer = document.createElement('div');
    borderContainer.className = 'input-border-container';
    borderContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      overflow: hidden;
      border-radius: 9999px;
    `;
    
    // Create top and bottom borders
    this.borderTop = document.createElement('div');
    this.borderTop.className = 'input-border-segment input-border-top';
    this.borderTop.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      height: 1px;
      background: linear-gradient(
        to right,
        var(--active-button-start),
        var(--active-button-end)
      );
      transform: translateX(-100%);
      transition: transform 0.8s cubic-bezier(0.1, 0.8, 0.2, 1);
      width: 100%;
    `;
    
    this.borderBottom = document.createElement('div');
    this.borderBottom.className = 'input-border-segment input-border-bottom';
    this.borderBottom.style.cssText = `
      position: absolute;
      bottom: 0;
      left: 0;
      height: 1px;
      background: linear-gradient(
        to right,
        var(--active-button-start),
        var(--active-button-end)
      );
      transform: translateX(-100%);
      transition: transform 0.8s cubic-bezier(0.1, 0.8, 0.2, 1);
      width: 100%;
    `;
    
    borderContainer.appendChild(this.borderTop);
    borderContainer.appendChild(this.borderBottom);
    this.wrapper.appendChild(borderContainer);
    
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
    
    // Setup animation systems
    this.setupMouseTracking();
    this.setupHoverAnimation();
    this.startContinuousMonitoring();
    
    console.log(`[text_input_component_engine] Rendered input with animations:`, this.options.id);
    
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
      transition: height 0.2s ease;
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
    
    // Simple placeholder and scrollbar styles
    if (!document.getElementById('dynamic-input-styles')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'dynamic-input-styles';
      styleSheet.textContent = `
        .dynamic-text-input::placeholder {
          color: rgba(255, 255, 255, 0.5);
          font-weight: normal;
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
    
    // Focus/blur are now handled in setupHoverAnimation() for border animations
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
  
  /**
   * Setup mouse tracking for global position
   * Now uses global mouse tracker instead of local tracking
   */
  setupMouseTracking() {
    // No longer need to add our own mousemove listener
    // Global mouse tracker handles this for all components
    console.log('[text_input_component_engine] Using global mouse tracker');
  }
  
  /**
   * Setup hover animation handlers
   */
  setupHoverAnimation() {
    if (!this.wrapper) return;
    
    // Mouse enter
    this.wrapper.addEventListener('mouseenter', () => {
      this.updateInputState(true);
    });
    
    // Mouse leave - handle exit direction
    this.wrapper.addEventListener('mouseleave', () => {
      // Force immediate state update
      this.animationState.insideInput = false;
      
      // Animate out if not focused
      if (!this.element.matches(':focus')) {
        // Determine exit direction based on current mouse position
        const rect = this.wrapper.getBoundingClientRect();
        const exitDirection = globalMouseTracker.getRelativeDirection(rect);
        
        // Update entry direction to exit direction for smooth animation
        this.animationState.entryDirection = exitDirection;
        
        this.animateBordersOut();
      }
    });
    
    // Focus/blur for additional animation triggers
    this.element.addEventListener('focus', () => {
      // Force animation if not already hovering
      if (!this.animationState.insideInput) {
        this.animationState.entryDirection = 'left'; // Default for keyboard focus
        this.animateBordersIn();
      }
    });
    
    this.element.addEventListener('blur', () => {
      // Only animate out if not hovering
      if (!this.animationState.insideInput) {
        this.animateBordersOut();
      }
    });
  }
  
  /**
   * Handle mouse position updates
   */
  handleMousePositionUpdate() {
    // Skip if we just checked recently
    const now = Date.now();
    if (now - this.animationState.lastCheckTime < this.MONITOR_INTERVAL) {
      return;
    }
    
    this.animationState.lastCheckTime = now;
    
    if (!this.wrapper) return;
    
    // Check if mouse is inside the input
    const rect = this.wrapper.getBoundingClientRect();
    const isInside = globalMouseTracker.isInsideBounds(rect);
      
    // Update state if changed
    if (isInside !== this.animationState.insideInput) {
      this.updateInputState(isInside);
    }
  }
  
  /**
   * Update input hover state
   */
  updateInputState(isInside) {
    this.animationState.insideInput = isInside;
    
    if (!this.wrapper) return;
    
    if (isInside) {
      // Determine entry direction based on mouse position
      const rect = this.wrapper.getBoundingClientRect();
      const direction = globalMouseTracker.getRelativeDirection(rect);
      
      // Set direction and animate in
      this.animationState.entryDirection = direction;
      
      if (!this.animationState.isAnimating && !this.animationState.currentlyHovered) {
        this.animateBordersIn();
      }
    } else {
      // Animate out if not focused
      if (!this.animationState.isAnimating && this.animationState.currentlyHovered && !this.element.matches(':focus')) {
        this.animateBordersOut();
      }
    }
  }
  
  /**
   * Animate borders sliding in
   */
  animateBordersIn() {
    if (!this.borderTop || !this.borderBottom || this.animationState.isAnimating) {
      return;
    }
    
    this.animationState.isAnimating = true;
    this.animationState.currentlyHovered = true;
    
    // Ensure borders start from correct position
    this.setBorderTransition(true); // Instant positioning
    
    if (this.animationState.entryDirection === 'left') {
      this.borderTop.style.transform = 'translateX(-100%)';
      this.borderBottom.style.transform = 'translateX(-100%)';
    } else {
      this.borderTop.style.transform = 'translateX(100%)';
      this.borderBottom.style.transform = 'translateX(100%)';
    }
    
    // Force reflow
    void this.borderTop.offsetWidth;
    
    // Enable animation and slide in
    this.setBorderTransition(false);
    this.borderTop.style.transform = 'translateX(0)';
    this.borderBottom.style.transform = 'translateX(0)';
    
    // Animation complete
    setTimeout(() => {
      this.animationState.isAnimating = false;
    }, this.ANIMATION_DURATION);
  }
  
  /**
   * Animate borders sliding out
   */
  animateBordersOut() {
    if (!this.borderTop || !this.borderBottom || this.animationState.isAnimating) {
      return;
    }
    
    this.animationState.isAnimating = true;
    
    // Slide out in the same direction they came from
    if (this.animationState.entryDirection === 'left') {
      this.borderTop.style.transform = 'translateX(-100%)';
      this.borderBottom.style.transform = 'translateX(-100%)';
    } else {
      this.borderTop.style.transform = 'translateX(100%)';
      this.borderBottom.style.transform = 'translateX(100%)';
    }
    
    // Animation complete
    setTimeout(() => {
      this.animationState.isAnimating = false;
      this.animationState.currentlyHovered = false;
    }, this.ANIMATION_DURATION);
  }
  
  /**
   * Set border transition state
   */
  setBorderTransition(instant = false) {
    if (!this.borderTop || !this.borderBottom) return;
    
    const transition = instant ? 'none' : 'transform 0.8s cubic-bezier(0.1, 0.8, 0.2, 1)';
    this.borderTop.style.transition = transition;
    this.borderBottom.style.transition = transition;
  }
  
  /**
   * Start continuous monitoring
   */
  startContinuousMonitoring() {
    // Check mouse position regularly
    setInterval(() => {
      this.handleMousePositionUpdate();
    }, this.MONITOR_INTERVAL);
  }
}

// Export for ES6 modules
export { text_input_component_engine };
