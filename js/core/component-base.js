/**
 * Component Base Class
 *
 * This abstract base class provides common functionality for all UI components.
 * Specific component types (selectors, inputs, etc.) should extend this class.
 */
class ComponentBase {
  /**
   * Create a new component
   * @param {string} containerSelector - CSS selector for the component container
   * @param {string} name - Unique identifier for this component
   * @param {Object} options - Configuration options
   */
  constructor(containerSelector, name, options = {}) {
    if (this.constructor === ComponentBase) {
      throw new Error(
        "ComponentBase is an abstract class and cannot be instantiated directly"
      );
    }

    this.containerSelector = containerSelector;
    this.name = name;
    this.options = Object.assign(
      {
        storageKey: `user${this.capitalizeFirstLetter(name)}Preference`,
        defaultValue: null,
        initialDelay: 0,
        eventNamespace: `component-${name}`,
        debug: false,
      },
      options
    );

    // Component instance state
    this.initialized = false;
    this.initializationAttempts = 0;
    this.destroyHandlers = [];
    this.eventListeners = [];
    this.domElements = {};
    this.componentId = ComponentUtils.generateId(this.name);

    // Bind methods to maintain context
    this.init = this.init.bind(this);
    this.destroy = this.destroy.bind(this);
    this.handleEvent = this.handleEvent.bind(this);
    this.log = this.log.bind(this);
    this.error = this.error.bind(this);
  }

  /**
   * Helper to capitalize first letter for storage keys
   * @param {string} str - The string to capitalize
   * @returns {string} - The string with first letter capitalized
   */
  capitalizeFirstLetter(str) {
    return ComponentUtils.capitalizeFirstLetter(str);
  }

  /**
   * Log debug messages when debug is enabled
   * @param {...any} args - Arguments to log
   */
  log(...args) {
    if (this.options.debug) {
      console.log(`[${this.name}]`, ...args);
    }
  }

  /**
   * Log error messages
   * @param {...any} args - Arguments to log
   */
  error(...args) {
    console.error(`[${this.name}]`, ...args);
  }

  /**
   * Initialize the component
   * This sets up the base component and calls component-specific init
   * @returns {Promise<boolean>} - Success status
   */
  async init() {
    // Check if already initialized
    if (this.initialized) {
      this.log(`Component already initialized, skipping`);
      return true;
    }

    // Limit initialization attempts
    this.initializationAttempts++;
    if (this.initializationAttempts > 3) {
      this.error(`Exceeded initialization attempts, giving up`);
      return false;
    }

    // Check DOM availability
    try {
      this.log(`Initializing ${this.name} component`);

      // Get DOM elements
      if (!this.getDOMElements()) {
        this.log(`Component elements not found, will retry later`);

        // Retry after a short delay if elements not found
        if (this.initializationAttempts < 3) {
          return new Promise((resolve) => {
            setTimeout(async () => {
              const result = await this.init();
              resolve(result);
            }, 100);
          });
        }
        return false;
      }

      // Perform component-specific initialization
      if (!(await this.initComponent())) {
        this.error(`Component-specific initialization failed`);
        return false;
      }

      // Apply stored preferences
      this.applyStoredPreference();

      // Set up events
      this.setupEventListeners();

      // Mark as initialized
      this.initialized = true;
      this.initializationAttempts = 0;

      this.log(`Component initialization successful`);

      // Perform post-initialization tasks
      this.onInitialized();

      return true;
    } catch (error) {
      this.error(`Error during initialization:`, error);
      return false;
    }
  }

  /**
   * Get all required DOM elements
   * Override in child classes to get component-specific elements
   * @returns {boolean} - True if all elements were found, false otherwise
   */
  getDOMElements() {
    try {
      // Get the container element
      const container = document.querySelector(this.containerSelector);
      if (!container) {
        this.error(`Container element not found: ${this.containerSelector}`);
        return false;
      }

      this.domElements.container = container;
      return true;
    } catch (error) {
      this.error(`Error getting DOM elements:`, error);
      return false;
    }
  }

  /**
   * Component-specific initialization
   * Override in child classes to perform component-specific initialization
   * @returns {Promise<boolean>} - Success status
   */
  async initComponent() {
    // Default implementation does nothing
    return true;
  }

