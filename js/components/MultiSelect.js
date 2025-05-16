/**
 * MultiSelect Component
 *
 * A specialized component for selecting multiple options with
 * checkboxes, tags, and optional search functionality.
 */
class MultiSelect extends ComponentBase {
  /**
   * Create a new MultiSelect
   * @param {Object} config - Configuration object
   * @param {string} config.name - Unique identifier
   * @param {Array} config.options - Array of option values
   * @param {Array} [config.labels] - Display labels for options
   * @param {Array} [config.defaultValue] - Default selected values
   * @param {number} [config.maxSelections] - Maximum selections allowed
   * @param {boolean} [config.searchable=true] - Enable search functionality
   * @param {string} [config.storageKey] - localStorage key
   * @param {string} [config.container] - CSS selector for container
   * @param {Function} [config.onValueChange] - Callback for changes
   * @param {string} [config.placeholder='Select options...'] - Placeholder text
   */
  constructor(config) {
    // Validate configuration
    if (!config || !config.name) {
      throw new Error('MultiSelect requires a name in config');
    }

    if (!config.options || !Array.isArray(config.options) || config.options.length === 0) {
      throw new Error('MultiSelect requires a non-empty options array');
    }

    // Set up container selector
    const containerSelector = config.container || `.${config.name}-multiselect`;

    // Prepare options for parent constructor
    const options = {
      options: config.options,
      labels: config.labels || config.options,
      defaultValue: config.defaultValue || [],
      maxSelections: config.maxSelections || null,
      searchable: config.searchable !== false,
      storageKey: config.storageKey || `user${config.name.charAt(0).toUpperCase() + config.name.slice(1)}Selections`,
      placeholder: config.placeholder || 'Select options...'
    };

    // Call parent constructor
    super(containerSelector, config.name, options);

    // Store callback and initialize state
    this.onValueChange = config.onValueChange;
    this.selectedValues = [...(options.defaultValue || [])];
    this.filteredOptions = [...options.options];
    this.isDropdownOpen = false;

    // DOM elements
    this.domElements = {
      trigger: null,
      dropdown: null,
      searchInput: null,
      optionsList: null,
      selectedTags: null,
      placeholder: null,
      container: null
    };

    this.log(`MultiSelect created: ${config.name}`);
  }

  /**
   * Get DOM elements
   * @returns {boolean} - Success status
   */
  getDOMElements() {
    if (!super.getDOMElements()) {
      return false;
    }

    try {
      const container = this.container;
      
      // Get main elements
      this.domElements.trigger = container.querySelector('.multiselect-trigger');
      this.domElements.dropdown = container.querySelector('.multiselect-dropdown');
      this.domElements.searchInput = container.querySelector('.search-input');
      this.domElements.optionsList = container.querySelector('.options-list');
      this.domElements.selectedTags = container.querySelector('.selected-tags');
      this.domElements.placeholder = container.querySelector('.placeholder');

      if (!this.domElements.trigger || !this.domElements.dropdown || !this.domElements.optionsList) {
        this.error('Required MultiSelect elements not found');
        return false;
      }

      this.domElements.container = container;
      return true;
    } catch (error) {
      this.error('Error getting MultiSelect DOM elements:', error);
      return false;
    }
  }

  /**
   * Initialize the component
   * @returns {Promise<boolean>} - Success status
   */
  async initComponent() {
    try {
      // Set up event listeners
      this.setupEventListeners();

      // Load saved values
      this.loadSavedValues();

      // Initialize display
      this.updateDisplay();

      // Render options
      this.renderOptions();

      return true;
    } catch (error) {
      this.error('Error initializing MultiSelect:', error);
      return false;
    }
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Toggle dropdown
    this.addEventListener(this.domElements.trigger, 'click', (event) => {
      event.stopPropagation();
      this.toggleDropdown();
    });

    // Search functionality
    if (this.domElements.searchInput && this.options.searchable) {
      this.addEventListener(this.domElements.searchInput, 'input', (event) => {
        this.handleSearch(event.target.value);
      });

      this.addEventListener(this.domElements.searchInput, 'click', (event) => {
        event.stopPropagation();
      });
    }

    // Close dropdown when clicking outside
    this.addEventListener(document, 'click', () => {
      this.closeDropdown();
    });

    // Prevent dropdown close when clicking inside
    this.addEventListener(this.domElements.dropdown, 'click', (event) => {
      event.stopPropagation();
    });
  }

  /**
   * Handle search input
   * @param {string} query - Search query
   */
  handleSearch(query) {
    const lowerQuery = query.toLowerCase();
    
    this.filteredOptions = this.options.options.filter((option, index) => {
      const label = this.options.labels[index];
      return label.toLowerCase().includes(lowerQuery) || option.toLowerCase().includes(lowerQuery);
    });

    this.renderOptions();
  }

