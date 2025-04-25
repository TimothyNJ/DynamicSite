/**
 * Selector Factory
 *
 * Manages the creation, registration, and lifecycle of all selectors.
 * Provides a central point for initializing selectors based on page loading.
 */
window.SelectorFactory = (function () {
  // Private registry of all registered selectors
  const selectors = new Map();

  // Track initialization status per page
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
    // Validate SelectorClass extends SelectorBase
    if (!SelectorClass.prototype instanceof SelectorBase) {
      console.error(`Selector class for "${name}" must extend SelectorBase`);
      return null;
    }

    // Create instance
    const instance = new SelectorClass(selectorClass, name, options);

    // Store in registry
    selectors.set(name, {
      instance,
      selectorClass,
      initialized: false,
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
  }

  /**
   * Initialize a specific registered selector
   * @param {string} name - The name of the selector to initialize
   * @returns {boolean} - Success status
   */
  function initializeSelector(name) {
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
    const success = selector.instance.init();

    if (success) {
      selector.initialized = true;
    }

    return success;
  }

  /**
   * Initialize all registered selectors
   * @returns {boolean} - Success status (true if all initialized)
   */
  function initializeAll() {
    if (pageInitialized) {
      return true;
    }

    console.log("Initializing all registered selectors");
    let allSucceeded = true;

    selectors.forEach((selector, name) => {
      const success = initializeSelector(name);
      if (!success) {
        allSucceeded = false;
      }
    });

    pageInitialized = allSucceeded;
    return allSucceeded;
  }

  /**
   * Reset initialization state when navigating away
   */
  function resetInitialization() {
    pageInitialized = false;

    selectors.forEach((selector) => {
      if (
        selector.instance &&
        typeof selector.instance.cleanup === "function"
      ) {
        selector.instance.cleanup();
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
        setTimeout(initializeAll, 0);
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
          setTimeout(initializeAll, 0);
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
        setTimeout(initializeAll, 0);
      }
    } else {
      // Wait for page to finish loading
      window.addEventListener("load", function () {
        // Check if we're on the settings page
        if (isSettingsPage() && !pageInitialized) {
          setTimeout(initializeAll, 0);
        }
      });
    }

    eventListenersRegistered = true;
  }

  // Public API
  return {
    register: registerSelector,
    initialize: initializeSelector,
    initializeAll: initializeAll,
    getSelector: getSelector,

    // For debugging
    getRegistry: () => new Map(selectors),
  };
})();
