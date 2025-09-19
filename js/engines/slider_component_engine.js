/**
 * slider_component_engine - Component-Type-Specific Engine for Sliders
 * 
 * Hybrid approach: Uses proven animation logic from main branch slider-buttons.js
 * wrapped in modern class-based architecture for dynamic component creation.
 * 
 * Replicates exact main branch slider behavior while providing configuration-driven
 * component creation that meets master plan requirements.
 * 
 * Date: 26-May-2025
 * Updates: 
 * - Added complete border hover animations from main branch
 * - Added MutationObserver for dynamic text changes
 * - Added getCSSVariable utility function
 * - Full feature parity with main branch achieved
 * - Refactored to use global mouse tracker for performance
 */

import { globalMouseTracker } from '../core/mouse-tracker.js';

class slider_component_engine {
  constructor(options, handler) {
    this.options = options;
    this.handler = handler;
    this.containerId = options.containerId;
    this.sliderClass = options.sliderClass || 'dynamic-slider';
    this.sliderElement = null;
    this.sliderInstance = null;
    
    // Core slider state (extracted from slider-buttons.js)
    this.sliderState = {
      activePosition: 2,
      currentHoveredOption: null,
      isAnimating: false,
      mouseEnteredFromRight: null,
      entryDirection: null,
      buttonWidth: 0,
      insideSlider: false,
      lastCheckTime: 0,
      shortestTextWidth: 0,
      buttonJustSelected: false,
    };
    
    // Animation constants (from main branch)
    this.ANIMATION_DURATION = 800;
    this.MONITOR_INTERVAL = 100;
    
    // Element references
    this._themeSelector = null;
    this._selectorBackground = null;
    this._options = null;
    this._borderTop = null;
    this._borderBottom = null;
    
    // Bound methods for event listeners
    this.handleMousePositionUpdate = this.handleMousePositionUpdate.bind(this);
    
    // Initialization timestamp for verification
    console.log(`[slider_component_engine] Initializing slider engine with full hover animations`);
  }

  /**
   * Get the primary selector class for querySelector usage
   * Handles multiple classes by splitting on spaces and using the first one
   */
  getSelectorClass() {
    // If sliderClass contains spaces, use only the first class for selectors
    const firstClass = this.sliderClass.split(' ')[0];
    return firstClass;
  }

  /**
   * Generate HTML structure for slider based on configuration
   * Replicates exact main branch HTML structure
   */
  generateHTML() {
    const optionsHTML = this.options.options.map((option, index) => {
      const activeClass = option.active ? ' active' : '';
      const dataAttributes = option.dataAttributes || '';
      
      return `
        <div class="option${activeClass}" data-position="${option.position}" ${dataAttributes}>
          <h3>${option.text}</h3>
        </div>
      `.trim();
    }).join('');

    return `
      <div class="slider-selector ${this.sliderClass}">
        <div class="border-container">
          <div class="border-segment border-top"></div>
          <div class="border-segment border-bottom"></div>
        </div>
        <div class="selector-background"></div>
        ${optionsHTML}
      </div>
    `.trim();
  }

  /**
   * Create slider container and inject HTML
   */
  createSliderContainer() {
    console.log(`[slider_component_engine] Creating container for: ${this.containerId}`);
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error(`[slider_component_engine] ERROR: Container ${this.containerId} not found in DOM`);
      return false;
    }
    
    // Apply container class and debug styling
    container.classList.add('slider-container');
    // container.style.border = '1px solid yellow';  // Debug border removed
    
    // Debug logging to see what container we're in
    console.log(`[${this.containerId}] Parent element:`, container.parentElement);
    console.log(`[${this.containerId}] Parent class:`, container.parentElement?.className);
    console.log(`[${this.containerId}] Parent width:`, container.parentElement?.offsetWidth);

    // Generate and inject HTML
    const html = this.generateHTML();
    container.innerHTML = html;
    
    // Get reference to created slider
    this.sliderElement = container.querySelector('.slider-selector');
    
