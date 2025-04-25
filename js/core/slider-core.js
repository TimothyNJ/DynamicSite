/**
 * Slider Core Module
 * Provides core functionality for interactive slider button selectors
 * 
 * This module handles:
 * - Slider UI animations and interactions
 * - Border animations
 * - Mouse tracking and hover effects
 * - Button equalization
 * - Responsive sizing
 * 
 * It does NOT contain any business logic specific to themes, time formats, etc.
 */
window.SliderCore = (function () {
    // Private state for the slider instance
    const createSliderState = () => ({
      activePosition: 2,
      currentHoveredOption: null,
      isAnimating: false,
      mouseEnteredFromRight: null,
      entryDirection: null,
      buttonWidth: 0,
      insideSlider: false,
      lastCheckTime: 0,
      shortestTextWidth: 0,
      buttonJustSelected: false
    });
  
    // Animation duration in milliseconds
    const ANIMATION_DURATION = 800;
    
    // Continuous monitoring interval (milliseconds)
    const MONITOR_INTERVAL = 100; // Check 10 times per second
  
    // Global mouse position tracker
    let globalMouseX = 0;
    let globalMouseY = 0;
  
    // Class to manage a single slider instance
    class SliderManager {
      constructor(selectorClass) {
        // The selector class string (e.g., ".theme-selector")
        this.selectorClass = selectorClass;
        
        // DOM elements
        this.sliderElement = null;
        this.selectorBackground = null;
        this.options = null;
        this.borderTop = null;
        this.borderBottom = null;
        
        // State
        this.state = createSliderState();
        
        // Callbacks
        this.onOptionSelected = null;
      }
  
      // Get DOM elements
      getDOMElements() {
        this.sliderElement = document.querySelector(this.selectorClass);
        this.selectorBackground = document.querySelector(
          `${this.selectorClass} .selector-background`
        );
        this.options = document.querySelectorAll(
          `${this.selectorClass} .option`
        );
        this.borderTop = document.querySelector(
          `${this.selectorClass} .border-top`
        );
        this.borderBottom = document.querySelector(
          `${this.selectorClass} .border-bottom`
        );
  
        return (
          this.sliderElement &&
          this.selectorBackground &&
          this.options &&
          this.options.length > 0 &&
          this.borderTop &&
          this.borderBottom
        );
      }
  
      // Utility functions for border calculations
      calculateBorderWidth() {
        return this.state.shortestTextWidth * 0.9;
      }
  
      calculateBorderPosition(hoveredOption, selectorRect) {
        if (!hoveredOption || !selectorRect) return 0;
  
        const hoveredRect = hoveredOption.getBoundingClientRect();
        const buttonLeft = hoveredRect.left - selectorRect.left;
        const buttonCenter = buttonLeft + hoveredRect.width / 2;
        return buttonCenter - this.calculateBorderWidth() / 2;
      }
  
      updateBorderTransform(leftPosition) {
        if (!this.borderTop || !this.borderBottom) return;
  
        const transformValue = `translateX(${leftPosition}px)`;
        this.borderTop.style.transform = transformValue;
        this.borderBottom.style.transform = transformValue;
      }
  
      // Utility function for border transitions
      setBorderTransition(immediate = false) {
        if (!this.borderTop || !this.borderBottom) return;
  
        this.borderTop.style.transition = immediate
          ? "none"
          : "transform 0.8s cubic-bezier(0.1, 0.8, 0.2, 1)";
        this.borderBottom.style.transition = immediate
          ? "none"
          : "transform 0.8s cubic-bezier(0.1, 0.8, 0.2, 1)";
  
        if (immediate) {
          // Force reflow to apply instant position change
          void this.borderTop.offsetWidth;
        }
      }
  
      // Calculate shortest text width from all buttons
      calculateShortestTextWidth() {
        if (!this.options || this.options.length === 0) return 100; // Default fallback
  
        let shortestWidth = Infinity;
  
        // Create a temporary span to measure text width
        const tempSpan = document.createElement("span");
        tempSpan.style.visibility = "hidden";
        tempSpan.style.position = "absolute";
        tempSpan.style.whiteSpace = "nowrap";
  
        // Get font style from an option's h3 if available
        const sampleH3 = document.querySelector(`${this.selectorClass} .option h3`);
        if (sampleH3) {
          tempSpan.style.font = getComputedStyle(sampleH3).font;
        } else {
          // Fallback font style
          tempSpan.style.font =
            "bold clamp(0.5rem, 1.2vw, 2.3rem) Helvetica, Tahoma, sans-serif";
        }
  
        document.body.appendChild(tempSpan);
  
        // Measure each text width
        this.options.forEach((option) => {
          const h3 = option.querySelector("h3");
          if (h3) {
            const text = h3.textContent;
            tempSpan.textContent = text;
            const width = tempSpan.offsetWidth;
            shortestWidth = Math.min(shortestWidth, width);
          }
        });
  
        // Remove the temporary element
        document.body.removeChild(tempSpan);
  
        // Store the result, ensure it's at least 50px
        this.state.shortestTextWidth = Math.max(shortestWidth, 50);
  
        return this.state.shortestTextWidth;
      }
  
      // Set all buttons to equal width based on widest content
      equalizeButtonWidths() {
        if (!this.options || this.options.length === 0) return 0;
  
        let maxWidth = 0;
  
        // First reset any previously set widths to get natural content width
        this.options.forEach((option) => {
          option.style.width = "auto";
        });
  
        // Measure natural width of each button
        this.options.forEach((option) => {
          const width = option.offsetWidth;
          maxWidth = Math.max(maxWidth, width);
        });
  
        // Set all buttons to the max width
        this.options.forEach((option) => {
          option.style.width = `${maxWidth}px`;
        });
  
        // Calculate shortest text width after setting button widths
        this.calculateShortestTextWidth();
  
        return maxWidth;
      }
  
      // Initialize the slider
      initialize() {
        if (!this.getDOMElements()) {
          console.error("Could not find necessary slider elements for", this.selectorClass);
          return false;
        }
  
        console.log("Initializing slider with selector:", this.selectorClass);
  
        // Set all buttons to equal width FIRST before anything else
        this.equalizeButtonWidths();
  
        // Disable transition for initial positioning
        if (this.selectorBackground) {
          this.selectorBackground.style.transition = "none";
        }
  
        // Initialize selector
        const selectorInitialized = this.initializeSelector();
        if (!selectorInitialized) {
          console.error("Selector initialization failed");
          return false;
        }
  
        // Re-enable transitions after initial positioning with fixed timing
        setTimeout(() => {
          if (this.selectorBackground) {
            this.selectorBackground.style.transition =
              "left 0.5s cubic-bezier(0.77, 0, 0.175, 1), width 0.5s cubic-bezier(0.77, 0, 0.175, 1)";
          }
        }, 50);
  
        // Set up mouse events
        this.setupMouseEvents();
        this.setupMouseTracking();
  
        // Set up click handlers on options
        this.setupOptionClickHandlers();
  
        // Set up resize handler
        this.setupResizeHandler();
  
        // Set up mutation observer to watch for text changes
        this.setupMutationObserver();
  
        // Start continuous monitoring to catch mouse events that might be missed
        this.startContinuousMonitoring();
  
        console.log("Slider initialization complete for", this.selectorClass);
        return true;
      }
  
      // Initialize selector
      initializeSelector() {
        if (!this.sliderElement || !this.selectorBackground) {
          console.error("Slider elements not available for initialization");
          return false;
        }
  
        // Get the active option
        const activeOption = document.querySelector(
          `${this.selectorClass} .option.active`
        );
        if (!activeOption) {
          console.warn("No active option found for", this.selectorClass);
          return false;
        }
  
        const selectorRect = this.sliderElement.getBoundingClientRect();
        const optionRect = activeOption.getBoundingClientRect();
  
        // Set width and position of the background without animation
        const leftPosition = optionRect.left - selectorRect.left;
        this.selectorBackground.style.width = optionRect.width + "px";
        this.selectorBackground.style.left = leftPosition + "px";
  
        // Set active position based on data-position
        this.state.activePosition = parseInt(
          activeOption.getAttribute("data-position") || "2"
        );
  
        // Initial position of borders off-screen
        this.resetBorderAnimation();
  
        return true;
      }
  
      // Track mouse position globally and check if we need to update
      setupMouseTracking() {
        // Global listener for mouse movement
        document.addEventListener("mousemove", (e) => {
          globalMouseX = e.clientX;
          globalMouseY = e.clientY;
  
          // Update mouse position every move for this slider
          this.handleMousePositionUpdate();
        });
      }
  
      // Initialize continuous monitoring
      startContinuousMonitoring() {
        // Check mouse position every interval
        setInterval(() => {
          this.handleMousePositionUpdate();
        }, MONITOR_INTERVAL);
      }
  
      // Handle mouse position updates
      handleMousePositionUpdate() {
        // Skip if we just checked recently
        const now = Date.now();
        if (now - this.state.lastCheckTime < MONITOR_INTERVAL) {
          return;
        }
  
        this.state.lastCheckTime = now;
  
        if (!this.sliderElement) return;
  
        // Check if mouse is inside the slider
        const rect = this.sliderElement.getBoundingClientRect();
        const isInside =
          globalMouseX >= rect.left &&
          globalMouseX <= rect.right &&
          globalMouseY >= rect.top &&
          globalMouseY <= rect.bottom;
  
        // Update slider state if mouse state has changed
        if (isInside !== this.state.insideSlider) {
          this.updateSliderState(isInside);
        } else if (isInside) {
          // When inside, keep updating border position based on mouse
          if (!this.state.isAnimating) {
            // Get the hovered option to check if we should enable animations
            const hoveredOption = this.findHoveredOption(globalMouseX);
  
            // If a button was just selected and we're hovering the active button,
            // don't trigger the animation
            if (
              this.state.buttonJustSelected &&
              hoveredOption &&
              hoveredOption.classList.contains("active")
            ) {
              return;
            }
  
            // Reset the buttonJustSelected flag if we hover over a non-active button
            if (hoveredOption && !hoveredOption.classList.contains("active")) {
              this.state.buttonJustSelected = false;
            }
  
            this.updateBorderPosition(globalMouseX);
          }
        }
      }
  
      // Reset border animation by moving borders off-screen
      resetBorderAnimation() {
        if (!this.sliderElement || !this.borderTop || !this.borderBottom) return;
  
        const selectorRect = this.sliderElement.getBoundingClientRect();
  
        // Determine the direction to position borders off-screen
        const direction = this.state.entryDirection || "left";
  
        // Instantly position off-screen (no animation)
        this.setBorderTransition(true);
  
        if (direction === "left") {
          this.borderTop.style.transform = "translateX(-100%)";
          this.borderBottom.style.transform = "translateX(-100%)";
        } else {
          this.borderTop.style.transform = `translateX(${selectorRect.width}px)`;
          this.borderBottom.style.transform = `translateX(${selectorRect.width}px)`;
        }
  
        // Restore transition
        this.setBorderTransition(false);
  
        this.state.currentHoveredOption = null;
        this.state.isAnimating = false;
        this.state.buttonWidth = 0;
      }
  
      // Determine animation direction based on active option and mouse position
      getAnimationDirection() {
        // If the right button is active (position 3), animation always starts from the right
        if (this.state.activePosition === 3) {
          return "right";
        }
        // If the left button is active (position 1), animation always starts from the left
        else if (this.state.activePosition === 1) {
          return "left";
        }
        // If the center button is active (position 2), determine based on mouse entry
        else {
          return this.state.mouseEnteredFromRight ? "right" : "left";
        }
      }
  
      // Find which option the mouse is over
      findHoveredOption(mouseX) {
        if (!this.options) return null;
  
        let hoveredOption = null;
  
        this.options.forEach((option) => {
          const rect = option.getBoundingClientRect();
          if (mouseX >= rect.left && mouseX <= rect.right) {
            hoveredOption = option;
          }
        });
  
        return hoveredOption;
      }
  
      // Animation to move borders in from edge
      animateBordersIn(hoveredOption, fromDirection) {
        if (!hoveredOption || this.state.isAnimating || !this.sliderElement) {
          return;
        }
  
        // If a button was just selected and we're hovering the active button,
        // don't trigger the animation
        if (
          this.state.buttonJustSelected &&
          hoveredOption.classList.contains("active")
        ) {
          return;
        }
  
        this.state.isAnimating = true;
        this.state.entryDirection = fromDirection;
  
        // Get dimensions
        const selectorRect = this.sliderElement.getBoundingClientRect();
  
        // Calculate border width and position
        const borderWidth = this.calculateBorderWidth();
        const borderLeft = this.calculateBorderPosition(hoveredOption, selectorRect);
  
        // Store calculated button width for later
        this.state.buttonWidth = borderWidth;
  
        // Set the border width to the shortest text width
        if (this.borderTop && this.borderBottom) {
          this.borderTop.style.width = `${borderWidth}px`;
          this.borderBottom.style.width = `${borderWidth}px`;
        }
  
        // Make sure borders are positioned off-screen first
        this.resetBorderAnimation();
  
        // Now animate to centered position
        this.updateBorderTransform(borderLeft);
  
        // After animation completes
        setTimeout(() => {
          this.state.isAnimating = false;
  
          // If mouse has moved to a different button during animation
          if (this.state.insideSlider) {
            const currentHoveredOption = this.findHoveredOption(globalMouseX);
  
            if (currentHoveredOption && currentHoveredOption !== hoveredOption) {
              // Animate to the current position
              this.updateBorderPosition(globalMouseX);
            }
          } else {
            // If mouse is no longer in the slider, animate out
            this.animateBordersOut();
          }
        }, ANIMATION_DURATION);
  
        // Save current hovered option
        this.state.currentHoveredOption = hoveredOption;
      }
  
      // Animation to move borders out to edge
      animateBordersOut() {
        if (
          this.state.isAnimating ||
          !this.sliderElement ||
          !this.borderTop ||
          !this.borderBottom
        ) {
          return;
        }
  
        this.state.isAnimating = true;
  
        const direction = this.state.entryDirection;
        const selectorRect = this.sliderElement.getBoundingClientRect();
  
        // Animate borders off-screen in the same direction they came from
        if (direction === "left") {
          this.borderTop.style.transform = "translateX(-100%)";
          this.borderBottom.style.transform = "translateX(-100%)";
        } else {
          this.borderTop.style.transform = `translateX(${selectorRect.width}px)`;
          this.borderBottom.style.transform = `translateX(${selectorRect.width}px)`;
        }
  
        // After animation completes
        setTimeout(() => {
          this.state.isAnimating = false;
          this.state.currentHoveredOption = null;
        }, ANIMATION_DURATION);
      }
  
      // Update border position based on mouse
      updateBorderPosition(mouseX) {
        // If animating, don't update position
        if (this.state.isAnimating || !this.sliderElement) {
          return;
        }
  
        const selectorRect = this.sliderElement.getBoundingClientRect();
  
        // Find which button the mouse is over
        let hoveredOption = this.findHoveredOption(mouseX);
  
        if (!hoveredOption) return;
  
        // If a button was just selected and we're hovering the active button,
        // don't update border position
        if (
          this.state.buttonJustSelected &&
          hoveredOption.classList.contains("active")
        ) {
          return;
        }
  
        // If we've moved to a different button
        if (hoveredOption !== this.state.currentHoveredOption) {
          // Update the current hovered option
          this.state.currentHoveredOption = hoveredOption;
  
          // Calculate new border position
          const borderLeft = this.calculateBorderPosition(hoveredOption, selectorRect);
  
          // Apply transform immediately without animation
          this.updateBorderTransform(borderLeft);
          return;
        }
  
        // For mouse following within the same button we'll center the border
        // instead of following the mouse to keep it clean
        const borderLeft = this.calculateBorderPosition(hoveredOption, selectorRect);
  
        // Apply transform to move borders
        this.updateBorderTransform(borderLeft);
      }
  
      // Update mouse state based on position
      updateSliderState(isInside) {
        this.state.insideSlider = isInside;
  
        if (!this.sliderElement) return;
  
        if (isInside) {
          const selectorRect = this.sliderElement.getBoundingClientRect();
          const selectorMidpoint = selectorRect.left + selectorRect.width / 2;
          this.state.mouseEnteredFromRight = globalMouseX > selectorMidpoint;
  
          // If borders are not animating and not visible
          if (!this.state.isAnimating && !this.state.currentHoveredOption) {
            const hoveredOption = this.findHoveredOption(globalMouseX);
            if (hoveredOption) {
              // Skip animation if a button was just selected and we're hovering the active button
              if (
                this.state.buttonJustSelected &&
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
          if (!this.state.isAnimating && this.state.currentHoveredOption) {
            this.animateBordersOut();
          }
        }
      }
  
      // Set up mouse events for the slider
      setupMouseEvents() {
        if (!this.sliderElement) return;
  
        // Track mouse entry to the selector
        this.sliderElement.addEventListener("mouseenter", () => {
          // Update slider state
          this.updateSliderState(true);
  
          // Find which option the mouse is over
          const hoveredOption = this.findHoveredOption(globalMouseX);
  
          if (hoveredOption && !this.state.isAnimating) {
            // Skip animation if a button was just selected and we're hovering the active button
            if (
              this.state.buttonJustSelected &&
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
        this.sliderElement.addEventListener("mousemove", () => {
          // Update border position based on mouse
          if (this.state.insideSlider && !this.state.isAnimating) {
            const hoveredOption = this.findHoveredOption(globalMouseX);
  
            // Always check if we're hovering a non-active button to reset the flag
            if (hoveredOption && !hoveredOption.classList.contains("active")) {
              this.state.buttonJustSelected = false;
            }
  
            this.updateBorderPosition(globalMouseX);
          }
        });
  
        // Handle mouse leave
        this.sliderElement.addEventListener("mouseleave", () => {
          // Update slider state
          this.updateSliderState(false);
  
          // Reset the buttonJustSelected flag when mouse leaves the slider
          this.state.buttonJustSelected = false;
        });
      }
  
      // Add click handlers to the theme options
      setupOptionClickHandlers() {
        const options = document.querySelectorAll(`${this.selectorClass} .option`);
        if (!options || options.length === 0) {
          console.warn("No options found to set up click handlers for", this.selectorClass);
          return;
        }
  
        options.forEach((option) => {
          // Remove any existing click handler to prevent duplicates
          option.removeEventListener("click", this.optionClickHandler);
  
          // Add new click handler with bound context
          option.addEventListener("click", this.optionClickHandler.bind(this));
        });
      }
  
      // Click handler function for options
      optionClickHandler(event) {
        this.setActiveOption(event.currentTarget);
      }
  
      // Public function to set active option
      setActiveOption(option, skipAnimation = false) {
        if (!option || !this.sliderElement || !this.selectorBackground) return;
  
        if (option.classList.contains("active")) {
          return; // Already active, no change needed
        }
  
        console.log("Setting active option:", option.querySelector("h3").textContent);
  
        // If border is visible, make it instantly disappear instead of animating out
        if (
          this.state.currentHoveredOption &&
          !this.state.isAnimating &&
          this.borderTop &&
          this.borderBottom
        ) {
          // Instantly remove borders (no animation)
          this.setBorderTransition(true);
          this.borderTop.style.transform = "translateX(-9999px)";
          this.borderBottom.style.transform = "translateX(-9999px)";
  
          // Reset state
          this.state.currentHoveredOption = null;
          this.state.isAnimating = false;
  
          // Restore transition
          this.setBorderTransition(false);
        }
  
        // Check if this.options NodeList is still valid
        if (this.options && this.options.length > 0) {
          // Remove active class from all options
          this.options.forEach((opt) => {
            opt.classList.remove("active");
          });
        } else {
          // Fallback if this.options is no longer valid
          document.querySelectorAll(`${this.selectorClass} .option`).forEach((opt) => {
            opt.classList.remove("active");
          });
        }
  
        // Add active class to clicked option
        option.classList.add("active");
  
        // Update active position
        this.state.activePosition = parseInt(
          option.getAttribute("data-position") || "2"
        );
  
        // Move the selector background
        const optionRect = option.getBoundingClientRect();
        const selectorRect = this.sliderElement.getBoundingClientRect();
  
        // Calculate the left position relative to the selector
        const leftPosition = optionRect.left - selectorRect.left;
  
        // Skip animation for programmatic calls if requested
        if (skipAnimation) {
          this.selectorBackground.style.transition = "none";
        } else {
          // Use fixed animation timing for background slide
          this.selectorBackground.style.transition =
            "left 0.5s cubic-bezier(0.77, 0, 0.175, 1), width 0.5s cubic-bezier(0.77, 0, 0.175, 1)";
        }
  
        // Since all buttons are equal width, we can reuse the stored width
        this.selectorBackground.style.width = optionRect.width + "px";
        this.selectorBackground.style.left = leftPosition + "px";
  
        // Force reflow when skipping animation
        if (skipAnimation) {
          void this.selectorBackground.offsetWidth;
  
          // Restore transition after applying changes
          setTimeout(() => {
            this.selectorBackground.style.transition =
              "left 0.5s cubic-bezier(0.77, 0, 0.175, 1), width 0.5s cubic-bezier(0.77, 0, 0.175, 1)";
          }, 0);
        }
  
        // Set button just selected flag
        this.state.buttonJustSelected = true;
  
        // Call the onOptionSelected handler if it exists
        if (typeof this.onOptionSelected === "function") {
          console.log("Calling onOptionSelected callback");
          this.onOptionSelected(option);
        } else {
          console.log("No onOptionSelected callback defined");
        }
  
        // Recalculate shortest text width when text content changes
        this.calculateShortestTextWidth();
  
        return option;
      }
  
      // Handle window resize to re-equalize button widths
      setupResizeHandler() {
        window.addEventListener("resize", () => {
          // Re-equalize button widths
          this.equalizeButtonWidths();
  
          if (!this.sliderElement || !this.selectorBackground) return;
  
          // Update the active button background
          const activeOption = document.querySelector(
            `${this.selectorClass} .option.active`
          );
          if (!activeOption) return;
  
          const selectorRect = this.sliderElement.getBoundingClientRect();
          const optionRect = activeOption.getBoundingClientRect();
  
          this.selectorBackground.style.transition = "none";
          this.selectorBackground.style.width = optionRect.width + "px";
          this.selectorBackground.style.left =
            optionRect.left - selectorRect.left + "px";
  
          // Force reflow
          void this.selectorBackground.offsetWidth;
  
          // Restore transition
          this.selectorBackground.style.transition =
            "left 0.5s cubic-bezier(0.77, 0, 0.175, 1), width 0.5s cubic-bezier(0.77, 0, 0.175, 1)";
        });
      }
  
      // Add a mutation observer to recalculate if button text changes
      setupMutationObserver() {
        if (!this.options || this.options.length === 0) return;
  
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
            this.equalizeButtonWidths();
          }
        });
  
        // Observe all button text elements for changes
        this.options.forEach((option) => {
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
    }
  
    // Factory function to create and initialize a new slider
    function createSlider(selectorClass) {
      const slider = new SliderManager(selectorClass);
      const initialized = slider.initialize();
      
      if (!initialized) {
        console.error(`Failed to initialize slider for ${selectorClass}`);
        return null;
      }
      
      return slider;
    }
  
    // Public API
    return {
      // Create a new slider instance
      create: createSlider,
      
      // Version info
      version: "1.0.0"
    };
  })();