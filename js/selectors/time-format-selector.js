/**
 * Time Format Selector
 *
 * Handles time format selection (12h/24h) functionality.
 * Extends the base selector with time-format-specific business logic.
 */
class TimeFormatSelector extends SelectorBase {
  /**
   * Create a new TimeFormatSelector
   * @param {string} selectorClass - CSS selector for the time format slider
   * @param {string} name - Identifier name (usually "timeFormat")
   * @param {Object} options - Configuration options
   */
  constructor(selectorClass, name, options = {}) {
    // Set default options for time format selector
    const timeFormatOptions = Object.assign(
      {
        storageKey: "userTimeFormatPreference",
        defaultValue: "12",
        values: ["12", "24"],
        labels: ["12-hour", "24-hour"],
        updateInterval: 1000, // Update time display every second
        debug: false,
      },
      options
    );

    super(selectorClass, name, timeFormatOptions);

    // Store update interval ID
    this.updateInterval = null;

    // Cache option elements
    this.option12h = null;
    this.option24h = null;
  }

  /**
   * Format current time based on format preference
   * @param {boolean} use24Hour - Whether to use 24-hour format
   * @returns {string} - Formatted time string
   */
  formatCurrentTime(use24Hour = false) {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, "0");

    if (use24Hour) {
      // 24-hour format
      hours = hours.toString().padStart(2, "0");
      return `24h ${hours}:${minutes}`;
    } else {
      // 12-hour format with AM/PM
      const period = hours >= 12 ? "pm" : "am";
      hours = hours % 12;
      hours = hours ? hours : 12; // Convert 0 to 12 for 12 AM
      return `12h ${hours}:${minutes}${period}`;
    }
  }

  /**
   * Update the time display in the option buttons
   */
  updateTimeDisplay() {
    if (!this.option12h || !this.option24h) {
      this.option12h = document.querySelector(
        `${this.containerSelector} .option[data-value="12"] h3`
      );
      this.option24h = document.querySelector(
        `${this.containerSelector} .option[data-value="24"] h3`
      );
    }

    if (this.option12h) {
      this.option12h.textContent = this.formatCurrentTime(false);
    }

    if (this.option24h) {
      this.option24h.textContent = this.formatCurrentTime(true);
    }
  }

  /**
   * Apply time format preference
   * @param {string} formatName - The format to apply ("12" or "24")
   */
  applyPreference(formatName) {
    this.log("Applying time format:", formatName);

    // Update the current value
    this.currentValue = formatName;

    // Update the time display
    this.updateTimeDisplay();

    // Set the active option in UI
    this.setActiveOption(formatName);

    // Trigger event
    this.triggerEvent("change", { value: formatName });
  }

  /**
   * Set up time display update interval
   */
  setupTimeDisplayInterval() {
    // Clear any existing interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // Initial update
    this.updateTimeDisplay();

    // Set up interval to update time display
    this.updateInterval = setInterval(
      () => this.updateTimeDisplay(),
      this.options.updateInterval
    );

    // Register cleanup
    this.addDestroyHandler(() => {
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }
    });
  }

  /**
   * Generate HTML for selector
   * Override to create time format specific display
   * @returns {string} - HTML markup
   */
  generateHTML() {
    // Generate options HTML with time-specific labels
    const now = new Date();
    let hours12 = now.getHours() % 12;
    hours12 = hours12 ? hours12 : 12; // Convert 0 to 12 for 12 AM
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const period = now.getHours() >= 12 ? "pm" : "am";
    const hours24 = now.getHours().toString().padStart(2, "0");

    const timeFormat12 = `12h ${hours12}:${minutes}${period}`;
    const timeFormat24 = `24h ${hours24}:${minutes}`;

    // Determine which option should be active
    const defaultValue = this.options.defaultValue || "12";

    return `
      <div class="slider-selector ${this.name}-selector">
        <div class="border-container">
          <div class="border-segment border-top"></div>
          <div class="border-segment border-bottom"></div>
        </div>
        <div class="selector-background"></div>
        <div class="option${defaultValue === "12" ? " active" : ""}" 
             data-position="1" 
             data-value="12">
          <h3>${timeFormat12}</h3>
        </div>
        <div class="option${defaultValue === "24" ? " active" : ""}" 
             data-position="2" 
             data-value="24">
          <h3>${timeFormat24}</h3>
        </div>
      </div>
    `;
  }

  /**
   * Component-specific initialization
   */
  async initComponent() {
    // Call parent initialization
    if (!(await super.initComponent())) {
      return false;
    }

    // Set up time display interval
    this.setupTimeDisplayInterval();

    return true;
  }

  /**
   * After initialization complete
   */
  onInitialized() {
    // Apply stored preference or default
    const savedFormat =
      localStorage.getItem(this.options.storageKey) ||
      this.options.defaultValue;
    this.applyPreference(savedFormat);
  }
}

// Register time format selector with the factory
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
    window.TimeFormatSelector = TimeFormatSelector;

    // Create instance if not running in preload mode
    if (typeof window.selectorPreload === "undefined") {
      window.timeFormatSelector = window.SelectorFactory.register(
        "timeFormat",
        TimeFormatSelector,
        ".time-format-selector",
        {
          storageKey: "userTimeFormatPreference",
          defaultValue: "12",
          values: ["12", "24"],
        }
      );
    }
  }

  // Start checking for dependencies
  checkDependencies();
})();
