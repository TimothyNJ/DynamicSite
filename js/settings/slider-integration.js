// js/settings/slider-integration.js
(function () {
  console.log("Slider integration loaded");

  // This will track if we've already initialized to avoid duplicate initialization
  let initialized = false;
  let currentThemeSelectorId = null; // Store a unique ID for current theme selector
  let isNavigating = false; // Flag to track page navigation
  let initializationAttempts = 0; // Track initialization attempts

  // Initialize the theme selector if it exists
  function initThemeSelector() {
    // Check if we're on the settings page by looking for the theme selector
    const themeSelectorElement = document.querySelector(".theme-selector");
    if (!themeSelectorElement) {
      console.log("Theme selector element not found in the DOM");
      return false;
    }

    // Generate a unique ID for the theme selector if it doesn't have one
    if (!themeSelectorElement.dataset.integrationId) {
      themeSelectorElement.dataset.integrationId = Date.now().toString();
    }

    // Check if this is a different instance than the one we initialized before
    if (currentThemeSelectorId !== themeSelectorElement.dataset.integrationId) {
      console.log("New theme selector instance detected");
      initialized = false; // Force reinitialization
      currentThemeSelectorId = themeSelectorElement.dataset.integrationId;
    }

    // Check if already initialized (with this selector)
    if (initialized) {
      console.log("Theme selector already initialized, skipping");
      return true;
    }

    // Limit initialization attempts
    initializationAttempts++;
    if (initializationAttempts > 3) {
      console.warn("Exceeded initialization attempts, giving up");
      return false;
    }

    // Check if sliderButtons is defined in the global scope
    if (
      typeof window.sliderButtons === "undefined" ||
      !window.sliderButtons ||
      typeof window.sliderButtons.init !== "function"
    ) {
      console.log(
        "Slider buttons object not available yet, will retry in 50ms"
      );
      setTimeout(initThemeSelector, 50);
      return false;
    }

    // Initialize the theme selector
    console.log("Initializing theme selector from integration.js");
    try {
      const result = window.sliderButtons.init();

      if (result === false) {
        console.log("Theme selector initialization failed, will retry in 50ms");
        setTimeout(initThemeSelector, 50);
        return false;
      }

      console.log("Theme selector initialization successful");
      initialized = true;
      initializationAttempts = 0; // Reset counter on success

      // Load saved theme preference
      const savedTheme = localStorage.getItem("userThemePreference");
      if (savedTheme) {
        console.log("Applying saved theme preference:", savedTheme);
        const themeOptions = {
          light: document.querySelector('.option[data-theme="light"]'),
          system: document.querySelector('.option[data-theme="system"]'),
          dark: document.querySelector('.option[data-theme="dark"]'),
        };

        if (themeOptions[savedTheme]) {
          window.sliderButtons.setActiveOption(themeOptions[savedTheme], true);
        }
      }

      return true;
    } catch (error) {
      console.error("Error during theme selector initialization:", error);
      return false;
    }
  }

  // Force re-initialization when page content changes
  function reinitializeIfNeeded() {
    // Check if we're on the settings page
    if (window.location.hash === "#settings") {
      console.log("Settings page detected, checking initialization");

      // Only attempt reinitialization if necessary
      if (!initialized) {
        initThemeSelector();
      }
    }
  }

  // The pageLoaded event is our primary initialization point
  document.addEventListener("pageLoaded", function (event) {
    if (event.detail && event.detail.pageName === "settings") {
      console.log("Settings page loaded event detected");

      // Force reinitialization since page has been loaded anew
      initialized = false;
      initializationAttempts = 0;
      isNavigating = false;

      // Initialize immediately - remove timeout
      initThemeSelector();
    } else {
      // If we navigated away from settings, mark as not initialized
      if (event.detail && event.detail.pageName !== "settings") {
        initialized = false;
        currentThemeSelectorId = null;
      }
    }
  });

  // Listen for navigation events
  window.addEventListener("hashchange", function () {
    if (window.location.hash === "#settings") {
      if (!isNavigating) {
        console.log("Navigated to settings page");
        initialized = false;
        initializationAttempts = 0;
        reinitializeIfNeeded();
      }
    } else {
      // When navigating away from settings
      initialized = false;
      currentThemeSelectorId = null;
    }
  });

  // Try during normal page load for direct URL navigation to settings
  if (document.readyState === "complete") {
    // Page already loaded, check if we're on the settings page
    if (window.location.hash === "#settings") {
      initThemeSelector();
    }
  } else {
    // Wait for page to finish loading
    window.addEventListener("load", function () {
      // Check if we're on the settings page
      if (window.location.hash === "#settings") {
        initThemeSelector();
      }
    });
  }

  // Store a reference in the window object for router.js to access
  window.themeSelector = {
    init: initThemeSelector,
    reinitialize: function () {
      initialized = false;
      initializationAttempts = 0;
      return initThemeSelector();
    },
  };
})();
