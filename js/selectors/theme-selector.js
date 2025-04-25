/**
 * Theme Selector
 *
 * Handles theme selection (light, dark, system) functionality.
 * Extends the base selector with theme-specific business logic.
 */
class ThemeSelector extends SelectorBase {
  /**
   * Create a new ThemeSelector
   * @param {string} selectorClass - CSS selector for the theme slider
   * @param {string} name - Identifier name (usually "theme")
   * @param {Object} options - Configuration options
   */
  constructor(selectorClass, name, options = {}) {
    // Set default options for theme selector
    const themeOptions = Object.assign(
      {
        storageKey: "userThemePreference",
        defaultValue: "system",
        themes: ["light", "system", "dark"],
      },
      options
    );

    super(selectorClass, name, themeOptions);

    // Store reference to media query for system theme detection
    this.darkModeMediaQuery = null;
    this.systemThemeChangeHandler = this.handleSystemThemeChange.bind(this);
  }

  /**
   * Apply specific theme
   * @param {string} themeName - Name of theme to apply (light, dark, system)
   * @param {boolean} skipThemeDetection - If true, skips system theme detection
   */
  applyTheme(themeName, skipThemeDetection = false) {
    console.log("Applying theme:", themeName);
    const body = document.body;

    if (themeName === "light") {
      console.log("Setting light theme attributes");
      body.setAttribute("data-theme", "light");
      body.style.backgroundImage =
        "linear-gradient(-25deg, var(--light-page-start) 0%, var(--light-page-end) 100%)";

      // Update slider background if available
      const themeSelector = document.querySelector(this.selectorClass);
      if (themeSelector) {
        themeSelector.style.background =
          "linear-gradient(-25deg, var(--light-slider-start) 0%, var(--light-slider-end) 100%)";
      }
    } else if (themeName === "dark") {
      console.log("Setting dark theme attributes");
      body.setAttribute("data-theme", "dark");
      body.style.backgroundImage =
        "linear-gradient(-25deg, var(--dark-page-start) 0%, var(--dark-page-end) 100%)";

      // Update slider background if available
      const themeSelector = document.querySelector(this.selectorClass);
      if (themeSelector) {
        themeSelector.style.background =
          "linear-gradient(-25deg, var(--dark-slider-start) 0%, var(--dark-slider-end) 100%)";
      }
    } else if (themeName === "system" && !skipThemeDetection) {
      console.log("Setting system theme based on preference");
      const prefersDark = this.detectSystemDarkMode();
      this.applyTheme(prefersDark ? "dark" : "light", true);
    }
  }

  /**
   * Check if system prefers dark mode
   * @returns {boolean} - True if system prefers dark mode
   */
  detectSystemDarkMode() {
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  }

  /**
   * Handle system theme change event
   */
  handleSystemThemeChange() {
    // Only apply change if current preference is "system"
    const currentPreference = localStorage.getItem(this.options.storageKey);
    if (currentPreference === "system") {
      const prefersDark = this.detectSystemDarkMode();
      this.applyTheme(prefersDark ? "dark" : "light", true);
    }
  }

  /**
   * Set up system theme change detection
   */
  setupSystemThemeDetection() {
    if (window.matchMedia) {
      // Remove any existing listeners first to prevent duplicates
      try {
        this.darkModeMediaQuery = window.matchMedia(
          "(prefers-color-scheme: dark)"
        );

        // For older browsers
        this.darkModeMediaQuery.removeListener(this.systemThemeChangeHandler);

        // For newer browsers
        this.darkModeMediaQuery.removeEventListener(
          "change",
          this.systemThemeChangeHandler
        );

        // Add the listener using modern method or fallback
        try {
          this.darkModeMediaQuery.addEventListener(
            "change",
            this.systemThemeChangeHandler
          );
        } catch (e) {
          console.warn("Media query addEventListener error:", e);
          // Fallback for older browsers
          try {
            this.darkModeMediaQuery.addListener(this.systemThemeChangeHandler);
          } catch (e2) {
            console.warn("Media query addListener error:", e2);
          }
        }
      } catch (e) {
        console.warn("Error setting up media query listeners:", e);
      }
    }
  }

