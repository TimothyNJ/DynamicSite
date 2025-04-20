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
      light: document.querySelector('.option[data-position="1"]'),
      system: document.querySelector('.option[data-position="2"]'),
      dark: document.querySelector('.option[data-position="3"]'),
    };

    if (themeOptions[savedTheme]) {
      window.themeSelector.setActiveOption(themeOptions[savedTheme], true);
    }
  }

  // Add event listener for theme changes to save preference
  document.querySelectorAll(".theme-selector .option").forEach((option) => {
    option.addEventListener("click", function () {
      // Extract theme name
      const themeName = this.querySelector("h3")
        .textContent.toLowerCase()
        .replace(" theme", "");

      // Save to localStorage
      localStorage.setItem("userThemePreference", themeName);
    });
  });
}
