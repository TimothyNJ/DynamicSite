/**
 * Selector Base Class
 *
 * This abstract base class provides common functionality for all slider selectors.
 * Specific selectors (theme, time format, etc.) should extend this class.
 */
class SelectorBase {
  /**
   * Create a new selector
   * @param {string} selectorClass - CSS selector for the slider container (e.g., ".theme-selector")
   * @param {string} name - Unique identifier for this selector
   * @param {Object} options - Configuration options
   */
  constructor(selectorClass, name, options = {}) {
    if (this.constructor === SelectorBase) {
      throw new Error(
        "SelectorBase is an abstract class and cannot be instantiated directly"
      );
    }

    this.selectorClass = selectorClass;
    this.name = name;
    this.options = Object.assign(
      {
        storageKey: `user${this.capitalizeFirstLetter(name)}Preference`,
        defaultValue: null,
        initialDelay: 0,
      },
      options
    );

    // Properties
    this.sliderInstance = null;
    this.initialized = false;
    this.initializationAttempts = 0;

    // Bind methods to maintain context
    this.init = this.init.bind(this);
    this.handleOptionSelected = this.handleOptionSelected.bind(this);
    this.cleanup = this.cleanup.bind(this);
    this.reinitialize = this.reinitialize.bind(this);
  }

  /**
   * Helper to capitalize first letter for storage keys
   * @param {string} str - The string to capitalize
   * @returns {string} - The string with first letter capitalized
   */
  capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Initialize the selector
   * This sets up the slider and registers event handlers
   * @returns {boolean} - Success status
   */
  init() {
    // Check if already initialized
    if (this.initialized) {
      console.log(`${this.name} selector already initialized, skipping`);
      return true;
    }

    // Limit initialization attempts
    this.initializationAttempts++;
    if (this.initializationAttempts > 3) {
      console.warn(
        `Exceeded initialization attempts for ${this.name} selector, giving up`
      );
      return false;
    }

    // Check DOM availability
    const sliderElement = document.querySelector(this.selectorClass);
    if (!sliderElement) {
      console.log(`${this.name} selector element not found in the DOM`);
      // Try again after a short delay
      if (this.initializationAttempts < 3) {
        setTimeout(this.init, 50);
      }
      return false;
    }

    // Check if core slider functionality is available
    if (typeof window.SliderCore === "undefined") {
      console.log(
        "Core slider functionality not available yet, will retry in 50ms"
      );
      setTimeout(this.init, 50);
      return false;
    }

    console.log(`Initializing ${this.name} selector`);

    try {
      // Create slider instance
      this.sliderInstance = window.SliderCore.create(this.selectorClass);

      if (!this.sliderInstance) {
        console.log(
          `${this.name} slider initialization failed, will retry in 50ms`
        );
        setTimeout(this.init, 50);
        return false;
      }

      // Set up the option selected callback
      this.sliderInstance.onOptionSelected = this.handleOptionSelected;

      // Apply saved preference if any
      this.applyStoredPreference();

      console.log(`${this.name} slider initialization successful`);
      this.initialized = true;
      this.initializationAttempts = 0; // Reset counter on success

      // Perform custom initialization
      this.onInitialized();

      return true;
    } catch (error) {
      console.error(`Error during ${this.name} slider initialization:`, error);
      return false;
    }
  }

  /**
   * Clean up resources
   * Called when navigating away from page
   */
  cleanup() {
    this.initialized = false;
    this.sliderInstance = null;
  }

  /**
   * Force reinitialization
   * @returns {boolean} - Success status
   */
  reinitialize() {
    this.initialized = false;
    this.initializationAttempts = 0;
    return this.init();
  }

  /**
   * Apply stored preference from localStorage
   * This is called during initialization
   */
  applyStoredPreference() {
    if (!this.sliderInstance) return;

    const savedValue = localStorage.getItem(this.options.storageKey);
    if (savedValue) {
      console.log(`Applying saved ${this.name} preference:`, savedValue);
      this.applyPreference(savedValue);
    } else if (this.options.defaultValue) {
      console.log(
        `Applying default ${this.name} preference:`,
        this.options.defaultValue
      );
      this.applyPreference(this.options.defaultValue);
    }
  }

  /**
   * Save preference to localStorage
   * @param {string} value - The value to save
   */
  savePreference(value) {
    localStorage.setItem(this.options.storageKey, value);
  }

  /**
   * Get preference value from option element
   * Child classes can override this to customize how values are extracted
   * @param {Element} option - The selected option DOM element
   * @returns {string} - The preference value
   */
  getValueFromOption(option) {
    // Try to get from data attribute first
    const dataAttribute = option.getAttribute(
      `data-${this.name.toLowerCase()}`
    );
    if (dataAttribute) return dataAttribute;

    // Fall back to text content
    const h3 = option.querySelector("h3");
    if (h3) {
      return h3.textContent.toLowerCase();
    }

    // Last resort, use position
    return option.getAttribute("data-position") || "1";
  }

  // ============================================================
  // ABSTRACT METHODS - Must be implemented by child classes
  // ============================================================

  /**
   * Handle when an option is selected
   * This is called when user clicks on an option
   * @param {Element} option - The selected option DOM element
   */
  handleOptionSelected(option) {
    throw new Error(
      "Method 'handleOptionSelected' must be implemented by child classes"
    );
  }

  /**
   * Apply preference - implement in child class
   * @param {string} value - The preference value to apply
   */
  applyPreference(value) {
    throw new Error(
      "Method 'applyPreference' must be implemented by child classes"
    );
  }

  /**
   * Hook called after initialization is complete
   * Child classes can override to perform additional setup
   */
  onInitialized() {
    // Default implementation does nothing
  }
}

// Make available globally
window.SelectorBase = SelectorBase;
