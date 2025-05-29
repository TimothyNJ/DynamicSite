/**
 * text_input_component_engine.js
 * 
 * Engine for creating consistent text input components that match
 * the DynamicSite design language. Handles dynamic expansion (both horizontal and vertical),
 * localStorage persistence, and sophisticated hover animations.
 * 
 * Date: 27-May-2025
 * Features: 
 * - Slider-style border animations
 * - Horizontal width expansion based on content
 * - Dynamic border radius based on line count
 * - Inner container to prevent text clipping
 * - Global mouse tracker integration
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
    this.innerContainer = null;
    this.borderTop = null;
    this.borderBottom = null;
    this.resizeObserver = null;
    
    // Animation state (similar to slider)
    this.animationState = {
      isAnimating: false,
      currentlyHovered: false,
      entryDirection: null,
      insideInput: false,
      lastCheckTime: 0,
      inputWidth: 0
    };
    
    // Width measurement state
    this.widthState = {
      measureElement: null,
      currentLineCount: 1,
      containerWidth: 0
    };
    
    // Animation constants
    this.ANIMATION_DURATION = 800; // Match slider exactly
    this.MONITOR_INTERVAL = 100;
    
    // Bound methods
    this.handleMousePositionUpdate = this.handleMousePositionUpdate.bind(this);
    this.updateWidth = this.updateWidth.bind(this);
    this.handleResize = this.handleResize.bind(this);
    
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
    
    // Create wrapper div with data-lines attribute
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'dynamic-input-wrapper';
    this.wrapper.setAttribute('data-lines', '1');
    
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
      border-radius: inherit;
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
    
    // Create inner container for text
    this.innerContainer = document.createElement('div');
    this.innerContainer.className = 'text-input-inner';
    
    // Create the appropriate element based on options
    if (this.options.multiline || this.options.expandable) {
      this.element = document.createElement('textarea');
      this.element.rows = 1; // Single line to start
    } else {
      this.element = document.createElement('input');
      this.element.type = this.options.type;
    }
    
    // Common properties
    this.element.id = this.options.id;
    this.element.name = this.options.name;
    this.element.className = 'dynamic-text-input';
    this.element.placeholder = this.options.placeholder;
    this.element.value = this.options.value;
    
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
    
    // Build DOM structure
    this.innerContainer.appendChild(this.element);
    this.wrapper.appendChild(this.innerContainer);
    containerEl.appendChild(this.wrapper);
    
    // Create width measurement element
    this.createMeasurementElement();
    
    // Setup ResizeObserver
    this.setupResizeObserver();
    
    // Initial adjustments
    if (this.options.expandable) {
      setTimeout(() => {
        this.adjustHeight();
        this.updateWidth();
        this.updateLineCount();
      }, 0);
    }
    
    // Setup animation systems
    this.setupMouseTracking();
    this.setupHoverAnimation();
    this.startContinuousMonitoring();
    
    console.log(`[text_input_component_engine] Rendered input with horizontal expansion:`, this.options.id);
    
    return this.element;
  }
  
  /**
   * Create hidden element for measuring text width
   */
  createMeasurementElement() {
    this.widthState.measureElement = document.createElement('div');
    this.widthState.measureElement.className = 'text-measurement-helper';
    this.widthState.measureElement.style.cssText = `
      position: absolute;
      visibility: hidden;
      height: auto;
      width: auto;
      white-space: pre; // Preserve spaces
      pointer-events: none;
      // Copy exact styles from the input
      font-size: var(--component-font-size);
      font-weight: var(--component-font-weight);
      font-family: var(--font-family-primary);
      line-height: 1.2;
      // No padding here - we'll add it in calculation
    `;
    document.body.appendChild(this.widthState.measureElement);
  }
  
  /**
   * Update width based on content
   */
  updateWidth() {
    if (!this.element || !this.widthState.measureElement || !this.wrapper) return;
    
    // Get the actual computed styles from the input element
    const computedStyle = window.getComputedStyle(this.element);
    const innerComputedStyle = window.getComputedStyle(this.innerContainer);
    
    // Apply matching styles to measurement element
    this.widthState.measureElement.style.fontSize = computedStyle.fontSize;
    this.widthState.measureElement.style.fontFamily = computedStyle.fontFamily;
    this.widthState.measureElement.style.fontWeight = computedStyle.fontWeight;
    this.widthState.measureElement.style.letterSpacing = computedStyle.letterSpacing;
    
    // Determine what to measure
    const hasValue = this.element.value && this.element.value.trim().length > 0;
    const textToMeasure = hasValue ? this.element.value : this.element.placeholder;
    
    // For multiline, measure the longest line
    const lines = textToMeasure.split('\n');
    let maxTextWidth = 0;
    
    lines.forEach(line => {
      // Use the line or placeholder if line is empty
      const lineText = line || this.element.placeholder;
      this.widthState.measureElement.textContent = lineText;
      const lineWidth = this.widthState.measureElement.offsetWidth;
      maxTextWidth = Math.max(maxTextWidth, lineWidth);
    });
    
    // Always measure placeholder for minimum width
    this.widthState.measureElement.textContent = this.element.placeholder;
    const placeholderWidth = this.widthState.measureElement.offsetWidth;
    
    // Get actual padding from computed styles
    const inputPaddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
    const inputPaddingRight = parseFloat(computedStyle.paddingRight) || 0;
    const innerPaddingLeft = parseFloat(innerComputedStyle.paddingLeft) || 0;
    const innerPaddingRight = parseFloat(innerComputedStyle.paddingRight) || 0;
    
    // Total horizontal padding
    const totalPadding = inputPaddingLeft + inputPaddingRight + innerPaddingLeft + innerPaddingRight;
    
    // Add a small buffer for cursor and character spacing
    const cursorBuffer = 20;
    
    // Calculate minimum width needed
    const baseWidth = hasValue ? Math.max(maxTextWidth, placeholderWidth) : placeholderWidth;
    const minDesiredWidth = Math.max(200, placeholderWidth + totalPadding + cursorBuffer);
    
    // NEW: Set constraints and let CSS handle the actual width
    // Don't set a fixed width - let it flex naturally
    this.wrapper.style.minWidth = `${minDesiredWidth}px`;
    this.wrapper.style.maxWidth = '90%';
    // Remove any fixed width to allow natural flexing
    this.wrapper.style.width = 'auto';
    
    // Update CSS variable for dynamic border radius
    this.wrapper.style.setProperty('--line-count', this.widthState.currentLineCount);
    
    // Debug logging
    console.log(`[updateWidth] Text: "${hasValue ? this.element.value : '[placeholder]'}", Min width: ${minDesiredWidth}px (natural flex sizing)`);
  }
  
  /**
   * Update line count for border radius calculation
   */
  updateLineCount() {
    if (!this.element) return;
    
    // Calculate line count
    const value = this.element.value || '';
    const lines = value.split('\n').length;
    
    // Update if changed
    if (lines !== this.widthState.currentLineCount) {
      this.widthState.currentLineCount = lines;
      this.wrapper.setAttribute('data-lines', lines);
      this.wrapper.style.setProperty('--line-count', lines);
    }
  }
  
  /**
   * Setup ResizeObserver for container width changes
   */
  setupResizeObserver() {
    if (!window.ResizeObserver || !this.wrapper.parentElement) return;
    
    this.resizeObserver = new ResizeObserver(this.handleResize);
    this.resizeObserver.observe(this.wrapper.parentElement);
  }
  
  /**
   * Handle container resize
   */
  handleResize(entries) {
    for (let entry of entries) {
      const newWidth = entry.contentRect.width;
      if (newWidth !== this.widthState.containerWidth) {
        this.widthState.containerWidth = newWidth;
        this.updateWidth();
      }
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
        this.updateWidth();
        this.updateLineCount();
      }
    });
    
    // Also update on focus to ensure proper width with placeholder
    this.element.addEventListener('focus', () => {
      if (this.options.expandable && !this.element.value) {
        this.updateWidth();
      }
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
    } else {
      this.element.style.overflowY = 'hidden';
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
      
      // Adjust height and width if expandable
      if (this.options.expandable) {
        this.adjustHeight();
        this.updateWidth();
        this.updateLineCount();
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
    // Clean up ResizeObserver
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    
    // Clean up measurement element
    if (this.widthState.measureElement && this.widthState.measureElement.parentNode) {
      this.widthState.measureElement.parentNode.removeChild(this.widthState.measureElement);
    }
    
    // Clean up main elements
    if (this.wrapper && this.wrapper.parentNode) {
      this.wrapper.parentNode.removeChild(this.wrapper);
    }
    
    this.element = null;
    this.wrapper = null;
    this.innerContainer = null;
    
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
