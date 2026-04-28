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
import { measureRenderedWidths } from '../core/measure-rendered-width.js';

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
    
    // Viewport resize state
    this.viewportResizeFrame = null;
    
    // Bound methods
    this.handleMousePositionUpdate = this.handleMousePositionUpdate.bind(this);
    this.updateWidth = this.updateWidth.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.handleViewportResize = this.handleViewportResize.bind(this);
    
    console.log(`[text_input_component_engine] Initialized with hover animations:`, this.options);
  }
  
  /**
   * Refresh measurement element styles from input element
   * With CSS approach, this is no longer needed as CSS variables handle it
   */
  refreshMeasurementStyles() {
    // CSS variables now handle all style synchronization
    // No JavaScript copying needed
    console.log('[refreshMeasurementStyles] CSS variables handle style sync');
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
    
    // Refresh measurement element styles to ensure current viewport sizing
    this.refreshMeasurementStyles();
    
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
    
    // Calculate minimum width - only use placeholder width when empty
    let minWidth;
    if (!text || text.trim().length === 0) {
      // Empty input - use placeholder width as minimum
      this.widthState.measureElement.textContent = this.element.placeholder || '';
      const placeholderWidth = this.widthState.measureElement.offsetWidth;
      minWidth = placeholderWidth + totalPadding + cursorBuffer;
    } else {
      // Has content - allow it to shrink to content size
      minWidth = 4;  // Minimal width
    }
    
    // Get container constraints
    const maxWidth = Math.min(neededWidth, containerWidth);
    const finalWidth = Math.max(minWidth, maxWidth);
    
    // Set the calculated width
    this.wrapper.style.width = `${finalWidth}px`;
    
    // Apply flex-based solution - content-based sizing
    this.wrapper.style.flex = '0 1 auto';  // No grow, shrink, auto basis
    this.wrapper.style.maxWidth = '100%';
    this.wrapper.style.minWidth = `${minWidth}px`;
    
    // Use scrollHeight for accurate height calculation
    this.element.style.height = 'auto';
    this.element.style.height = this.element.scrollHeight + 'px';
    
    console.log(`[handleLineBreakMode] Lines: ${lines.length}, Width: ${finalWidth}px, Using hybrid flex approach`);
  }
  
  /**
   * Handle sizing for unwrapped text (calculate both width and height)
   */
  handleUnwrappedMode(text, containerWidth, totalPadding, cursorBuffer, lineHeight, paddingTop, paddingBottom) {
    // Measure straight-line width
    this.widthState.measureElement.textContent = text;
    const straightLineWidth = this.widthState.measureElement.offsetWidth;
    
    // Calculate desired width
    const desiredWidth = straightLineWidth + totalPadding + cursorBuffer;
    
    // DEBUG: Log measurement details
    const measuredFontSize = window.getComputedStyle(this.widthState.measureElement).fontSize;
    const actualFontSize = window.getComputedStyle(this.element).fontSize;
    console.log(`[DEBUG handleUnwrappedMode] Text: "${text.substring(0, 20)}...", Measured font: ${measuredFontSize}, Actual font: ${actualFontSize}, Text width: ${straightLineWidth}px`);
    
    // Calculate minimum width - only use placeholder width when empty
    let minWidth;
    if (!text || text.trim().length === 0) {
      // Empty input - use placeholder width as minimum
      this.widthState.measureElement.textContent = this.element.placeholder || '';
      const placeholderWidth = this.widthState.measureElement.offsetWidth;
      minWidth = placeholderWidth + totalPadding + cursorBuffer;
    } else {
      // Has content - allow it to shrink to content size
      minWidth = 4;  // Minimal width
    }
    
    // Determine if we need to wrap
    const willWrap = desiredWidth > containerWidth;
    const finalWidth = willWrap ? containerWidth : Math.max(minWidth, desiredWidth);
    
    // DEBUG: Log width calculations
    const oldWidth = this.wrapper.style.width;
    console.log(`[DEBUG handleUnwrappedMode] Old width: ${oldWidth}, Desired: ${desiredWidth}px, Final: ${finalWidth}px, Will wrap: ${willWrap}`);
    
    // Set the calculated width
    this.wrapper.style.width = `${finalWidth}px`;
    
    // Apply flex-based solution - content-based sizing
    this.wrapper.style.flex = '0 1 auto';  // No grow, shrink, auto basis
    this.wrapper.style.maxWidth = '100%';
    this.wrapper.style.minWidth = `${minWidth}px`;
    
    // Use scrollHeight for accurate height calculation
    this.element.style.height = 'auto';
    this.element.style.height = `${this.element.scrollHeight}px`;
    
    console.log(`[handleUnwrappedMode] Width: ${finalWidth}px, Height: ${this.element.scrollHeight}px`);
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
    
    // Setup viewport resize handling
    this.setupViewportResizeHandling();
    
    console.log(`[text_input_component_engine] Rendered input with horizontal expansion:`, this.options.id);
    
    return this.element;
  }
  
  /**
   * Create hidden element for measuring text width
   */
  createMeasurementElement() {
    this.widthState.measureElement = document.createElement('div');
    this.widthState.measureElement.className = 'text-measurement-helper';
    // All styles now handled by CSS class - no inline styles needed
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
    
    // Refresh measurement element styles to ensure current viewport sizing
    this.refreshMeasurementStyles();
    
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
    
    // Set the calculated width
    this.wrapper.style.width = `${finalWidth}px`;
    
    // Apply flex-based solution - content-based sizing
    this.wrapper.style.flex = '0 1 auto';  // No grow, shrink, auto basis
    this.wrapper.style.maxWidth = '100%';
    this.wrapper.style.minWidth = `${minWidth}px`;
    
    // Debug logging
    console.log(`[updateWidth] Text: "${singleLineText}" (${singleLineText.length} chars)`);
    console.log(`[updateWidth] Text width: ${textWidth}px, Final width: ${finalWidth}px`);
    console.log(`[updateWidth] Using hybrid approach with flex properties`);
  }
  
  /**
   * Setup viewport resize handling
   */
  setupViewportResizeHandling() {
    // Static tracker for all instances
    if (!text_input_component_engine.viewportListenerAdded) {
      text_input_component_engine.viewportListenerAdded = true;
      text_input_component_engine.instances = new Set();
      
      // Add single global viewport resize listener
      window.addEventListener('resize', () => {
        // Notify all text input instances
        text_input_component_engine.instances.forEach(instance => {
          instance.handleViewportResize();
        });
      });
    }
    
    // Add this instance to the set
    text_input_component_engine.instances.add(this);
  }
  
  /**
   * Handle viewport resize events
   */
  handleViewportResize() {
    // Cancel any pending frame
    if (this.viewportResizeFrame) {
      cancelAnimationFrame(this.viewportResizeFrame);
    }
    
    // Schedule update for next frame
    this.viewportResizeFrame = requestAnimationFrame(() => {
      console.log('[handleViewportResize] Viewport resized, updating measurements');
      
      // Refresh measurement styles and recalculate
      if (this.options.expandable) {
        this.handleSizeApproximation(this.element.value || '', true);
      } else {
        this.updateWidth();
      }
      
      this.viewportResizeFrame = null;
    });
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
        console.log(`[DEBUG handleResize] Container width changed from ${this.widthState.containerWidth}px to ${newWidth}px`);
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
    // Remove from global instances set
    if (text_input_component_engine.instances) {
      text_input_component_engine.instances.delete(this);
    }
    
    // Cancel any pending animation frame
    if (this.viewportResizeFrame) {
      cancelAnimationFrame(this.viewportResizeFrame);
      this.viewportResizeFrame = null;
    }
    
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

/**
 * text_input_component_engine_length_capped
 *
 * Sibling class to text_input_component_engine. First step: functionally
 * identical — same logic, same rendering, same animations. Subsequent
 * iterations will layer on character/length-capped wrapping behaviour
 * derived from the measurement pattern in the original engine.
 *
 * Static properties (instances set, viewportListenerAdded flag) are
 * namespaced to this class so the two engines maintain independent
 * resize-listener state and don't cross-talk.
 */
class text_input_component_engine_length_capped {
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
      charCap: options.charCap || 66,
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

    // Viewport resize state
    this.viewportResizeFrame = null;

    // Bound methods
    this.handleMousePositionUpdate = this.handleMousePositionUpdate.bind(this);
    this.updateWidth = this.updateWidth.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.handleViewportResize = this.handleViewportResize.bind(this);

    console.log(`[text_input_component_engine_length_capped] Initialized with hover animations:`, this.options);
  }

  /**
   * Refresh measurement element styles from input element
   * With CSS approach, this is no longer needed as CSS variables handle it
   */
  refreshMeasurementStyles() {
    // CSS variables now handle all style synchronization
    // No JavaScript copying needed
    console.log('[refreshMeasurementStyles] CSS variables handle style sync');
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

    // Refresh measurement element styles to ensure current viewport sizing
    this.refreshMeasurementStyles();

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
    let longestLine = '';

    // Measure each line to find the widest
    lines.forEach(line => {
      // Use a space for empty lines to ensure measurement
      this.widthState.measureElement.textContent = line || ' ';
      const lineWidth = this.widthState.measureElement.offsetWidth;
      if (lineWidth > maxLineWidth) {
        maxLineWidth = lineWidth;
        longestLine = line || ' ';
      }
    });

    // Calculate needed width (with padding and cursor buffer)
    const neededWidth = maxLineWidth + totalPadding + cursorBuffer;

    // Calculate character-cap width using first N chars of longest line
    const charCap = this.options.charCap || 66;
    const capSample = longestLine.length >= charCap ? longestLine.substring(0, charCap) : longestLine;
    this.widthState.measureElement.textContent = capSample;
    const charCapContentWidth = this.widthState.measureElement.offsetWidth;
    const charCapWidth = charCapContentWidth + totalPadding + cursorBuffer;

    // Calculate minimum width - only use placeholder width when empty
    let minWidth;
    if (!text || text.trim().length === 0) {
      // Empty input - use placeholder width as minimum
      this.widthState.measureElement.textContent = this.element.placeholder || '';
      const placeholderWidth = this.widthState.measureElement.offsetWidth;
      minWidth = placeholderWidth + totalPadding + cursorBuffer;
    } else {
      // Has content - allow it to shrink to content size
      minWidth = 4;  // Minimal width
    }

    // Get container constraints - cap at both container width and char cap
    const effectiveCap = Math.min(containerWidth, charCapWidth);
    const maxWidth = Math.min(neededWidth, effectiveCap);
    const finalWidth = Math.max(minWidth, maxWidth);

    // Set the calculated width
    this.wrapper.style.width = `${finalWidth}px`;

    // Apply flex-based solution - content-based sizing
    this.wrapper.style.flex = '0 1 auto';  // No grow, shrink, auto basis
    this.wrapper.style.maxWidth = '100%';
    this.wrapper.style.minWidth = `${minWidth}px`;

    // Use scrollHeight for accurate height calculation
    this.element.style.height = 'auto';
    this.element.style.height = this.element.scrollHeight + 'px';

    console.log(`[handleLineBreakMode] Lines: ${lines.length}, Width: ${finalWidth}px, CharCap(${charCap}): ${charCapWidth}px, Using hybrid flex approach`);
  }

  /**
   * Handle sizing for unwrapped text (calculate both width and height)
   */
  handleUnwrappedMode(text, containerWidth, totalPadding, cursorBuffer, lineHeight, paddingTop, paddingBottom) {
    // Measure straight-line width
    this.widthState.measureElement.textContent = text;
    const straightLineWidth = this.widthState.measureElement.offsetWidth;

    // Calculate desired width
    const desiredWidth = straightLineWidth + totalPadding + cursorBuffer;

    // Calculate character-cap width: measure first N chars of actual text
    // If text is shorter than cap, cap width equals text width (no cap triggered)
    const charCap = this.options.charCap || 66;
    const capSample = text && text.length >= charCap ? text.substring(0, charCap) : (text || '');
    this.widthState.measureElement.textContent = capSample;
    const charCapContentWidth = this.widthState.measureElement.offsetWidth;
    const charCapWidth = charCapContentWidth + totalPadding + cursorBuffer;

    // DEBUG: Log measurement details
    const measuredFontSize = window.getComputedStyle(this.widthState.measureElement).fontSize;
    const actualFontSize = window.getComputedStyle(this.element).fontSize;
    console.log(`[DEBUG handleUnwrappedMode] Text: "${text.substring(0, 20)}...", Measured font: ${measuredFontSize}, Actual font: ${actualFontSize}, Text width: ${straightLineWidth}px, CharCap(${charCap}) width: ${charCapWidth}px`);

    // Calculate minimum width - only use placeholder width when empty
    let minWidth;
    if (!text || text.trim().length === 0) {
      // Empty input - use placeholder width as minimum
      this.widthState.measureElement.textContent = this.element.placeholder || '';
      const placeholderWidth = this.widthState.measureElement.offsetWidth;
      minWidth = placeholderWidth + totalPadding + cursorBuffer;
    } else {
      // Has content - allow it to shrink to content size
      minWidth = 4;  // Minimal width
    }

    // Effective cap is the smaller of container width and char-cap width
    const effectiveCap = Math.min(containerWidth, charCapWidth);

    // Determine if we need to wrap (exceeds either container or char-cap)
    const willWrap = desiredWidth > effectiveCap;
    const finalWidth = willWrap ? effectiveCap : Math.max(minWidth, desiredWidth);

    // DEBUG: Log width calculations
    const oldWidth = this.wrapper.style.width;
    console.log(`[DEBUG handleUnwrappedMode] Old width: ${oldWidth}, Desired: ${desiredWidth}px, EffectiveCap: ${effectiveCap}px, Final: ${finalWidth}px, Will wrap: ${willWrap}`);

    // Set the calculated width
    this.wrapper.style.width = `${finalWidth}px`;

    // Apply flex-based solution - content-based sizing
    this.wrapper.style.flex = '0 1 auto';  // No grow, shrink, auto basis
    this.wrapper.style.maxWidth = '100%';
    this.wrapper.style.minWidth = `${minWidth}px`;

    // Use scrollHeight for accurate height calculation
    this.element.style.height = 'auto';
    this.element.style.height = `${this.element.scrollHeight}px`;

    console.log(`[handleUnwrappedMode] Width: ${finalWidth}px, Height: ${this.element.scrollHeight}px`);
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
      console.error(`[text_input_component_engine_length_capped] Container not found:`, container);
      return null;
    }

    // Create wrapper div with data-lines attribute
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'dynamic-input-wrapper';
    this.wrapper.setAttribute('data-lines', '1');
    // Length-capped engine reads as prose — left-align text. Set on wrapper
    // for inherited elements; element itself also needs it because
    // .dynamic-text-input explicitly sets text-align: center.
    this.wrapper.style.textAlign = 'left';

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
    // Override .dynamic-text-input { text-align: center } from _inputs.scss.
    // Length-capped engine reads as prose, so force left alignment.
    this.element.style.textAlign = 'left';

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

    // Setup viewport resize handling
    this.setupViewportResizeHandling();

    console.log(`[text_input_component_engine_length_capped] Rendered input with horizontal expansion:`, this.options.id);

    return this.element;
  }

  /**
   * Create hidden element for measuring text width
   */
  createMeasurementElement() {
    this.widthState.measureElement = document.createElement('div');
    this.widthState.measureElement.className = 'text-measurement-helper';
    // All styles now handled by CSS class - no inline styles needed
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

    // Refresh measurement element styles to ensure current viewport sizing
    this.refreshMeasurementStyles();

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

    // Calculate character-cap width based on first N chars of singleLineText
    const charCap = this.options.charCap || 66;
    const capSample = singleLineText.length >= charCap ? singleLineText.substring(0, charCap) : singleLineText;
    this.widthState.measureElement.textContent = capSample;
    const charCapContentWidth = this.widthState.measureElement.offsetWidth;
    const charCapWidth = charCapContentWidth + totalPadding + cursorBuffer;

    // Calculate minimum width based on content
    // Only use placeholder width as minimum when input is empty (placeholder visible)
    let minWidth;
    if (!hasValue && this.element.placeholder) {
      minWidth = placeholderWidth + totalPadding + cursorBuffer;
    } else {
      minWidth = 4;  // Minimal width for empty input without placeholder
    }

    // Effective cap is the smaller of container width and char-cap width
    const effectiveCap = Math.min(containerWidth, charCapWidth);

    // Set width to exactly what's needed, respecting minimum and effective cap
    const finalWidth = Math.max(minWidth, Math.min(desiredWidth, effectiveCap));

    // Set the calculated width
    this.wrapper.style.width = `${finalWidth}px`;

    // Apply flex-based solution - content-based sizing
    this.wrapper.style.flex = '0 1 auto';  // No grow, shrink, auto basis
    this.wrapper.style.maxWidth = '100%';
    this.wrapper.style.minWidth = `${minWidth}px`;

    // Debug logging
    console.log(`[updateWidth] Text: "${singleLineText}" (${singleLineText.length} chars)`);
    console.log(`[updateWidth] Text width: ${textWidth}px, CharCap(${charCap}): ${charCapWidth}px, Final width: ${finalWidth}px`);
    console.log(`[updateWidth] Using hybrid approach with flex properties + char cap`);
  }

  /**
   * Setup viewport resize handling
   */
  setupViewportResizeHandling() {
    // Static tracker for all instances
    if (!text_input_component_engine_length_capped.viewportListenerAdded) {
      text_input_component_engine_length_capped.viewportListenerAdded = true;
      text_input_component_engine_length_capped.instances = new Set();

      // Add single global viewport resize listener
      window.addEventListener('resize', () => {
        // Notify all text input instances
        text_input_component_engine_length_capped.instances.forEach(instance => {
          instance.handleViewportResize();
        });
      });
    }

    // Add this instance to the set
    text_input_component_engine_length_capped.instances.add(this);
  }

  /**
   * Handle viewport resize events
   */
  handleViewportResize() {
    // Cancel any pending frame
    if (this.viewportResizeFrame) {
      cancelAnimationFrame(this.viewportResizeFrame);
    }

    // Schedule update for next frame
    this.viewportResizeFrame = requestAnimationFrame(() => {
      console.log('[handleViewportResize] Viewport resized, updating measurements');

      // Refresh measurement styles and recalculate
      if (this.options.expandable) {
        this.handleSizeApproximation(this.element.value || '', true);
      } else {
        this.updateWidth();
      }

      this.viewportResizeFrame = null;
    });
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
        console.log(`[DEBUG handleResize] Container width changed from ${this.widthState.containerWidth}px to ${newWidth}px`);
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
      console.log(`[text_input_component_engine_length_capped] Applied stored value:`, storedValue);
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
          console.log('[text_input_component_engine_length_capped] Paste approximation applied');
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
    // Remove from global instances set
    if (text_input_component_engine_length_capped.instances) {
      text_input_component_engine_length_capped.instances.delete(this);
    }

    // Cancel any pending animation frame
    if (this.viewportResizeFrame) {
      cancelAnimationFrame(this.viewportResizeFrame);
      this.viewportResizeFrame = null;
    }

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

    console.log(`[text_input_component_engine_length_capped] Destroyed:`, this.options.id);
  }

  /**
   * Setup mouse tracking for global position
   * Now uses global mouse tracker instead of local tracking
   */
  setupMouseTracking() {
    // No longer need to add our own mousemove listener
    // Global mouse tracker handles this for all components
    console.log('[text_input_component_engine_length_capped] Using global mouse tracker');
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

/**
 * text_input_floating_label_component_engine
 *
 * Sibling class to text_input_component_engine. First step: functionally
 * identical — same logic, same rendering, same animations. Subsequent
 * iterations will layer on the floating-label (Material-style notched
 * outline) treatment so the field name floats from inside the box up
 * onto the border line on focus / when the input has a value.
 *
 * Static properties (instances set, viewportListenerAdded flag) are
 * namespaced to this class so the three text-input engines maintain
 * independent resize-listener state and don't cross-talk.
 */
class text_input_floating_label_component_engine {
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
      // null = no character cap (field flexes to wherever the container
      // ends). Pass an explicit number to opt back into a width ceiling.
      charCap: options.charCap || null,
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

    // Viewport resize state
    this.viewportResizeFrame = null;

    // Bound methods
    this.handleMousePositionUpdate = this.handleMousePositionUpdate.bind(this);
    this.updateWidth = this.updateWidth.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.handleViewportResize = this.handleViewportResize.bind(this);

    console.log(`[text_input_floating_label_component_engine] Initialized with hover animations:`, this.options);
  }

  /**
   * Defensive font-rendering sync: read the input element's COMPUTED
   * font properties and apply them to the measurement element with
   * !important so the engine's width math stays accurate regardless
   * of any CSS surprise (source order, specificity battles, future
   * rule additions). The JS becomes the source of truth — the ruler
   * measures characters at whatever the input is actually rendering
   * at, computed-style level. Called before every width calculation.
   */
  refreshMeasurementStyles() {
    if (!this.element || !this.widthState.measureElement) return;
    const cs = window.getComputedStyle(this.element);
    const ms = this.widthState.measureElement.style;
    ms.setProperty('font-size',      cs.fontSize,       'important');
    ms.setProperty('font-family',    cs.fontFamily,     'important');
    ms.setProperty('font-weight',    cs.fontWeight,     'important');
    ms.setProperty('font-style',     cs.fontStyle,      'important');
    ms.setProperty('letter-spacing', cs.letterSpacing,  'important');
    ms.setProperty('text-transform', cs.textTransform,  'important');
    ms.setProperty('line-height',    cs.lineHeight,     'important');
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
    const textToSize = text || this.options.placeholder || '';

    // Check if text is empty
    const isEmpty = !textToSize.trim();

    // Check if text has explicit line breaks
    const hasLineBreaks = textToSize.includes('\n');

    // Get current styles for accurate measurement
    const computedStyle = window.getComputedStyle(this.element);
    const innerComputedStyle = window.getComputedStyle(this.innerContainer);

    // Refresh measurement element styles to ensure current viewport sizing
    this.refreshMeasurementStyles();

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
    let longestLine = '';

    // Measure each line to find the widest
    lines.forEach(line => {
      // Use a space for empty lines to ensure measurement
      this.widthState.measureElement.textContent = line || ' ';
      const lineWidth = this.widthState.measureElement.offsetWidth;
      if (lineWidth > maxLineWidth) {
        maxLineWidth = lineWidth;
        longestLine = line || ' ';
      }
    });

    // Calculate needed width (with padding and cursor buffer)
    const neededWidth = maxLineWidth + totalPadding + cursorBuffer;

    // Calculate character-cap width using first N chars of longest line
    const charCap = this.options.charCap;
    let charCapWidth;
    if (charCap) {
      const capSample = longestLine.length >= charCap ? longestLine.substring(0, charCap) : longestLine;
      this.widthState.measureElement.textContent = capSample;
      const charCapContentWidth = this.widthState.measureElement.offsetWidth;
      charCapWidth = charCapContentWidth + totalPadding + cursorBuffer;
    } else {
      charCapWidth = Infinity;  // No cap — effectiveCap will just be the container width.
    }

    // Calculate minimum width — floating-label variant: always anchor to
    // placeholder width when one is set so the field doesn't snap narrower
    // the moment the user types their first character. Still allows growth
    // beyond the placeholder width as content gets longer.
    this.widthState.measureElement.textContent = this.options.placeholder || '';
    const placeholderWidth = this.widthState.measureElement.offsetWidth;
    let minWidth;
    if (this.options.placeholder) {
      minWidth = placeholderWidth + totalPadding + cursorBuffer;
    } else {
      minWidth = 4;  // No placeholder set — fall back to minimal width
    }

    // Get container constraints - cap at both container width and char cap
    const effectiveCap = Math.min(containerWidth, charCapWidth);
    const maxWidth = Math.min(neededWidth, effectiveCap);
    const finalWidth = Math.max(minWidth, maxWidth);

    // Set the calculated width
    this.wrapper.style.width = `${finalWidth}px`;

    // Apply flex-based solution - content-based sizing
    this.wrapper.style.flex = '0 1 auto';  // No grow, shrink, auto basis
    this.wrapper.style.maxWidth = '100%';
    this.wrapper.style.minWidth = `${minWidth}px`;

    // Use scrollHeight for accurate height calculation
    this.element.style.height = 'auto';
    this.element.style.height = this.element.scrollHeight + 'px';

    console.log(`[handleLineBreakMode] Lines: ${lines.length}, Width: ${finalWidth}px, CharCap(${charCap}): ${charCapWidth}px, Using hybrid flex approach`);
  }

  /**
   * Handle sizing for unwrapped text (calculate both width and height)
   */
  handleUnwrappedMode(text, containerWidth, totalPadding, cursorBuffer, lineHeight, paddingTop, paddingBottom) {
    // Measure straight-line width
    this.widthState.measureElement.textContent = text;
    const straightLineWidth = this.widthState.measureElement.offsetWidth;

    // Calculate desired width
    const desiredWidth = straightLineWidth + totalPadding + cursorBuffer;

    // Calculate character-cap width: measure first N chars of actual text
    // If text is shorter than cap, cap width equals text width (no cap triggered)
    const charCap = this.options.charCap;
    let charCapWidth;
    if (charCap) {
      const capSample = text && text.length >= charCap ? text.substring(0, charCap) : (text || '');
      this.widthState.measureElement.textContent = capSample;
      const charCapContentWidth = this.widthState.measureElement.offsetWidth;
      charCapWidth = charCapContentWidth + totalPadding + cursorBuffer;
    } else {
      charCapWidth = Infinity;  // No cap — effectiveCap will just be the container width.
    }

    // DEBUG: Log measurement details
    const measuredFontSize = window.getComputedStyle(this.widthState.measureElement).fontSize;
    const actualFontSize = window.getComputedStyle(this.element).fontSize;
    console.log(`[DEBUG handleUnwrappedMode] Text: "${text.substring(0, 20)}...", Measured font: ${measuredFontSize}, Actual font: ${actualFontSize}, Text width: ${straightLineWidth}px, CharCap(${charCap}) width: ${charCapWidth}px`);

    // Calculate minimum width — floating-label variant: always anchor to
    // placeholder width when one is set so the field doesn't snap narrower
    // the moment the user types their first character. Still allows growth
    // beyond the placeholder width as content gets longer.
    this.widthState.measureElement.textContent = this.options.placeholder || '';
    const placeholderWidth = this.widthState.measureElement.offsetWidth;
    let minWidth;
    if (this.options.placeholder) {
      minWidth = placeholderWidth + totalPadding + cursorBuffer;
    } else {
      minWidth = 4;  // No placeholder set — fall back to minimal width
    }

    // Effective cap is the smaller of container width and char-cap width
    const effectiveCap = Math.min(containerWidth, charCapWidth);

    // Determine if we need to wrap (exceeds either container or char-cap)
    const willWrap = desiredWidth > effectiveCap;
    const finalWidth = willWrap ? effectiveCap : Math.max(minWidth, desiredWidth);

    // DEBUG: Log width calculations
    const oldWidth = this.wrapper.style.width;
    console.log(`[DEBUG handleUnwrappedMode] Old width: ${oldWidth}, Desired: ${desiredWidth}px, EffectiveCap: ${effectiveCap}px, Final: ${finalWidth}px, Will wrap: ${willWrap}`);

    // Set the calculated width
    this.wrapper.style.width = `${finalWidth}px`;

    // Apply flex-based solution - content-based sizing
    this.wrapper.style.flex = '0 1 auto';  // No grow, shrink, auto basis
    this.wrapper.style.maxWidth = '100%';
    this.wrapper.style.minWidth = `${minWidth}px`;

    // Use scrollHeight for accurate height calculation
    this.element.style.height = 'auto';
    this.element.style.height = `${this.element.scrollHeight}px`;

    console.log(`[handleUnwrappedMode] Width: ${finalWidth}px, Height: ${this.element.scrollHeight}px`);
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
      console.error(`[text_input_floating_label_component_engine] Container not found:`, container);
      return null;
    }

    // Create wrapper div with data-lines attribute
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'dynamic-input-wrapper dynamic-input-wrapper--floating-label';
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
    this.innerContainer.className = 'text-input-inner text-input-inner--floating-label';

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
    this.element.className = 'dynamic-text-input dynamic-text-input--floating-label';
    // Floating-label engine: never set the HTML placeholder attribute on
    // the input element. The label DOM element fully replaces the
    // placeholder's visual role, so leaving the attribute empty avoids
    // the duplicate-text collision (label centered + native placeholder
    // left-aligned at once). Width measurement code reads
    // `this.options.placeholder` directly so the placeholder-pinned
    // minimum width feature still anchors against the original string.
    this.element.placeholder = '';
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

    // Floating label: positioned absolutely within the wrapper. At rest
    // the label sits horizontally and vertically centered inside the
    // field; when the engine adds the --floated modifier (on focus or
    // when the input has a value) the label eases up to sit centered on
    // the top border line, scaled down via transform.
    this.labelElement = document.createElement('label');
    this.labelElement.className = 'dynamic-input-label dynamic-input-label--floating-label';
    this.labelElement.htmlFor = this.options.id;
    this.labelElement.textContent = this.options.label || this.options.placeholder || '';
    this.wrapper.appendChild(this.labelElement);

    // Initial floated state if the input was created with a value.
    if (this.options.value) {
      this.labelElement.classList.add('dynamic-input-label--floating-label--floated');
    }

    // Wire focus / blur / input listeners that toggle the floated state.
    // Separate from attachEventListeners() — that method already binds
    // input/focus/blur for size and animation handling, and adding the
    // floated-state toggle as its own pass keeps the two concerns clean.
    const updateFloated = () => this.updateLabelFloatedState();
    this.element.addEventListener('focus', updateFloated);
    this.element.addEventListener('blur', updateFloated);
    this.element.addEventListener('input', updateFloated);

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

    // Setup viewport resize handling
    this.setupViewportResizeHandling();

    console.log(`[text_input_floating_label_component_engine] Rendered input with horizontal expansion:`, this.options.id);

    return this.element;
  }

  /**
   * Create hidden element for measuring text width
   */
  createMeasurementElement() {
    this.widthState.measureElement = document.createElement('div');
    this.widthState.measureElement.className = 'text-measurement-helper text-measurement-helper--floating-label';
    // All styles now handled by CSS class - no inline styles needed
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

    // Refresh measurement element styles to ensure current viewport sizing
    this.refreshMeasurementStyles();

    // Determine what to measure
    const hasValue = this.element.value && this.element.value.trim().length > 0;
    const textToMeasure = hasValue ? this.element.value : this.options.placeholder;

    // For single line inputs, prevent wrapping by measuring as one line
    // This ensures we expand BEFORE text wraps to line 2
    const singleLineText = textToMeasure.replace(/\n/g, ' ');

    // Measure the full text as if it were on one line
    this.widthState.measureElement.textContent = singleLineText;
    const textWidth = this.widthState.measureElement.offsetWidth;

    // Always measure placeholder for minimum width
    this.widthState.measureElement.textContent = this.options.placeholder;
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

    // Calculate character-cap width based on first N chars of singleLineText
    const charCap = this.options.charCap;
    let charCapWidth;
    if (charCap) {
      const capSample = singleLineText.length >= charCap ? singleLineText.substring(0, charCap) : singleLineText;
      this.widthState.measureElement.textContent = capSample;
      const charCapContentWidth = this.widthState.measureElement.offsetWidth;
      charCapWidth = charCapContentWidth + totalPadding + cursorBuffer;
    } else {
      charCapWidth = Infinity;  // No cap — effectiveCap will just be the container width.
    }

    // Calculate minimum width — floating-label variant: always anchor to
    // placeholder width when one is set so the field doesn't snap narrower
    // the moment the user types their first character. Still allows growth
    // beyond the placeholder width as content gets longer.
    let minWidth;
    if (this.options.placeholder) {
      minWidth = placeholderWidth + totalPadding + cursorBuffer;
    } else {
      minWidth = 4;  // No placeholder set — fall back to minimal width
    }

    // Effective cap is the smaller of container width and char-cap width
    const effectiveCap = Math.min(containerWidth, charCapWidth);

    // Set width to exactly what's needed, respecting minimum and effective cap
    const finalWidth = Math.max(minWidth, Math.min(desiredWidth, effectiveCap));

    // Set the calculated width
    this.wrapper.style.width = `${finalWidth}px`;

    // Apply flex-based solution - content-based sizing
    this.wrapper.style.flex = '0 1 auto';  // No grow, shrink, auto basis
    this.wrapper.style.maxWidth = '100%';
    this.wrapper.style.minWidth = `${minWidth}px`;

    // Debug logging
    console.log(`[updateWidth] Text: "${singleLineText}" (${singleLineText.length} chars)`);
    console.log(`[updateWidth] Text width: ${textWidth}px, CharCap(${charCap}): ${charCapWidth}px, Final width: ${finalWidth}px`);
    console.log(`[updateWidth] Using hybrid approach with flex properties + char cap`);
  }

  /**
   * Setup viewport resize handling
   */
  setupViewportResizeHandling() {
    // Static tracker for all instances
    if (!text_input_floating_label_component_engine.viewportListenerAdded) {
      text_input_floating_label_component_engine.viewportListenerAdded = true;
      text_input_floating_label_component_engine.instances = new Set();

      // Add single global viewport resize listener
      window.addEventListener('resize', () => {
        // Notify all text input instances
        text_input_floating_label_component_engine.instances.forEach(instance => {
          instance.handleViewportResize();
        });
      });
    }

    // Add this instance to the set
    text_input_floating_label_component_engine.instances.add(this);
  }

  /**
   * Handle viewport resize events
   */
  handleViewportResize() {
    // Cancel any pending frame
    if (this.viewportResizeFrame) {
      cancelAnimationFrame(this.viewportResizeFrame);
    }

    // Schedule update for next frame
    this.viewportResizeFrame = requestAnimationFrame(() => {
      console.log('[handleViewportResize] Viewport resized, updating measurements');

      // Refresh measurement styles and recalculate
      if (this.options.expandable) {
        this.handleSizeApproximation(this.element.value || '', true);
      } else {
        this.updateWidth();
      }

      this.viewportResizeFrame = null;
    });
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
        console.log(`[DEBUG handleResize] Container width changed from ${this.widthState.containerWidth}px to ${newWidth}px`);
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
      console.log(`[text_input_floating_label_component_engine] Applied stored value:`, storedValue);
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
          console.log('[text_input_floating_label_component_engine] Paste approximation applied');
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
   * Sync the floating label's --floated class against current input state.
   * Floated when the input is focused OR has a non-empty value. Called
   * from focus / blur / input listeners attached in render().
   */
  updateLabelFloatedState() {
    if (!this.labelElement || !this.element) return;
    const focused = document.activeElement === this.element;
    const hasValue = !!(this.element.value && this.element.value.length > 0);
    const shouldFloat = focused || hasValue;
    this.labelElement.classList.toggle(
      'dynamic-input-label--floating-label--floated',
      shouldFloat
    );
  }

  /**
   * Destroy the component and clean up
   */
  destroy() {
    // Remove from global instances set
    if (text_input_floating_label_component_engine.instances) {
      text_input_floating_label_component_engine.instances.delete(this);
    }

    // Cancel any pending animation frame
    if (this.viewportResizeFrame) {
      cancelAnimationFrame(this.viewportResizeFrame);
      this.viewportResizeFrame = null;
    }

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

    console.log(`[text_input_floating_label_component_engine] Destroyed:`, this.options.id);
  }

  /**
   * Setup mouse tracking for global position
   * Now uses global mouse tracker instead of local tracking
   */
  setupMouseTracking() {
    // No longer need to add our own mousemove listener
    // Global mouse tracker handles this for all components
    console.log('[text_input_floating_label_component_engine] Using global mouse tracker');
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

/**
 * list_floating_label_component_engine
 *
 * Sibling class to text_input_component_engine. First step: functionally
 * identical — same logic, same rendering, same animations. Subsequent
 * iterations will layer on the floating-label (Material-style notched
 * outline) treatment so the field name floats from inside the box up
 * onto the border line on focus / when the input has a value.
 *
 * Static properties (instances set, viewportListenerAdded flag) are
 * namespaced to this class so the three text-input engines maintain
 * independent resize-listener state and don't cross-talk.
 */
class list_floating_label_component_engine {
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
      // null = no character cap (field flexes to wherever the container
      // ends). Pass an explicit number to opt back into a width ceiling.
      charCap: options.charCap || null,
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

    // Viewport resize state
    this.viewportResizeFrame = null;

    // Bound methods
    this.handleMousePositionUpdate = this.handleMousePositionUpdate.bind(this);
    this.updateWidth = this.updateWidth.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.handleViewportResize = this.handleViewportResize.bind(this);

    console.log(`[list_floating_label_component_engine] Initialized with hover animations:`, this.options);
  }

  /**
   * Defensive font-rendering sync: read the input element's COMPUTED
   * font properties and apply them to the measurement element with
   * !important so the engine's width math stays accurate regardless
   * of any CSS surprise (source order, specificity battles, future
   * rule additions). The JS becomes the source of truth — the ruler
   * measures characters at whatever the input is actually rendering
   * at, computed-style level. Called before every width calculation.
   */
  refreshMeasurementStyles() {
    if (!this.element || !this.widthState.measureElement) return;
    const cs = window.getComputedStyle(this.element);
    const ms = this.widthState.measureElement.style;
    ms.setProperty('font-size',      cs.fontSize,       'important');
    ms.setProperty('font-family',    cs.fontFamily,     'important');
    ms.setProperty('font-weight',    cs.fontWeight,     'important');
    ms.setProperty('font-style',     cs.fontStyle,      'important');
    ms.setProperty('letter-spacing', cs.letterSpacing,  'important');
    ms.setProperty('text-transform', cs.textTransform,  'important');
    ms.setProperty('line-height',    cs.lineHeight,     'important');
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
    const textToSize = text || this.options.placeholder || '';

    // Check if text is empty
    const isEmpty = !textToSize.trim();

    // Check if text has explicit line breaks
    const hasLineBreaks = textToSize.includes('\n');

    // Get current styles for accurate measurement
    const computedStyle = window.getComputedStyle(this.element);
    const innerComputedStyle = window.getComputedStyle(this.innerContainer);

    // Refresh measurement element styles to ensure current viewport sizing
    this.refreshMeasurementStyles();

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
    let longestLine = '';

    // Measure each line to find the widest
    lines.forEach(line => {
      // Use a space for empty lines to ensure measurement
      this.widthState.measureElement.textContent = line || ' ';
      const lineWidth = this.widthState.measureElement.offsetWidth;
      if (lineWidth > maxLineWidth) {
        maxLineWidth = lineWidth;
        longestLine = line || ' ';
      }
    });

    // Calculate needed width (with padding and cursor buffer)
    const neededWidth = maxLineWidth + totalPadding + cursorBuffer;

    // Calculate character-cap width using first N chars of longest line
    const charCap = this.options.charCap;
    let charCapWidth;
    if (charCap) {
      const capSample = longestLine.length >= charCap ? longestLine.substring(0, charCap) : longestLine;
      this.widthState.measureElement.textContent = capSample;
      const charCapContentWidth = this.widthState.measureElement.offsetWidth;
      charCapWidth = charCapContentWidth + totalPadding + cursorBuffer;
    } else {
      charCapWidth = Infinity;  // No cap — effectiveCap will just be the container width.
    }

    // Calculate minimum width — floating-label variant: always anchor to
    // placeholder width when one is set so the field doesn't snap narrower
    // the moment the user types their first character. Still allows growth
    // beyond the placeholder width as content gets longer.
    this.widthState.measureElement.textContent = this.options.placeholder || '';
    const placeholderWidth = this.widthState.measureElement.offsetWidth;
    let minWidth;
    if (this.options.placeholder) {
      minWidth = placeholderWidth + totalPadding + cursorBuffer;
    } else {
      minWidth = 4;  // No placeholder set — fall back to minimal width
    }

    // Get container constraints - cap at both container width and char cap
    const effectiveCap = Math.min(containerWidth, charCapWidth);
    const maxWidth = Math.min(neededWidth, effectiveCap);
    const finalWidth = Math.max(minWidth, maxWidth);

    // Set the calculated width
    this.wrapper.style.width = `${finalWidth}px`;

    // Apply flex-based solution - content-based sizing
    this.wrapper.style.flex = '0 1 auto';  // No grow, shrink, auto basis
    this.wrapper.style.maxWidth = '100%';
    this.wrapper.style.minWidth = `${minWidth}px`;

    // Use scrollHeight for accurate height calculation
    this.element.style.height = 'auto';
    this.element.style.height = this.element.scrollHeight + 'px';

    console.log(`[handleLineBreakMode] Lines: ${lines.length}, Width: ${finalWidth}px, CharCap(${charCap}): ${charCapWidth}px, Using hybrid flex approach`);
  }

  /**
   * Handle sizing for unwrapped text (calculate both width and height)
   */
  handleUnwrappedMode(text, containerWidth, totalPadding, cursorBuffer, lineHeight, paddingTop, paddingBottom) {
    // Measure straight-line width
    this.widthState.measureElement.textContent = text;
    const straightLineWidth = this.widthState.measureElement.offsetWidth;

    // Calculate desired width
    const desiredWidth = straightLineWidth + totalPadding + cursorBuffer;

    // Calculate character-cap width: measure first N chars of actual text
    // If text is shorter than cap, cap width equals text width (no cap triggered)
    const charCap = this.options.charCap;
    let charCapWidth;
    if (charCap) {
      const capSample = text && text.length >= charCap ? text.substring(0, charCap) : (text || '');
      this.widthState.measureElement.textContent = capSample;
      const charCapContentWidth = this.widthState.measureElement.offsetWidth;
      charCapWidth = charCapContentWidth + totalPadding + cursorBuffer;
    } else {
      charCapWidth = Infinity;  // No cap — effectiveCap will just be the container width.
    }

    // DEBUG: Log measurement details
    const measuredFontSize = window.getComputedStyle(this.widthState.measureElement).fontSize;
    const actualFontSize = window.getComputedStyle(this.element).fontSize;
    console.log(`[DEBUG handleUnwrappedMode] Text: "${text.substring(0, 20)}...", Measured font: ${measuredFontSize}, Actual font: ${actualFontSize}, Text width: ${straightLineWidth}px, CharCap(${charCap}) width: ${charCapWidth}px`);

    // Calculate minimum width — floating-label variant: always anchor to
    // placeholder width when one is set so the field doesn't snap narrower
    // the moment the user types their first character. Still allows growth
    // beyond the placeholder width as content gets longer.
    this.widthState.measureElement.textContent = this.options.placeholder || '';
    const placeholderWidth = this.widthState.measureElement.offsetWidth;
    let minWidth;
    if (this.options.placeholder) {
      minWidth = placeholderWidth + totalPadding + cursorBuffer;
    } else {
      minWidth = 4;  // No placeholder set — fall back to minimal width
    }

    // Effective cap is the smaller of container width and char-cap width
    const effectiveCap = Math.min(containerWidth, charCapWidth);

    // Determine if we need to wrap (exceeds either container or char-cap)
    const willWrap = desiredWidth > effectiveCap;
    const finalWidth = willWrap ? effectiveCap : Math.max(minWidth, desiredWidth);

    // DEBUG: Log width calculations
    const oldWidth = this.wrapper.style.width;
    console.log(`[DEBUG handleUnwrappedMode] Old width: ${oldWidth}, Desired: ${desiredWidth}px, EffectiveCap: ${effectiveCap}px, Final: ${finalWidth}px, Will wrap: ${willWrap}`);

    // Set the calculated width
    this.wrapper.style.width = `${finalWidth}px`;

    // Apply flex-based solution - content-based sizing
    this.wrapper.style.flex = '0 1 auto';  // No grow, shrink, auto basis
    this.wrapper.style.maxWidth = '100%';
    this.wrapper.style.minWidth = `${minWidth}px`;

    // Use scrollHeight for accurate height calculation
    this.element.style.height = 'auto';
    this.element.style.height = `${this.element.scrollHeight}px`;

    console.log(`[handleUnwrappedMode] Width: ${finalWidth}px, Height: ${this.element.scrollHeight}px`);
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
   * Render the list selector into the specified container.
   * Creates a focusable display <div> (no <input>), a floating label, and
   * a dropdown panel populated from this.options.items. Field width is
   * sized to the widest item via the hidden measurement helper.
   */
  render(container) {
    // Get container element
    const containerEl = typeof container === 'string'
      ? document.getElementById(container)
      : container;

    if (!containerEl) {
      console.error(`[list_floating_label_component_engine] Container not found:`, container);
      return null;
    }

    // Wrapper — same chrome as text_input_floating_label_component_engine.
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'dynamic-input-wrapper dynamic-input-wrapper--floating-label';
    this.wrapper.setAttribute('data-lines', '1');

    // Animated border container — slides on hover/focus, unchanged.
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

    // Inner container — same as parent class.
    this.innerContainer = document.createElement('div');
    this.innerContainer.className = 'text-input-inner text-input-inner--floating-label';

    // The field is a real <input type="text"> — combobox pattern. The user
    // can type to filter the dropdown OR click to browse the full list.
    // Using an <input> rather than a <div> means we get natural element
    // height baked in by the browser (no empty-div collapse problem) and
    // free typing-with-caret behavior. role=combobox + aria-* keep it
    // accessible. autocomplete=off disables browser autofill so it doesn't
    // fight our own list. Strict mode (default) validates on blur — if the
    // typed text doesn't match an item, the field reverts to last selection.
    this.element = document.createElement('input');
    this.element.type = 'text';
    this.element.id = this.options.id;
    this.element.name = this.options.name;
    this.element.className = 'dynamic-text-input dynamic-text-input--floating-label dynamic-list-display';
    this.element.setAttribute('role', 'combobox');
    this.element.setAttribute('aria-expanded', 'false');
    this.element.setAttribute('aria-autocomplete', 'list');
    this.element.setAttribute('autocomplete', 'off');
    this.element.placeholder = '';  // floating label handles the placeholder role
    this.element.value = this.options.value || '';
    // Track the canonical "committed" value separately from the input's
    // current text — the input may show partial typing, but _committedValue
    // is the last item the user actually selected.
    this._committedValue = this.options.value || '';
    // Highlighted index for keyboard navigation through dropdown rows.
    this._highlightedIndex = -1;
    // Current filtered subset of items (full list when no filter active).
    this._filteredItems = (this.options.items || []).slice();

    this.innerContainer.appendChild(this.element);
    this.wrapper.appendChild(this.innerContainer);

    // Floating label — identical to parent class.
    this.labelElement = document.createElement('label');
    this.labelElement.className = 'dynamic-input-label dynamic-input-label--floating-label';
    this.labelElement.htmlFor = this.options.id;
    this.labelElement.textContent = this.options.label || this.options.placeholder || '';
    this.wrapper.appendChild(this.labelElement);

    if (this.options.value) {
      this.labelElement.classList.add('dynamic-input-label--floating-label--floated');
    }

    // Dropdown panel: hidden by default, opens on click. One row per item.
    this.dropdownElement = document.createElement('div');
    this.dropdownElement.className = 'dynamic-list-dropdown';
    this.dropdownElement.setAttribute('role', 'listbox');
    this.populateDropdown(this.options.items || []);
    this.wrapper.appendChild(this.dropdownElement);

    containerEl.appendChild(this.wrapper);

    // Reuse the parent class's measurement helper — its CSS modifier
    // (.text-measurement-helper--floating-label) already sets h4 font, so
    // it measures items at the same size the display renders them.
    this.createMeasurementElement();

    // List-specific event wiring (click toggles dropdown, item click selects,
    // outside-click closes, focus/blur drives the floating label state).
    this.setupListEventListeners();

    // Initial width: size to widest item, capped at container width.
    this.measureLongestItemWidth();

    // Animation systems — unchanged from parent class. The element is a
    // focusable div with tabindex=0, so focus/blur fire correctly and the
    // border slide animations continue to work.
    this.setupMouseTracking();
    this.setupHoverAnimation();
    this.startContinuousMonitoring();

    // Viewport resize → re-measure (h4 font scales with viewport via
    // clamp, so the longest item's pixel width changes when the window
    // resizes). handleViewportResize is overridden below to call
    // measureLongestItemWidth instead of the parent's text-width math.
    this.setupViewportResizeHandling();

    console.log(`[list_floating_label_component_engine] Rendered list with ${(this.options.items || []).length} items:`, this.options.id);

    return this.element;
  }

  /**
   * Create hidden element for measuring text width
   */
  createMeasurementElement() {
    this.widthState.measureElement = document.createElement('div');
    this.widthState.measureElement.className = 'text-measurement-helper text-measurement-helper--floating-label';
    // All styles now handled by CSS class - no inline styles needed
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

    // Refresh measurement element styles to ensure current viewport sizing
    this.refreshMeasurementStyles();

    // Determine what to measure
    const hasValue = this.element.value && this.element.value.trim().length > 0;
    const textToMeasure = hasValue ? this.element.value : this.options.placeholder;

    // For single line inputs, prevent wrapping by measuring as one line
    // This ensures we expand BEFORE text wraps to line 2
    const singleLineText = textToMeasure.replace(/\n/g, ' ');

    // Measure the full text as if it were on one line
    this.widthState.measureElement.textContent = singleLineText;
    const textWidth = this.widthState.measureElement.offsetWidth;

    // Always measure placeholder for minimum width
    this.widthState.measureElement.textContent = this.options.placeholder;
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

    // Calculate character-cap width based on first N chars of singleLineText
    const charCap = this.options.charCap;
    let charCapWidth;
    if (charCap) {
      const capSample = singleLineText.length >= charCap ? singleLineText.substring(0, charCap) : singleLineText;
      this.widthState.measureElement.textContent = capSample;
      const charCapContentWidth = this.widthState.measureElement.offsetWidth;
      charCapWidth = charCapContentWidth + totalPadding + cursorBuffer;
    } else {
      charCapWidth = Infinity;  // No cap — effectiveCap will just be the container width.
    }

    // Calculate minimum width — floating-label variant: always anchor to
    // placeholder width when one is set so the field doesn't snap narrower
    // the moment the user types their first character. Still allows growth
    // beyond the placeholder width as content gets longer.
    let minWidth;
    if (this.options.placeholder) {
      minWidth = placeholderWidth + totalPadding + cursorBuffer;
    } else {
      minWidth = 4;  // No placeholder set — fall back to minimal width
    }

    // Effective cap is the smaller of container width and char-cap width
    const effectiveCap = Math.min(containerWidth, charCapWidth);

    // Set width to exactly what's needed, respecting minimum and effective cap
    const finalWidth = Math.max(minWidth, Math.min(desiredWidth, effectiveCap));

    // Set the calculated width
    this.wrapper.style.width = `${finalWidth}px`;

    // Apply flex-based solution - content-based sizing
    this.wrapper.style.flex = '0 1 auto';  // No grow, shrink, auto basis
    this.wrapper.style.maxWidth = '100%';
    this.wrapper.style.minWidth = `${minWidth}px`;

    // Debug logging
    console.log(`[updateWidth] Text: "${singleLineText}" (${singleLineText.length} chars)`);
    console.log(`[updateWidth] Text width: ${textWidth}px, CharCap(${charCap}): ${charCapWidth}px, Final width: ${finalWidth}px`);
    console.log(`[updateWidth] Using hybrid approach with flex properties + char cap`);
  }

  /**
   * Setup viewport resize handling
   */
  setupViewportResizeHandling() {
    // Static tracker for all instances
    if (!list_floating_label_component_engine.viewportListenerAdded) {
      list_floating_label_component_engine.viewportListenerAdded = true;
      list_floating_label_component_engine.instances = new Set();

      // Add single global viewport resize listener
      window.addEventListener('resize', () => {
        // Notify all text input instances
        list_floating_label_component_engine.instances.forEach(instance => {
          instance.handleViewportResize();
        });
      });
    }

    // Add this instance to the set
    list_floating_label_component_engine.instances.add(this);
  }

  /**
   * Handle viewport resize events
   */
  handleViewportResize() {
    // Cancel any pending frame
    if (this.viewportResizeFrame) {
      cancelAnimationFrame(this.viewportResizeFrame);
    }
    // Re-measure the longest item — clamp font scales with viewport.
    this.viewportResizeFrame = requestAnimationFrame(() => {
      console.log('[handleViewportResize] Viewport resized, re-measuring longest item');
      this.measureLongestItemWidth();
      this.viewportResizeFrame = null;
    });
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
        console.log(`[DEBUG handleResize] Container width changed from ${this.widthState.containerWidth}px to ${newWidth}px`);
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
      console.log(`[list_floating_label_component_engine] Applied stored value:`, storedValue);
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
          console.log('[list_floating_label_component_engine] Paste approximation applied');
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
   * Sync the floating label's --floated class against current input state.
   * Floated when the input is focused OR has a non-empty value. Called
   * from focus / blur / input listeners attached in render().
   */
  updateLabelFloatedState() {
    if (!this.labelElement || !this.element) return;
    const focused = document.activeElement === this.element;
    const hasValue = !!(this.element.value && this.element.value.length > 0);
    const shouldFloat = focused || hasValue;
    this.labelElement.classList.toggle(
      'dynamic-input-label--floating-label--floated',
      shouldFloat
    );
  }

  /**
   * Populate the dropdown panel with one row per item. Each row is
   * clickable and selects its item on click.
   */
  populateDropdown(items) {
    if (!this.dropdownElement) return;
    this.dropdownElement.innerHTML = '';
    items.forEach((item, idx) => {
      const row = document.createElement('div');
      row.className = 'dynamic-list-item';
      row.setAttribute('role', 'option');
      row.setAttribute('data-value', item);
      row.setAttribute('data-index', String(idx));
      row.textContent = item;
      this.dropdownElement.appendChild(row);
    });
  }

  /**
   * Replace the engine's items list with a new array. Updates options.items,
   * the filtered subset, the dropdown rows, the highlighted row, and
   * re-runs measureLongestItemWidth so the wrapper resizes to fit the new
   * longest item. Use this when an upstream control filters the list (e.g.
   * a Type picker that switches the Region picker between States and
   * Territories).
   *
   * Optionally clears the current input value so the user starts fresh
   * from the new list.
   */
  setItems(newItems, { clearValue = true } = {}) {
    this.options.items = Array.isArray(newItems) ? newItems.slice() : [];
    this._filteredItems = this.options.items.slice();
    this._highlightedIndex = -1;
    this.populateDropdown(this._filteredItems);
    if (clearValue && this.element) {
      this.element.value = '';
      this._committedValue = '';
      this.options.value = '';
      this.updateLabelFloatedState();
    }
    this.measureLongestItemWidth();
  }

  /**
   * Size the wrapper to fit the widest item in the list. Mirrors the
   * collapsed-navbar pattern (handleCollapsedNavbar in dimensions.js):
   * for each item, build a clone of the inner container shape with that
   * item's text inside, measure the clone's natural rendered offsetWidth
   * via the shared measureRenderedWidths utility, take the max.
   *
   * Why a clone of the inner container? It carries the exact same padding,
   * border, and box-sizing as the real one, so the offsetWidth reading
   * already includes all the chrome — no manual padding-summation math
   * that can drift out of sync with the CSS.
   *
   * The measured "candidates" include the floating label text in addition
   * to all items, because at rest the label sits centered inside the field
   * and the wrapper must be wide enough to fit it.
   *
   * Capped at the parent container's width so the field shrinks gracefully
   * when the parent doesn't have room for the longest item.
   */
  measureLongestItemWidth() {
    if (!this.element || !this.innerContainer || !this.wrapper) return;

    // Snapshot the actual input's computed font properties so the span
    // we put inside each clone renders text at exactly the same metrics.
    const inputCS = window.getComputedStyle(this.element);
    const fontProps = {
      fontFamily: inputCS.fontFamily,
      fontSize: inputCS.fontSize,
      fontWeight: inputCS.fontWeight,
      fontStyle: inputCS.fontStyle,
      letterSpacing: inputCS.letterSpacing,
      textTransform: inputCS.textTransform,
      lineHeight: inputCS.lineHeight,
    };

    // Candidates to measure: the label text (so the field fits its label
    // at rest) plus every selectable item.
    const candidates = [
      this.labelElement && this.labelElement.textContent,
      ...(this.options.items || []),
    ].filter(Boolean);

    // Factory: clone the inner container shallow (we don't want the
    // real input — it has width: 100% and won't size to content), give
    // the clone an explicit `width: auto` so it sizes to its child, then
    // drop in a span carrying the item text styled with the input's font.
    const innerClone = this.innerContainer.cloneNode(false);
    innerClone.style.width = 'auto';

    const factoryFn = (text) => {
      const wrapper = innerClone.cloneNode(false);
      wrapper.style.width = 'auto';
      const span = document.createElement('span');
      Object.assign(span.style, fontProps);
      span.style.whiteSpace = 'pre';
      span.textContent = text;
      wrapper.appendChild(span);
      return wrapper;
    };

    const { maxWidth } = measureRenderedWidths(candidates, factoryFn);

    // Cursor buffer matches the floating-label engine so the caret has
    // visual breathing room when the user types in the combobox input.
    const cursorBuffer = 20;
    const finalWidth = maxWidth + cursorBuffer;

    // No JS-side cap on parent.offsetWidth here. The wrapper's parent in
    // .sidenav-content (and other flex-column containers with align-items:
    // center) shrinks to fit its content, so reading parent.offsetWidth
    // would just give us back our own previously-set width — a circular
    // dependency that locked the field to whatever it happened to be on
    // the first frame. The wrapper's CSS max-width: 100% caps it against
    // the actual flex container's available width when needed — and "100%"
    // in flex context resolves against the flex container, not the
    // shrunk-to-content immediate parent.
    this.wrapper.style.width = `${finalWidth}px`;
    this.wrapper.style.flex = '0 1 auto';
    this.wrapper.style.maxWidth = '100%';

    console.log(`[measureLongestItemWidth] candidates=${candidates.length}, maxWidth=${maxWidth}px, final=${finalWidth}px`);
  }

  /**
   * Commit a selection: update the input's value, the canonical
   * _committedValue, float the label, close the dropdown, fire the
   * change handler, persist to localStorage if configured.
   */
  selectItem(value) {
    this.options.value = value;
    this._committedValue = value;
    if (this.element) {
      this.element.value = value;
    }
    this.updateLabelFloatedState();
    this.closeDropdown();
    if (this.changeHandler) {
      this.changeHandler(value, this.options.id);
    }
    if (this.options.storageKey) {
      try { localStorage.setItem(this.options.storageKey, value); } catch (_) {}
    }
  }

  openDropdown() {
    if (!this.dropdownElement || !this.element) return;
    this.dropdownElement.classList.add('dynamic-list-dropdown--open');
    this.element.setAttribute('aria-expanded', 'true');
  }

  closeDropdown() {
    if (!this.dropdownElement || !this.element) return;
    this.dropdownElement.classList.remove('dynamic-list-dropdown--open');
    this.element.setAttribute('aria-expanded', 'false');
  }

  toggleDropdown() {
    if (!this.dropdownElement) return;
    if (this.isDropdownOpen()) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  isDropdownOpen() {
    return !!(this.dropdownElement
      && this.dropdownElement.classList.contains('dynamic-list-dropdown--open'));
  }

  /**
   * Filter the dropdown rows using a two-tier match:
   *
   *   Tier 1 — Exact code match (case-insensitive). If the typed query
   *            equals the code in an item's trailing "(CODE)" suffix
   *            (e.g. typing "ar" → "Arkansas (AR)"), that item ranks at
   *            the top of the filtered list.
   *
   *   Tier 2 — Prefix match on the displayed name (the part of the
   *            item before the trailing "(CODE)" suffix, or the whole
   *            item if no suffix). Typing "ar" matches "Arizona",
   *            "Arkansas", "Armenia", "Aruba" — anything that BEGINS
   *            with "ar". Substring-anywhere matches (e.g. "ar" inside
   *            "Madagascar") are intentionally excluded.
   *
   * Empty query restores the full list. Items without a "(CODE)" suffix
   * (e.g. plain country-name lists used by the engines-page demo) only
   * participate in Tier 2 — codeOf() returns null and they never match
   * the code tier. Prefix-match still works on their full text.
   *
   * Resets the highlighted row to the first match (the top of Tier 1
   * if anything matched it, otherwise the top of Tier 2).
   */
  filterItems(query) {
    const items = this.options.items || [];
    const q = (query || '').trim().toLowerCase();

    if (!q) {
      this._filteredItems = items.slice();
    } else {
      const codeMatches = [];
      const prefixMatches = [];

      for (const item of items) {
        const text = String(item);
        // Extract the code(s) from a trailing "(CODE)" or "(ALIAS/CODE)"
        // suffix, if present. Multiple codes are separated by '/' so an
        // item can declare informal aliases (e.g. 'United Kingdom (UK/GB)'
        // — typing either 'uk' or 'gb' should match).
        const m = text.match(/\(([^)]+)\)\s*$/);
        const codes = m
          ? m[1].split('/').map((c) => c.trim().toLowerCase()).filter(Boolean)
          : [];
        // Name = text with the trailing "(CODE)" stripped, lowercased.
        // If no trailing code, the whole item is the name.
        const name = (m
          ? text.slice(0, m.index).trim()
          : text
        ).toLowerCase();

        if (codes.includes(q)) {
          codeMatches.push(item);
        } else if (name.startsWith(q)) {
          prefixMatches.push(item);
        }
        // Items matching neither tier are dropped from the filtered list.
      }

      this._filteredItems = [...codeMatches, ...prefixMatches];
    }

    this.populateDropdown(this._filteredItems);
    this._highlightedIndex = this._filteredItems.length > 0 ? 0 : -1;
    this.applyHighlight();
  }

  /**
   * Move the keyboard-navigation highlight by `delta` rows (1 = down,
   * -1 = up). Wraps at top/bottom.
   */
  moveHighlight(delta) {
    const items = this._filteredItems || [];
    if (items.length === 0) {
      this._highlightedIndex = -1;
      return;
    }
    let next = this._highlightedIndex + delta;
    if (next < 0) next = items.length - 1;
    if (next >= items.length) next = 0;
    this._highlightedIndex = next;
    this.applyHighlight();
  }

  /**
   * Apply the --highlighted class to the row at _highlightedIndex,
   * remove it from all others, and scroll the highlighted row into view.
   */
  applyHighlight() {
    if (!this.dropdownElement) return;
    const rows = this.dropdownElement.querySelectorAll('.dynamic-list-item');
    rows.forEach((row, idx) => {
      if (idx === this._highlightedIndex) {
        row.classList.add('dynamic-list-item--highlighted');
        row.scrollIntoView({ block: 'nearest' });
      } else {
        row.classList.remove('dynamic-list-item--highlighted');
      }
    });
  }

  /**
   * On blur, decide what to do with the typed value. Strict mode
   * (default) requires an exact case-insensitive match against an item;
   * if no match, revert to the last committed value. Non-strict mode
   * accepts any typed text as the new committed value.
   */
  validateOnBlur() {
    if (!this.element) return;
    const strict = this.options.strict !== false;
    const typed = (this.element.value || '').trim();

    if (!strict) {
      this._committedValue = typed;
      this.options.value = typed;
      return;
    }

    if (typed === '') {
      this._committedValue = '';
      this.options.value = '';
      return;
    }

    const items = this.options.items || [];
    const exactMatch = items.find(item =>
      String(item).toLowerCase() === typed.toLowerCase()
    );
    if (exactMatch) {
      this.selectItem(exactMatch);
    } else {
      // No match — revert to the last committed value and restore full list
      this.element.value = this._committedValue || '';
      this.populateDropdown(this.options.items || []);
      this._filteredItems = (this.options.items || []).slice();
    }
  }

  /**
   * Combobox-style event wiring:
   *   - focus / click → open the dropdown (filtered by current input)
   *   - input         → filter dropdown rows as the user types
   *   - keydown       → arrow keys move highlight, Enter commits highlighted,
   *                     Escape closes
   *   - mousedown on item → commit (mousedown not click so it fires before blur)
   *   - blur          → validateOnBlur reverts or accepts based on strict mode
   *   - outside click → close the dropdown
   */
  setupListEventListeners() {
    if (!this.element || !this.dropdownElement || !this.wrapper) return;

    this.element.addEventListener('focus', () => {
      this.openDropdown();
      this.filterItems(this.element.value);
      this.updateLabelFloatedState();
    });

    this.element.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!this.isDropdownOpen()) {
        this.openDropdown();
        this.filterItems(this.element.value);
      }
    });

    this.element.addEventListener('input', () => {
      if (!this.isDropdownOpen()) this.openDropdown();
      this.filterItems(this.element.value);
      this.updateLabelFloatedState();
    });

    this.element.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!this.isDropdownOpen()) this.openDropdown();
        this.moveHighlight(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.moveHighlight(-1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const items = this._filteredItems || [];
        if (this._highlightedIndex >= 0 && items[this._highlightedIndex] != null) {
          this.selectItem(items[this._highlightedIndex]);
        } else if (items.length === 1) {
          this.selectItem(items[0]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.closeDropdown();
        this.element.blur();
      }
    });

    // mousedown not click — fires before the input's blur, so the row
    // selection commits before validateOnBlur could revert it.
    this.dropdownElement.addEventListener('mousedown', (e) => {
      const row = e.target.closest('.dynamic-list-item');
      if (!row) return;
      e.preventDefault();  // keep focus on the input
      const value = row.getAttribute('data-value');
      this.selectItem(value);
    });

    // Blur: validate (strict mode) or accept (free-form). Tiny delay so
    // any in-flight click handlers have a chance to commit first.
    this.element.addEventListener('blur', () => {
      setTimeout(() => {
        this.validateOnBlur();
        this.updateLabelFloatedState();
      }, 0);
    });

    // Outside click closes the dropdown. Stored on `this` so destroy()
    // can remove the document-level listener.
    this._outsideClickHandler = (e) => {
      if (!this.wrapper.contains(e.target)) {
        this.closeDropdown();
      }
    };
    document.addEventListener('click', this._outsideClickHandler);
  }

  /**
   * Destroy the component and clean up
   */
  destroy() {
    // List-specific: remove the document-level outside-click listener.
    if (this._outsideClickHandler) {
      document.removeEventListener('click', this._outsideClickHandler);
      this._outsideClickHandler = null;
    }

    // Remove from global instances set
    if (list_floating_label_component_engine.instances) {
      list_floating_label_component_engine.instances.delete(this);
    }

    // Cancel any pending animation frame
    if (this.viewportResizeFrame) {
      cancelAnimationFrame(this.viewportResizeFrame);
      this.viewportResizeFrame = null;
    }

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

    console.log(`[list_floating_label_component_engine] Destroyed:`, this.options.id);
  }

  /**
   * Setup mouse tracking for global position
   * Now uses global mouse tracker instead of local tracking
   */
  setupMouseTracking() {
    // No longer need to add our own mousemove listener
    // Global mouse tracker handles this for all components
    console.log('[list_floating_label_component_engine] Using global mouse tracker');
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
export { text_input_component_engine, text_input_component_engine_length_capped, text_input_floating_label_component_engine, list_floating_label_component_engine };
