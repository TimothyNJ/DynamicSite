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
      maxHeight: options.maxHeight || null, // No height restriction
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
    this.approximationTimeout = null;
    
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
   * Handle fast approximation for any text/container change
   * @param {string} text - The text to size for
   * @param {boolean} forceApproximation - Force approximation even for small text
   * @returns {boolean} - Whether approximation was handled
   */
  handleSizeApproximation(text, forceApproximation = false) {
    // Get container constraints
    const containerWidth = this.getContentContainerWidth();
    if (!containerWidth) return false;
    
    // Handle empty text case - use placeholder for sizing
    const textToSize = text || this.element.placeholder || '';
    
    // Check if text is empty
    const isEmpty = !textToSize.trim();
    
    // Check if text has explicit line breaks
    const hasLineBreaks = textToSize.includes('\n');
    
    // Get current styles for accurate measurement
    const computedStyle = window.getComputedStyle(this.element);
    const innerComputedStyle = window.getComputedStyle(this.innerContainer);
    
    // Apply exact styles to measurement element
    this.widthState.measureElement.style.fontSize = computedStyle.fontSize;
    this.widthState.measureElement.style.fontFamily = computedStyle.fontFamily;
    this.widthState.measureElement.style.fontWeight = computedStyle.fontWeight;
    this.widthState.measureElement.style.letterSpacing = computedStyle.letterSpacing;
    
    // Get padding values (needed for both modes)
    const inputPaddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
    const inputPaddingRight = parseFloat(computedStyle.paddingRight) || 0;
    const inputPaddingTop = parseFloat(computedStyle.paddingTop) || 0;
    const inputPaddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
    const innerPaddingLeft = parseFloat(innerComputedStyle.paddingLeft) || 0;
    const innerPaddingRight = parseFloat(innerComputedStyle.paddingRight) || 0;
    
    const totalPadding = inputPaddingLeft + inputPaddingRight + innerPaddingLeft + innerPaddingRight;
    const cursorBuffer = 20;
    const lineHeight = parseFloat(computedStyle.lineHeight) || 20;
    
    // Simplified two-mode system
    if (hasLineBreaks && !isEmpty) {
      // LINE BREAK MODE: Has explicit breaks or needs text wrapping
      this.handleLineBreakMode(textToSize, containerWidth, totalPadding, cursorBuffer, lineHeight, inputPaddingTop, inputPaddingBottom);
    } else {
      // UNWRAPPED MODE: Normal single-line typing
      this.handleUnwrappedMode(textToSize, containerWidth, totalPadding, cursorBuffer, lineHeight, inputPaddingTop, inputPaddingBottom);
    }
    
    // Schedule precise refinement
    if (this.approximationTimeout) {
      clearTimeout(this.approximationTimeout);
    }
    this.approximationTimeout = setTimeout(() => {
      this.wrapper.style.transition = '';
      this.updateWidth();
      this.adjustHeight();
      this.approximationTimeout = null;
    }, 0);
    
    return true; // Handled
  }
  
  /**
   * Handle sizing for text with line breaks (may not need full width)
   */
  handleLineBreakMode(text, containerWidth, totalPadding, cursorBuffer, lineHeight, paddingTop, paddingBottom) {
    // Split text by lines and find widest line
    const lines = text.split('\n');
    let maxLineWidth = 0;
    
    // Measure each line to find the widest
    lines.forEach(line => {
      // Use a space for empty lines to ensure measurement
      this.widthState.measureElement.textContent = line || ' ';
      const lineWidth = this.widthState.measureElement.offsetWidth;
      maxLineWidth = Math.max(maxLineWidth, lineWidth);
    });
    
    // Calculate needed width (with padding and cursor buffer)
    const neededWidth = maxLineWidth + totalPadding + cursorBuffer;
    
    // Use the actual needed width, up to container width
    const finalWidth = Math.min(neededWidth, containerWidth);
    
    // Apply width
    this.wrapper.style.width = `${finalWidth}px`;
    
    // Use scrollHeight for accurate height calculation
    this.element.style.height = 'auto';
    this.element.style.height = this.element.scrollHeight + 'px';
    
    console.log(`[handleLineBreakMode] Lines: ${lines.length}, Widest: ${maxLineWidth}px, Final width: ${finalWidth}px, Height: ${this.element.scrollHeight}px`);
  }
  
  /**
   * Handle sizing for unwrapped text (calculate both width and height)
   */
  handleUnwrappedMode(text, containerWidth, totalPadding, cursorBuffer, lineHeight, paddingTop, paddingBottom) {
    // Measure straight-line width
    this.widthState.measureElement.textContent = text;
    const straightLineWidth = this.widthState.measureElement.offsetWidth;
    
    // Calculate dimensions
    let approximateWidth, approximateRows;
    
    if (straightLineWidth <= containerWidth - totalPadding - cursorBuffer) {
      // Fits in one line
      approximateWidth = straightLineWidth + totalPadding + cursorBuffer;
      approximateRows = 1;
    } else {
      // Needs multiple lines
      const contentWidth = containerWidth - totalPadding - cursorBuffer;
      approximateRows = Math.ceil(straightLineWidth / contentWidth);
      approximateWidth = containerWidth;
    }
    
    // Apply dimensions with smooth transitions
    this.wrapper.style.width = `${approximateWidth}px`;
    
    // Set approximate height
    const approximateHeight = (approximateRows * lineHeight) + paddingTop + paddingBottom;
    this.element.style.height = `${approximateHeight}px`;
    
    console.log(`[handleUnwrappedMode] Width: ${approximateWidth}px, Rows: ${approximateRows}, Height: ${approximateHeight}px`);
  }
  
  /**
   * Get content container width for constraints
   */
  getContentContainerWidth() {
    if (!this.wrapper) return null;
    
    let element = this.wrapper.parentElement;
    while (element) {
      if (element.classList && element.classList.contains('content-container')) {
        return element.offsetWidth || null;
      }
      element = element.parentElement;
    }
    
    // Fallback to wrapper parent
    return this.wrapper.parentElement ? this.wrapper.parentElement.offsetWidth : null;
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
        // Use approximation if there's initial value, otherwise just set initial size
        if (this.element.value) {
          this.handleSizeApproximation(this.element.value);
        } else {
          this.adjustHeight();
          this.updateWidth();
        }
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
      white-space: pre;
      pointer-events: none;
      font-size: var(--component-font-size);
      font-weight: var(--component-font-weight);
      font-family: var(--font-family-primary);
      line-height: 1.2;
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
    
    // For single line inputs, prevent wrapping by measuring as one line
    // This ensures we expand BEFORE text wraps to line 2
    const singleLineText = textToMeasure.replace(/\n/g, ' ');
    
    // Measure the full text as if it were on one line
    this.widthState.measureElement.textContent = singleLineText;
    const textWidth = this.widthState.measureElement.offsetWidth;
    
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
    
    // Calculate desired width - expand to fit all text on one line
    const currentTextWidth = hasValue ? textWidth : placeholderWidth;
    const desiredWidth = currentTextWidth + totalPadding + cursorBuffer;
    
    // Get container constraints
    const containerWidth = this.wrapper.parentElement ? this.wrapper.parentElement.offsetWidth : window.innerWidth;
    
    // Calculate minimum width based on content
    // Only use placeholder width as minimum when input is empty (placeholder visible)
    let minWidth;
    if (!hasValue && this.element.placeholder) {
      minWidth = placeholderWidth + totalPadding + cursorBuffer;
    } else {
      minWidth = 4;  // Minimal width for empty input without placeholder
    }
    
    // Set width to exactly what's needed, respecting minimum and container constraints
    const finalWidth = Math.max(minWidth, Math.min(desiredWidth, containerWidth));
    this.wrapper.style.width = `${finalWidth}px`;
    // Don't set minWidth style - let the wrapper shrink as needed
    
    // Debug logging
    console.log(`[updateWidth] Text: "${singleLineText}" (${singleLineText.length} chars)`);
    console.log(`[updateWidth] Text width: ${textWidth}px, Total width needed: ${desiredWidth}px`);
    console.log(`[updateWidth] Container width: ${containerWidth}px, Final width: ${finalWidth}px`);
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
        
        // Use approximation for instant resize response
        if (this.options.expandable && this.element.value) {
          // Force full recalculation on resize (viewport/container change)
          this.handleSizeApproximation(this.element.value, true);
        } else {
          this.updateWidth();
        }
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
    // Handle paste events for instant approximation
    this.element.addEventListener('paste', (e) => {
      if (this.options.expandable) {
        const pastedText = e.clipboardData?.getData('text');
        if (this.handleSizeApproximation(pastedText)) {
          // Approximation handled it - let normal input event handle the rest
          console.log('[text_input_component_engine] Paste approximation applied');
        }
      }
    });
    
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
        // Always use approximation first for smooth experience
        this.handleSizeApproximation(value);
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
    
    // Step 1: Aggressively force to absolute minimum
    // Remove any existing height to break browser's cached state
    this.element.style.height = '';
    
    // Step 2: Set to truly minimal height
    this.element.style.height = '0px';
    
    // Step 3: Force multiple reflows to ensure browser acknowledges change
    void this.element.offsetHeight;
    void this.element.scrollHeight;
    
    // Step 4: Now get the true content height from zero state
    const scrollHeight = this.element.scrollHeight;
    
    // Step 5: Calculate proper minimum based on content/placeholder
    const computedStyle = window.getComputedStyle(this.element);
    const lineHeight = parseFloat(computedStyle.lineHeight);
    const paddingTop = parseFloat(computedStyle.paddingTop);
    const paddingBottom = parseFloat(computedStyle.paddingBottom);
    
    let minHeight;
    if (this.options.minHeight === 'auto') {
      // Always use line height + padding for consistent minimum
      minHeight = lineHeight + paddingTop + paddingBottom;
    } else {
      minHeight = parseInt(this.options.minHeight);
    }
    
    const maxHeight = this.options.maxHeight ? parseInt(this.options.maxHeight) : Infinity;
    
    // Step 6: Grow from zero to exactly what's needed
    const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
    
    // Apply final height
    this.element.style.height = newHeight + 'px';
    
    // Handle scrollbar
    if (this.options.maxHeight && scrollHeight > maxHeight) {
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
        // Use approximation for smooth update
        this.handleSizeApproximation(value);
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
