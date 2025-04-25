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
        formats: ["12", "24"],
        updateInterval: 1000, // Update time display every second
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
        `${this.selectorClass} .option[data-format="12"] h3`
      );
      this.option24h = document.querySelector(
        `${this.selectorClass} .option[data-format="24"] h3`
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
    console.log("Applying time format:", formatName);

    // Update the current format
    this.currentFormat = formatName;

    // Update the time display
    this.updateTimeDisplay();

    // Find the option element
    if (this.sliderInstance) {
      const option = document.querySelector(
        `${this.selectorClass} .option[data-format="${formatName}"]`
      );

      if (option) {
        // Add a slight delay to allow DOM to be ready
        setTimeout(() => {
          // Update the active button in UI
          this.sliderInstance.setActiveOption(option, true);
        }, 50);
      }
    }
  }

  /**
   * Handle option selected
   * @param {Element} option - The selected option element
   */
  handleOptionSelected(option) {
    // Get the format name
    const formatName = this.getValueFromOption(option);

    console.log("Time format option selected:", formatName);

    // Apply the format
    this.applyPreference(formatName);

    // Save to localStorage
    this.savePreference(formatName);
  }

  /**
   * Get format value from option
   * @param {Element} option - The option element
   * @returns {string} - The format value
   */
  getValueFromOption(option) {
    // Try data-format attribute first
    const dataFormat = option.getAttribute("data-format");
    if (dataFormat) return dataFormat;

    // Try header content
    const h3 = option.querySelector("h3");
    if (h3) {
      // Extract 12h or 24h from the text
      const text = h3.textContent.toLowerCase();
      if (text.includes("12h")) return "12";
      if (text.includes("24h")) return "24";
    }

    // Fallback to position: 1=12h, 2=24h
    const position = parseInt(option.getAttribute("data-position") || "1");
    return this.options.formats[position - 1] || "12";
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
  }

  /**
   * Clean up resources
   */
  cleanup() {
    // Clear update interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    // Call parent cleanup
    super.cleanup();
  }

  /**
   * After initialization complete
   */
  onInitialized() {
    // Set up time display update interval
    this.setupTimeDisplayInterval();

    // Refresh the active option after a short delay to ensure proper visual update
    setTimeout(() => {
      const formatName =
        localStorage.getItem(this.options.storageKey) ||
        this.options.defaultValue;
      const option = document.querySelector(
        `${this.selectorClass} .option[data-format="${formatName}"]`
      );

      if (option && this.sliderInstance) {
        this.sliderInstance.setActiveOption(option, false);
      }
    }, 100);
  }
}

// Register time format selector with the factory
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

    // Create and register the time format selector
    console.log("Registering time format selector");
    window.timeFormatSelector = window.SelectorFactory.register(
      "timeFormat",
      TimeFormatSelector,
      ".time-format-selector",
      {
        storageKey: "userTimeFormatPreference",
        defaultValue: "12",
      }
    );
  }

  // Start waiting for dependencies
  waitForDependencies();
})();
