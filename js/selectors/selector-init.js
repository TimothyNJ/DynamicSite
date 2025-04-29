/**
 * Selector System Initialization
 *
 * This file serves as the entry point for the selector system.
 * It loads all necessary modules in the correct order and initializes them.
 *
 * Features:
 * - Dependency-aware module loading
 * - Progressive enhancement with fallbacks
 * - Error recovery and retry logic
 * - Loading status indicators
 */
(function () {
  const LOAD_TIMEOUT = 5000; // 5 seconds timeout for loading modules
  const MAX_RETRIES = 3; // Maximum number of retries for failed loads
  const RETRY_DELAY = 300; // Delay between retries in milliseconds

  // Initialize progress tracking
  let totalModules = 0;
  let loadedModules = 0;

  // Define all modules to be loaded with their dependencies
  const modules = [
    {
      id: "slider-core",
      src: "js/core/slider-core.js",
      loaded: false,
      required: true,
      retries: 0,
      type: "script",
    },
    {
      id: "slider-styles",
      src: "js/core/slider-styles.css",
      type: "stylesheet",
      loaded: false,
      required: true,
      retries: 0,
    },
    {
      id: "input-styles",
      src: "js/inputs/input-styles.css",
      type: "stylesheet",
      loaded: false,
      required: true,
      retries: 0,
    },
    {
      id: "selector-base",
      src: "js/selectors/selector-base.js",
      loaded: false,
      required: true,
      dependencies: ["slider-core"],
      retries: 0,
      type: "script",
    },
    {
      id: "selector-factory",
      src: "js/selectors/selector-factory.js",
      loaded: false,
      required: true,
      dependencies: ["selector-base"],
      retries: 0,
      type: "script",
    },
    {
      id: "selector-config",
      src: "js/selectors/selector-config.js",
      loaded: false,
      required: true,
      dependencies: ["selector-factory"],
      retries: 0,
      type: "script",
    },
    {
      id: "generic-selector",
      src: "js/selectors/generic-selector.js",
      loaded: false,
      required: true,
      dependencies: ["selector-factory", "selector-config"],
      retries: 0,
      type: "script",
    },
    {
      id: "selector-manager",
      src: "js/selectors/selector-manager.js",
      loaded: false,
      required: true,
      dependencies: ["selector-config", "generic-selector"],
      retries: 0,
      type: "script",
    },
    {
      id: "theme-selector",
      src: "js/selectors/theme-selector.js",
      loaded: false,
      required: false,
      dependencies: ["selector-factory", "generic-selector"],
      retries: 0,
      type: "script",
    },
    {
      id: "time-format-selector",
      src: "js/selectors/time-format-selector.js",
      loaded: false,
      required: false,
      dependencies: ["selector-factory", "generic-selector"],
      retries: 0,
      type: "script",
    },
    {
      id: "input-base",
      src: "js/inputs/input-base.js",
      loaded: false,
      required: true,
      retries: 0,
      type: "script",
    },
    {
      id: "input-config",
      src: "js/inputs/input-config.js",
      loaded: false,
      required: true,
      dependencies: ["input-base"],
      retries: 0,
      type: "script",
    },
    {
      id: "input-factory",
      src: "js/inputs/input-factory.js",
      loaded: false,
      required: true,
      dependencies: ["input-base"],
      retries: 0,
      type: "script",
    },
    {
      id: "input-manager",
      src: "js/inputs/input-manager.js",
      loaded: false,
      required: true,
      dependencies: ["input-factory", "input-config"],
      retries: 0,
      type: "script",
    },
  ];

  // Count total modules for progress tracking
  totalModules = modules.length;

  // Track overall loading state
  let isLoading = false;
  let loadStartTime = 0;
  let loadingComplete = false;
  let abortController = null;

  /**
   * Create and display loading indicator
   * @returns {HTMLElement} The loading indicator element
   */
  function createLoadingIndicator() {
    // Remove any existing indicators
    const existingIndicator = document.getElementById(
      "selector-system-loading"
    );
    if (existingIndicator) {
      existingIndicator.remove();
    }

    // Create new loading indicator
    const indicator = document.createElement("div");
    indicator.id = "selector-system-loading";
    indicator.className = "loading-indicator";
    indicator.innerHTML = `
      <div class="loading-spinner"></div>
      <div class="loading-text">Loading UI Components: <span class="loading-progress">0/${totalModules}</span></div>
    `;

    // Add styles if not already present
    if (!document.getElementById("selector-system-loading-styles")) {
      const style = document.createElement("style");
      style.id = "selector-system-loading-styles";
      style.textContent = `
        #selector-system-loading {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 12px;
          z-index: 9999;
          display: flex;
          align-items: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          transition: opacity 0.3s ease;
        }
        .loading-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 0.8s linear infinite;
          margin-right: 8px;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }

    // Find container to append to - prefer settings container or fall back to body
    const settingsContainer =
      document.querySelector(".settings-container") || document.body;
    settingsContainer.appendChild(indicator);

    return indicator;
  }

  /**
   * Update loading progress
   * @param {string} moduleId - ID of the module that was loaded
   */
  function updateLoadingProgress(moduleId) {
    loadedModules++;
    const progressEl = document.querySelector(
      "#selector-system-loading .loading-progress"
    );
    if (progressEl) {
      progressEl.textContent = `${loadedModules}/${totalModules}`;
    }

    // If all modules loaded, hide the indicator after a delay
    if (loadedModules >= totalModules) {
      setTimeout(() => {
        const indicator = document.getElementById("selector-system-loading");
        if (indicator) {
          indicator.style.opacity = "0";
          setTimeout(() => indicator.remove(), 300);
        }
      }, 500);
    }
  }

  /**
   * Get a module by ID
   * @param {string} id - Module ID
   * @returns {Object} - Module object
   */
  function getModule(id) {
    return modules.find((m) => m.id === id);
  }

  /**
   * Check if a module's dependencies are loaded
   * @param {Object} module - Module to check
   * @returns {boolean} - True if dependencies are loaded
   */
  function areDependenciesLoaded(module) {
    if (!module.dependencies || module.dependencies.length === 0) {
      return true;
    }

    return module.dependencies.every((depId) => {
      const dep = getModule(depId);
      return dep && dep.loaded;
    });
  }

  /**
   * Get modules ready to be loaded (dependencies satisfied)
   * @returns {Array} - Array of modules ready to load
   */
  function getReadyModules() {
    return modules.filter(
      (module) =>
        !module.loaded && !module.loading && areDependenciesLoaded(module)
    );
  }

  /**
   * Handle module load error
   * @param {Object} module - The module that failed to load
   * @param {Error} error - The error that occurred
   */
  function handleModuleError(module, error) {
    console.error(`Failed to load module ${module.id}:`, error);

    module.loading = false;
    module.error = error;

    // Retry loading the module if under max retries
    if (module.retries < MAX_RETRIES) {
      module.retries++;
      console.log(
        `Retrying module ${module.id} (attempt ${module.retries}/${MAX_RETRIES})`
      );

      setTimeout(() => {
        loadModule(module).catch((err) => handleModuleError(module, err));
      }, RETRY_DELAY * module.retries);
    } else if (module.required) {
      // For required modules, show fallback UI
      showModuleErrorFallback(module);
    }

    // Continue loading other modules
    continueLoading();
  }

  /**
   * Show fallback UI for critical module failure
   * @param {Object} module - The failed module
   */
  function showModuleErrorFallback(module) {
    console.warn(
      `Critical module ${module.id} failed to load after ${MAX_RETRIES} attempts`
    );

    // Show original selectors for theme and time format
    if (document.getElementById("original-selectors")) {
      document.getElementById("original-selectors").style.display = "block";
    }

    // Show original inputs
    if (document.getElementById("original-inputs")) {
      document.getElementById("original-inputs").style.display = "block";
    }

    // Add error notification
    const errorNotice = document.createElement("div");
    errorNotice.style.cssText =
      "background:#ff5252; color:white; padding:8px; margin:10px; border-radius:4px; font-size:14px; text-align:center;";
    errorNotice.textContent =
      "Some UI components could not be loaded. Using simplified interface.";

    const settingsContainer = document.querySelector(".settings-container");
    if (settingsContainer) {
      settingsContainer.prepend(errorNotice);
    }
  }

  /**
   * Load a specific module
   * @param {Object} module - Module to load
   * @returns {Promise} - Resolves when module is loaded
   */
  function loadModule(module) {
    return new Promise((resolve, reject) => {
      if (module.loaded) {
        resolve(module);
        return;
      }

      // Skip if dependencies aren't loaded yet
      if (!areDependenciesLoaded(module)) {
        reject(new Error(`Dependencies not loaded for ${module.id}`));
        return;
      }

      console.log(`Loading module: ${module.id}`);
      module.loading = true;

      if (module.type === "stylesheet") {
        // Load stylesheet
        const link = document.createElement("link");
        link.id = `${module.id}-style`;
        link.rel = "stylesheet";
        link.href = module.src;

        link.onload = () => {
          console.log(`Stylesheet loaded: ${module.id}`);
          module.loaded = true;
          module.loading = false;
          updateLoadingProgress(module.id);
          resolve(module);
        };

        link.onerror = (err) => {
          console.error(`Error loading stylesheet ${module.id}:`, err);
          module.loading = false;
          reject(err);
        };

        document.head.appendChild(link);
      } else {
        // Load JavaScript with timeout
        const script = document.createElement("script");
        script.id = `${module.id}-script`;
        script.src = module.src;

        // Set up timeout for script loading
        const timeoutId = setTimeout(() => {
          if (!module.loaded) {
            console.warn(`Loading timed out for module ${module.id}`);
            script.onerror(new Error(`Timeout loading ${module.id}`));
          }
        }, LOAD_TIMEOUT);

        script.onload = () => {
          clearTimeout(timeoutId);
          console.log(`Script loaded: ${module.id}`);
          module.loaded = true;
          module.loading = false;
          updateLoadingProgress(module.id);
          resolve(module);
        };

        script.onerror = (err) => {
          clearTimeout(timeoutId);
          console.error(`Error loading script ${module.id}:`, err);
          module.loading = false;
          reject(err);
        };

        document.body.appendChild(script);
      }
    });
  }

  /**
   * Continue loading modules in parallel groups
   */
  function continueLoading() {
    if (!isLoading) return;

    // Check timeout
    if (Date.now() - loadStartTime > LOAD_TIMEOUT * 2) {
      console.error("Selector system module loading timed out");
      isLoading = false;

      // Handle timeout by showing fallbacks
      modules
        .filter((m) => m.required && !m.loaded)
        .forEach(showModuleErrorFallback);

      return;
    }

    // Find all modules ready to load (dependencies satisfied)
    const readyModules = getReadyModules();

    if (readyModules.length > 0) {
      // Load modules in parallel
      Promise.allSettled(
        readyModules.map((module) =>
          loadModule(module).catch((err) => handleModuleError(module, err))
        )
      ).then(() => {
        // Continue with next batch
        setTimeout(continueLoading, 0);
      });
    } else {
      // Check if all required modules are loaded
      const allRequiredLoaded = modules
        .filter((m) => m.required)
        .every((m) => m.loaded);

      if (allRequiredLoaded) {
        console.log("All required UI system modules loaded");
        isLoading = false;
        loadingComplete = true;

        // Notify that loading is complete
        if (typeof window.SelectorFactory !== "undefined") {
          window.SelectorFactory.initializeAll();
        }

        // Initialize input system if available
        if (typeof window.InputFactory !== "undefined") {
          window.InputFactory.initializeAll();
        }
      } else {
        // Keep trying if some modules are still loading
        const stillLoading = modules.some((m) => m.loading);

        if (stillLoading) {
          setTimeout(continueLoading, 100);
        } else {
          // No modules loading but not all required modules loaded
          // This means some required modules failed to load
          console.warn("Some required modules failed to load");

          modules
            .filter((m) => m.required && !m.loaded)
            .forEach(showModuleErrorFallback);

          isLoading = false;
        }
      }
    }
  }

  /**
   * Load all modules in dependency order
   */
  function loadAllModules() {
    if (isLoading || loadingComplete) {
      return;
    }

    isLoading = true;
    loadStartTime = Date.now();
    loadedModules = 0;

    // Create loading indicator
    createLoadingIndicator();

    console.log("Starting selector system module loading");

    // Create abort controller for cleanup
    abortController = new AbortController();

    // Process loading queue
    continueLoading();
  }

  /**
   * Clean up resources when navigating away
   */
  function cleanup() {
    if (!isLoading) return;

    isLoading = false;

    // Abort any pending loads
    if (abortController) {
      abortController.abort();
    }

    // Remove loading indicator
    const indicator = document.getElementById("selector-system-loading");
    if (indicator) {
      indicator.remove();
    }

    console.log("Selector system loading aborted");
  }

  /**
   * Initialize the selector system when the settings page is loaded
   */
  function initializeOnSettingsPage() {
    // Check if we're on the settings page
    const isSettingsPage =
      window.location.hash === "#settings" ||
      !!document.querySelector(".settings-container");

    if (isSettingsPage) {
      loadAllModules();
    }
  }

  // Set up event listeners for page loading
  function setupEventListeners() {
    // Listen for page loaded events
    document.addEventListener("pageLoaded", function (event) {
      if (event.detail && event.detail.pageName === "settings") {
        console.log("Settings page loaded event detected by selector-init");
        loadAllModules();
      } else {
        // Clean up when navigating away
        cleanup();
      }
    });

    // Listen for hash changes
    window.addEventListener("hashchange", function () {
      if (window.location.hash === "#settings") {
        loadAllModules();
      } else {
        cleanup();
      }
    });

    // Listen for page visibility changes to handle tab switching
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden" && isLoading) {
        // When switching away, mark the time to check duration when coming back
        window.selectorSystemHiddenTime = Date.now();
      } else if (
        document.visibilityState === "visible" &&
        window.selectorSystemHiddenTime
      ) {
        // If we were away for too long and we're still loading, restart
        const timeAway = Date.now() - window.selectorSystemHiddenTime;
        if (isLoading && timeAway > LOAD_TIMEOUT) {
          console.log(
            "Page was hidden for too long, restarting module loading"
          );
          cleanup();
          loadAllModules();
        }
      }
    });

    // Check if the page is already loaded
    if (document.readyState === "complete") {
      initializeOnSettingsPage();
    } else {
      // Wait for page to finish loading
      window.addEventListener("load", initializeOnSettingsPage);
    }
  }

  // Set up event listeners
  setupEventListeners();

  // Expose the system to window for debugging and advanced use
  window.SelectorSystem = {
    loadAllModules,
    getModuleStatus: () =>
      modules.map((m) => ({
        id: m.id,
        loaded: m.loaded,
        required: m.required,
        error: m.error ? m.error.message : null,
        retries: m.retries,
      })),
    retryFailedModules: () => {
      modules
        .filter((m) => !m.loaded && m.retries >= MAX_RETRIES)
        .forEach((m) => {
          m.retries = 0;
          loadModule(m).catch((err) => handleModuleError(m, err));
        });

      if (!isLoading) {
        continueLoading();
      }
    },
  };
})();
