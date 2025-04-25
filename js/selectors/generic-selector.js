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
          storageKey: `user${name.charAt(0).toUpperCase() + name.slice(1)}Preference`,
          defaultValue: null,
          values: [],
          labels: [],
          icons: [],
          minWidth: null,
          maxOptions: 5, // Reasonable default for most cases
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
      console.log(`Applying ${this.name} preference:`, value);
  
      // Find the option with matching value
      const option = document.querySelector(
        `${this.selectorClass} .option[data-value="${value}"]`
      );
  
      if (option && this.sliderInstance) {
        // Use a small delay to ensure DOM is ready
        setTimeout(() => {
          this.sliderInstance.setActiveOption(option, true);
        }, 50);
      }
  
      // Call a custom handler if provided
      if (typeof this.options.onValueChange === 'function') {
        this.options.onValueChange(value);
      }
    }
  
    /**
     * Handle when an option is selected
     * @param {Element} option - The selected option DOM element
     */
    handleOptionSelected(option) {
      // Get the value from the option
      const value = this.getValueFromOption(option);
      
      console.log(`${this.name} option selected:`, value);
  
      // Apply the selection
      this.applyPreference(value);
  
      // Save to localStorage
      this.savePreference(value);
    }
  
    /**
     * Get value from option element
     * @param {Element} option - The option element
     * @returns {string} - The value
     */
    getValueFromOption(option) {
      // Try data-value attribute first
      const dataValue = option.getAttribute("data-value");
      if (dataValue) return dataValue;
  
      // Try header content
      const h3 = option.querySelector("h3");
      if (h3) {
        return h3.textContent.trim();
      }
  
      // Fallback to position
      return option.getAttribute("data-position") || "1";
    }
  
    /**
     * Generate HTML for selector
     * @returns {string} - HTML markup for the selector
     */
    generateHTML() {
      // Generate options HTML
      const optionsHTML = this.selectorValues.map((value, index) => {
        const position = index + 1;
        const isActive = value === this.options.defaultValue;
        const label = this.selectorLabels[index] || value;
        
        // Generate icon HTML if available
        let iconHTML = '';
        if (this.selectorIcons && this.selectorIcons[index]) {
          iconHTML = `<span class="option-icon">${this.selectorIcons[index]}</span>`;
        }
        
        return `
          <div class="option${isActive ? ' active' : ''}" 
               data-position="${position}" 
               data-value="${value}">
            ${iconHTML}
            <h3>${label}</h3>
          </div>
        `;
      }).join('');
  
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
      // Optional: Additional setup after initialization
      
      // Refresh active state after a short delay
      setTimeout(() => {
        const savedValue = localStorage.getItem(this.options.storageKey) || this.options.defaultValue;
        if (savedValue) {
          const option = document.querySelector(
            `${this.selectorClass} .option[data-value="${savedValue}"]`
          );
          
          if (option && this.sliderInstance) {
            this.sliderInstance.setActiveOption(option, true);
          }
        }
      }, 100);
    }
  }
  
  // Register with factory if available
  if (typeof window.SelectorFactory !== 'undefined') {
    console.log("Registering GenericSelector with factory");
    window.GenericSelector = GenericSelector;
  }