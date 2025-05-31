/**
 * text_input_component_engine_2.js
 * 
 * Simplified text input engine that matches slider component sizing and behavior.
 * Uses natural flex sizing instead of complex calculations.
 * 
 * Date: 31-May-2025
 * 
 * Key improvements:
 * - Matches slider component's compact initial size
 * - Natural flex-based expansion
 * - No width calculations or measurement elements
 * - Clean integration with global mouse tracker
 */

import { globalMouseTracker } from '../core/mouse-tracker.js';

class text_input_component_engine_2 {
  constructor(options = {}, changeHandler = null) {
    // Options with sensible defaults
    this.options = {
      id: options.id || `input-${Date.now()}`,
      placeholder: options.placeholder || 'Enter text',
      value: options.value || '',
      storageKey: options.storageKey || null,
      expandable: options.expandable !== false,
      ...options
    };
    
    this.changeHandler = changeHandler;
    this.element = null;
    this.wrapper = null;
    this.innerContainer = null;
    this.borderTop = null;
    this.borderBottom = null;
    
    // Animation state
    this.animationState = {
      isAnimating: false,
      currentlyHovered: false,
      entryDirection: null,
      insideInput: false,
      lastCheckTime: 0
    };
    
    // Animation timing
    this.ANIMATION_DURATION = 800;
    this.MONITOR_INTERVAL = 100;
    
    // Bound methods
    this.handleMousePositionUpdate = this.handleMousePositionUpdate.bind(this);
  }
  
  /**
   * Render the component
   */
  render(container) {
    const containerEl = typeof container === 'string' 
      ? document.getElementById(container)
      : container;
      
    if (!containerEl) {
      console.error(`[text_input_2] Container not found:`, container);
      return null;
    }
    
    // Create wrapper - this is what expands
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'text-input-2-wrapper';
    
    // Create border container
    const borderContainer = document.createElement('div');
    borderContainer.className = 'input-border-container';
    
    // Create animated borders
    this.borderTop = document.createElement('div');
    this.borderTop.className = 'input-border-segment input-border-top';
    
    this.borderBottom = document.createElement('div');
    this.borderBottom.className = 'input-border-segment input-border-bottom';
    
    borderContainer.appendChild(this.borderTop);
    borderContainer.appendChild(this.borderBottom);
    this.wrapper.appendChild(borderContainer);
    
    // Create inner container to prevent corner clipping
    this.innerContainer = document.createElement('div');
    this.innerContainer.className = 'text-input-2-inner';
    
    // Create the input element
    this.element = document.createElement('input');
    this.element.type = 'text';
    this.element.id = this.options.id;
    this.element.className = 'text-input-2';
    this.element.placeholder = this.options.placeholder;
    this.element.value = this.options.value;
    
    // Apply stored value if available
    if (this.options.storageKey) {
      const stored = localStorage.getItem(this.options.storageKey);
      if (stored !== null) {
        this.element.value = stored;
        this.options.value = stored;
      }
    }
    
    // Build DOM
    this.innerContainer.appendChild(this.element);
    this.wrapper.appendChild(this.innerContainer);
    containerEl.appendChild(this.wrapper);
    
    // Attach event listeners
    this.attachEventListeners();
    
    // Setup animation systems
    this.setupHoverAnimation();
    this.startContinuousMonitoring();
    
    console.log(`[text_input_2] Rendered with natural flex sizing`);
    return this.element;
  }
  
  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Handle input changes
    this.element.addEventListener('input', (e) => {
      const value = e.target.value;
      this.options.value = value;
      
      // Save to localStorage
      if (this.options.storageKey) {
        localStorage.setItem(this.options.storageKey, value);
      }
      
      // Call change handler
      if (this.changeHandler) {
        this.changeHandler(value, this.options.id);
      }
    });
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
    
    // Mouse leave
    this.wrapper.addEventListener('mouseleave', () => {
      this.animationState.insideInput = false;
      
      if (!this.element.matches(':focus')) {
        const rect = this.wrapper.getBoundingClientRect();
        const exitDirection = globalMouseTracker.getRelativeDirection(rect);
        this.animationState.entryDirection = exitDirection;
        this.animateBordersOut();
      }
    });
    
