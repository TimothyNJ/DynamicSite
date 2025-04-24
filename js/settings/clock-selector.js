// js/settings/clock-selector.js
window.clockSelector = (function () {
  // Clock selector elements
  let _clockSelector;
  let _selectorBackground;
  let _options;
  let _borderTop;
  let _borderBottom;

  // Clock display elements
  let _clock12h;
  let _clock24h;

  // Timer for updating clock
  let _clockTimer = null;

  // Slider state (similar to theme slider)
  const sliderState = {
    activePosition: 2, // Default to 24-hour (position 2)
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

  // Monitor interval
  const MONITOR_INTERVAL = 100;

  // Global mouse position tracker
  let globalMouseX = 0;
  let globalMouseY = 0;

  // Function to update both clock displays
  function updateClockDisplays() {
    const now = new Date();

    // Update 12-hour clock
    if (_clock12h) {
      const hours12 = now.getHours() % 12 || 12; // Convert 0 to 12
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const ampm = now.getHours() >= 12 ? "PM" : "AM";
      _clock12h.textContent = `${hours12}:${minutes} ${ampm}`;
    }

    // Update 24-hour clock
    if (_clock24h) {
      const hours24 = now.getHours().toString().padStart(2, "0");
      const minutes = now.getMinutes().toString().padStart(2, "0");
      _clock24h.textContent = `${hours24}:${minutes}`;
    }
  }

  // Start clock timer
  function startClockTimer() {
    // Clear any existing timer
    if (_clockTimer) {
      clearInterval(_clockTimer);
    }

    // Update immediately
    updateClockDisplays();

    // Set up interval to update every second
    _clockTimer = setInterval(updateClockDisplays, 1000);
  }

  // Utility functions for border calculations (similar to theme slider)
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

  // Apply clock format by position
  function applyClockFormatByPosition(position) {
    // Save preference to localStorage
    localStorage.setItem("userClockFormat", position === 1 ? "12" : "24");
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
    const sampleH3 = document.querySelector(".clock-selector .option h3");
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

    if (!_clockSelector) return;

    // Check if mouse is inside the slider
    const rect = _clockSelector.getBoundingClientRect();
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
    if (!_clockSelector || !_selectorBackground) {
      console.error("Clock selector elements not available for initialization");
      return false;
    }

    // Get the active option
    const activeOption = _clockSelector.querySelector(".option.active");
    if (!activeOption) {
      console.warn("No active option found");
      return false;
    }

    const selectorRect = _clockSelector.getBoundingClientRect();
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
    if (!_clockSelector || !_borderTop || !_borderBottom) return;

    const selectorRect = _clockSelector.getBoundingClientRect();

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
    if (!hoveredOption || sliderState.isAnimating || !_clockSelector) {
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
    const selectorRect = _clockSelector.getBoundingClientRect();

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
      !_clockSelector ||
      !_borderTop ||
      !_borderBottom
    ) {
      return;
    }

    sliderState.isAnimating = true;

    const direction = sliderState.entryDirection;
    const selectorRect = _clockSelector.getBoundingClientRect();

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
    if (sliderState.isAnimating || !_clockSelector) {
      return;
    }

    const selectorRect = _clockSelector.getBoundingClientRect();

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

    if (!_clockSelector) return;

    if (isInside) {
      const selectorRect = _clockSelector.getBoundingClientRect();
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

          const fromDirection = sliderState.mouseEnteredFromRight
            ? "right"
            : "left";
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
    if (!_clockSelector) return;

    // Track mouse entry to the selector
    _clockSelector.addEventListener("mouseenter", () => {
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
        const fromDirection = sliderState.mouseEnteredFromRight
          ? "right"
          : "left";
        animateBordersIn(hoveredOption, fromDirection);
      }
    });

    // Track mouse movements over the entire selector
    _clockSelector.addEventListener("mousemove", () => {
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
    _clockSelector.addEventListener("mouseleave", () => {
      // Update slider state
      updateSliderState(false);

      // Reset the buttonJustSelected flag when mouse leaves the slider
      sliderState.buttonJustSelected = false;
    });
  }

  // Add click handlers to the clock options
  function setupOptionClickHandlers() {
    if (!_options || _options.length === 0) {
      console.warn("No clock options found to set up click handlers");
      return;
    }

    _options.forEach((option) => {
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
    if (!option || !_clockSelector || !_selectorBackground) return;

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
      _clockSelector.querySelectorAll(".option").forEach((opt) => {
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
    const selectorRect = _clockSelector.getBoundingClientRect();

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

    // Get the clock format from data-clock-format attribute
    const clockFormat = option.getAttribute("data-clock-format");

    // Apply the selected clock format
    applyClockFormatByPosition(
      parseInt(option.getAttribute("data-position") || "2")
    );

    // Save preference to localStorage
    localStorage.setItem("userClockFormat", clockFormat);

    // Recalculate shortest text width when text content changes
    calculateShortestTextWidth();
  }

  // Handle window resize to re-equalize button widths
  function setupResizeHandler() {
    window.addEventListener("resize", () => {
      // Re-equalize button widths
      equalizeButtonWidths();

      if (!_clockSelector || !_selectorBackground) return;

      // Update the active button background
      const activeOption = _clockSelector.querySelector(".option.active");
      if (!activeOption) return;

      const selectorRect = _clockSelector.getBoundingClientRect();
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

  // Apply saved clock format preference
  function applySavedClockFormat() {
    const savedFormat = localStorage.getItem("userClockFormat");

    if (savedFormat) {
      // Find the option with matching data attribute
      const formatOption = document.querySelector(
        `.clock-selector .option[data-clock-format="${savedFormat}"]`
      );

      if (formatOption) {
        setActiveOption(formatOption, true);
      }
    }
  }

  // Initialize everything
  function init() {
    // Get clock selector elements
    _clockSelector = document.querySelector(".clock-selector");
    _selectorBackground = document.querySelector(
      ".clock-selector .selector-background"
    );
    _options = document.querySelectorAll(".clock-selector .option");
    _borderTop = document.querySelector(".clock-selector .border-top");
    _borderBottom = document.querySelector(".clock-selector .border-bottom");

    // Get clock display elements
    _clock12h = document.getElementById("clock-12h");
    _clock24h = document.getElementById("clock-24h");

    if (!_clockSelector) {
      console.error("Clock selector elements not found");
      return false;
    }

    // Start updating the clock displays
    startClockTimer();

    // Set all buttons to equal width FIRST before anything else
    equalizeButtonWidths();

    // Disable transition for initial positioning
    if (_selectorBackground) {
      _selectorBackground.style.transition = "none";
    }

    // Initialize selector
    const selectorInitialized = initializeSelector();
    if (!selectorInitialized) {
      console.error("Clock selector initialization failed");
      return false;
    }

    // Apply saved clock format
    applySavedClockFormat();

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

    // Start continuous monitoring to catch mouse events that might be missed
    startContinuousMonitoring();

    return true;
  }

  // Return public methods
  return {
    init: init,
    setActiveOption: setActiveOption,
    updateClockDisplays: updateClockDisplays,
  };
})();
