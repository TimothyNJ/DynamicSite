// Slider Buttons Module
window.sliderButtons = (function () {
  // Private variables
  let sliders = {};

  // Initialize a new slider
  function initSlider(sliderId) {
    // If already initialized, return the instance
    if (sliders[sliderId]) {
      return sliders[sliderId];
    }

    // Create a new slider instance
    const slider = {
      _sliderContainer: null,
      _selectorBackground: null,
      _options: null,
      _borderTop: null,
      _borderBottom: null,

      // Slider state
      state: {
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
      },

      // Animation duration
      ANIMATION_DURATION: 800,

      // Continuous monitoring interval (milliseconds)
      MONITOR_INTERVAL: 100, // Check 10 times per second

      // Global mouse position tracker
      globalMouseX: 0,
      globalMouseY: 0,

      // Utility functions for border calculations
      calculateBorderWidth: function () {
        return this.state.shortestTextWidth * 0.9;
      },

      calculateBorderPosition: function (hoveredOption, selectorRect) {
        const hoveredRect = hoveredOption.getBoundingClientRect();
        const buttonLeft = hoveredRect.left - selectorRect.left;
        const buttonCenter = buttonLeft + hoveredRect.width / 2;
        return buttonCenter - this.calculateBorderWidth() / 2;
      },

      updateBorderTransform: function (leftPosition) {
        const transformValue = `translateX(${leftPosition}px)`;
        this._borderTop.style.transform = transformValue;
        this._borderBottom.style.transform = transformValue;
      },

      // Utility function for border transitions
      setBorderTransition: function (immediate = false) {
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
      },

      // Calculate shortest text width from all buttons
      calculateShortestTextWidth: function () {
        let shortestWidth = Infinity;

        // Create a temporary span to measure text width
        const tempSpan = document.createElement("span");
        tempSpan.style.visibility = "hidden";
        tempSpan.style.position = "absolute";
        tempSpan.style.whiteSpace = "nowrap";
        tempSpan.style.font = getComputedStyle(
          this._sliderContainer.querySelector(".option h3")
        ).font;
        document.body.appendChild(tempSpan);

        // Measure each text width
        this._options.forEach((option) => {
          const text = option.querySelector("h3").textContent;
          tempSpan.textContent = text;
          const width = tempSpan.offsetWidth;
          shortestWidth = Math.min(shortestWidth, width);
        });

        // Remove the temporary element
        document.body.removeChild(tempSpan);

        // Store the result
        this.state.shortestTextWidth = shortestWidth;

        return shortestWidth;
      },

      // Track mouse position globally and check if we need to update
      setupMouseTracking: function () {
        const self = this;
        document.addEventListener("mousemove", (e) => {
          self.globalMouseX = e.clientX;
          self.globalMouseY = e.clientY;

          // Update mouse position every move
          self.handleMousePositionUpdate();
        });
      },

      // Initialize continuous monitoring
      startContinuousMonitoring: function () {
        const self = this;
        // Check mouse position every interval
        setInterval(() => {
          self.handleMousePositionUpdate();
        }, this.MONITOR_INTERVAL);
      },

      // Handle mouse position updates
      handleMousePositionUpdate: function () {
        // Skip if we just checked recently
        const now = Date.now();
        if (now - this.state.lastCheckTime < this.MONITOR_INTERVAL) {
          return;
        }

        this.state.lastCheckTime = now;

        // Check if mouse is inside the slider
        const rect = this._sliderContainer.getBoundingClientRect();
        const isInside =
          this.globalMouseX >= rect.left &&
          this.globalMouseX <= rect.right &&
          this.globalMouseY >= rect.top &&
          this.globalMouseY <= rect.bottom;

        // Update slider state if mouse state has changed
        if (isInside !== this.state.insideSlider) {
          this.updateSliderState(isInside);
        } else if (isInside) {
          // When inside, keep updating border position based on mouse
          if (!this.state.isAnimating) {
            // Get the hovered option to check if we should enable animations
            const hoveredOption = this.findHoveredOption(this.globalMouseX);

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

            this.updateBorderPosition(this.globalMouseX);
          }
        }
      },

      // Set all buttons to equal width based on widest content
      equalizeButtonWidths: function () {
        let maxWidth = 0;

        // First reset any previously set widths to get natural content width
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

        // Calculate shortest text width after setting button widths
        this.calculateShortestTextWidth();

        return maxWidth;
      },

      // Initialize selector
      initializeSelector: function () {
        // Set all buttons to equal width
        const buttonWidth = this.equalizeButtonWidths();

        // Get the active option
        const activeOption =
          this._sliderContainer.querySelector(".option.active");
        const selectorRect = this._sliderContainer.getBoundingClientRect();
        const optionRect = activeOption.getBoundingClientRect();

        // Set width and position of the background without animation
        const leftPosition = optionRect.left - selectorRect.left;
        this._selectorBackground.style.width = optionRect.width + "px";
        this._selectorBackground.style.left = leftPosition + "px";

        // Set active position based on data-position
        this.state.activePosition = parseInt(
          activeOption.getAttribute("data-position")
        );

        // Initial position of borders off-screen
        this.resetBorderAnimation();

        // Ensure text color is white for all options
        this._options.forEach((option) => {
          const h3 = option.querySelector("h3");
          if (h3) {
            h3.style.color = "#ffffff";
          }
        });
      },

      // Reset border animation by moving borders off-screen
      resetBorderAnimation: function () {
        const selectorRect = this._sliderContainer.getBoundingClientRect();

        // Determine the direction to position borders off-screen
        const direction = this.state.entryDirection || "left";

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

        this.state.currentHoveredOption = null;
        this.state.isAnimating = false;
        this.state.buttonWidth = 0;
      },

      // Determine animation direction based on active option and mouse position
      getAnimationDirection: function () {
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
      },

      // Find which option the mouse is over
      findHoveredOption: function (mouseX) {
        let hoveredOption = null;

        this._options.forEach((option) => {
          const rect = option.getBoundingClientRect();
          if (mouseX >= rect.left && mouseX <= rect.right) {
            hoveredOption = option;
          }
        });

        return hoveredOption;
      },

      // Animation to move borders in from edge
      animateBordersIn: function (hoveredOption, fromDirection) {
        if (!hoveredOption || this.state.isAnimating) {
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
        const selectorRect = this._sliderContainer.getBoundingClientRect();

        // Calculate border width and position
        const borderWidth = this.calculateBorderWidth();
        const borderLeft = this.calculateBorderPosition(
          hoveredOption,
          selectorRect
        );

        // Store calculated button width for later
        this.state.buttonWidth = borderWidth;

        // Set the border width to the shortest text width
        this._borderTop.style.width = `${borderWidth}px`;
        this._borderBottom.style.width = `${borderWidth}px`;

        // Make sure borders are positioned off-screen first
        this.resetBorderAnimation();

        // Now animate to centered position
        this.updateBorderTransform(borderLeft);

        const self = this;
        // After animation completes
        setTimeout(() => {
          self.state.isAnimating = false;

          // If mouse has moved to a different button during animation
          if (self.state.insideSlider) {
            const currentHoveredOption = self.findHoveredOption(
              self.globalMouseX
            );

            if (
              currentHoveredOption &&
              currentHoveredOption !== hoveredOption
            ) {
              // Animate to the current position
              self.updateBorderPosition(self.globalMouseX);
            }
          } else {
            // If mouse is no longer in the slider, animate out
            self.animateBordersOut();
          }
        }, this.ANIMATION_DURATION);

        // Save current hovered option
        this.state.currentHoveredOption = hoveredOption;
      },

      // Animation to move borders out to edge
      animateBordersOut: function () {
        if (this.state.isAnimating) {
          return;
        }

        this.state.isAnimating = true;

        const direction = this.state.entryDirection;
        const selectorRect = this._sliderContainer.getBoundingClientRect();

        // Animate borders off-screen in the same direction they came from
        if (direction === "left") {
          this._borderTop.style.transform = "translateX(-100%)";
          this._borderBottom.style.transform = "translateX(-100%)";
        } else {
          this._borderTop.style.transform = `translateX(${selectorRect.width}px)`;
          this._borderBottom.style.transform = `translateX(${selectorRect.width}px)`;
        }

        const self = this;
        // After animation completes
        setTimeout(() => {
          self.state.isAnimating = false;
          self.state.currentHoveredOption = null;
        }, this.ANIMATION_DURATION);
      },

      // Update border position based on mouse
      updateBorderPosition: function (mouseX) {
        // If animating, don't update position
        if (this.state.isAnimating) {
          return;
        }

        const selectorRect = this._sliderContainer.getBoundingClientRect();

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
          const borderLeft = this.calculateBorderPosition(
            hoveredOption,
            selectorRect
          );

          // Apply transform immediately without animation
          this.updateBorderTransform(borderLeft);
          return;
        }

        // For mouse following within the same button we'll center the border
        // instead of following the mouse to keep it clean
        const borderLeft = this.calculateBorderPosition(
          hoveredOption,
          selectorRect
        );

        // Apply transform to move borders
        this.updateBorderTransform(borderLeft);
      },

      // Update mouse state based on position
      updateSliderState: function (isInside) {
        this.state.insideSlider = isInside;

        if (isInside) {
          const selectorRect = this._sliderContainer.getBoundingClientRect();
          const selectorMidpoint = selectorRect.left + selectorRect.width / 2;
          this.state.mouseEnteredFromRight =
            this.globalMouseX > selectorMidpoint;

          // If borders are not animating and not visible
          if (!this.state.isAnimating && !this.state.currentHoveredOption) {
            const hoveredOption = this.findHoveredOption(this.globalMouseX);
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
      },

      // Set up mouse events for the slider
      setupMouseEvents: function () {
        const self = this;

        // Track mouse entry to the selector
        this._sliderContainer.addEventListener("mouseenter", () => {
          // Update slider state
          self.updateSliderState(true);

          // Find which option the mouse is over
          const hoveredOption = self.findHoveredOption(self.globalMouseX);

          if (hoveredOption && !self.state.isAnimating) {
            // Skip animation if a button was just selected and we're hovering the active button
            if (
              self.state.buttonJustSelected &&
              hoveredOption.classList.contains("active")
            ) {
              return;
            }

            // Determine animation direction and start animation
            const fromDirection = self.getAnimationDirection();
            self.animateBordersIn(hoveredOption, fromDirection);
          }
        });

        // Track mouse movements over the entire selector
        this._sliderContainer.addEventListener("mousemove", () => {
          // Update border position based on mouse
          if (self.state.insideSlider && !self.state.isAnimating) {
            const hoveredOption = self.findHoveredOption(self.globalMouseX);

            // Always check if we're hovering a non-active button to reset the flag
            if (hoveredOption && !hoveredOption.classList.contains("active")) {
              self.state.buttonJustSelected = false;
            }

            self.updateBorderPosition(self.globalMouseX);
          }
        });

        // Handle mouse leave
        this._sliderContainer.addEventListener("mouseleave", () => {
          // Update slider state
          self.updateSliderState(false);

          // Reset the buttonJustSelected flag when mouse leaves the slider
          self.state.buttonJustSelected = false;
        });
      },

      // Add click handlers to the options
      setupOptionClickHandlers: function () {
        const self = this;
        this._sliderContainer.querySelectorAll(".option").forEach((option) => {
          option.addEventListener("click", function () {
            self.setActiveOption(this);
          });
        });
      },

      // Public function to set active option
      setActiveOption: function (option, skipAnimation = false) {
        if (option.classList.contains("active")) {
          return; // Already active, no change needed
        }

        // If border is visible, make it instantly disappear instead of animating out
        if (this.state.currentHoveredOption && !this.state.isAnimating) {
          // Instantly remove borders (no animation)
          this.setBorderTransition(true);
          this._borderTop.style.transform = "translateX(-9999px)";
          this._borderBottom.style.transform = "translateX(-9999px)";

          // Reset state
          this.state.currentHoveredOption = null;
          this.state.isAnimating = false;

          // Restore transition
          this.setBorderTransition(false);
        }

        // Remove active class from all options
        this._options.forEach((opt) => {
          opt.classList.remove("active");
        });

        // Add active class to clicked option
        option.classList.add("active");

        // Update active position
        this.state.activePosition = parseInt(
          option.getAttribute("data-position")
        );

        // Move the selector background
        const optionRect = option.getBoundingClientRect();
        const selectorRect = this._sliderContainer.getBoundingClientRect();

        // Calculate the left position relative to the selector
        const leftPosition = optionRect.left - selectorRect.left;

        // Skip animation for programmatic calls if requested
        if (skipAnimation) {
          this._selectorBackground.style.transition = "none";
        } else {
          // Use fixed animation timing for background slide
          this._selectorBackground.style.transition =
            "left 0.5s cubic-bezier(0.77, 0, 0.175, 1), width 0.5s cubic-bezier(0.77, 0, 0.175, 1)";
        }

        // Since all buttons are equal width, we can reuse the stored width
        this._selectorBackground.style.width = optionRect.width + "px";
        this._selectorBackground.style.left = leftPosition + "px";

        // Force reflow when skipping animation
        if (skipAnimation) {
          void this._selectorBackground.offsetWidth;

          // Restore transition after applying changes
          setTimeout(() => {
            this._selectorBackground.style.transition =
              "left 0.5s cubic-bezier(0.77, 0, 0.175, 1), width 0.5s cubic-bezier(0.77, 0, 0.175, 1)";
          }, 0);
        }

        // Set button just selected flag
        this.state.buttonJustSelected = true;

        // Get the value from data-value attribute or from text
        const value =
          option.getAttribute("data-value") ||
          option.querySelector("h3").textContent.toLowerCase().trim();

        // Save preference to localStorage if the slider has an ID
        if (this._sliderContainer.id) {
          localStorage.setItem(this._sliderContainer.id + "Preference", value);
        }

        // Ensure text is white for all options (after change)
        this._options.forEach((opt) => {
          const h3 = opt.querySelector("h3");
          if (h3) {
            h3.style.color = "#ffffff";
          }
        });

        // Trigger change event
        const changeEvent = new CustomEvent("sliderChange", {
          detail: { sliderId: this._sliderContainer.id, value: value },
        });
        this._sliderContainer.dispatchEvent(changeEvent);

        // Recalculate shortest text width when text content changes
        this.calculateShortestTextWidth();
      },

      // Handle window resize to re-equalize button widths
      setupResizeHandler: function () {
        const self = this;
        window.addEventListener("resize", () => {
          // Re-equalize button widths
          self.equalizeButtonWidths();

          // Update the active button background
          const activeOption =
            self._sliderContainer.querySelector(".option.active");
          const selectorRect = self._sliderContainer.getBoundingClientRect();
          const optionRect = activeOption.getBoundingClientRect();

          self._selectorBackground.style.transition = "none";
          self._selectorBackground.style.width = optionRect.width + "px";
          self._selectorBackground.style.left =
            optionRect.left - selectorRect.left + "px";

          // Force reflow
          void self._selectorBackground.offsetWidth;

          // Restore transition
          self._selectorBackground.style.transition =
            "left 0.5s cubic-bezier(0.77, 0, 0.175, 1), width 0.5s cubic-bezier(0.77, 0, 0.175, 1)";
        });
      },

      // Add a mutation observer to recalculate if button text changes
      setupMutationObserver: function () {
        const self = this;
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
            self.equalizeButtonWidths();
          }
        });

        // Observe all button text elements for changes
        this._options.forEach((option) => {
          const h3 = option.querySelector("h3");
          observer.observe(h3, {
            characterData: true,
            childList: true,
            subtree: true,
          });
        });
      },

      // Initialize everything
      init: function () {
        // Get slider elements
        this._sliderContainer = document.getElementById(sliderId);
        this._selectorBackground = this._sliderContainer.querySelector(
          ".selector-background"
        );
        this._options = this._sliderContainer.querySelectorAll(".option");
        this._borderTop = this._sliderContainer.querySelector(".border-top");
        this._borderBottom =
          this._sliderContainer.querySelector(".border-bottom");

        if (!this._sliderContainer) {
          console.error(
            "Slider container elements not found for ID: " + sliderId
          );
          return false;
        }

        // Set --inv variable to white at the slider level
        this._sliderContainer.style.setProperty("--inv", "#ffffff");

        // Disable transition for initial positioning
        this._selectorBackground.style.transition = "none";

        // Initialize selector
        this.initializeSelector();

        // Try to load saved preference
        if (this._sliderContainer.id) {
          const savedValue = localStorage.getItem(
            this._sliderContainer.id + "Preference"
          );
          if (savedValue) {
            const savedOption = Array.from(this._options).find((opt) => {
              const optValue =
                opt.getAttribute("data-value") ||
                opt.querySelector("h3").textContent.toLowerCase().trim();
              return optValue === savedValue;
            });

            if (savedOption) {
              this.setActiveOption(savedOption, true);
            }
          }
        }

        // Re-enable transitions after initial positioning with fixed timing
        setTimeout(() => {
          this._selectorBackground.style.transition =
            "left 0.5s cubic-bezier(0.77, 0, 0.175, 1), width 0.5s cubic-bezier(0.77, 0, 0.175, 1)";
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

        // Force white text for all options
        this._options.forEach((option) => {
          const h3 = option.querySelector("h3");
          if (h3) {
            h3.style.color = "#ffffff";
          }
        });

        return true;
      },
    };

    // Store the slider instance
    sliders[sliderId] = slider;
    return slider;
  }

  // Initialize theme slider specifically (for backward compatibility)
  function initThemeSlider() {
    const themeSlider = initSlider("theme-selector");

    // For backward compatibility, make this available globally
    window.themeSelector = {
      init: function () {
        return themeSlider.init();
      },
      setActiveOption: function (option, skipAnimation) {
        return themeSlider.setActiveOption(option, skipAnimation);
      },
      applyThemeByName: function (themeName, skipThemeDetection) {
        // Find the right option based on theme name
        const option =
          document.querySelector(`.option[data-theme="${themeName}"]`) ||
          document.querySelector(`.option[data-value="${themeName}"]`);

        if (option) {
          themeSlider.setActiveOption(option, skipThemeDetection);
        }

        // Handle theme application specifically
        const body = document.body;

        if (themeName === "light") {
          body.setAttribute("data-theme", "light");
          body.style.backgroundImage =
            "linear-gradient(-25deg, var(--light-page-start) 0%, var(--light-page-end) 100%)";
          document.querySelector(".slider-container").style.background =
            "linear-gradient(-25deg, var(--light-slider-start) 0%, var(--light-slider-end) 100%)";
        } else if (themeName === "dark") {
          body.setAttribute("data-theme", "dark");
          body.style.backgroundImage =
            "linear-gradient(-25deg, var(--dark-page-start) 0%, var(--dark-page-end) 100%)";
          document.querySelector(".slider-container").style.background =
            "linear-gradient(-25deg, var(--dark-slider-start) 0%, var(--dark-slider-end) 100%)";
        } else if (themeName === "system" && !skipThemeDetection) {
          const prefersDark =
            window.matchMedia &&
            window.matchMedia("(prefers-color-scheme: dark)").matches;
          this.applyThemeByName(prefersDark ? "dark" : "light", true);
        }

        return true;
      },
    };
  }

  // Initialize time format slider
  function initTimeFormatSlider() {
    return initSlider("time-format-selector");
  }

  // Return public methods
  return {
    initSlider: initSlider,
    initThemeSlider: initThemeSlider,
    initTimeFormatSlider: initTimeFormatSlider,
  };
})();
