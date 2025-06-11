/**
 * multi_select_component_engine.js
 * 
 * Engine for creating multi-select components that look exactly like
 * buttons but allow multiple options to be selected simultaneously.
 * Each option acts as an independent toggle button.
 * 
 * Updated: 10-Jun-2025 - Aligned with button engine architecture
 * Updated: 10-Jun-2025 - Added border hover animations matching slider
 * Date: 22-May-2025
 * Deployment Timestamp: [TO BE UPDATED ON DEPLOYMENT]
 */

import { globalMouseTracker } from '../core/mouse-tracker.js';

class multi_select_component_engine {
  constructor(options = {}, changeHandler = null) {
    // Default options
    this.options = {
      id: options.id || `multi-select-${Date.now()}`,
      containerClass: options.containerClass || 'multi-select-selector',
      options: options.options || [],
      selectedValues: options.selectedValues || [],
      storageKey: options.storageKey || null,
      minSelection: options.minSelection || 0,
      maxSelection: options.maxSelection || null,
      ...options
    };
    
    this.changeHandler = changeHandler;
    this.container = null;
    this.optionElements = new Map();
    this.selector = null;
    
    // Hover animation state (from slider engine)
    this.hoverState = {
      currentHoveredOption: null,
      isAnimating: false,
      mouseEnteredFromRight: null,
      entryDirection: null,
      lastCheckTime: 0,
      insideSelector: false,
      shortestTextWidth: 0
    };
    
    // Animation constants
    this.ANIMATION_DURATION = 800;
    this.MONITOR_INTERVAL = 100;
    
    // Element references
    this._borderTop = null;
    this._borderBottom = null;
    this._selectorBackground = null;
    
    // Bound method
    this.handleMousePositionUpdate = this.handleMousePositionUpdate.bind(this);
    
    console.log(`[multi_select_component_engine] Initialized with options:`, this.options);
  }
  
  /**
   * Initialize and render the multi-select
   * @param {string} containerId - Container element ID
   * @returns {boolean} Success status
   */
  init(containerId) {
    const containerEl = document.getElementById(containerId);
    if (!containerEl) {
      console.error(`[multi_select_component_engine] Container not found: ${containerId}`);
      return false;
    }
    
    // Apply stored values if storage key provided
    if (this.options.storageKey) {
      this.applyStoredValues();
    }
    
    // Create multi-select structure
    this.createMultiSelect(containerEl);
    
    // Set initial selections
    this.updateSelections();
    
    console.log(`[multi_select_component_engine] Multi-select initialized: ${this.options.id}`);
    return true;
  }
  
  /**
   * Create the multi-select structure
   * @param {HTMLElement} containerEl - Container element
   */
  createMultiSelect(containerEl) {
    // Apply container class to existing container (matches button approach)
    containerEl.classList.add('multi-select-container');
    this.container = containerEl;
    
    // Create multi-select selector
    const selector = document.createElement('div');
    selector.className = this.options.containerClass;
    this.selector = selector;
    
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
    
    // Add border container to selector
    selector.appendChild(borderContainer);
    
    // Selector background for active options (matches slider)
    const selectorBackground = document.createElement('div');
    selectorBackground.className = 'selector-background';
    selector.appendChild(selectorBackground);
    this._selectorBackground = selectorBackground;
    
    // Add options
    this.options.options.forEach((option, index) => {
      const optionEl = this.createOption(option, index);
      selector.appendChild(optionEl);
      this.optionElements.set(option.value, optionEl);
    });
    
    // Add to container
    this.container.appendChild(selector);
    
    // Initialize hover animations and width equalization
    this.initializeHoverAnimations();
    this.equalizeOptionWidths();
  }
  
