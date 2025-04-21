// js/settings/slider-integration.js
(function () {
  console.log("Slider integration loaded");

  // This will track if we've already initialized to avoid duplicate initialization
  let initialized = false;

  // Initialize the theme selector if it exists
  function initThemeSelector() {
    // Check if already initialized
    if (initialized) {
      console.log("Theme selector already initialized, skipping");
      return;
    }

    // Check if we're on the settings page by looking for the theme selector
    const themeSelectorElement = document.querySelector(".theme-selector");
    if (!themeSelectorElement) {
      console.log("Theme selector element not found in the DOM");
      return false;
    }

    // Check if sliderButtons is defined in the global scope
    if (
      typeof window.sliderButtons === "undefined" ||
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
    const result = window.sliderButtons.init();

    if (result === false) {
      console.log("Theme selector initialization failed, will retry in 300ms");
      setTimeout(initThemeSelector, 300);
      return false;
    }

    console.log("Theme selector initialization successful");
    initialized = true;

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
  }

  // The pageLoaded event is our primary initialization point
  document.addEventListener("pageLoaded", function (event) {
    if (event.detail && event.detail.pageName === "settings") {
      console.log("Settings page loaded event detected");
      // First try after a short delay
      setTimeout(function () {
        if (!initThemeSelector()) {
          // If it fails, try with a longer delay
          setTimeout(function () {
            if (!initThemeSelector()) {
              // One final try with an even longer delay
              setTimeout(initThemeSelector, 1000);
            }
          }, 500);
        }
      }, 200);
    }
  });

  // Also try during normal page load for direct URL navigation to settings
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
  };
})();
