/**
 * Generic Selector
 *
 * A versatile selector component that can be configured for various use cases.
 * Extends the base selector with configurable options and appearance.
 */
class GenericSelector extends SelectorBase {
  /**
   * Create a new GenericSelector
   * @param {string} selectorClass - CSS selector for the selector container
   * @param {string} name - Identifier name
   * @param {Object} options - Configuration options
   */
  constructor(selectorClass, name, options = {}) {
    // Set default options for generic selector
    const genericOptions = Object.assign(
      {
        storageKey: `user${ComponentUtils.capitalizeFirstLetter(
          name
        )}Preference`,
        defaultValue: null,
        values: [], // Possible values
        labels: [], // Display labels
        icons: [], // Optional icons to show with labels
        minWidth: null, // Optional minimum width
        maxOptions: 5, // Reasonable default for most cases
        onValueChange: null, // Optional callback when value changes
        debug: false, // Enable debug logging
      },
      options
    );

    super(selectorClass, name, genericOptions);

    // Store specific properties for this selector type
    this.selectorValues = this.options.values;
    this.selectorLabels = this.options.labels;
    this.selectorIcons = this.options.icons;
  }

  /**
   * Apply preference
   * @param {string} value - The selected value to apply
   */
  applyPreference(value) {
    this.log(`Applying ${this.name} preference:`, value);

    // Update current value
    this.currentValue = value;

    // Set the active option in the UI
    this.setActiveOption(value);

    // Call a custom handler if provided
    if (typeof this.options.onValueChange === "function") {
      this.options.onValueChange(value);
    }

    // Trigger change event
    this.triggerEvent("change", { value });
  }

  /**
   * Get value from option element
   * Override base method for generic selector-specific behavior
   * @param {Element} option - The option element
   * @returns {string} - The value
   */
  getValueFromOption(option) {
    if (!option) return null;

    // Try data-value attribute first (preferred)
    const dataValue = option.getAttribute("data-value");
    if (dataValue) return dataValue;

    // Try header content
    const h3 = option.querySelector("h3");
    if (h3) {
      // Try to match the text with one of our labels
      const text = h3.textContent.trim();
      const index = this.selectorLabels.findIndex((label) => label === text);

      if (index >= 0 && this.selectorValues[index]) {
        return this.selectorValues[index];
      }

      // Otherwise just return the text
      return text;
    }

    // Fallback to position
    const position = parseInt(option.getAttribute("data-position") || "1") - 1;
    return this.selectorValues[position] || null;
  }

  /**
   * Generate HTML for selector
   * @returns {string} - HTML markup for the selector
   */
  generateHTML() {
    // Validate we have values
    if (!this.selectorValues || this.selectorValues.length === 0) {
      this.error("No values provided for selector");
      return '<div class="error">Configuration Error: No values provided</div>';
    }

    // Generate options HTML
    const optionsHTML = this.selectorValues
      .map((value, index) => {
        const position = index + 1;
        const isActive = value === this.options.defaultValue;
        const label = this.selectorLabels[index] || value;

        // Generate icon HTML if available
        let iconHTML = "";
        if (this.selectorIcons && this.selectorIcons[index]) {
          iconHTML = `<span class="option-icon">${this.selectorIcons[index]}</span>`;
        }

        return `
        <div class="option${isActive ? " active" : ""}" 
             data-position="${position}" 
             data-value="${value}">
          ${iconHTML}
          <h3>${label}</h3>
        </div>
      `;
      })
      .join("");

    // Generate full selector HTML
    return `
      <div class="slider-selector ${this.name}-selector">
        <div class="border-container">
          <div class="border-segment border-top"></div>
          <div class="border-segment border-bottom"></div>
        </div>
        <div class="selector-background"></div>
        ${optionsHTML}
      </div>
    `;
  }

  /**
   * After initialization complete
   */
  onInitialized() {
    // Refresh active state after a short delay
    setTimeout(() => {
      const savedValue =
        localStorage.getItem(this.options.storageKey) ||
        this.options.defaultValue;
      if (savedValue) {
        this.setActiveOption(savedValue);
      }
    }, 100);
  }
}

// Register with factory if available
if (typeof window.SelectorFactory !== "undefined") {
  window.GenericSelector = GenericSelector;
}
