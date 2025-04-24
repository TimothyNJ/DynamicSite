// js/settings/theme-slider-integration.js
(function () {
  console.log("Theme slider integration loaded");

  // This will track if we've already initialized to avoid duplicate initialization
  let initialized = false;
  let initializationAttempts = 0; // Track initialization attempts

  // Initialize the theme slider if it exists
  function initThemeSlider() {
    // Check if we're on the settings page by looking for the theme selector
    const themeSelectorElement = document.querySelector(".theme-selector");
    if (!themeSelectorElement) {
      console.log("Theme selector element not found in the DOM");
      return false;
    }

    // Check if already initialized
    if (initialized) {
      console.log("Theme slider already initialized, skipping");
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
      typeof window.themeSlider === "undefined"
    ) {
      console.log(
        "Core slider or theme slider not available yet, will retry in 50ms"
      );
      setTimeout(initThemeSlider, 50);
      return false;
    }

    // Initialize the theme slider
    console.log("Initializing theme slider from integration.js");
    try {
      const result = window.themeSlider.init();

      if (result === false) {
        console.log("Theme slider initialization failed, will retry in 50ms");
        setTimeout(initThemeSlider, 50);
        return false;
      }

      console.log("Theme slider initialization successful");
      initialized = true;
      initializationAttempts = 0; // Reset counter on success

      // Apply saved theme preference
      const savedTheme = localStorage.getItem("userThemePreference");
      if (savedTheme) {
        console.log("Applying saved theme preference:", savedTheme);
        const themeOptions = {
          light: document.querySelector(
            '.theme-selector .option[data-theme="light"]'
          ),
          system: document.querySelector(
            '.theme-selector .option[data-theme="system"]'
          ),
          dark: document.querySelector(
            '.theme-selector .option[data-theme="dark"]'
          ),
        };

        if (themeOptions[savedTheme]) {
          // Use the slider instance directly
          window.sliderButtons.setActiveOption(themeOptions[savedTheme], true);
        } else {
          // Apply theme directly if we can't find the option
          window.themeSlider.applyThemeByName(savedTheme);
        }
      }

      return true;
    } catch (error) {
      console.error("Error during theme slider initialization:", error);
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
      initThemeSlider();
    } else {
      // If we navigated away from settings
      if (event.detail && event.detail.pageName !== "settings") {
        initialized = false;
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
        initThemeSlider();
      }
    } else {
      // When navigating away from settings
      initialized = false;
    }
  });

  // Try during normal page load for direct URL navigation to settings
  if (document.readyState === "complete") {
    // Page already loaded, check if we're on the settings page
    if (window.location.hash === "#settings") {
      initThemeSlider();
    }
  } else {
    // Wait for page to finish loading
    window.addEventListener("load", function () {
      // Check if we're on the settings page
      if (window.location.hash === "#settings") {
        initThemeSlider();
      }
    });
  }

  // Store a reference in the window object for router.js to access
  window.themeSliderIntegration = {
    init: initThemeSlider,
    reinitialize: function () {
      initialized = false;
      initializationAttempts = 0;
      return initThemeSlider();
    },
  };
})();