  /**
   * Create an option element
   * @param {Object} option - Option configuration
   * @param {number} index - Option index
   * @returns {HTMLElement} Option element
   */
  createOption(option, index) {
    const optionEl = document.createElement('div');
    optionEl.className = 'option';
    optionEl.dataset.value = option.value;
    optionEl.dataset.position = index + 1;
    
    if (option.dataAttributes) {
      const attrs = option.dataAttributes.split(' ');
      attrs.forEach(attr => {
        const [key, value] = attr.split('=');
        if (key && value) {
          optionEl.dataset[key.replace('data-', '')] = value.replace(/"/g, '');
        }
      });
    }
    
    // Create option content
    const content = document.createElement('div');
    content.className = 'option-content';
    
    // Add icon if provided
    if (option.icon) {
      const icon = document.createElement('span');
      icon.className = 'option-icon';
      icon.innerHTML = option.icon;
      content.appendChild(icon);
    }
    
    // Add text
    const h3 = document.createElement('h3');
    h3.textContent = option.text || option.value;
    content.appendChild(h3);
    
    // Build DOM structure
    optionEl.appendChild(content);
    
    // Add click handler
    optionEl.addEventListener('click', () => this.toggleOption(option.value));
    
    return optionEl;
  }
  
  /**
   * Toggle option selection
   * @param {string} value - Option value
   */
  toggleOption(value) {
    const optionEl = this.optionElements.get(value);
    if (!optionEl) return;
    
    const isActive = optionEl.classList.contains('active');
    const selector = this.container.querySelector(`.${this.options.containerClass}`);
    
    // Check selection limits
    if (!isActive && this.options.maxSelection) {
      const currentCount = selector.querySelectorAll('.option.active').length;
      if (currentCount >= this.options.maxSelection) {
        console.log(`[multi_select_component_engine] Maximum selection limit reached: ${this.options.maxSelection}`);
        return;
      }
    }
    
    if (isActive && this.options.minSelection) {
      const currentCount = selector.querySelectorAll('.option.active').length;
      if (currentCount <= this.options.minSelection) {
        console.log(`[multi_select_component_engine] Minimum selection limit reached: ${this.options.minSelection}`);
        return;
      }
    }
    
    // Toggle selection
    if (isActive) {
      optionEl.classList.remove('active');
      this.options.selectedValues = this.options.selectedValues.filter(v => v !== value);
    } else {
      optionEl.classList.add('active');
      if (!this.options.selectedValues.includes(value)) {
        this.options.selectedValues.push(value);
      }
    }
    
    // Save to storage
    if (this.options.storageKey) {
      localStorage.setItem(this.options.storageKey, JSON.stringify(this.options.selectedValues));
    }
    
    // Call change handler
    if (this.changeHandler) {
      this.changeHandler(this.options.selectedValues, value, !isActive);
    }
    
    console.log(`[multi_select_component_engine] Option ${isActive ? 'deselected' : 'selected'}: ${value}`);
  }
  
  /**
   * Apply stored values from localStorage
   */
  applyStoredValues() {
    if (!this.options.storageKey) return;
    
    const stored = localStorage.getItem(this.options.storageKey);
    if (stored) {
      try {
        this.options.selectedValues = JSON.parse(stored);
        console.log(`[multi_select_component_engine] Applied stored values:`, this.options.selectedValues);
      } catch (e) {
        console.error(`[multi_select_component_engine] Error parsing stored values:`, e);
      }
    }
  }
  
  /**
   * Update visual selections based on selectedValues
   */
  updateSelections() {
    this.optionElements.forEach((optionEl, value) => {
      if (this.options.selectedValues.includes(value)) {
        optionEl.classList.add('active');
      } else {
        optionEl.classList.remove('active');
      }
    });
  }
  

  /**
   * Get selected values
   * @returns {Array} Selected values
   */
  getSelectedValues() {
    return [...this.options.selectedValues];
  }
  
  /**
   * Set selected values
   * @param {Array} values - Values to select
   */
  setSelectedValues(values) {
    this.options.selectedValues = [...values];
    this.updateSelections();
    
    if (this.options.storageKey) {
      localStorage.setItem(this.options.storageKey, JSON.stringify(this.options.selectedValues));
    }
    
    if (this.changeHandler) {
      this.changeHandler(this.options.selectedValues, null, null);
    }
  }
  
  /**
   * Select all options
   */
  selectAll() {
    const allValues = this.options.options.map(opt => opt.value);
    if (this.options.maxSelection && allValues.length > this.options.maxSelection) {
      console.log(`[multi_select_component_engine] Cannot select all - exceeds maximum: ${this.options.maxSelection}`);
      return;
    }
    this.setSelectedValues(allValues);
  }
  
  /**
   * Clear all selections
   */
  clearAll() {
    if (this.options.minSelection && this.options.minSelection > 0) {
      console.log(`[multi_select_component_engine] Cannot clear all - minimum required: ${this.options.minSelection}`);
      return;
    }
    this.setSelectedValues([]);
  }
  
  /**
   * Initialize hover animations
   */
  initializeHoverAnimations() {
    if (!this.selector || !this._borderTop || !this._borderBottom) return;
    
    // Set initial border positions off-screen
    this.resetBorderAnimation();
    
    // Initialize selector background position
    this.initializeSelectorBackground();
    
    // Setup mouse events
    this.setupMouseEvents();
    
    // Start continuous monitoring
    this.startContinuousMonitoring();
  }
  
  /**
   * Equalize option widths (matches slider)
   */
  equalizeOptionWidths() {
    const options = this.selector.querySelectorAll('.option');
    if (!options || options.length === 0) return;
    
    let maxWidth = 0;
    
    // Reset widths to get natural content width
    options.forEach(option => {
      option.style.width = 'auto';
    });
    
    // Measure natural width of each option
    options.forEach(option => {
      const width = option.offsetWidth;
      maxWidth = Math.max(maxWidth, width);
    });
    
    // Set all options to the max width
    options.forEach(option => {
      option.style.width = `${maxWidth}px`;
    });
    
    // Calculate shortest text width
    this.calculateShortestTextWidth();
  }
  
  /**
   * Calculate shortest text width
   */
  calculateShortestTextWidth() {
    const options = this.selector.querySelectorAll('.option');
    if (!options || options.length === 0) return 100;
    
    let shortestWidth = Infinity;
    
    // Create temporary span to measure text width
    const tempSpan = document.createElement('span');
    tempSpan.style.visibility = 'hidden';
    tempSpan.style.position = 'absolute';
    tempSpan.style.whiteSpace = 'nowrap';
    
    const sampleH3 = this.selector.querySelector('.option h3');
    if (sampleH3) {
      tempSpan.style.font = getComputedStyle(sampleH3).font;
    }
    
    document.body.appendChild(tempSpan);
    
    options.forEach(option => {
      const h3 = option.querySelector('h3');
      if (h3) {
        tempSpan.textContent = h3.textContent;
        const width = tempSpan.offsetWidth;
        shortestWidth = Math.min(shortestWidth, width);
      }
    });
    
    document.body.removeChild(tempSpan);
    this.hoverState.shortestTextWidth = Math.max(shortestWidth, 50);
    return this.hoverState.shortestTextWidth;
  }
  
  /**
   * Initialize selector background position
   */
  initializeSelectorBackground() {
    if (!this._selectorBackground) return;
    
    // Hide selector background initially (multi-select doesn't have single active state)
    this._selectorBackground.style.display = 'none';
  }
  
  /**
   * Calculate border width
   */
  calculateBorderWidth() {
    return this.hoverState.shortestTextWidth * 0.9;
  }
  
  /**
   * Calculate border position for centered placement
   */
  calculateBorderPosition(hoveredOption, selectorRect) {
    if (!hoveredOption || !selectorRect) return 0;
    
    const hoveredRect = hoveredOption.getBoundingClientRect();
    const optionLeft = hoveredRect.left - selectorRect.left;
    const optionCenter = optionLeft + hoveredRect.width / 2;
    return optionCenter - this.calculateBorderWidth() / 2;
  }
  
  /**
   * Update border transform position
   */
  updateBorderTransform(leftPosition) {
    if (!this._borderTop || !this._borderBottom) return;
    
    const transformValue = `translateX(${leftPosition}px)`;
    this._borderTop.style.transform = transformValue;
    this._borderBottom.style.transform = transformValue;
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
      void this._borderTop.offsetWidth;
    }
  }
  
