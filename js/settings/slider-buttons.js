// Theme Selector Module
window.sliderButtons = (function () {
  // Private variables
  let _themeSelector;
  let _selectorBackground;
  let _options;
  let _borderTop;
  let _borderBottom;
  let _selectorClass = ".theme-selector"; // Default selector class

  // Slider state
  const sliderState = {
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

  // Animation duration
  const ANIMATION_DURATION = 800;

  // Continuous monitoring interval (milliseconds)
  const MONITOR_INTERVAL = 100; // Check 10 times per second

  // Global mouse position tracker
  let globalMouseX = 0;
  let globalMouseY = 0;

  // Utility functions for border calculations
  function calculateBorderWidth() {
    return sliderState.shortestTextWidth * 0.9;
  }

  function calculateBorderPosition(hoveredOption, selectorRect) {
    if (!hoveredOption || !selectorRect) return 0;

    const hoveredRect = hoveredOption.getBoundingClientRect();
    const buttonLeft = hoveredRect.left - selectorRect.left;
    const buttonCenter = buttonLeft + hoveredRect.width / 2;
    return buttonCenter - calculateBorderWidth() / 2;
  }

  function updateBorderTransform(leftPosition) {
    if (!_borderTop || !_borderBottom) return;

    const transformValue = `translateX(${leftPosition}px)`;
    _borderTop.style.transform = transformValue;
    _borderBottom.style.transform = transformValue;
  }

  // Utility function for border transitions
  function setBorderTransition(immediate = false) {
    if (!_borderTop || !_borderBottom) return;

    _borderTop.style.transition = immediate
      ? "none"
      : "transform 0.8s cubic-bezier(0.1, 0.8, 0.2, 1)";
    _borderBottom.style.transition = immediate
      ? "none"
      : "transform 0.8s cubic-bezier(0.1, 0.8, 0.2, 1)";

    if (immediate) {
      // Force reflow to apply instant position change
      void _borderTop.offsetWidth;
    }
  }

  // Function to get CSS variable value from root
  function getCSSVariable(name) {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
  }

  // Calculate shortest text width from all buttons
  function calculateShortestTextWidth() {
    if (!_options || _options.length === 0) return 100; // Default fallback

    let shortestWidth = Infinity;

    // Create a temporary span to measure text width
    const tempSpan = document.createElement("span");
    tempSpan.style.visibility = "hidden";
    tempSpan.style.position = "absolute";
    tempSpan.style.whiteSpace = "nowrap";

    // Get font style from an option's h3 if available
    const sampleH3 = document.querySelector(`${_selectorClass} .option h3`);
    if (sampleH3) {
      tempSpan.style.font = getComputedStyle(sampleH3).font;
    } else {
      // Fallback font style
      tempSpan.style.font =
        "bold clamp(0.5rem, 1.2vw, 2.3rem) Helvetica, Tahoma, sans-serif";
    }

    document.body.appendChild(tempSpan);

    // Measure each text width
    _options.forEach((option) => {
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
    sliderState.shortestTextWidth = Math.max(shortestWidth, 50);

    return sliderState.shortestTextWidth;
  }

  // Track mouse position globally and check if we need to update
  function setupMouseTracking() {
    document.addEventListener("mousemove", (e) => {
      globalMouseX = e.clientX;
      globalMouseY = e.clientY;

      // Update mouse position every move
      handleMousePositionUpdate();
    });
  }

  // Initialize continuous monitoring
  function startContinuousMonitoring() {
    // Check mouse position every interval
    setInterval(() => {
      handleMousePositionUpdate();
    }, MONITOR_INTERVAL);
  }

  // Handle mouse position updates
  function handleMousePositionUpdate() {
    // Skip if we just checked recently
    const now = Date.now();
    if (now - sliderState.lastCheckTime < MONITOR_INTERVAL) {
      return;
    }

    sliderState.lastCheckTime = now;

    if (!_themeSelector) return;

    // Check if mouse is inside the slider
    const rect = _themeSelector.getBoundingClientRect();
    const isInside =
      globalMouseX >= rect.left &&
      globalMouseX <= rect.right &&
      globalMouseY >= rect.top &&
      globalMouseY <= rect.bottom;

    // Update slider state if mouse state has changed
    if (isInside !== sliderState.insideSlider) {
      updateSliderState(isInside);
    } else if (isInside) {
      // When inside, keep updating border position based on mouse
      if (!sliderState.isAnimating) {
        // Get the hovered option to check if we should enable animations
        const hoveredOption = findHoveredOption(globalMouseX);

        // If a button was just selected and we're hovering the active button,
        // don't trigger the animation
        if (
          sliderState.buttonJustSelected &&
          hoveredOption &&
          hoveredOption.classList.contains("active")
        ) {
          return;
        }

        // Reset the buttonJustSelected flag if we hover over a non-active button
        if (hoveredOption && !hoveredOption.classList.contains("active")) {
          sliderState.buttonJustSelected = false;
        }

        updateBorderPosition(globalMouseX);
      }
    }
  }

  // Set all buttons to equal width based on widest content
  function equalizeButtonWidths() {
    if (!_options || _options.length === 0) return 0;

    let maxWidth = 0;

    // First reset any previously set widths to get natural content width
    _options.forEach((option) => {
      option.style.width = "auto";
    });

    // Measure natural width of each button
    _options.forEach((option) => {
      const width = option.offsetWidth;
      maxWidth = Math.max(maxWidth, width);
    });

    // Set all buttons to the max width
    _options.forEach((option) => {
      option.style.width = `${maxWidth}px`;
    });

    // Calculate shortest text width after setting button widths
    calculateShortestTextWidth();

    return maxWidth;
  }

  // Initialize selector
  function initializeSelector() {
    if (!_themeSelector || !_selectorBackground) {
      console.error("Theme selector elements not available for initialization");
      return false;
    }

    // Get the active option
    const activeOption = document.querySelector(
      `${_selectorClass} .option.active`
    );
    if (!activeOption) {
      console.warn("No active option found");
      return false;
    }

    const selectorRect = _themeSelector.getBoundingClientRect();
    const optionRect = activeOption.getBoundingClientRect();

    // Set width and position of the background without animation
    const leftPosition = optionRect.left - selectorRect.left;
    _selectorBackground.style.width = optionRect.width + "px";
    _selectorBackground.style.left = leftPosition + "px";

    // Set active position based on data-position
    sliderState.activePosition = parseInt(
      activeOption.getAttribute("data-position") || "2"
    );

    // Initial position of borders off-screen
    resetBorderAnimation();

    return true;
  }

  // Reset border animation by moving borders off-screen
  function resetBorderAnimation() {
    if (!_themeSelector || !_borderTop || !_borderBottom) return;

    const selectorRect = _themeSelector.getBoundingClientRect();

    // Determine the direction to position borders off-screen
    const direction = sliderState.entryDirection || "left";

    // Instantly position off-screen (no animation)
    setBorderTransition(true);

    if (direction === "left") {
      _borderTop.style.transform = "translateX(-100%)";
      _borderBottom.style.transform = "translateX(-100%)";
    } else {
      _borderTop.style.transform = `translateX(${selectorRect.width}px)`;
      _borderBottom.style.transform = `translateX(${selectorRect.width}px)`;
    }

    // Restore transition
    setBorderTransition(false);

    sliderState.currentHoveredOption = null;
    sliderState.isAnimating = false;
    sliderState.buttonWidth = 0;
  }

  // Determine animation direction based on active option and mouse position
  function getAnimationDirection() {
    // If the right button is active (position 3), animation always starts from the right
    if (sliderState.activePosition === 3) {
      return "right";
    }
    // If the left button is active (position 1), animation always starts from the left
    else if (sliderState.activePosition === 1) {
      return "left";
    }
    // If the center button is active (position 2), determine based on mouse entry
    else {
      return sliderState.mouseEnteredFromRight ? "right" : "left";
    }
  }

  // Find which option the mouse is over
  function findHoveredOption(mouseX) {
    if (!_options) return null;

    let hoveredOption = null;

    _options.forEach((option) => {
      const rect = option.getBoundingClientRect();
      if (mouseX >= rect.left && mouseX <= rect.right) {
        hoveredOption = option;
      }
    });

    return hoveredOption;
  }

  // Animation to move borders in from edge
  function animateBordersIn(hoveredOption, fromDirection) {
    if (!hoveredOption || sliderState.isAnimating || !_themeSelector) {
      return;
    }

    // If a button was just selected and we're hovering the active button,
    // don't trigger the animation
    if (
      sliderState.buttonJustSelected &&
      hoveredOption.classList.contains("active")
    ) {
      return;
    }

    sliderState.isAnimating = true;
    sliderState.entryDirection = fromDirection;

    // Get dimensions
    const selectorRect = _themeSelector.getBoundingClientRect();

    // Calculate border width and position
    const borderWidth = calculateBorderWidth();
    const borderLeft = calculateBorderPosition(hoveredOption, selectorRect);

    // Store calculated button width for later
    sliderState.buttonWidth = borderWidth;

    // Set the border width to the shortest text width
    if (_borderTop && _borderBottom) {
      _borderTop.style.width = `${borderWidth}px`;
      _borderBottom.style.width = `${borderWidth}px`;
    }

    // Make sure borders are positioned off-screen first
    resetBorderAnimation();

    // Now animate to centered position
    updateBorderTransform(borderLeft);

    // After animation completes
    setTimeout(() => {
      sliderState.isAnimating = false;

      // If mouse has moved to a different button during animation
      if (sliderState.insideSlider) {
        const currentHoveredOption = findHoveredOption(globalMouseX);

        if (currentHoveredOption && currentHoveredOption !== hoveredOption) {
          // Animate to the current position
          updateBorderPosition(globalMouseX);
        }
      } else {
        // If mouse is no longer in the slider, animate out
        animateBordersOut();
      }
    }, ANIMATION_DURATION);

    // Save current hovered option
    sliderState.currentHoveredOption = hoveredOption;
  }

  // Animation to move borders out to edge
  function animateBordersOut() {
    if (
      sliderState.isAnimating ||
      !_themeSelector ||
      !_borderTop ||
      !_borderBottom
    ) {
      return;
    }

    sliderState.isAnimating = true;

    const direction = sliderState.entryDirection;
    const selectorRect = _themeSelector.getBoundingClientRect();

    // Animate borders off-screen in the same direction they came from
    if (direction === "left") {
      _borderTop.style.transform = "translateX(-100%)";
      _borderBottom.style.transform = "translateX(-100%)";
    } else {
      _borderTop.style.transform = `translateX(${selectorRect.width}px)`;
      _borderBottom.style.transform = `translateX(${selectorRect.width}px)`;
    }

    // After animation completes
    setTimeout(() => {
      sliderState.isAnimating = false;
      sliderState.currentHoveredOption = null;
    }, ANIMATION_DURATION);
  }

  // Update border position based on mouse
  function updateBorderPosition(mouseX) {
    // If animating, don't update position
    if (sliderState.isAnimating || !_themeSelector) {
      return;
    }

    const selectorRect = _themeSelector.getBoundingClientRect();

    // Find which button the mouse is over
    let hoveredOption = findHoveredOption(mouseX);

    if (!hoveredOption) return;

    // If a button was just selected and we're hovering the active button,
    // don't update border position
    if (
      sliderState.buttonJustSelected &&
      hoveredOption.classList.contains("active")
    ) {
      return;
    }

    // If we've moved to a different button
    if (hoveredOption !== sliderState.currentHoveredOption) {
      // Update the current hovered option
      sliderState.currentHoveredOption = hoveredOption;

      // Calculate new border position
      const borderLeft = calculateBorderPosition(hoveredOption, selectorRect);

      // Apply transform immediately without animation
      updateBorderTransform(borderLeft);
      return;
    }

    // For mouse following within the same button we'll center the border
    // instead of following the mouse to keep it clean
    const borderLeft = calculateBorderPosition(hoveredOption, selectorRect);

    // Apply transform to move borders
    updateBorderTransform(borderLeft);
  }

  // Update mouse state based on position
  function updateSliderState(isInside) {
    sliderState.insideSlider = isInside;

    if (!_themeSelector) return;

    if (isInside) {
      const selectorRect = _themeSelector.getBoundingClientRect();
      const selectorMidpoint = selectorRect.left + selectorRect.width / 2;
      sliderState.mouseEnteredFromRight = globalMouseX > selectorMidpoint;

      // If borders are not animating and not visible
      if (!sliderState.isAnimating && !sliderState.currentHoveredOption) {
        const hoveredOption = findHoveredOption(globalMouseX);
        if (hoveredOption) {
          // Skip animation if a button was just selected and we're hovering the active button
          if (
            sliderState.buttonJustSelected &&
            hoveredOption.classList.contains("active")
          ) {
            return;
          }

          const fromDirection = getAnimationDirection();
          animateBordersIn(hoveredOption, fromDirection);
        }
      }
    } else {
      // If mouse left the slider and borders are visible but not animating
      if (!sliderState.isAnimating && sliderState.currentHoveredOption) {
        animateBordersOut();
      }
    }
  }

  // Set up mouse events for the slider
  function setupMouseEvents() {
    if (!_themeSelector) return;

    // Track mouse entry to the selector
    _themeSelector.addEventListener("mouseenter", () => {
      // Update slider state
      updateSliderState(true);

      // Find which option the mouse is over
      const hoveredOption = findHoveredOption(globalMouseX);

      if (hoveredOption && !sliderState.isAnimating) {
        // Skip animation if a button was just selected and we're hovering the active button
        if (
          sliderState.buttonJustSelected &&
          hoveredOption.classList.contains("active")
        ) {
          return;
        }

        // Determine animation direction and start animation
        const fromDirection = getAnimationDirection();
        animateBordersIn(hoveredOption, fromDirection);
      }
    });

    // Track mouse movements over the entire selector
    _themeSelector.addEventListener("mousemove", () => {
      // Update border position based on mouse
      if (sliderState.insideSlider && !sliderState.isAnimating) {
        const hoveredOption = findHoveredOption(globalMouseX);

        // Always check if we're hovering a non-active button to reset the flag
        if (hoveredOption && !hoveredOption.classList.contains("active")) {
          sliderState.buttonJustSelected = false;
        }

        updateBorderPosition(globalMouseX);
      }
    });

    // Handle mouse leave
    _themeSelector.addEventListener("mouseleave", () => {
      // Update slider state
      updateSliderState(false);

      // Reset the buttonJustSelected flag when mouse leaves the slider
      sliderState.buttonJustSelected = false;
    });
  }

  // Add click handlers to the theme options
  function setupOptionClickHandlers() {
    const options = document.querySelectorAll(`${_selectorClass} .option`);
    if (!options || options.length === 0) {
      console.warn("No options found to set up click handlers");
      return;
    }

    options.forEach((option) => {
      // Remove any existing click handler to prevent duplicates
      option.removeEventListener("click", optionClickHandler);

      // Add new click handler
      option.addEventListener("click", optionClickHandler);
    });
  }

  // Click handler function for options
  function optionClickHandler() {
    setActiveOption(this);
  }

  // Public function to set active option
  function setActiveOption(option, skipAnimation = false) {
    console.log("Setting active option:", option ? option.textContent : "none");

    if (!option || !_themeSelector || !_selectorBackground) return;

    if (option.classList.contains("active")) {
      return; // Already active, no change needed
    }

    // If border is visible, make it instantly disappear instead of animating out
    if (
      sliderState.currentHoveredOption &&
      !sliderState.isAnimating &&
      _borderTop &&
      _borderBottom
    ) {
      // Instantly remove borders (no animation)
      setBorderTransition(true);
      _borderTop.style.transform = "translateX(-9999px)";
      _borderBottom.style.transform = "translateX(-9999px)";

      // Reset state
      sliderState.currentHoveredOption = null;
      sliderState.isAnimating = false;

      // Restore transition
      setBorderTransition(false);
    }

    // Check if _options NodeList is still valid
    if (_options && _options.length > 0) {
      // Remove active class from all options
      _options.forEach((opt) => {
        opt.classList.remove("active");
      });
    } else {
      // Fallback if _options is no longer valid
      document.querySelectorAll(`${_selectorClass} .option`).forEach((opt) => {
        opt.classList.remove("active");
      });
    }

    // Add active class to clicked option
    option.classList.add("active");

    // Update active position
    sliderState.activePosition = parseInt(
      option.getAttribute("data-position") || "2"
    );

    // Move the selector background
    const optionRect = option.getBoundingClientRect();
    const selectorRect = _themeSelector.getBoundingClientRect();

    // Calculate the left position relative to the selector
    const leftPosition = optionRect.left - selectorRect.left;

    // Skip animation for programmatic calls if requested
    if (skipAnimation) {
      _selectorBackground.style.transition = "none";
    } else {
      // Use fixed animation timing for background slide
      _selectorBackground.style.transition =
        "left 0.5s cubic-bezier(0.77, 0, 0.175, 1), width 0.5s cubic-bezier(0.77, 0, 0.175, 1)";
    }

    // Since all buttons are equal width, we can reuse the stored width
    _selectorBackground.style.width = optionRect.width + "px";
    _selectorBackground.style.left = leftPosition + "px";

    // Force reflow when skipping animation
    if (skipAnimation) {
      void _selectorBackground.offsetWidth;

      // Restore transition after applying changes
      setTimeout(() => {
        _selectorBackground.style.transition =
          "left 0.5s cubic-bezier(0.77, 0, 0.175, 1), width 0.5s cubic-bezier(0.77, 0, 0.175, 1)";
      }, 0);
    }

    // Set button just selected flag
    sliderState.buttonJustSelected = true;

    // Call the onOptionSelected handler if it exists
    if (typeof this.onOptionSelected === "function") {
      console.log("Calling onOptionSelected callback");
      this.onOptionSelected(option);
    } else {
      console.log("No onOptionSelected callback defined");
    }

    // Recalculate shortest text width when text content changes
    calculateShortestTextWidth();
  }

  // Handle window resize to re-equalize button widths
  function setupResizeHandler() {
    window.addEventListener("resize", () => {
      // Re-equalize button widths
      equalizeButtonWidths();

      if (!_themeSelector || !_selectorBackground) return;

      // Update the active button background
      const activeOption = document.querySelector(
        `${_selectorClass} .option.active`
      );
      if (!activeOption) return;

      const selectorRect = _themeSelector.getBoundingClientRect();
      const optionRect = activeOption.getBoundingClientRect();

      _selectorBackground.style.transition = "none";
      _selectorBackground.style.width = optionRect.width + "px";
      _selectorBackground.style.left =
        optionRect.left - selectorRect.left + "px";

      // Force reflow
      void _selectorBackground.offsetWidth;

      // Restore transition
      _selectorBackground.style.transition =
        "left 0.5s cubic-bezier(0.77, 0, 0.175, 1), width 0.5s cubic-bezier(0.77, 0, 0.175, 1)";
    });
  }

  // Add a mutation observer to recalculate if button text changes
  function setupMutationObserver() {
    if (!_options || _options.length === 0) return;

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
        equalizeButtonWidths();
      }
    });

    // Observe all button text elements for changes
    _options.forEach((option) => {
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

  // Initialize everything
  function init(selectorClass = ".theme-selector") {
    console.log("Initializing slider with selector:", selectorClass);

    // Update the selector class if provided
    _selectorClass = selectorClass;

    // Get slider elements
    _themeSelector = document.querySelector(_selectorClass);
    _selectorBackground = document.querySelector(
      `${_selectorClass} .selector-background`
    );
    _options = document.querySelectorAll(`${_selectorClass} .option`);
    _borderTop = document.querySelector(`${_selectorClass} .border-top`);
    _borderBottom = document.querySelector(`${_selectorClass} .border-bottom`);

    if (!_themeSelector) {
      console.error(`Selector elements not found for ${_selectorClass}`);
      return false;
    }

    // Set all buttons to equal width FIRST before anything else
    equalizeButtonWidths();

    // Disable transition for initial positioning
    if (_selectorBackground) {
      _selectorBackground.style.transition = "none";
    }

    // Initialize selector
    const selectorInitialized = initializeSelector();
    if (!selectorInitialized) {
      console.error("Selector initialization failed");
      return false;
    }

    // Re-enable transitions after initial positioning with fixed timing
    setTimeout(() => {
      if (_selectorBackground) {
        _selectorBackground.style.transition =
          "left 0.5s cubic-bezier(0.77, 0, 0.175, 1), width 0.5s cubic-bezier(0.77, 0, 0.175, 1)";
      }
    }, 50);

    // Set up mouse events
    setupMouseEvents();
    setupMouseTracking();

    // Set up click handlers on options
    setupOptionClickHandlers();

    // Set up resize handler
    setupResizeHandler();

    // Set up mutation observer to watch for text changes
    setupMutationObserver();

    // Start continuous monitoring to catch mouse events that might be missed
    startContinuousMonitoring();

    console.log("Slider initialization complete");
    return true;
  }

  // Callback for option selection (to be overridden)
  function onOptionSelected(option) {
    // Default empty implementation
    console.log("Default onOptionSelected - should be overridden");
  }

  // Return public methods and properties
  return {
    init: init,
    setActiveOption: setActiveOption,
    onOptionSelected: onOptionSelected,
    // Expose for testing and debugging
    _themeSelector: _themeSelector,
  };
})();
