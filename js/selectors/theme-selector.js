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
        values: ["dark", "system", "light"],
        labels: ["Dark", "System", "Light"],
        debug: false,
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
    this.log("Applying theme:", themeName);
    const body = document.body;

    if (themeName === "light") {
      this.log("Setting light theme attributes");
      body.setAttribute("data-theme", "light");
      body.style.backgroundImage =
        "linear-gradient(-25deg, var(--light-page-start) 0%, var(--light-page-end) 100%)";

      // Update component background colors via CSS variables
      document.documentElement.style.setProperty(
        "--component-gradient-start",
        "var(--light-component-start)"
      );
      document.documentElement.style.setProperty(
        "--component-gradient-end",
        "var(--light-component-end)"
      );
    } else if (themeName === "dark") {
      this.log("Setting dark theme attributes");
      body.setAttribute("data-theme", "dark");
      body.style.backgroundImage =
        "linear-gradient(-25deg, var(--dark-page-start) 0%, var(--dark-page-end) 100%)";

      // Update component background colors via CSS variables
      document.documentElement.style.setProperty(
        "--component-gradient-start",
        "var(--dark-component-start)"
      );
      document.documentElement.style.setProperty(
        "--component-gradient-end",
        "var(--dark-component-end)"
      );
    } else if (themeName === "system" && !skipThemeDetection) {
      this.log("Setting system theme based on preference");
      const prefersDark = this.detectSystemDarkMode();
      this.applyTheme(prefersDark ? "dark" : "light", true);
    }

    // Trigger theme changed event
    this.triggerEvent("themeChanged", { theme: themeName });
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
  handleSystemThemeChange(event) {
    // Only apply change if current preference is "system"
    const currentPreference = localStorage.getItem(this.options.storageKey);
    if (currentPreference === "system") {
      const prefersDark = event.matches;
      this.log(
        "System theme preference changed:",
        prefersDark ? "dark" : "light"
      );
      this.applyTheme(prefersDark ? "dark" : "light", true);
    }
  }

  /**
   * Set up system theme change detection
   */
  setupSystemThemeDetection() {
    if (window.matchMedia) {
      try {
        // Remove any existing listeners first to prevent duplicates
        if (this.darkModeMediaQuery) {
          try {
            // For older browsers
            this.darkModeMediaQuery.removeListener(
              this.systemThemeChangeHandler
            );
            // For newer browsers
            this.darkModeMediaQuery.removeEventListener(
              "change",
              this.systemThemeChangeHandler
            );
          } catch (e) {
            this.log("Error removing existing media query listeners:", e);
          }
        }

        // Create new media query
        this.darkModeMediaQuery = window.matchMedia(
          "(prefers-color-scheme: dark)"
        );

        // Add the listener using modern method or fallback
        try {
          this.darkModeMediaQuery.addEventListener(
            "change",
            this.systemThemeChangeHandler
          );
        } catch (e) {
          this.log("Media query addEventListener error:", e);
          // Fallback for older browsers
          try {
            this.darkModeMediaQuery.addListener(this.systemThemeChangeHandler);
          } catch (e2) {
            this.error("Media query addListener error:", e2);
          }
        }

        // Register cleanup
        this.addDestroyHandler(() => {
          try {
            if (this.darkModeMediaQuery) {
              // For older browsers
              this.darkModeMediaQuery.removeListener(
                this.systemThemeChangeHandler
              );
              // For newer browsers
              this.darkModeMediaQuery.removeEventListener(
                "change",
                this.systemThemeChangeHandler
              );
            }
          } catch (e) {
            this.error(
              "Error removing media query listeners during cleanup:",
              e
            );
          }
        });
      } catch (e) {
        this.error("Error setting up media query listeners:", e);
      }
    }
  }

  /**
   * Apply preference from selector
   * @param {string} themeName - The theme to apply
   */
  applyPreference(themeName) {
    if (!themeName) return;

    this.log("Applying theme preference:", themeName);

    // Update active option in UI
    this.setActiveOption(themeName);

    // Store current value
    this.currentValue = themeName;

    // Apply the theme
    this.applyTheme(themeName);
  }

  /**
   * After initialization complete
   */
  onInitialized() {
    // Set up system theme detection
    this.setupSystemThemeDetection();

    // Apply stored preference or default after a short delay
    setTimeout(() => {
      const savedTheme =
        localStorage.getItem(this.options.storageKey) ||
        this.options.defaultValue;
      this.applyPreference(savedTheme);
    }, 50);
  }
}

// Register theme selector with the factory
(function () {
  // Register when dependencies are available
  function checkDependencies() {
    if (
      typeof window.SelectorBase === "undefined" ||
      typeof window.SelectorFactory === "undefined"
    ) {
      setTimeout(checkDependencies, 50);
      return;
    }

    // Register with factory
    window.ThemeSelector = ThemeSelector;

    // Create instance if not running in preload mode
    if (typeof window.selectorPreload === "undefined") {
      window.themeSelector = window.SelectorFactory.register(
        "theme",
        ThemeSelector,
        ".theme-selector",
        {
          storageKey: "userThemePreference",
          defaultValue: "system",
          values: ["dark", "system", "light"],
          labels: ["Dark", "System", "Light"],
        }
      );
    }
  }

  // Start checking for dependencies
  checkDependencies();
})();
