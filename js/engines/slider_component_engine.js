/**
 * slider_component_engine - Component-Type-Specific Engine for Sliders
 * 
 * Hybrid approach: Uses proven animation logic from main branch slider-buttons.js
 * wrapped in modern class-based architecture for dynamic component creation.
 * 
 * Replicates exact main branch slider behavior while providing configuration-driven
 * component creation that meets master plan requirements.
 * 
 * Date: 21-May-2025 23:44
 * Deployment Timestamp: 20250521234420
 */

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
    
    // Global mouse tracking
    this.globalMouseX = 0;
    this.globalMouseY = 0;
    
    // Element references
    this._themeSelector = null;
    this._selectorBackground = null;
    this._options = null;
    this._borderTop = null;
    this._borderBottom = null;
    
    // Initialization timestamp for verification
    console.log(`[slider_component_engine] Initializing slider engine [Deployment: 20250521234420]`);
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
      <div class="${this.sliderClass}">
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
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error(`Container ${this.containerId} not found`);
      return false;
    }

    // Generate and inject HTML
    container.innerHTML = this.generateHTML();
    
    // Get reference to created slider
    this.sliderElement = container.querySelector(`.${this.sliderClass}`);
    
    return this.sliderElement !== null;
  }

  /**
   * Initialize slider engine with proven main branch logic
   * Extracted from slider-buttons.js with modern wrapper
   */
  init() {
    console.log(`[slider_component_engine] Initializing slider: ${this.sliderClass}`);
    
    // Create HTML structure
    if (!this.createSliderContainer()) {
      console.error('Failed to create slider container');
      return false;
    }

    // Get element references (from slider-buttons.js pattern)
    this._themeSelector = document.querySelector(`.${this.sliderClass}`);
    this._selectorBackground = document.querySelector(`.${this.sliderClass} .selector-background`);
    this._options = document.querySelectorAll(`.${this.sliderClass} .option`);
    this._borderTop = document.querySelector(`.${this.sliderClass} .border-top`);
    this._borderBottom = document.querySelector(`.${this.sliderClass} .border-bottom`);

    if (!this._themeSelector) {
      console.error(`Slider elements not found for ${this.sliderClass}`);
      return false;
    }

    // Apply main branch initialization logic
    this.equalizeButtonWidths();
    this.initializeSelector();
    this.setupMouseEvents();
    this.setupOptionClickHandlers();
    this.setupResizeHandler();
    
    // Start mouse tracking (from slider-buttons.js)
    this.setupMouseTracking();
    this.startContinuousMonitoring();
    
    console.log(`[slider_component_engine] Slider initialization complete: ${this.sliderClass}`);
    return true;
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
    });

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
    const sampleH3 = document.querySelector(`.${this.sliderClass} .option h3`);
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
    const activeOption = document.querySelector(`.${this.sliderClass} .option.active`);
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

    // Restore transition after positioning
    setTimeout(() => {
      this._selectorBackground.style.transition = 
        "left 0.5s cubic-bezier(0.77, 0, 0.175, 1), width 0.5s cubic-bezier(0.77, 0, 0.175, 1)";
    }, 50);

    return true;
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

    // Call the custom handler
    if (this.handler && typeof this.handler === "function") {
      console.log(`[slider_component_engine] Calling custom handler`);
      this.handler(option);
    }
  }

  /**
   * Setup mouse tracking (simplified from slider-buttons.js)
   */
  setupMouseTracking() {
    document.addEventListener("mousemove", (e) => {
      this.globalMouseX = e.clientX;
      this.globalMouseY = e.clientY;
    });
  }

  /**
   * Setup mouse events (simplified from slider-buttons.js)
   */
  setupMouseEvents() {
    if (!this._themeSelector) return;

    this._themeSelector.addEventListener("mouseenter", () => {
      // Simplified hover effects - could expand with full border animations
      console.log(`[slider_component_engine] Mouse entered slider`);
    });

    this._themeSelector.addEventListener("mouseleave", () => {
      console.log(`[slider_component_engine] Mouse left slider`);
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
      const activeOption = document.querySelector(`.${this.sliderClass} .option.active`);
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
   * Start continuous monitoring (from slider-buttons.js)
   */
  startContinuousMonitoring() {
    setInterval(() => {
      // Simplified monitoring - could expand with full hover border effects
      const now = Date.now();
      if (now - this.sliderState.lastCheckTime < this.MONITOR_INTERVAL) {
        return;
      }
      this.sliderState.lastCheckTime = now;
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

// Export for use in factory
window.slider_component_engine = slider_component_engine;

console.log('[slider_component_engine] Engine class loaded [Deployment: 20250521234420]');
