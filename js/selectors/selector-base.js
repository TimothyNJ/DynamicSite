/**
 * Selector Base Class
 *
 * This abstract class extends ComponentBase to provide specialized functionality
 * for all slider-based selectors. Specific selector types (theme, time, etc.)
 * should extend this class.
 */
class SelectorBase extends ComponentBase {
  /**
   * Create a new selector component
   * @param {string} selectorClass - CSS selector for the slider container
   * @param {string} name - Unique identifier for this selector
   * @param {Object} options - Configuration options
   */
  constructor(selectorClass, name, options = {}) {
    // Set up selector-specific default options
    const selectorOptions = Object.assign(
      {
        values: [], // Possible values for this selector
        labels: [], // Display labels for values
        storageKey: `user${ComponentUtils.capitalizeFirstLetter(
          name
        )}Preference`,
        defaultValue: null, // Default value if none is stored
        containerClass: `${name}-container`, // Class for container element
        optionSelector: ".option", // Selector for option elements
        backgroundSelector: ".selector-background", // Selector for slider background
        borderTopSelector: ".border-top", // Selector for top border
        borderBottomSelector: ".border-bottom", // Selector for bottom border
        activeClass: "active", // Class for active option
        animationDuration: 500, // Duration for animations
        animationEasing: "cubic-bezier(0.77, 0, 0.175, 1)", // Easing function
        useCoreSlider: true, // Whether to use the SliderCore module
      },
      options
    );

    // Call parent constructor
    super(selectorClass, name, selectorOptions);

    // Selector-specific properties
    this.sliderInstance = null;
    this.currentValue = null;

    // Additional methods to bind
    this.handleOptionSelected = this.handleOptionSelected.bind(this);
    this.setActiveOption = this.setActiveOption.bind(this);
  }

  /**
   * Get DOM elements specific to selectors
   * @returns {boolean} - Success status
   */
  getDOMElements() {
    // First call parent method to get container
    if (!super.getDOMElements()) {
      return false;
    }

    try {
      // Get the selector element
      const selector = document.querySelector(this.containerSelector);
      if (!selector) {
        this.error(`Selector element not found: ${this.containerSelector}`);
        return false;
      }

      // Get option elements
      const options = selector.querySelectorAll(this.options.optionSelector);
      if (!options || options.length === 0) {
        this.error(`No options found in selector`);
        return false;
      }

      // Get background element
      const background = selector.querySelector(
        this.options.backgroundSelector
      );
      if (!background) {
        this.error(`Background element not found`);
        return false;
      }

      // Get border elements
      const borderTop = selector.querySelector(this.options.borderTopSelector);
      const borderBottom = selector.querySelector(
        this.options.borderBottomSelector
      );

      // Store elements
      this.domElements.selector = selector;
      this.domElements.options = options;
      this.domElements.background = background;
      this.domElements.borderTop = borderTop;
      this.domElements.borderBottom = borderBottom;

      return true;
    } catch (error) {
      this.error(`Error getting selector DOM elements:`, error);
      return false;
    }
  }

  /**
   * Initialize the selector component
   * @returns {Promise<boolean>} - Success status
   */
  async initComponent() {
    try {
      // Check if we should use the core slider
      if (this.options.useCoreSlider) {
        // Wait for SliderCore to be available
        if (typeof window.SliderCore === "undefined") {
          this.log("Waiting for SliderCore to be available");

          // Try a few times with increasing delay
          for (let i = 0; i < 5; i++) {
            await new Promise((resolve) =>
              setTimeout(resolve, 100 * Math.pow(2, i))
            );
            if (typeof window.SliderCore !== "undefined") break;
          }

          // If still not available, fail
          if (typeof window.SliderCore === "undefined") {
            this.error("SliderCore module not available");
            return false;
          }
        }

        // Create slider instance
        this.sliderInstance = window.SliderCore.create(this.containerSelector);

        if (!this.sliderInstance) {
          this.error("Failed to create slider instance");
          return false;
        }

        // Set up the onOptionSelected callback
        this.sliderInstance.onOptionSelected = this.handleOptionSelected;
      } else {
        // Set up click handlers for options
        this.setupOptionClickHandlers();
      }

      return true;
    } catch (error) {
      this.error(`Error initializing selector component:`, error);
      return false;
    }
  }

  /**
   * Set up option click handlers when not using SliderCore
   */
  setupOptionClickHandlers() {
    if (!this.domElements.options) return;

    // Add click handlers to each option
    this.domElements.options.forEach((option) => {
      const removeListener = this.addEventListener(option, "click", () =>
        this.handleOptionSelected(option)
      );

      // Store for cleanup
      this.addDestroyHandler(removeListener);
    });
  }

