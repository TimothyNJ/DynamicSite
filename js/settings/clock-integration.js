// js/settings/clock-integration.js
(function () {
  console.log("Clock integration loaded");

  // This will track if we've already initialized to avoid duplicate initialization
  let initialized = false;
  let currentClockSelectorId = null; // Store a unique ID for current clock selector
  let initializationAttempts = 0; // Track initialization attempts

  // Initialize the clock selector if it exists
  function initClockSelector() {
    // Check if we're on the settings page by looking for the clock selector
    const clockSelectorElement = document.querySelector(".clock-selector");
    if (!clockSelectorElement) {
      console.log("Clock selector element not found in the DOM");
      return false;
    }

    // Generate a unique ID for the clock selector if it doesn't have one
    if (!clockSelectorElement.dataset.integrationId) {
      clockSelectorElement.dataset.integrationId = Date.now().toString();
    }

    // Check if this is a different instance than the one we initialized before
    if (currentClockSelectorId !== clockSelectorElement.dataset.integrationId) {
      console.log("New clock selector instance detected");
      initialized = false; // Force reinitialization
      currentClockSelectorId = clockSelectorElement.dataset.integrationId;
    }

    // Check if already initialized (with this selector)
    if (initialized) {
      console.log("Clock selector already initialized, skipping");
      return true;
    }

    // Limit initialization attempts
    initializationAttempts++;
    if (initializationAttempts > 3) {
      console.warn("Exceeded initialization attempts, giving up");
      return false;
    }

    // Check if clockSelector is defined in the global scope
    if (
      typeof window.clockSelector === "undefined" ||
      !window.clockSelector ||
      typeof window.clockSelector.init !== "function"
    ) {
      console.log(
        "Clock selector object not available yet, will retry in 50ms"
      );
      setTimeout(initClockSelector, 50);
      return false;
    }

    // Initialize the clock selector
    console.log("Initializing clock selector from integration.js");
    try {
      const result = window.clockSelector.init();

      if (result === false) {
        console.log("Clock selector initialization failed, will retry in 50ms");
        setTimeout(initClockSelector, 50);
        return false;
      }

      console.log("Clock selector initialization successful");
      initialized = true;
      initializationAttempts = 0; // Reset counter on success

      // Load saved clock format preference
      const savedFormat = localStorage.getItem("userClockFormat");
      if (savedFormat) {
        console.log("Applying saved clock format preference:", savedFormat);
        const formatOptions = {
          12: document.querySelector(
            '.clock-selector .option[data-clock-format="12"]'
          ),
          24: document.querySelector(
            '.clock-selector .option[data-clock-format="24"]'
          ),
        };

        if (formatOptions[savedFormat]) {
          window.clockSelector.setActiveOption(
            formatOptions[savedFormat],
            true
          );
        }
      }

      return true;
    } catch (error) {
      console.error("Error during clock selector initialization:", error);
      return false;
    }
  }

  // The pageLoaded event is our primary initialization point
  document.addEventListener("pageLoaded", function (event) {
    if (event.detail && event.detail.pageName === "settings") {
      console.log("Settings page loaded event detected");

      // Reset initialization state for a fresh start
      initialized = false;
      initializationAttempts = 0;

      // Initialize immediately
      initClockSelector();
    } else {
      // If we navigated away from settings, mark as not initialized
      if (event.detail && event.detail.pageName !== "settings") {
        initialized = false;
        currentClockSelectorId = null;
      }
    }
  });

  // Try during normal page load for direct URL navigation to settings
  if (document.readyState === "complete") {
    // Page already loaded, check if we're on the settings page
    if (window.location.hash === "#settings") {
      initClockSelector();
    }
  } else {
    // Wait for page to finish loading
    window.addEventListener("load", function () {
      // Check if we're on the settings page
      if (window.location.hash === "#settings") {
        initClockSelector();
      }
    });
  }

  // Store a reference in the window object for the router to access
  window.clockSelectorIntegration = {
    init: initClockSelector,
    reinitialize: function () {
      initialized = false;
      initializationAttempts = 0;
      return initClockSelector();
    },
  };
})();
