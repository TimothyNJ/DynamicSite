// js/settings/slider-integration.js
(function () {
  console.log("Slider integration loaded");

  // This will track if we've already initialized to avoid duplicate initialization
  let initialized = false;
  let currentSelectors = null; // Store references to current DOM elements
  let isReloading = false; // Track when we're reloading scripts
  let waitingInterval = null; // For polling when waiting for script reload

  // Initialize the theme selector if it exists
  function initThemeSelector() {
    // Check if we're on the settings page by looking for the theme selector
    const themeSelectorElement = document.querySelector(".theme-selector");
    if (!themeSelectorElement) {
      console.log("Theme selector element not found in the DOM");
      return false;
    }

    // Reset initialization status when the DOM has changed
    // Compare current selector with the one we have stored
    if (
      currentSelectors &&
      currentSelectors.themeSelector !== themeSelectorElement
    ) {
      console.log("DOM has changed, resetting initialization state");
      initialized = false;

      // We need to reload the slider-buttons script
      if (!isReloading) {
        reloadSliderButtonsScript();
        return false;
      }
    }

    // If we're in the process of reloading the script, wait
    if (isReloading) {
      console.log("Still waiting for scripts to reload...");
      return false;
    }

    // Check if already initialized with current DOM elements
    if (initialized) {
      console.log("Theme selector already initialized, skipping");
      return true;
    }

    // Check if sliderButtons is defined in the global scope
    if (
      typeof window.sliderButtons === "undefined" ||
      !window.sliderButtons ||
      typeof window.sliderButtons.init !== "function"
    ) {
      console.log(
        "Slider buttons object not available yet, will retry in 300ms"
      );
      setTimeout(initThemeSelector, 300);
      return false;
    }

    // Initialize the theme selector
    console.log("Initializing theme selector from integration.js");
    try {
      const result = window.sliderButtons.init();

      if (result === false) {
        console.log(
          "Theme selector initialization failed, will retry in 300ms"
        );
        setTimeout(initThemeSelector, 300);
        return false;
      }

      console.log("Theme selector initialization successful");
      initialized = true;

      // Store references to current DOM elements
      currentSelectors = {
        themeSelector: document.querySelector(".theme-selector"),
        selectorBackground: document.querySelector(".selector-background"),
        options: document.querySelectorAll(".option"),
        borderTop: document.querySelector(".border-top"),
        borderBottom: document.querySelector(".border-bottom"),
      };

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

  // Function to reload the slider-buttons.js script
  function reloadSliderButtonsScript() {
    isReloading = true;
    console.log("Reloading slider-buttons.js script");

    // Remove the current script
    const existingScript = document.querySelector(
      'script[src="js/settings/slider-buttons.js"]'
    );
    if (existingScript) {
      existingScript.remove();
    }

    // Remove the current window.sliderButtons object
    window.sliderButtons = null;

    // Create a new script element
    const newScript = document.createElement("script");
    newScript.src = "js/settings/slider-buttons.js";
    newScript.onload = function () {
      console.log("Slider buttons script reloaded");
      isReloading = false;

      // Give a bit more time for the script to initialize
      setTimeout(function () {
        initThemeSelector();
      }, 100);
    };

    newScript.onerror = function () {
      console.error("Failed to reload slider-buttons.js");
      isReloading = false;
    };

    // Add the new script to the document
    document.body.appendChild(newScript);

    // Set a timeout to prevent waiting indefinitely
    setTimeout(function () {
      if (isReloading) {
        console.warn("Script reload timeout reached, resetting state");
        isReloading = false;
      }
    }, 5000);
  }

  // Force re-initialization when page content changes
  function reinitializeIfNeeded() {
    // Check if we're on the settings page
    if (window.location.hash === "#settings") {
      console.log("Settings page detected, checking initialization");

      // Give time for DOM to be fully loaded
      setTimeout(function () {
        // Get current theme selector
        const themeSelectorElement = document.querySelector(".theme-selector");

        // Check if DOM has changed
        if (
          themeSelectorElement &&
          (!currentSelectors ||
            currentSelectors.themeSelector !== themeSelectorElement)
        ) {
          console.log("New DOM detected, forcing reinitialization");
          initialized = false;
          if (!isReloading) {
            initThemeSelector();
          }
        }
      }, 100);
    }
  }

  // The pageLoaded event is our primary initialization point
  document.addEventListener("pageLoaded", function (event) {
    if (event.detail && event.detail.pageName === "settings") {
      console.log("Settings page loaded event detected");

      // Force reinitialization since page has been loaded anew
      initialized = false;
      isReloading = false;

      // Clear any waiting interval
      if (waitingInterval) {
        clearInterval(waitingInterval);
        waitingInterval = null;
      }

      // First try after a short delay
      setTimeout(function () {
        initThemeSelector();
      }, 200);
    }
  });

  // Also monitor hash changes to reinitialize when navigating directly to settings
  window.addEventListener("hashchange", reinitializeIfNeeded);

  // Try during normal page load for direct URL navigation to settings
  if (document.readyState === "complete") {
    // Page already loaded, check if we're on the settings page
    if (window.location.hash === "#settings") {
      setTimeout(initThemeSelector, 500);
    }
  } else {
    // Wait for page to finish loading
    window.addEventListener("load", function () {
      // Check if we're on the settings page
      if (window.location.hash === "#settings") {
        setTimeout(initThemeSelector, 500);
      }
    });
  }

  // Store a reference in the window object for router.js to access
  window.themeSelector = {
    init: initThemeSelector,
    reinitialize: function () {
      initialized = false;
      isReloading = false;
      return initThemeSelector();
    },
  };
})();
