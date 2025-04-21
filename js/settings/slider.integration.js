// js/settings/slider-integration.js
(function () {
  // This function will be called both on initial site load and when the settings page is loaded
  console.log("Slider integration loaded");

  // Initialize the theme selector if it exists
  function initThemeSelector() {
    // Check if we're on the settings page by looking for the theme selector
    const themeSelectorElement = document.querySelector(".theme-selector");

    if (!themeSelectorElement) {
      console.log("Theme selector element not found in the DOM");
      return;
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
      return;
    }

    // Initialize the theme selector
    console.log("Initializing theme selector");
    const result = window.sliderButtons.init();
    console.log("Theme selector initialization result:", result);

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
  }

  // Wait for page to be fully loaded
  if (document.readyState === "complete") {
    // Page already loaded
    setTimeout(initThemeSelector, 300);
  } else {
    // Wait for page to finish loading
    window.addEventListener("load", function () {
      setTimeout(initThemeSelector, 300);
    });
  }

  // Also try to initialize when the settings page is loaded via router
  document.addEventListener("pageLoaded", function (event) {
    if (event.detail && event.detail.pageName === "settings") {
      console.log("Settings page loaded event detected");
      // Longer delay to ensure DOM elements are available
      setTimeout(initThemeSelector, 500);
    }
  });

  // Store a reference in the window object for router.js to access
  window.themeSelector = window.sliderButtons;
})();