  /**
   * Handle option selected event
   * This is called when user clicks on an option
   * @param {Element} option - The selected option DOM element
   */
  handleOptionSelected(option) {
    if (!option) return;

    // Get the value from the option
    const value = this.getValueFromOption(option);

    this.log(`Option selected:`, value);

    // Apply the preference
    this.applyPreference(value);

    // Save to localStorage
    this.savePreference(value);

    // Trigger event
    this.triggerEvent("change", { value, option });
  }

  /**
   * Set the active option
   * @param {string} value - The value to set active
   * @param {boolean} skipAnimation - Whether to skip animation
   * @returns {Element|null} - The activated option element or null
   */
  setActiveOption(value, skipAnimation = false) {
    // No action if value is already active
    if (value === this.currentValue) {
      return null;
    }

    // Find the option with this value
    let targetOption = null;

    if (this.domElements.options) {
      for (const option of this.domElements.options) {
        const optionValue = this.getValueFromOption(option);
        if (optionValue === value) {
          targetOption = option;
          break;
        }
      }
    }

    if (!targetOption) {
      this.error(`No option found with value: ${value}`);
      return null;
    }

    // If using SliderCore, use its method
    if (
      this.sliderInstance &&
      typeof this.sliderInstance.setActiveOption === "function"
    ) {
      this.sliderInstance.setActiveOption(targetOption, skipAnimation);
    } else {
      // Otherwise handle it ourselves
      this.updateActiveOption(targetOption, skipAnimation);
    }

    // Store the current value
    this.currentValue = value;

    return targetOption;
  }

  /**
   * Update active option when not using SliderCore
   * @param {Element} activeOption - The option to make active
   * @param {boolean} skipAnimation - Whether to skip animation
   */
  updateActiveOption(activeOption, skipAnimation = false) {
    if (
      !activeOption ||
      !this.domElements.options ||
      !this.domElements.background
    ) {
      return;
    }

    // Remove active class from all options
    this.domElements.options.forEach((option) => {
      option.classList.remove(this.options.activeClass);
    });

    // Add active class to selected option
    activeOption.classList.add(this.options.activeClass);

    // Position the background behind the active option
    const optionRect = activeOption.getBoundingClientRect();
    const selectorRect = this.domElements.selector.getBoundingClientRect();

    // Calculate the left position relative to the selector
    const leftPosition = optionRect.left - selectorRect.left;

    // Apply the position and width
    if (skipAnimation) {
      this.domElements.background.style.transition = "none";

      // Set properties
      this.domElements.background.style.width = `${optionRect.width}px`;
      this.domElements.background.style.left = `${leftPosition}px`;

      // Force reflow
      void this.domElements.background.offsetWidth;

      // Restore transition
      this.domElements.background.style.transition = "";
    } else {
      // Apply with animation
      this.domElements.background.style.transition = `left ${this.options.animationDuration}ms ${this.options.animationEasing}, 
         width ${this.options.animationDuration}ms ${this.options.animationEasing}`;

      this.domElements.background.style.width = `${optionRect.width}px`;
      this.domElements.background.style.left = `${leftPosition}px`;
    }
  }

  /**
   * Get value from option element
   * @param {Element} option - The option element
   * @returns {string} - The value
   */
  getValueFromOption(option) {
    if (!option) return null;

    // Try data-value attribute first
    const dataValue = option.getAttribute("data-value");
    if (dataValue) {
      return dataValue;
    }

    // Try data attribute with component name
    const dataAttr = option.getAttribute(`data-${this.name.toLowerCase()}`);
    if (dataAttr) {
      return dataAttr;
    }

    // Try header content
    const header = option.querySelector("h3");
    if (header) {
      return header.textContent.trim().toLowerCase();
    }

    // Fallback to position
    return option.getAttribute("data-position") || "1";
  }

  /**
   * Clean up resources specific to selectors
   */
  cleanupComponent() {
    // Cleanup SliderCore if it was used
    if (
      this.sliderInstance &&
      typeof this.sliderInstance.destroy === "function"
    ) {
      this.sliderInstance.destroy();
    }

    this.sliderInstance = null;
    this.currentValue = null;
  }

  /**
   * Generate HTML for selector
   * @returns {string} - HTML markup
   */
  generateHTML() {
    // Generate options HTML
    const optionsHTML = this.options.values
      .map((value, index) => {
        const position = index + 1;
        const isActive = value === this.options.defaultValue;
        const label = this.options.labels[index] || value;

        return `
        <div class="option${isActive ? " active" : ""}" 
             data-position="${position}" 
             data-value="${value}">
          <h3>${label}</h3>
        </div>
      `;
      })
      .join("");

    // Generate the full selector HTML
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
}

// Make available globally
window.SelectorBase = SelectorBase;
