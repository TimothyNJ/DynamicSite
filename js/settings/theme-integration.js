// Wait for DOM to be fully loaded
document.addEventListener("DOMContentLoaded", function () {
  // Initialize the theme selector
  themeSelector.init();

  // Optional: Load saved theme preference
  const savedTheme = localStorage.getItem("userThemePreference");
  if (savedTheme) {
    const themeOptions = {
      light: document.querySelector('.option[data-position="1"]'),
      system: document.querySelector('.option[data-position="2"]'),
      dark: document.querySelector('.option[data-position="3"]'),
    };

    if (themeOptions[savedTheme]) {
      themeSelector.setActiveOption(themeOptions[savedTheme], true);
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
});
