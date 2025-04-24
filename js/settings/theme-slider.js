// js/settings/theme-slider.js
window.themeSlider = (function () {
  // Core slider instance we'll use
  let sliderInstance = null;

  // Utility function for theme application
  function applyThemeByName(themeName, skipThemeDetection = false) {
    console.log("Applying theme:", themeName);
    const body = document.body;

    if (themeName === "light") {
      console.log("Setting light theme attributes");
      body.setAttribute("data-theme", "light");
      body.style.backgroundImage =
        "linear-gradient(-25deg, var(--light-page-start) 0%, var(--light-page-end) 100%)";
      if (sliderInstance._themeSelector) {
        sliderInstance._themeSelector.style.background =
          "linear-gradient(-25deg, var(--light-slider-start) 0%, var(--light-slider-end) 100%)";
      }
    } else if (themeName === "dark") {
      console.log("Setting dark theme attributes");
      body.setAttribute("data-theme", "dark");
      body.style.backgroundImage =
        "linear-gradient(-25deg, var(--dark-page-start) 0%, var(--dark-page-end) 100%)";
      if (sliderInstance._themeSelector) {
        sliderInstance._themeSelector.style.background =
          "linear-gradient(-25deg, var(--dark-slider-start) 0%, var(--dark-slider-end) 100%)";
      }
    } else if (themeName === "system" && !skipThemeDetection) {
      console.log("Setting system theme based on preference");
      const prefersDark =
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      applyThemeByName(prefersDark ? "dark" : "light", true);
    }
  }

  // Define the applySystemTheme function to check system preference
  function applySystemTheme() {
    // Find the system theme option
    const systemOption =
      document.querySelector('.theme-selector .option[data-theme="system"]') ||
      document.querySelector('.theme-selector .option[data-position="2"]');

    if (!systemOption) {
      console.warn("System theme option not found");
      return;
    }

    // Make sure system option is active
    if (!systemOption.classList.contains("active")) {
      // Programmatically activate the system option
      sliderInstance.setActiveOption(systemOption, true);
    } else {
      // Apply the system theme directly since the option is already active
      applyThemeByName("system");
    }
  }

  // Custom handler for when an option is selected
  function handleOptionSelected(option) {
    // Get the theme name from data-theme attribute or from text
    const themeName =
      option.getAttribute("data-theme") ||
      option
        .querySelector("h3")
        .textContent.toLowerCase()
        .replace(" theme", "");

    console.log("Theme option selected:", themeName);

    // Apply the selected theme
    applyThemeByName(themeName);
    console.log("Theme should now be:", themeName);

    // Save preference to localStorage
    localStorage.setItem("userThemePreference", themeName);
  }

  // Initialize the theme slider
  function init() {
    // Get access to the core slider functionality
    if (!window.sliderButtons) {
      console.error("Core slider functionality not available");
      return false;
    }

    // Use the existing slider instance directly
    sliderInstance = window.sliderButtons;

    // Set custom option selection handler
    sliderInstance.onOptionSelected = handleOptionSelected;

    // Initialize the slider
    const result = sliderInstance.init(".theme-selector");

    if (!result) {
      return false;
    }

    // Set up listeners for system theme changes
    if (window.matchMedia) {
      // Remove any existing listeners first to prevent duplicates
      try {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        // For older browsers
        mediaQuery.removeListener(applySystemTheme);
        // For newer browsers
        mediaQuery.removeEventListener("change", applySystemTheme);

        // Add the listener
        mediaQuery.addEventListener("change", applySystemTheme);
      } catch (e) {
        console.warn("Media query listener error:", e);
        // Fallback for older browsers
        try {
          window
            .matchMedia("(prefers-color-scheme: dark)")
            .addListener(applySystemTheme);
        } catch (e2) {
          console.warn("Media query addListener error:", e2);
        }
      }
    }

    // Apply system theme based on system preference
    applySystemTheme();

    return true;
  }

  // Public API
  return {
    init: init,
    applyThemeByName: applyThemeByName,
    applySystemTheme: applySystemTheme,
  };
})();
