// js/settings/theme-integration.js
// Wait for DOM to be fully loaded
document.addEventListener("DOMContentLoaded", function () {
  // This function will be called both on initial site load and when the settings page is loaded
  initThemeSelector();
});

// Also listen for the page loaded event to initialize when settings page is loaded
document.addEventListener("pageLoaded", function (event) {
  if (event.detail.pageName === "settings") {
    // Short delay to ensure DOM elements are available
    setTimeout(initThemeSelector, 100);
  }
});

function initThemeSelector() {
  // Check if we're on the settings page by looking for the theme selector
  const themeSelectorElement = document.querySelector(".theme-selector");
  if (!themeSelectorElement) return;

  // Check if themeSelector is defined in the global scope
  if (
    typeof window.themeSelector === "undefined" ||
    typeof window.themeSelector.init !== "function"
  ) {
    console.warn("Theme selector not available yet");
    return;
  }

  // Initialize the theme selector
  window.themeSelector.init();

  // Load saved theme preference
  const savedTheme = localStorage.getItem("userThemePreference");
  if (savedTheme) {
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