  /**
   * Reset border animation
   */
  resetBorderAnimation() {
    if (!this.selector || !this._borderTop || !this._borderBottom) return;
    
    const selectorRect = this.selector.getBoundingClientRect();
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
      this._borderTop.style.transform = `translateX(${selectorRect.width}px)`;
      this._borderBottom.style.transform = `translateX(${selectorRect.width}px)`;
    }
    
    // Restore transition
    this.setBorderTransition(false);
    
    this.hoverState.currentHoveredOption = null;
    this.hoverState.isAnimating = false;
  }
  
  /**
   * Find which option the mouse is over
   */
  findHoveredOption(mouseX) {
    const options = this.selector.querySelectorAll('.option');
    let hoveredOption = null;
    
    options.forEach(option => {
      const rect = option.getBoundingClientRect();
      if (mouseX >= rect.left && mouseX <= rect.right) {
        hoveredOption = option;
      }
    });
    
    return hoveredOption;
  }
  
  /**
   * Animate borders in
   */
  animateBordersIn(hoveredOption, fromDirection) {
    if (!hoveredOption || this.hoverState.isAnimating || !this.selector) return;
    
    this.hoverState.isAnimating = true;
    this.hoverState.entryDirection = fromDirection;
    
    const selectorRect = this.selector.getBoundingClientRect();
    const borderWidth = this.calculateBorderWidth();
    const borderLeft = this.calculateBorderPosition(hoveredOption, selectorRect);
    
    // Set border width
    if (this._borderTop && this._borderBottom) {
      this._borderTop.style.width = `${borderWidth}px`;
      this._borderBottom.style.width = `${borderWidth}px`;
    }
    
    // Reset to entry position
    this.resetBorderAnimation();
    
    // Animate to position
    this.updateBorderTransform(borderLeft);
    
    // After animation completes
    setTimeout(() => {
      this.hoverState.isAnimating = false;
      
      if (this.hoverState.insideSelector) {
        const { x: mouseX } = globalMouseTracker.getPosition();
        const currentHoveredOption = this.findHoveredOption(mouseX);
        
        if (currentHoveredOption && currentHoveredOption !== hoveredOption) {
          this.updateBorderPosition(mouseX);
        }
      } else {
        this.animateBordersOut();
      }
    }, this.ANIMATION_DURATION);
    
    this.hoverState.currentHoveredOption = hoveredOption;
  }
  
  /**
   * Animate borders out
   */
  animateBordersOut() {
    if (this.hoverState.isAnimating || !this.selector) return;
    
    this.hoverState.isAnimating = true;
    
    const direction = this.hoverState.entryDirection;
    const selectorRect = this.selector.getBoundingClientRect();
    
    if (direction === 'left') {
      this._borderTop.style.transform = 'translateX(-100%)';
      this._borderBottom.style.transform = 'translateX(-100%)';
    } else {
      this._borderTop.style.transform = `translateX(${selectorRect.width}px)`;
      this._borderBottom.style.transform = `translateX(${selectorRect.width}px)`;
    }
    
    setTimeout(() => {
      this.hoverState.isAnimating = false;
      this.hoverState.currentHoveredOption = null;
    }, this.ANIMATION_DURATION);
  }
  
  /**
   * Update border position based on mouse
   */
  updateBorderPosition(mouseX) {
    if (this.hoverState.isAnimating || !this.selector) return;
    
    const selectorRect = this.selector.getBoundingClientRect();
    const hoveredOption = this.findHoveredOption(mouseX);
    
    if (!hoveredOption) return;
    
    if (hoveredOption !== this.hoverState.currentHoveredOption) {
      this.hoverState.currentHoveredOption = hoveredOption;
      const borderLeft = this.calculateBorderPosition(hoveredOption, selectorRect);
      this.updateBorderTransform(borderLeft);
    }
  }
  
  /**
   * Handle mouse position updates
   */
  handleMousePositionUpdate() {
    const now = Date.now();
    if (now - this.hoverState.lastCheckTime < this.MONITOR_INTERVAL) {
      return;
    }
    
    this.hoverState.lastCheckTime = now;
    
    if (!this.selector) return;
    
    const rect = this.selector.getBoundingClientRect();
    const isInside = globalMouseTracker.isInsideBounds(rect);
    
    if (isInside !== this.hoverState.insideSelector) {
      this.updateSelectorState(isInside);
    } else if (isInside) {
      if (!this.hoverState.isAnimating) {
        const { x: mouseX } = globalMouseTracker.getPosition();
        this.updateBorderPosition(mouseX);
      }
    }
  }
  
  /**
   * Update selector state based on mouse position
   */
  updateSelectorState(isInside) {
    this.hoverState.insideSelector = isInside;
    
    if (!this.selector) return;
    
    if (isInside) {
      const selectorRect = this.selector.getBoundingClientRect();
      const direction = globalMouseTracker.getRelativeDirection(selectorRect);
      this.hoverState.mouseEnteredFromRight = direction === 'right';
      
      if (!this.hoverState.isAnimating && !this.hoverState.currentHoveredOption) {
        const { x: mouseX } = globalMouseTracker.getPosition();
        const hoveredOption = this.findHoveredOption(mouseX);
        if (hoveredOption) {
          const fromDirection = direction === 'right' ? 'right' : 'left';
          this.animateBordersIn(hoveredOption, fromDirection);
        }
      }
    } else {
      if (!this.hoverState.isAnimating && this.hoverState.currentHoveredOption) {
        this.animateBordersOut();
      }
    }
  }
  
  /**
   * Setup mouse events
   */
  setupMouseEvents() {
    if (!this.selector) return;
    
    this.selector.addEventListener('mouseenter', () => {
      this.updateSelectorState(true);
      
      const { x: mouseX } = globalMouseTracker.getPosition();
      const hoveredOption = this.findHoveredOption(mouseX);
      
      if (hoveredOption && !this.hoverState.isAnimating) {
        const selectorRect = this.selector.getBoundingClientRect();
        const direction = globalMouseTracker.getRelativeDirection(selectorRect);
        const fromDirection = direction === 'right' ? 'right' : 'left';
        this.animateBordersIn(hoveredOption, fromDirection);
      }
    });
    
    this.selector.addEventListener('mousemove', () => {
      if (this.hoverState.insideSelector && !this.hoverState.isAnimating) {
        const { x: mouseX } = globalMouseTracker.getPosition();
        this.updateBorderPosition(mouseX);
      }
    });
    
    this.selector.addEventListener('mouseleave', () => {
      this.updateSelectorState(false);
    });
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
    // Remove the selector element from container
    const selector = this.container.querySelector(`.${this.options.containerClass}`);
    if (selector && selector.parentNode) {
      selector.parentNode.removeChild(selector);
    }
    
    // Remove the multi-select-container class we added
    if (this.container) {
      this.container.classList.remove('multi-select-container');
    }
    
    this.container = null;
    this.selector = null;
    this.optionElements.clear();
    this._borderTop = null;
    this._borderBottom = null;
    this._selectorBackground = null;
    console.log(`[multi_select_component_engine] Destroyed:`, this.options.id);
  }
}

// Export for ES6 modules
export { multi_select_component_engine };
