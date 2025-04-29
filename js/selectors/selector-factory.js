/**
 * Selector Factory
 *
 * Manages the creation, registration, and lifecycle of all selectors.
 * Provides a central point for initializing selectors based on configuration.
 */
window.SelectorFactory = (function () {
  // Private registry of all registered selectors
  const selectors = new Map();

  // Flag to track initialization of selectors on current page
  let pageInitialized = false;

  // Flag to track if we've set up event listeners
  let eventListenersRegistered = false;

  /**
   * Register a new selector type
   * @param {string} name - Unique name for the selector
   * @param {class} SelectorClass - The selector class (must extend SelectorBase)
   * @param {string} selectorClass - CSS selector for the DOM element
   * @param {Object} options - Options for the selector
   * @returns {Object} - The created selector instance
   */
  function registerSelector(name, SelectorClass, selectorClass, options = {}) {
    // Check if selector already registered
    if (selectors.has(name)) {
      const existing = selectors.get(name);
      if (existing.initialized && existing.instance.initialized) {
        console.log(`Selector "${name}" already registered and initialized`);
        return existing.instance;
      }
      console.log(`Replacing existing selector registration for "${name}"`);
    }

    // Validate SelectorClass extends SelectorBase
    if (!SelectorClass.prototype instanceof window.SelectorBase) {
      console.error(`Selector class for "${name}" must extend SelectorBase`);
      return null;
    }

    try {
      // Create instance
      const instance = new SelectorClass(selectorClass, name, options);

      // Store in registry
      selectors.set(name, {
        instance,
        selectorClass,
        initialized: false,
        SelectorClass,
      });

      console.log(
        `Registered selector "${name}" with selector "${selectorClass}"`
      );

      // Set up event listeners if not already done
      if (!eventListenersRegistered) {
        setupEventListeners();
      }

      // Initialize immediately if on the appropriate page
      if (isSettingsPage()) {
        initializeSelector(name);
      }

      return instance;
    } catch (error) {
      console.error(`Error registering selector "${name}":`, error);
      return null;
    }
  }

  /**
   * Initialize a specific registered selector
   * @param {string} name - The name of the selector to initialize
   * @returns {Promise<boolean>} - Success status
   */
  async function initializeSelector(name) {
    const selector = selectors.get(name);
    if (!selector) {
      console.error(`Selector "${name}" not found in registry`);
      return false;
    }

    // Don't reinitialize if already successfully initialized
    if (selector.initialized && selector.instance.initialized) {
      return true;
    }

    console.log(`Initializing selector: ${name}`);
    try {
      const success = await selector.instance.init();

      if (success) {
        selector.initialized = true;
        return true;
      } else {
        console.error(`Failed to initialize selector: ${name}`);
        return false;
      }
    } catch (error) {
      console.error(`Error initializing selector "${name}":`, error);
      return false;
    }
  }

  /**
   * Initialize all registered selectors
   * @returns {Promise<boolean>} - Success status (true if all initialized)
   */
  async function initializeAll() {
    if (pageInitialized) {
      return true;
    }

    console.log("Initializing all registered selectors");

    const initPromises = [];
    let allSucceeded = true;

    // Start initialization for all selectors
    selectors.forEach((selector, name) => {
      const promise = initializeSelector(name).catch((error) => {
        console.error(`Error initializing selector "${name}":`, error);
        allSucceeded = false;
        return false;
      });

      initPromises.push(promise);
    });

    // Wait for all initializations to complete
    const results = await Promise.all(initPromises);

    // Check if all were successful
    allSucceeded = results.every((success) => success);

    pageInitialized = allSucceeded;
    return allSucceeded;
  }

  /**
   * Reset initialization state when navigating away
   */
  function resetInitialization() {
    pageInitialized = false;

    selectors.forEach((selector, name) => {
      if (selector.instance && selector.initialized) {
        try {
          selector.instance.destroy();
        } catch (error) {
          console.error(`Error destroying selector "${name}":`, error);
        }
      }
      selector.initialized = false;
    });
  }

  /**
   * Check if we're currently on the settings page
   * @returns {boolean} - True if on settings page
   */
  function isSettingsPage() {
    // Check URL hash
    if (window.location.hash === "#settings") {
      return true;
    }

    // Also check for settings elements in the DOM as fallback
    const settingsContainer = document.querySelector(".settings-container");
    return !!settingsContainer;
  }

  /**
   * Get a registered selector by name
   * @param {string} name - The selector name
   * @returns {Object} - The selector instance
   */
  function getSelector(name) {
    const selector = selectors.get(name);
    return selector ? selector.instance : null;
  }

  /**
   * Set up event listeners for page navigation
   */
  function setupEventListeners() {
    if (eventListenersRegistered) {
      return;
    }

    // Listen for page loaded events
    document.addEventListener("pageLoaded", function (event) {
      if (event.detail && event.detail.pageName === "settings") {
        console.log("Settings page loaded event detected");

        // Reset pageInitialized flag to force reinitialization
        pageInitialized = false;

        // Initialize all registered selectors
        setTimeout(() => {
          initializeAll().catch((error) => {
            console.error("Error initializing selectors:", error);
          });
        }, 0);
      } else {
        // If we navigated away from settings, clean up
        if (event.detail && event.detail.pageName !== "settings") {
          resetInitialization();
        }
      }
    });

    // Listen for hash changes
    window.addEventListener("hashchange", function () {
      if (window.location.hash === "#settings") {
        if (!pageInitialized) {
          console.log("Navigated to settings page via hash change");
          setTimeout(() => {
            initializeAll().catch((error) => {
              console.error("Error initializing selectors:", error);
            });
          }, 0);
        }
      } else {
        // When navigating away from settings
        resetInitialization();
      }
    });

    // Try during normal page load for direct URL navigation to settings
    if (document.readyState === "complete") {
      // Page already loaded, check if we're on the settings page
      if (isSettingsPage() && !pageInitialized) {
        setTimeout(() => {
          initializeAll().catch((error) => {
            console.error("Error initializing selectors:", error);
          });
        }, 0);
      }
    } else {
      // Wait for page to finish loading
      window.addEventListener("load", function () {
        // Check if we're on the settings page
        if (isSettingsPage() && !pageInitialized) {
          setTimeout(() => {
            initializeAll().catch((error) => {
              console.error("Error initializing selectors:", error);
            });
          }, 0);
        }
      });
    }

    eventListenersRegistered = true;
  }

  /**
   * Reinitialize a specific selector or all selectors
   * @param {string} [name] - The name of the selector to reinitialize, or null for all
   * @returns {Promise<boolean>} - Success status
   */
  async function reinitialize(name = null) {
    if (name) {
      // Reinitialize a specific selector
      const selector = selectors.get(name);
      if (!selector) {
        console.error(`Selector "${name}" not found in registry`);
        return false;
      }

      // Reset the selector
      if (selector.instance && selector.initialized) {
        try {
          selector.instance.destroy();
        } catch (error) {
          console.error(`Error destroying selector "${name}":`, error);
        }
      }
      selector.initialized = false;

      // Reinitialize
      return initializeSelector(name);
    } else {
      // Reinitialize all selectors
      resetInitialization();
      return initializeAll();
    }
  }

  /**
   * Create selectors from configuration
   * @param {Object} config - Configuration object with selector definitions
   * @returns {Promise<boolean>} - Success status
   */
  async function createFromConfig(config) {
    if (!config) {
      console.error("No configuration provided");
      return false;
    }

    const promises = [];

    Object.entries(config).forEach(([key, selectorConfig]) => {
      // Skip if already registered
      if (selectors.has(key) && selectors.get(key).initialized) {
        return;
      }

      // Get the selector class based on type
      let SelectorClass;
      const typeName = selectorConfig.type || "generic";

      if (typeName === "generic" && window.GenericSelector) {
        SelectorClass = window.GenericSelector;
      } else if (typeName === "theme" && window.ThemeSelector) {
        SelectorClass = window.ThemeSelector;
      } else if (typeName === "time-format" && window.TimeFormatSelector) {
        SelectorClass = window.TimeFormatSelector;
      } else if (
        window[`${ComponentUtils.capitalizeFirstLetter(typeName)}Selector`]
      ) {
        // Try to find a class based on the type name
        SelectorClass =
          window[`${ComponentUtils.capitalizeFirstLetter(typeName)}Selector`];
      } else {
        // Fallback to generic selector
        SelectorClass = window.GenericSelector || window.SelectorBase;
      }

      if (!SelectorClass) {
        console.error(`No selector class found for type "${typeName}"`);
        return;
      }

      // Register the selector
      const instance = registerSelector(
        key,
        SelectorClass,
        selectorConfig.selector,
        selectorConfig
      );

      if (instance) {
        promises.push(
          initializeSelector(key).catch((error) => {
            console.error(`Error initializing selector "${key}":`, error);
            return false;
          })
        );
      }
    });

    // Wait for all initializations to complete
    const results = await Promise.all(promises);
    return results.every((success) => success);
  }

  // Public API
  return {
    register: registerSelector,
    initialize: initializeSelector,
    initializeAll: initializeAll,
    reinitialize: reinitialize,
    getSelector: getSelector,
    createFromConfig: createFromConfig,

    // For debugging
    getRegistry: () => new Map(selectors),
  };
})();