  /**
   * Clean up resources
   */
  cleanup() {
    // Remove media query listeners
    if (this.darkModeMediaQuery) {
      try {
        // For older browsers
        this.darkModeMediaQuery.removeListener(this.systemThemeChangeHandler);

        // For newer browsers
        this.darkModeMediaQuery.removeEventListener(
          "change",
          this.systemThemeChangeHandler
        );
      } catch (e) {
        console.warn("Error removing media query listeners:", e);
      }
    }

    // Call parent cleanup
    super.cleanup();
  }

  /**
   * Apply user preference from storage or UI selection
   * @param {string} themeName - The theme to apply
   */
  applyPreference(themeName) {
    // First, try to find the option in DOM
    if (this.sliderInstance) {
      const option = document.querySelector(
        `${this.selectorClass} .option[data-theme="${themeName}"]`
      );

      if (option) {
        // Set the active option in the UI
        this.sliderInstance.setActiveOption(option, true);
      }
    }

    // Apply the theme
    this.applyTheme(themeName);
  }

  /**
   * Handle option selected event
   * @param {Element} option - The selected option element
   */
  handleOptionSelected(option) {
    // Get the theme from data-theme attribute or fallback to text
    const themeName = this.getValueFromOption(option);

    console.log("Theme option selected:", themeName);

    // Apply the theme
    this.applyTheme(themeName);

    // Save to local storage
    this.savePreference(themeName);
  }

  /**
   * Get theme value from option
   * @param {Element} option - The option element
   * @returns {string} - The theme name
   */
  getValueFromOption(option) {
    // First try data-theme attribute
    const dataTheme = option.getAttribute("data-theme");
    if (dataTheme) return dataTheme;

    // Then try header content
    const h3 = option.querySelector("h3");
    if (h3) {
      return h3.textContent.toLowerCase().replace(" theme", "");
    }

    // Fallback to position: 1=light, 2=system, 3=dark
    const position = parseInt(option.getAttribute("data-position") || "2");
    return this.options.themes[position - 1] || "system";
  }

  /**
   * After initialization complete
   */
  onInitialized() {
    // Set up system theme detection
    this.setupSystemThemeDetection();

    // Apply system theme based on system preference
    const currentPreference =
      localStorage.getItem(this.options.storageKey) ||
      this.options.defaultValue;
    if (currentPreference === "system") {
      this.applySystemTheme();
    }
  }

  /**
   * Apply system theme based on system preferences
   */
  applySystemTheme() {
    // Find the system theme option
    const systemOption =
      document.querySelector(
        `${this.selectorClass} .option[data-theme="system"]`
      ) ||
      document.querySelector(
        `${this.selectorClass} .option[data-position="2"]`
      );

    if (!systemOption) {
      console.warn("System theme option not found");
      return;
    }

    // Make sure system option is active
    if (!systemOption.classList.contains("active")) {
      // Programmatically activate the system option
      if (this.sliderInstance) {
        this.sliderInstance.setActiveOption(systemOption, true);
      }
    } else {
      // Apply the system theme directly since the option is already active
      this.applyTheme("system");
    }
  }
}

// Register theme selector with the factory
(function () {
  // Wait for dependencies to be loaded
  function waitForDependencies() {
    if (
      typeof window.SelectorBase === "undefined" ||
      typeof window.SelectorFactory === "undefined"
    ) {
      console.log("Waiting for selector dependencies...");
      setTimeout(waitForDependencies, 50);
      return;
    }

    // Create and register the theme selector
    console.log("Registering theme selector");
    window.themeSelector = window.SelectorFactory.register(
      "theme",
      ThemeSelector,
      ".theme-selector",
      {
        storageKey: "userThemePreference",
        defaultValue: "system",
      }
    );
  }

  // Start waiting for dependencies
  waitForDependencies();
})();
