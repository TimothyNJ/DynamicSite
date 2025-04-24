// js/settings/time-format-slider-integration.js
(function () {
  console.log("Time format slider integration loaded");

  // This will track if we've already initialized to avoid duplicate initialization
  let initialized = false;
  let initializationAttempts = 0; // Track initialization attempts

  // Initialize the time format slider if it exists
  function initTimeFormatSlider() {
    // Check if we're on the settings page by looking for the time format selector
    const timeFormatSelector = document.querySelector(".time-format-selector");
    if (!timeFormatSelector) {
      console.log("Time format selector element not found in the DOM");
      return false;
    }

    // Check if already initialized
    if (initialized) {
      console.log("Time format slider already initialized, skipping");
      return true;
    }

    // Limit initialization attempts
    initializationAttempts++;
    if (initializationAttempts > 3) {
      console.warn("Exceeded initialization attempts, giving up");
      return false;
    }

    // Check if dependencies are loaded
    if (
      typeof window.sliderButtons === "undefined" ||
      typeof window.timeFormatSlider === "undefined"
    ) {
      console.log(
        "Core slider or time format slider not available yet, will retry in 50ms"
      );
      setTimeout(initTimeFormatSlider, 50);
      return false;
    }

    // Ensure the callback is set up before initializing
    window.sliderButtons.onOptionSelected =
      window.timeFormatSlider.handleOptionSelected;

    // Initialize the time format slider
    console.log("Initializing time format slider from integration.js");
    try {
      const result = window.timeFormatSlider.init();

      if (result === false) {
        console.log(
          "Time format slider initialization failed, will retry in 50ms"
        );
        setTimeout(initTimeFormatSlider, 50);
        return false;
      }

      console.log("Time format slider initialization successful");
      initialized = true;
      initializationAttempts = 0; // Reset counter on success

      // Apply saved time format preference
      const savedFormat = localStorage.getItem("userTimeFormatPreference");
      if (savedFormat) {
        console.log("Applying saved time format preference:", savedFormat);
        const formatOptions = {
          12: document.querySelector(
            '.time-format-selector .option[data-format="12"]'
          ),
          24: document.querySelector(
            '.time-format-selector .option[data-format="24"]'
          ),
        };

        if (formatOptions[savedFormat]) {
          // Use the slider instance directly
          window.sliderButtons.setActiveOption(
            formatOptions[savedFormat],
            true
          );
        } else {
          // Apply format directly if we can't find the option
          window.timeFormatSlider.applyTimeFormat(savedFormat);
        }
      }

      return true;
    } catch (error) {
      console.error("Error during time format slider initialization:", error);
      return false;
    }
  }

  // The pageLoaded event is our primary initialization point
  document.addEventListener("pageLoaded", function (event) {
    if (event.detail && event.detail.pageName === "settings") {
      console.log("Settings page loaded event detected");

      // Force reinitialization
      initialized = false;
      initializationAttempts = 0;

      // Initialize immediately
      setTimeout(initTimeFormatSlider, 0); // Use setTimeout to avoid blocking
    } else {
      // If we navigated away from settings, clean up and reset
      if (event.detail && event.detail.pageName !== "settings") {
        initialized = false;
        if (window.timeFormatSlider && window.timeFormatSlider.cleanup) {
          window.timeFormatSlider.cleanup();
        }
      }
    }
  });

  // Listen for navigation events
  window.addEventListener("hashchange", function () {
    if (window.location.hash === "#settings") {
      if (!initialized) {
        console.log("Navigated to settings page");
        initialized = false;
        initializationAttempts = 0;
        setTimeout(initTimeFormatSlider, 0); // Use setTimeout to avoid blocking
      }
    } else {
      // When navigating away from settings, clean up
      initialized = false;
      if (window.timeFormatSlider && window.timeFormatSlider.cleanup) {
        window.timeFormatSlider.cleanup();
      }
    }
  });

  // Try during normal page load for direct URL navigation to settings
  if (document.readyState === "complete") {
    // Page already loaded, check if we're on the settings page
    if (window.location.hash === "#settings") {
      setTimeout(initTimeFormatSlider, 0); // Use setTimeout to avoid blocking
    }
  } else {
    // Wait for page to finish loading
    window.addEventListener("load", function () {
      // Check if we're on the settings page
      if (window.location.hash === "#settings") {
        setTimeout(initTimeFormatSlider, 0); // Use setTimeout to avoid blocking
      }
    });
  }

  // Store a reference in the window object for router.js to access
  window.timeFormatSliderIntegration = {
    init: function () {
      setTimeout(initTimeFormatSlider, 0); // Use setTimeout to avoid blocking
      return true;
    },
    reinitialize: function () {
      initialized = false;
      initializationAttempts = 0;
      setTimeout(initTimeFormatSlider, 0); // Use setTimeout to avoid blocking
      return true;
    },
  };
})();
