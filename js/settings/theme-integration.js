// js/settings/theme-integration.js
// Wait for DOM to be fully loaded
document.addEventListener("DOMContentLoaded", function () {
  // This function will be called both on initial site load and when the settings page is loaded
  console.log("DOM loaded, checking for settings page");
  setTimeout(initThemeSelector, 300);
});

// Also listen for the page loaded event to initialize when settings page is loaded
document.addEventListener("pageLoaded", function (event) {
  if (event.detail.pageName === "settings") {
    console.log("Settings page loaded event detected");
    // Longer delay to ensure DOM elements are available
    setTimeout(initThemeSelector, 500);
  }
});

function initThemeSelector() {
  // Check if we're on the settings page by looking for the theme selector
  const themeSelectorElement = document.querySelector(".theme-selector");
  console.log("Checking for theme selector element:", themeSelectorElement);

  if (!themeSelectorElement) {
    console.warn("Theme selector element not found in the DOM");
    return;
  }

  // Check if themeSelector is defined in the global scope
  if (
    typeof window.themeSelector === "undefined" ||
    typeof window.themeSelector.init !== "function"
  ) {
    console.warn(
      "Theme selector object not available yet, will retry in 300ms"
    );
    setTimeout(initThemeSelector, 300);
    return;
  }

  // Initialize the theme selector
  console.log("Initializing theme selector");
  const result = window.themeSelector.init();
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
      window.themeSelector.setActiveOption(themeOptions[savedTheme], true);
    }
  }
}