  /**
   * Set up event listeners
   * Override in child classes to add component-specific event listeners
   */
  setupEventListeners() {
    // Default implementation does nothing
  }

  /**
   * Handle events
   * @param {string} eventName - Name of the event
   * @param {Object} eventData - Event data
   */
  handleEvent(eventName, eventData = {}) {
    this.log(`Event: ${eventName}`, eventData);

    // Event handling logic here
    const handlerName = `on${this.capitalizeFirstLetter(eventName)}`;

    if (typeof this[handlerName] === "function") {
      this[handlerName](eventData);
    }
  }

  /**
   * Trigger an event
   * @param {string} eventName - Name of the event
   * @param {Object} eventData - Event data
   */
  triggerEvent(eventName, eventData = {}) {
    this.log(`Triggering event: ${eventName}`, eventData);

    // Create a custom event
    const event = new CustomEvent(
      `${this.options.eventNamespace}:${eventName}`,
      {
        detail: {
          component: this,
          ...eventData,
        },
        bubbles: true,
      }
    );

    // Dispatch the event from the container element
    if (this.domElements.container) {
      this.domElements.container.dispatchEvent(event);
    }

    // Call local handler
    this.handleEvent(eventName, eventData);
  }

  /**
   * Add an event listener
   * @param {Element} element - Element to add listener to
   * @param {string} eventType - Type of event
   * @param {Function} handler - Event handler
   * @param {Object} options - Event listener options
   */
  addEventListener(element, eventType, handler, options = {}) {
    if (!element) return null;

    const boundHandler = handler.bind(this);
    element.addEventListener(eventType, boundHandler, options);

    // Store for cleanup
    this.eventListeners.push({
      element,
      eventType,
      handler: boundHandler,
      options,
    });

    // Return a function to remove this specific listener
    return () => {
      element.removeEventListener(eventType, boundHandler, options);
      this.eventListeners = this.eventListeners.filter(
        (listener) =>
          listener.element !== element ||
          listener.eventType !== eventType ||
          listener.handler !== boundHandler
      );
    };
  }

  /**
   * Apply stored preference from localStorage
   * This is called during initialization
   */
  applyStoredPreference() {
    const savedValue = localStorage.getItem(this.options.storageKey);

    if (savedValue) {
      this.log(`Applying saved preference:`, savedValue);
      this.applyPreference(savedValue);
    } else if (this.options.defaultValue !== null) {
      this.log(`Applying default preference:`, this.options.defaultValue);
      this.applyPreference(this.options.defaultValue);
    }
  }

  /**
   * Save preference to localStorage
   * @param {string} value - The value to save
   */
  savePreference(value) {
    if (value !== undefined && value !== null) {
      localStorage.setItem(this.options.storageKey, value);
      this.log(`Saved preference:`, value);
    }
  }

  /**
   * Clean up resources
   * Called when destroying the component or navigating away
   */
  destroy() {
    this.log(`Destroying component`);

    // Remove all event listeners
    this.eventListeners.forEach(({ element, eventType, handler, options }) => {
      element.removeEventListener(eventType, handler, options);
    });
    this.eventListeners = [];

    // Call destroy handlers
    this.destroyHandlers.forEach((handler) => handler());
    this.destroyHandlers = [];

    // Clear DOM references
    this.domElements = {};

    // Reset state
    this.initialized = false;

    // Call component-specific cleanup
    this.cleanupComponent();
  }

  /**
   * Component-specific cleanup
   * Override in child classes to perform component-specific cleanup
   */
  cleanupComponent() {
    // Default implementation does nothing
  }

  /**
   * Add a function to be called when the component is destroyed
   * @param {Function} handler - Function to call on destroy
   */
  addDestroyHandler(handler) {
    if (typeof handler === "function") {
      this.destroyHandlers.push(handler);
    }
  }

  /**
   * Generate HTML for this component
   * Override in child classes to generate component HTML
   * @returns {string} - HTML markup
   */
  generateHTML() {
    throw new Error(
      "Method 'generateHTML' must be implemented by child classes"
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
window.ComponentBase = ComponentBase;