    const success = this.sliderElement !== null;
    console.log(`[slider_component_engine] Slider element created: ${success}`);
    
    return success;
  }

  /**
   * Initialize slider engine with proven main branch logic
   */
  init() {
    console.log(`[slider_component_engine] Initializing: ${this.sliderClass}`);
    
    // Create HTML structure
    if (!this.createSliderContainer()) {
      console.error('[slider_component_engine] Failed to create slider container');
      return false;
    }

    // Get element references using the primary selector class
    const selectorClass = this.getSelectorClass();
    this._themeSelector = document.querySelector(`.slider-selector.${selectorClass}`);
    this._selectorBackground = document.querySelector(`.slider-selector.${selectorClass} .selector-background`);
    this._options = document.querySelectorAll(`.slider-selector.${selectorClass} .option`);
    this._borderTop = document.querySelector(`.slider-selector.${selectorClass} .border-top`);
    this._borderBottom = document.querySelector(`.slider-selector.${selectorClass} .border-bottom`);

    if (!this._themeSelector) {
      console.error(`[slider_component_engine] Core slider element not found for ${selectorClass}`);
      return false;
    }

    try {
      // Apply main branch initialization logic
      this.equalizeButtonWidths();
      this.initializeSelector();
      this.setupMouseEvents();
      this.setupOptionClickHandlers();
      this.setupResizeHandler();
      this.setupMutationObserver();
      this.setupMouseTracking();
      this.startContinuousMonitoring();
      
      console.log(`[slider_component_engine] Initialization complete for: ${this.sliderClass}`);
      return true;
    } catch (error) {
      console.error('[slider_component_engine] ERROR during initialization:', error);
      return false;
    }
  }

  /**
   * Calculate border width based on shortest text
   */
  calculateBorderWidth() {
    return this.sliderState.shortestTextWidth * 0.9;
  }

  /**
   * Calculate border position for centered placement on button
   */
  calculateBorderPosition(hoveredOption, selectorRect) {
    if (!hoveredOption || !selectorRect) return 0;

    const hoveredRect = hoveredOption.getBoundingClientRect();
    const buttonLeft = hoveredRect.left - selectorRect.left;
    const buttonCenter = buttonLeft + hoveredRect.width / 2;
    return buttonCenter - this.calculateBorderWidth() / 2;
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
      ? "none"
      : "transform 0.8s cubic-bezier(0.1, 0.8, 0.2, 1)";
    this._borderBottom.style.transition = immediate
      ? "none"
      : "transform 0.8s cubic-bezier(0.1, 0.8, 0.2, 1)";

    if (immediate) {
      // Force reflow to apply instant position change
      void this._borderTop.offsetWidth;
    }
  }

  /**
   * Get CSS variable value from root
   */
  getCSSVariable(name) {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
  }

  /**
   * Button width equalization (extracted from slider-buttons.js)
   */
  equalizeButtonWidths() {
    if (!this._options || this._options.length === 0) return 0;

    let maxWidth = 0;

    // Reset widths to get natural content width
    this._options.forEach((option) => {
      option.style.width = "auto";
    });

    // Measure natural width of each button
    this._options.forEach((option) => {
      const width = option.offsetWidth;
      maxWidth = Math.max(maxWidth, width);
      console.log(`[slider_component_engine] Button '${option.textContent.trim()}' natural width: ${width}px`);
    });

    console.log(`[slider_component_engine] Setting all buttons to max width: ${maxWidth}px`);

    // Set all buttons to the max width
    this._options.forEach((option) => {
      option.style.width = `${maxWidth}px`;
    });

    // Calculate shortest text width
    this.calculateShortestTextWidth();

    return maxWidth;
  }

  /**
   * Calculate shortest text width (from slider-buttons.js)
   */
  calculateShortestTextWidth() {
    if (!this._options || this._options.length === 0) return 100;

    let shortestWidth = Infinity;

    // Create temporary span to measure text width
    const tempSpan = document.createElement("span");
    tempSpan.style.visibility = "hidden";
    tempSpan.style.position = "absolute";
    tempSpan.style.whiteSpace = "nowrap";

    // Get font style from an option's h3
    const selectorClass = this.getSelectorClass();
    const sampleH3 = document.querySelector(`.slider-selector.${selectorClass} .option h3`);
    if (sampleH3) {
      tempSpan.style.font = getComputedStyle(sampleH3).font;
    } else {
      tempSpan.style.font = "bold clamp(0.5rem, 1.2vw, 2.3rem) Helvetica, Tahoma, sans-serif";
    }

    document.body.appendChild(tempSpan);

    // Measure each text width
    this._options.forEach((option) => {
      const h3 = option.querySelector("h3");
      if (h3) {
        const text = h3.textContent;
        tempSpan.textContent = text;
        const width = tempSpan.offsetWidth;
        shortestWidth = Math.min(shortestWidth, width);
      }
    });

    document.body.removeChild(tempSpan);
    this.sliderState.shortestTextWidth = Math.max(shortestWidth, 50);
    return this.sliderState.shortestTextWidth;
  }

  /**
   * Initialize selector positioning (from slider-buttons.js)
   */
  initializeSelector() {
    if (!this._themeSelector || !this._selectorBackground) {
      console.error("Slider elements not available for initialization");
      return false;
    }

    // Get the active option
    const selectorClass = this.getSelectorClass();
    const activeOption = document.querySelector(`.slider-selector.${selectorClass} .option.active`);
    if (!activeOption) {
      console.warn("No active option found");
      return false;
    }

    const selectorRect = this._themeSelector.getBoundingClientRect();
    const optionRect = activeOption.getBoundingClientRect();

    // Set width and position of the background without animation
    const leftPosition = optionRect.left - selectorRect.left;
    this._selectorBackground.style.transition = "none";
    this._selectorBackground.style.width = optionRect.width + "px";
    this._selectorBackground.style.left = leftPosition + "px";

    // Set active position
    this.sliderState.activePosition = parseInt(
      activeOption.getAttribute("data-position") || "2"
    );

    // Initial position of borders off-screen
    // Set initial direction based on active position for first hover
    if (this.sliderState.activePosition === 3) {
      this.sliderState.entryDirection = "right";
    } else if (this.sliderState.activePosition === 1) {
      this.sliderState.entryDirection = "left";
    } else {
      // For center, default to left but will be overridden by actual mouse entry
      this.sliderState.entryDirection = "left";
    }
    
    // Position borders off-screen
    if (this._borderTop && this._borderBottom) {
      this.setBorderTransition(true);
      if (this.sliderState.entryDirection === "left") {
        this._borderTop.style.transform = "translateX(-100%)";
        this._borderBottom.style.transform = "translateX(-100%)";
      } else {
        const selectorRect = this._themeSelector.getBoundingClientRect();
        this._borderTop.style.transform = `translateX(${selectorRect.width}px)`;
        this._borderBottom.style.transform = `translateX(${selectorRect.width}px)`;
      }
      // Force reflow
      void this._borderTop.offsetWidth;
      this.setBorderTransition(false);
    }

    // Restore transition after positioning
    setTimeout(() => {
      this._selectorBackground.style.transition = 
        "left 0.5s cubic-bezier(0.77, 0, 0.175, 1), width 0.5s cubic-bezier(0.77, 0, 0.175, 1)";
    }, 50);

    return true;
  }

  /**
   * Reset border animation by moving borders off-screen
   */
  resetBorderAnimation() {
    if (!this._themeSelector || !this._borderTop || !this._borderBottom) return;

    const selectorRect = this._themeSelector.getBoundingClientRect();

    // Use the current entry direction (should always be set by animateBordersIn)
    const direction = this.sliderState.entryDirection;
    
    // Safety check - this should not happen with the fix above
    if (!direction) {
      console.warn('[slider_component_engine] resetBorderAnimation called without entryDirection set');
      return;
    }

    // Instantly position off-screen (no animation)
    this.setBorderTransition(true);

    if (direction === "left") {
      this._borderTop.style.transform = "translateX(-100%)";
      this._borderBottom.style.transform = "translateX(-100%)";
    } else {
      this._borderTop.style.transform = `translateX(${selectorRect.width}px)`;
      this._borderBottom.style.transform = `translateX(${selectorRect.width}px)`;
    }

    // Restore transition
    this.setBorderTransition(false);

    this.sliderState.currentHoveredOption = null;
    this.sliderState.isAnimating = false;
    this.sliderState.buttonWidth = 0;
  }

  /**
   * Determine animation direction based on active option and mouse position
   */
  getAnimationDirection() {
    // If the right button is active (position 3), animation always starts from the right
    if (this.sliderState.activePosition === 3) {
      return "right";
    }
    // If the left button is active (position 1), animation always starts from the left
    else if (this.sliderState.activePosition === 1) {
      return "left";
    }
    // If the center button is active (position 2), determine based on mouse entry
    else {
      return this.sliderState.mouseEnteredFromRight ? "right" : "left";
    }
  }

  /**
   * Find which option the mouse is over
   */
  findHoveredOption(mouseX) {
    if (!this._options) return null;

    let hoveredOption = null;

    this._options.forEach((option) => {
      const rect = option.getBoundingClientRect();
      if (mouseX >= rect.left && mouseX <= rect.right) {
        hoveredOption = option;
      }
    });

    return hoveredOption;
  }

  /**
   * Animate borders in from edge
   */
  animateBordersIn(hoveredOption, fromDirection) {
    if (!hoveredOption || this.sliderState.isAnimating || !this._themeSelector) {
      return;
    }

    // If a button was just selected and we're hovering the active button, don't trigger animation
    if (
      this.sliderState.buttonJustSelected &&
      hoveredOption.classList.contains("active")
    ) {
      return;
    }

    this.sliderState.isAnimating = true;
    
    // IMPORTANT: Set entry direction BEFORE calling resetBorderAnimation
    this.sliderState.entryDirection = fromDirection;

    // Get dimensions
    const selectorRect = this._themeSelector.getBoundingClientRect();

    // Calculate border width and position
    const borderWidth = this.calculateBorderWidth();
    const borderLeft = this.calculateBorderPosition(hoveredOption, selectorRect);

    // Store calculated button width for later
    this.sliderState.buttonWidth = borderWidth;

    // Set the border width to the shortest text width
    if (this._borderTop && this._borderBottom) {
      this._borderTop.style.width = `${borderWidth}px`;
      this._borderBottom.style.width = `${borderWidth}px`;
    }

    // Now borders will be positioned off-screen in the correct direction
    this.resetBorderAnimation();

    // Now animate to centered position
    this.updateBorderTransform(borderLeft);

    // After animation completes
    setTimeout(() => {
      this.sliderState.isAnimating = false;

      // If mouse has moved to a different button during animation
      if (this.sliderState.insideSlider) {
        const { x: mouseX } = globalMouseTracker.getPosition();
        const currentHoveredOption = this.findHoveredOption(mouseX);

        if (currentHoveredOption && currentHoveredOption !== hoveredOption) {
          // Animate to the current position
          this.updateBorderPosition(mouseX);
        }
      } else {
        // If mouse is no longer in the slider, animate out
        this.animateBordersOut();
      }
    }, this.ANIMATION_DURATION);

    // Save current hovered option
    this.sliderState.currentHoveredOption = hoveredOption;
  }

  /**
   * Animate borders out to edge
   */
  animateBordersOut() {
    if (
      this.sliderState.isAnimating ||
      !this._themeSelector ||
      !this._borderTop ||
      !this._borderBottom
    ) {
      return;
    }

    this.sliderState.isAnimating = true;

    const direction = this.sliderState.entryDirection;
    const selectorRect = this._themeSelector.getBoundingClientRect();

    // Animate borders off-screen in the same direction they came from
    if (direction === "left") {
      this._borderTop.style.transform = "translateX(-100%)";
      this._borderBottom.style.transform = "translateX(-100%)";
    } else {
      this._borderTop.style.transform = `translateX(${selectorRect.width}px)`;
      this._borderBottom.style.transform = `translateX(${selectorRect.width}px)`;
    }

    // After animation completes
    setTimeout(() => {
      this.sliderState.isAnimating = false;
      this.sliderState.currentHoveredOption = null;
    }, this.ANIMATION_DURATION);
  }

  /**
   * Update border position based on mouse
   */
  updateBorderPosition(mouseX) {
    // If animating, don't update position
    if (this.sliderState.isAnimating || !this._themeSelector) {
      return;
    }

    const selectorRect = this._themeSelector.getBoundingClientRect();

    // Find which button the mouse is over
    let hoveredOption = this.findHoveredOption(mouseX);

    if (!hoveredOption) return;

    // If a button was just selected and we're hovering the active button, don't update
    if (
      this.sliderState.buttonJustSelected &&
      hoveredOption.classList.contains("active")
    ) {
      return;
    }

    // If we've moved to a different button
    if (hoveredOption !== this.sliderState.currentHoveredOption) {
      // Update the current hovered option
      this.sliderState.currentHoveredOption = hoveredOption;

      // Calculate new border position
      const borderLeft = this.calculateBorderPosition(hoveredOption, selectorRect);

      // Apply transform immediately without animation
      this.updateBorderTransform(borderLeft);
      return;
    }

    // For mouse following within the same button we'll center the border
    const borderLeft = this.calculateBorderPosition(hoveredOption, selectorRect);

    // Apply transform to move borders
    this.updateBorderTransform(borderLeft);
  }

  /**
   * Handle mouse position updates
   */
  handleMousePositionUpdate() {
    // Skip if we just checked recently
    const now = Date.now();
    if (now - this.sliderState.lastCheckTime < this.MONITOR_INTERVAL) {
      return;
    }

    this.sliderState.lastCheckTime = now;

    if (!this._themeSelector) return;

    // Check if mouse is inside the slider
    const rect = this._themeSelector.getBoundingClientRect();
    const isInside = globalMouseTracker.isInsideBounds(rect);

    // Update slider state if mouse state has changed
    if (isInside !== this.sliderState.insideSlider) {
      this.updateSliderState(isInside);
    } else if (isInside) {
      // When inside, keep updating border position based on mouse
      if (!this.sliderState.isAnimating) {
        // Get the hovered option to check if we should enable animations
        const { x: mouseX } = globalMouseTracker.getPosition();
        const hoveredOption = this.findHoveredOption(mouseX);

        // If a button was just selected and we're hovering the active button, don't trigger
        if (
          this.sliderState.buttonJustSelected &&
          hoveredOption &&
          hoveredOption.classList.contains("active")
        ) {
          return;
        }

        // Reset the buttonJustSelected flag if we hover over a non-active button
        if (hoveredOption && !hoveredOption.classList.contains("active")) {
          this.sliderState.buttonJustSelected = false;
        }

        this.updateBorderPosition(mouseX);
      }
    }
  }

  /**
   * Update mouse state based on position
   */
  updateSliderState(isInside) {
    this.sliderState.insideSlider = isInside;

    if (!this._themeSelector) return;

    if (isInside) {
      const selectorRect = this._themeSelector.getBoundingClientRect();
      const direction = globalMouseTracker.getRelativeDirection(selectorRect);
      this.sliderState.mouseEnteredFromRight = direction === 'right';

      // If borders are not animating and not visible
      if (!this.sliderState.isAnimating && !this.sliderState.currentHoveredOption) {
        const { x: mouseX } = globalMouseTracker.getPosition();
        const hoveredOption = this.findHoveredOption(mouseX);
        if (hoveredOption) {
          // Skip animation if a button was just selected and we're hovering the active button
          if (
            this.sliderState.buttonJustSelected &&
            hoveredOption.classList.contains("active")
          ) {
            return;
          }

          const fromDirection = this.getAnimationDirection();
          this.animateBordersIn(hoveredOption, fromDirection);
        }
      }
    } else {
      // If mouse left the slider and borders are visible but not animating
      if (!this.sliderState.isAnimating && this.sliderState.currentHoveredOption) {
        this.animateBordersOut();
      }
    }
  }

  /**
   * Setup option click handlers
   */
  setupOptionClickHandlers() {
    if (!this._options || this._options.length === 0) {
      console.warn("No options found to set up click handlers");
      return;
    }

    this._options.forEach((option) => {
      option.addEventListener("click", () => {
        this.setActiveOption(option);
      });
    });
  }

  /**
   * Set active option with animation (from slider-buttons.js logic)
   */
  setActiveOption(option, skipAnimation = false) {
    console.log(`[slider_component_engine] Setting active option: ${option ? option.textContent : 'none'}`);

    if (!option || !this._themeSelector || !this._selectorBackground) return;

    if (option.classList.contains("active")) {
      return; // Already active
    }

    // If border is visible, make it instantly disappear instead of animating out
    if (
      this.sliderState.currentHoveredOption &&
      !this.sliderState.isAnimating &&
      this._borderTop &&
      this._borderBottom
    ) {
      // Instantly remove borders (no animation)
      this.setBorderTransition(true);
      this._borderTop.style.transform = "translateX(-9999px)";
      this._borderBottom.style.transform = "translateX(-9999px)";

      // Reset state
      this.sliderState.currentHoveredOption = null;
      this.sliderState.isAnimating = false;

      // Restore transition
      this.setBorderTransition(false);
    }

    // Remove active class from all options
    this._options.forEach((opt) => {
      opt.classList.remove("active");
    });

    // Add active class to selected option
    option.classList.add("active");

    // Update active position
    this.sliderState.activePosition = parseInt(
      option.getAttribute("data-position") || "2"
    );

    // Move the selector background
    const optionRect = option.getBoundingClientRect();
    const selectorRect = this._themeSelector.getBoundingClientRect();
    const leftPosition = optionRect.left - selectorRect.left;

    // Animation control
    if (skipAnimation) {
      this._selectorBackground.style.transition = "none";
    } else {
      this._selectorBackground.style.transition = 
        "left 0.5s cubic-bezier(0.77, 0, 0.175, 1), width 0.5s cubic-bezier(0.77, 0, 0.175, 1)";
    }

    this._selectorBackground.style.width = optionRect.width + "px";
    this._selectorBackground.style.left = leftPosition + "px";

    if (skipAnimation) {
      void this._selectorBackground.offsetWidth;
      setTimeout(() => {
        this._selectorBackground.style.transition = 
          "left 0.5s cubic-bezier(0.77, 0, 0.175, 1), width 0.5s cubic-bezier(0.77, 0, 0.175, 1)";
      }, 0);
    }

    // Set button just selected flag
    this.sliderState.buttonJustSelected = true;

    // Recalculate shortest text width when text content changes
    this.calculateShortestTextWidth();

    // Call the custom handler
    if (this.handler && typeof this.handler === "function") {
      console.log(`[slider_component_engine] Calling custom handler`);
      this.handler(option);
    }
  }

  /**
   * Setup mouse tracking (from slider-buttons.js)
   * Now uses global mouse tracker instead of local tracking
   */
  setupMouseTracking() {
    // No longer need to add our own mousemove listener
    // Global mouse tracker handles this for all components
    console.log('[slider_component_engine] Using global mouse tracker');
  }

  /**
   * Setup mouse events
   */
  setupMouseEvents() {
    if (!this._themeSelector) return;

    this._themeSelector.addEventListener("mouseenter", () => {
      // Update slider state
      this.updateSliderState(true);

      // Find which option the mouse is over
      const { x: mouseX } = globalMouseTracker.getPosition();
      const hoveredOption = this.findHoveredOption(mouseX);

      if (hoveredOption && !this.sliderState.isAnimating) {
        // Skip animation if a button was just selected and we're hovering the active button
        if (
          this.sliderState.buttonJustSelected &&
          hoveredOption.classList.contains("active")
        ) {
          return;
        }

        // Determine animation direction and start animation
        const fromDirection = this.getAnimationDirection();
        this.animateBordersIn(hoveredOption, fromDirection);
      }
    });

    // Track mouse movements over the entire selector
    this._themeSelector.addEventListener("mousemove", () => {
      // Update border position based on mouse
      if (this.sliderState.insideSlider && !this.sliderState.isAnimating) {
        const { x: mouseX } = globalMouseTracker.getPosition();
        const hoveredOption = this.findHoveredOption(mouseX);

        // Always check if we're hovering a non-active button to reset the flag
        if (hoveredOption && !hoveredOption.classList.contains("active")) {
          this.sliderState.buttonJustSelected = false;
        }

        this.updateBorderPosition(mouseX);
      }
    });

    this._themeSelector.addEventListener("mouseleave", () => {
      // Update slider state
      this.updateSliderState(false);

      // Reset the buttonJustSelected flag when mouse leaves the slider
      this.sliderState.buttonJustSelected = false;
    });
  }

  /**
   * Setup resize handler
   */
  setupResizeHandler() {
    window.addEventListener("resize", () => {
      this.equalizeButtonWidths();
      
      if (!this._themeSelector || !this._selectorBackground) return;

      // Update active button background
      const selectorClass = this.getSelectorClass();
      const activeOption = document.querySelector(`.slider-selector.${selectorClass} .option.active`);
      if (!activeOption) return;

      const selectorRect = this._themeSelector.getBoundingClientRect();
      const optionRect = activeOption.getBoundingClientRect();

      this._selectorBackground.style.transition = "none";
      this._selectorBackground.style.width = optionRect.width + "px";
      this._selectorBackground.style.left = optionRect.left - selectorRect.left + "px";

      void this._selectorBackground.offsetWidth;
      this._selectorBackground.style.transition = 
        "left 0.5s cubic-bezier(0.77, 0, 0.175, 1), width 0.5s cubic-bezier(0.77, 0, 0.175, 1)";
    });
  }

  /**
   * Setup mutation observer to watch for text changes
   */
  setupMutationObserver() {
    if (!this._options || this._options.length === 0) return;

    // Create a new observer
    const observer = new MutationObserver((mutations) => {
      let textChanged = false;

      // Check if any mutations changed the text content
      mutations.forEach((mutation) => {
        if (
          mutation.type === "characterData" ||
          mutation.type === "childList"
        ) {
          textChanged = true;
        }
      });

      // If text changed, recalculate shortest width and equalize buttons
      if (textChanged) {
        console.log(`[slider_component_engine] Text change detected in ${this.sliderClass}, recalculating button widths`);
        this.equalizeButtonWidths();
      }
    });

    // Observe all button text elements for changes
    this._options.forEach((option) => {
      const h3 = option.querySelector("h3");
      if (h3) {
        observer.observe(h3, {
          characterData: true,
          childList: true,
          subtree: true,
        });
      }
    });
  }

  /**
   * Start continuous monitoring
   */
  startContinuousMonitoring() {
    // Check mouse position every interval
    setInterval(() => {
      this.handleMousePositionUpdate();
    }, this.MONITOR_INTERVAL);
  }

  /**
   * Cleanup and destroy slider instance
   */
  destroy() {
    console.log(`[slider_component_engine] Destroying slider: ${this.sliderClass}`);
    
    if (this.sliderElement) {
      this.sliderElement.remove();
    }
    
    // Clear references
    this._themeSelector = null;
    this._selectorBackground = null;
    this._options = null;
    this._borderTop = null;
    this._borderBottom = null;
    this.sliderElement = null;
  }
}

// Export as ES6 module
export { slider_component_engine };