  /**
   * Toggle dropdown visibility
   */
  toggleDropdown() {
    if (this.isDropdownOpen) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  /**
   * Open dropdown
   */
  openDropdown() {
    this.isDropdownOpen = true;
    this.domElements.dropdown.classList.add('open');
    this.domElements.trigger.classList.add('open');

    // Focus search input if searchable
    if (this.domElements.searchInput && this.options.searchable) {
      setTimeout(() => {
        this.domElements.searchInput.focus();
      }, 0);
    }

    this.triggerEvent('dropdownOpen');
  }

  /**
   * Close dropdown
   */
  closeDropdown() {
    this.isDropdownOpen = false;
    this.domElements.dropdown.classList.remove('open');
    this.domElements.trigger.classList.remove('open');

    // Clear search
    if (this.domElements.searchInput) {
      this.domElements.searchInput.value = '';
      this.filteredOptions = [...this.options.options];
      this.renderOptions();
    }

    this.triggerEvent('dropdownClose');
  }

  /**
   * Render options in dropdown
   */
  renderOptions() {
    if (!this.domElements.optionsList) return;

    const optionsHTML = this.filteredOptions.map((option, originalIndex) => {
      // Find the original index in the full options array
      const fullIndex = this.options.options.indexOf(option);
      const label = this.options.labels[fullIndex];
      const isSelected = this.selectedValues.includes(option);
      const isDisabled = this.isSelectionDisabled(option);

      return `
        <div class="multiselect-option ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}" 
             data-value="${option}" data-index="${fullIndex}">
          <input type="checkbox" 
                 ${isSelected ? 'checked' : ''} 
                 ${isDisabled ? 'disabled' : ''}
                 class="option-checkbox">
          <span class="option-label">${label}</span>
        </div>
      `;
    }).join('');

    this.domElements.optionsList.innerHTML = optionsHTML;

    // Add click handlers to options
    this.domElements.optionsList.querySelectorAll('.multiselect-option').forEach(option => {
      this.addEventListener(option, 'click', () => {
        const value = option.getAttribute('data-value');
        this.toggleOption(value);
      });
    });
  }

  /**
   * Check if selection is disabled (max selections reached)
   * @param {string} option - Option to check
   * @returns {boolean} - Is disabled
   */
  isSelectionDisabled(option) {
    if (!this.options.maxSelections) return false;
    return !this.selectedValues.includes(option) && 
           this.selectedValues.length >= this.options.maxSelections;
  }

  /**
   * Toggle option selection
   * @param {string} value - Option value to toggle
   */
  toggleOption(value) {
    const index = this.selectedValues.indexOf(value);

    if (index > -1) {
      // Remove selection
      this.selectedValues.splice(index, 1);
    } else {
      // Add selection (if not at max)
      if (!this.options.maxSelections || this.selectedValues.length < this.options.maxSelections) {
        this.selectedValues.push(value);
      } else {
        // Show feedback about max selections
        this.showMaxSelectionsMessage();
        return;
      }
    }

    // Update display
    this.updateDisplay();
    this.renderOptions(); // Re-render to update checkboxes

    // Save and trigger callbacks
    this.saveValue();
    this.handleValueChange();
  }

  /**
   * Update the display (tags and placeholder)
   */
  updateDisplay() {
    this.updateTags();
    this.updatePlaceholder();
  }

  /**
   * Update selected tags display
   */
  updateTags() {
    if (!this.domElements.selectedTags) return;

    const tagsHTML = this.selectedValues.map(value => {
      const index = this.options.options.indexOf(value);
      const label = this.options.labels[index];
      
      return `
        <span class="selected-tag" data-value="${value}">
          <span class="tag-label">${label}</span>
          <button type="button" class="remove-tag" aria-label="Remove ${label}">×</button>
        </span>
      `;
    }).join('');

    this.domElements.selectedTags.innerHTML = tagsHTML;

    // Add remove handlers to tags
    this.domElements.selectedTags.querySelectorAll('.remove-tag').forEach(button => {
      this.addEventListener(button, 'click', (event) => {
        event.stopPropagation();
        const value = button.closest('.selected-tag').getAttribute('data-value');
        this.toggleOption(value);
      });
    });
  }

  /**
   * Update placeholder visibility
   */
  updatePlaceholder() {
    if (!this.domElements.placeholder) return;

    if (this.selectedValues.length === 0) {
      this.domElements.placeholder.style.display = 'block';
      this.domElements.placeholder.textContent = this.options.placeholder;
    } else {
      this.domElements.placeholder.style.display = 'none';
    }
  }

  /**
   * Show message about max selections
   */
  showMaxSelectionsMessage() {
    // Could show a tooltip or flash message
    this.log(`Maximum ${this.options.maxSelections} selections allowed`);
    
    // Add visual feedback
    this.domElements.container.classList.add('max-reached');
    setTimeout(() => {
      this.domElements.container.classList.remove('max-reached');
    }, 2000);
  }

  /**
   * Handle value change
   */
  handleValueChange() {
    this.log(`Selected values changed: ${JSON.stringify(this.selectedValues)}`);

    // Call callback if provided
    if (this.onValueChange && typeof this.onValueChange === 'function') {
      try {
        this.onValueChange([...this.selectedValues]);
      } catch (error) {
        this.error('Error in onValueChange callback:', error);
      }
    }

    // Trigger event
    this.triggerEvent('change', {
      selectedValues: [...this.selectedValues],
      selectedLabels: this.getSelectedLabels()
    });
  }

  /**
   * Get labels for selected values
   * @returns {Array} - Selected labels
   */
  getSelectedLabels() {
    return this.selectedValues.map(value => {
      const index = this.options.options.indexOf(value);
      return this.options.labels[index];
    });
  }

  /**
   * Set values programmatically
   * @param {Array} values - Array of values to select
   * @param {boolean} [skipCallback=false] - Skip callback
   * @returns {boolean} - Success status
   */
  setValue(values, skipCallback = false) {
    if (!Array.isArray(values)) {
      this.error('setValue requires an array of values');
      return false;
    }

    // Validate values
    const validValues = values.filter(value => this.options.options.includes(value));
    
    if (validValues.length !== values.length) {
      this.warn('Some values were invalid and ignored');
    }

    // Check max selections
    if (this.options.maxSelections && validValues.length > this.options.maxSelections) {
      this.error(`Cannot select more than ${this.options.maxSelections} options`);
      return false;
    }

    // Update selected values
    this.selectedValues = [...validValues];

    // Update display
    this.updateDisplay();
    this.renderOptions();

    // Save and trigger callbacks if not skipped
    if (!skipCallback) {
      this.saveValue();
      this.handleValueChange();
    }

    return true;
  }

  /**
   * Get current values
   * @returns {Object} - Current selections
   */
  getValue() {
    return {
      values: [...this.selectedValues],
      labels: this.getSelectedLabels(),
      count: this.selectedValues.length
    };
  }

  /**
   * Clear all selections
   */
  clear() {
    this.selectedValues = [];
    this.updateDisplay();
    this.renderOptions();
    this.saveValue();
    this.handleValueChange();
  }

  /**
   * Save value to localStorage
   */
  saveValue() {
    if (this.options.storageKey) {
      const value = JSON.stringify(this.selectedValues);
      localStorage.setItem(this.options.storageKey, value);
      this.log(`Saved to localStorage: ${value}`);
    }
  }

  /**
   * Load saved values from localStorage
   */
  loadSavedValues() {
    if (this.options.storageKey) {
      const saved = localStorage.getItem(this.options.storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            this.selectedValues = parsed.filter(value => this.options.options.includes(value));
            this.log(`Loaded from localStorage: ${saved}`);
          }
        } catch (error) {
          this.error('Error parsing saved selections:', error);
        }
      }
    }
  }

  /**
   * Generate HTML for the component
   * @returns {string} - HTML markup
   */
  generateHTML() {
    const searchHTML = this.options.searchable ? `
      <div class="search-container">
        <input type="text" class="search-input" placeholder="Search options...">
      </div>
    ` : '';

    return `
      <div class="multiselect ${this.name}-multiselect">
        <div class="multiselect-trigger">
          <div class="selected-tags"></div>
          <div class="placeholder">${this.options.placeholder}</div>
          <div class="dropdown-arrow">▼</div>
        </div>
        <div class="multiselect-dropdown">
          ${searchHTML}
          <div class="options-list"></div>
        </div>
      </div>
    `;
  }

  /**
   * Get component configuration
   * @returns {Object} - Current configuration
   */
  getConfig() {
    return {
      name: this.name,
      containerSelector: this.containerSelector,
      options: this.options.options,
      labels: this.options.labels,
      selectedValues: [...this.selectedValues],
      maxSelections: this.options.maxSelections,
      searchable: this.options.searchable,
      storageKey: this.options.storageKey,
      isInitialized: this.isInitialized
    };
  }

  /**
   * Clean up component
   */
  cleanupComponent() {
    // Close dropdown if open
    if (this.isDropdownOpen) {
      this.closeDropdown();
    }

    // Clear state
    this.selectedValues = [];
    this.filteredOptions = [];
    this.domElements = {};
  }
}

// Make globally available
window.MultiSelect = MultiSelect;

// Add to components namespace
if (!window.Components) {
  window.Components = {};
}
window.Components.MultiSelect = MultiSelect;