    // Focus/blur
    this.element.addEventListener('focus', () => {
      if (!this.animationState.insideInput) {
        this.animationState.entryDirection = 'left';
        this.animateBordersIn();
      }
    });
    
    this.element.addEventListener('blur', () => {
      if (!this.animationState.insideInput) {
        this.animateBordersOut();
      }
    });
  }
  
  /**
   * Handle mouse position updates from global tracker
   */
  handleMousePositionUpdate() {
    const now = Date.now();
    if (now - this.animationState.lastCheckTime < this.MONITOR_INTERVAL) {
      return;
    }
    
    this.animationState.lastCheckTime = now;
    
    if (!this.wrapper) return;
    
    const rect = this.wrapper.getBoundingClientRect();
    const isInside = globalMouseTracker.isInsideBounds(rect);
    
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
      const rect = this.wrapper.getBoundingClientRect();
      const direction = globalMouseTracker.getRelativeDirection(rect);
      this.animationState.entryDirection = direction;
      
      if (!this.animationState.isAnimating && !this.animationState.currentlyHovered) {
        this.animateBordersIn();
      }
    } else {
      if (!this.animationState.isAnimating && this.animationState.currentlyHovered && !this.element.matches(':focus')) {
        this.animateBordersOut();
      }
    }
  }
  
  /**
   * Animate borders in
   */
  animateBordersIn() {
    if (!this.borderTop || !this.borderBottom || this.animationState.isAnimating) {
      return;
    }
    
    this.animationState.isAnimating = true;
    this.animationState.currentlyHovered = true;
    
    // Set instant position
    this.setBorderTransition(true);
    
    if (this.animationState.entryDirection === 'left') {
      this.borderTop.style.transform = 'translateX(-100%)';
      this.borderBottom.style.transform = 'translateX(-100%)';
    } else {
      this.borderTop.style.transform = 'translateX(100%)';
      this.borderBottom.style.transform = 'translateX(100%)';
    }
    
    // Force reflow
    void this.borderTop.offsetWidth;
    
    // Animate in
    this.setBorderTransition(false);
    this.borderTop.style.transform = 'translateX(0)';
    this.borderBottom.style.transform = 'translateX(0)';
    
    setTimeout(() => {
      this.animationState.isAnimating = false;
    }, this.ANIMATION_DURATION);
  }
  
  /**
   * Animate borders out
   */
  animateBordersOut() {
    if (!this.borderTop || !this.borderBottom || this.animationState.isAnimating) {
      return;
    }
    
    this.animationState.isAnimating = true;
    
    if (this.animationState.entryDirection === 'left') {
      this.borderTop.style.transform = 'translateX(-100%)';
      this.borderBottom.style.transform = 'translateX(-100%)';
    } else {
      this.borderTop.style.transform = 'translateX(100%)';
      this.borderBottom.style.transform = 'translateX(100%)';
    }
    
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
   * Start monitoring mouse position
   */
  startContinuousMonitoring() {
    setInterval(() => {
      this.handleMousePositionUpdate();
    }, this.MONITOR_INTERVAL);
  }
  
  /**
   * Get current value
   */
  getValue() {
    return this.element ? this.element.value : this.options.value;
  }
  
  /**
   * Set value programmatically
   */
  setValue(value) {
    if (this.element) {
      this.element.value = value;
      this.options.value = value;
      
      if (this.options.storageKey) {
        localStorage.setItem(this.options.storageKey, value);
      }
      
      if (this.changeHandler) {
        this.changeHandler(value, this.options.id);
      }
    }
  }
  
  /**
   * Clean up
   */
  destroy() {
    if (this.wrapper && this.wrapper.parentNode) {
      this.wrapper.parentNode.removeChild(this.wrapper);
    }
    
    this.element = null;
    this.wrapper = null;
    this.innerContainer = null;
    this.borderTop = null;
    this.borderBottom = null;
  }
}

// Export for ES6 modules
export { text_input_component_engine_2 };
