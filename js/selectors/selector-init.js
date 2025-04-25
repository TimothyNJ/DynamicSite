/**
 * Selector System Initialization
 *
 * This file serves as the entry point for the selector system.
 * It loads all necessary modules in the correct order and initializes them.
 */
(function () {
  const LOAD_TIMEOUT = 3000; // 3 seconds timeout for loading modules

  // Define all modules to be loaded
  const modules = [
    {
      id: "generic-selector",
      src: "js/selectors/generic-selector.js",
      loaded: false,
      required: true,
      dependencies: ["selector-factory"],
    },
    {
      id: "selector-config",
      src: "js/selectors/selector-config.js",
      loaded: false,
      required: true,
      dependencies: ["generic-selector"],
    },
    {
      id: "selector-manager",
      src: "js/selectors/selector-manager.js",
      loaded: false,
      required: true,
      dependencies: ["selector-config"],
    },
    {
      id: "slider-core",
      src: "js/core/slider-core.js",
      loaded: false,
      required: true,
    },
    {
      id: "slider-styles",
      src: "js/core/slider-styles.css",
      type: "stylesheet",
      loaded: false,
      required: true,
    },
    {
      id: "input-styles",
      src: "js/core/input-styles.css",
      type: "stylesheet",
      loaded: false,
      required: true,
    },
    {
      id: "selector-base",
      src: "js/selectors/selector-base.js",
      loaded: false,
      required: true,
      dependencies: ["slider-core"],
    },
    {
      id: "selector-factory",
      src: "js/selectors/selector-factory.js",
      loaded: false,
      required: true,
      dependencies: ["selector-base"],
    },
    {
      id: "theme-selector",
      src: "js/selectors/theme-selector.js",
      loaded: false,
      required: false,
      dependencies: ["selector-factory"],
    },
    {
      id: "time-format-selector",
      src: "js/selectors/time-format-selector.js",
      loaded: false,
      required: false,
      dependencies: ["selector-factory"],
    },
    {
      id: "input-base",
      src: "js/inputs/input-base.js",
      loaded: false,
      required: true,
    },
    {
      id: "input-config",
      src: "js/inputs/input-config.js",
      loaded: false,
      required: true,
      dependencies: ["input-base"],
    },
    {
      id: "input-factory",
      src: "js/inputs/input-factory.js",
      loaded: false,
      required: true,
      dependencies: ["input-base"],
    },
    {
      id: "input-manager",
      src: "js/inputs/input-manager.js",
      loaded: false,
      required: true,
      dependencies: ["input-factory", "input-config"],
    },
  ];

  // Track overall loading state
  let isLoading = false;
  let loadStartTime = 0;
  let loadingComplete = false;

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

      if (module.type === "stylesheet") {
        // Load stylesheet
        const link = document.createElement("link");
        link.id = `${module.id}-style`;
        link.rel = "stylesheet";
        link.href = module.src;

        link.onload = () => {
          console.log(`Stylesheet loaded: ${module.id}`);
          module.loaded = true;
          resolve(module);
        };

        link.onerror = (err) => {
          console.error(`Error loading stylesheet ${module.id}:`, err);
          reject(err);
        };

        document.head.appendChild(link);
      } else {
        // Load JavaScript
        const script = document.createElement("script");
        script.id = `${module.id}-script`;
        script.src = module.src;

        script.onload = () => {
          console.log(`Script loaded: ${module.id}`);
          module.loaded = true;
          resolve(module);
        };

        script.onerror = (err) => {
          console.error(`Error loading script ${module.id}:`, err);
          reject(err);
        };

        document.body.appendChild(script);
      }
    });
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

    console.log("Starting selector system module loading");

    // Process loading queue
    processLoadingQueue();
  }

  /**
   * Process the loading queue recursively
   * Handles loading modules in the correct dependency order
   */
  function processLoadingQueue() {
    // Check timeout
    if (Date.now() - loadStartTime > LOAD_TIMEOUT) {
      console.error("Selector system module loading timed out");
      isLoading = false;
      return;
    }

    // Find next module to load
    const nextModule = modules.find(
      (module) => !module.loaded && areDependenciesLoaded(module)
    );

    if (nextModule) {
      // Load the next module
      loadModule(nextModule)
        .then(() => {
          // Continue with next module
          setTimeout(processLoadingQueue, 0);
        })
        .catch((err) => {
          console.warn(`Failed to load ${nextModule.id}, will retry:`, err);
          // Try again after a short delay
          setTimeout(processLoadingQueue, 100);
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
        // Keep trying
        setTimeout(processLoadingQueue, 100);
      }
    }
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
      }
    });

    // Listen for hash changes
    window.addEventListener("hashchange", function () {
      if (window.location.hash === "#settings") {
        loadAllModules();
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

  // Expose the system to window for debugging
  window.SelectorSystem = {
    loadAllModules,
    getModuleStatus: () =>
      modules.map((m) => ({
        id: m.id,
        loaded: m.loaded,
        required: m.required,
      })),
  };
})();
