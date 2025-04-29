/**
 * Selector Manager
 *
 * Manages the initialization and lifecycle of all selectors.
 * Dynamically creates selectors based on configuration and page content.
 */
window.SelectorManager = (function () {
  // Store created selector instances
  const instances = new Map();

  // Flag to track if we've initialized from config
  let initializedFromConfig = false;

  /**
   * Initialize selectors based on configuration
   * @returns {Promise<boolean>} Success status
   */
  async function initializeSelectors() {
    // Skip if already initialized
    if (initializedFromConfig) {
      console.log("Selectors already initialized from configuration");
      return true;
    }

    // Skip if configuration is not available
    if (!window.SelectorConfig) {
      console.error("Selector configuration not found");
      return false;
    }

    // Skip if factory is not available
    if (!window.SelectorFactory) {
      console.error("Selector factory not found");
      return false;
    }

    console.log("Initializing selectors from configuration...");

    try {
      // Use factory's createFromConfig method
      const success = await window.SelectorFactory.createFromConfig(
        window.SelectorConfig
      );

      if (success) {
        initializedFromConfig = true;
        console.log("Selectors initialized successfully from configuration");

        // Store references to created instances
        Object.keys(window.SelectorConfig).forEach((key) => {
          const instance = window.SelectorFactory.getSelector(key);
          if (instance) {
            instances.set(key, instance);
          }
        });
      }

      return success;
    } catch (error) {
      console.error("Error initializing selectors from configuration:", error);
      return false;
    }
  }

  /**
   * Generate HTML for all configured selectors
   * @returns {string} HTML markup
   */
  function generateSelectorsHTML() {
    // Skip if configuration is not available
    if (!window.SelectorConfig) {
      console.log("No selector configuration available for HTML generation");
      return "";
    }

    let html = "";

    // Process each selector configuration
    Object.entries(window.SelectorConfig).forEach(([key, config]) => {
      // Get the appropriate selector class
      let SelectorClass;
      const typeName = config.type || "generic";

      if (typeName === "generic" && window.GenericSelector) {
        SelectorClass = window.GenericSelector;
      } else if (typeName === "theme" && window.ThemeSelector) {
        SelectorClass = window.ThemeSelector;
      } else if (typeName === "time-format" && window.TimeFormatSelector) {
        SelectorClass = window.TimeFormatSelector;
      } else if (
        window[`${ComponentUtils.capitalizeFirstLetter(typeName)}Selector`]
      ) {
        SelectorClass =
          window[`${ComponentUtils.capitalizeFirstLetter(typeName)}Selector`];
      } else {
        // Fallback to generic selector or base
        SelectorClass = window.GenericSelector || window.SelectorBase;
      }

      if (!SelectorClass) {
        console.warn(
          `No selector class found for type "${typeName}", skipping HTML generation`
        );
        return;
      }

      try {
        // Create temporary instance to generate HTML
        const tempInstance = new SelectorClass(
          config.selector,
          config.name || key,
          config
        );

        // Add section HTML without heading (as per requirement for minimal whitespace)
        html += `
          <div class="settings-section">
            <div class="slider-container ${key}-container">
              ${tempInstance.generateHTML()}
            </div>
          </div>
        `;
      } catch (error) {
        console.error(`Error generating HTML for selector "${key}":`, error);
      }
    });

    return html;
  }

  /**
   * Get a selector instance by name
   * @param {string} name Selector name
   * @returns {Object|null} Selector instance or null if not found
   */
  function getInstance(name) {
    // First check our local cache
    if (instances.has(name)) {
      return instances.get(name);
    }

    // If not found, check with factory
    if (window.SelectorFactory) {
      const instance = window.SelectorFactory.getSelector(name);
      if (instance) {
        // Update our cache
        instances.set(name, instance);
        return instance;
      }
    }

    return null;
  }

  /**
   * Reset all selectors
   * Useful when navigating away from the settings page
   */
  function resetAll() {
    initializedFromConfig = false;
    instances.clear();

    // Tell factory to reset as well
    if (
      window.SelectorFactory &&
      typeof window.SelectorFactory.resetInitialization === "function"
    ) {
      window.SelectorFactory.resetInitialization();
    }
  }

  // Listen for page load to initialize selectors
  document.addEventListener("pageLoaded", function (event) {
    if (event.detail && event.detail.pageName === "settings") {
      // Wait for core modules to load
      setTimeout(() => {
        initializeSelectors().catch((error) => {
          console.error("Error during selector initialization:", error);
        });
      }, 100);
    } else {
      // Reset when navigating away
      resetAll();
    }
  });

  // Public API
  return {
    init: initializeSelectors,
    generateHTML: generateSelectorsHTML,
    getInstance: getInstance,
    resetAll: resetAll,
    getInstances: () => new Map(instances),
  };
})();
