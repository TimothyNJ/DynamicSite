/**
 * multi_select_component_engine.js
 * 
 * Engine for creating multi-select components that look exactly like
 * buttons but allow multiple options to be selected simultaneously.
 * Each option acts as an independent toggle button.
 * 
 * Updated: 10-Jun-2025 - Aligned with button engine architecture
 * Date: 22-May-2025
 * Deployment Timestamp: [TO BE UPDATED ON DEPLOYMENT]
 */

class multi_select_component_engine {
  constructor(options = {}, changeHandler = null) {
    // Default options
    this.options = {
      id: options.id || `multi-select-${Date.now()}`,
      containerClass: options.containerClass || 'multi-select-selector',
      options: options.options || [],
      selectedValues: options.selectedValues || [],
      storageKey: options.storageKey || null,
      minSelection: options.minSelection || 0,
      maxSelection: options.maxSelection || null,
      ...options
    };
    
    this.changeHandler = changeHandler;
    this.container = null;
    this.optionElements = new Map();
    
    console.log(`[multi_select_component_engine] Initialized with options:`, this.options);
  }
  
  /**
   * Initialize and render the multi-select
   * @param {string} containerId - Container element ID
   * @returns {boolean} Success status
   */
  init(containerId) {
    const containerEl = document.getElementById(containerId);
    if (!containerEl) {
      console.error(`[multi_select_component_engine] Container not found: ${containerId}`);
      return false;
    }
    
    // Apply stored values if storage key provided
    if (this.options.storageKey) {
      this.applyStoredValues();
    }
    
    // Create multi-select structure
    this.createMultiSelect(containerEl);
    
    // Set initial selections
    this.updateSelections();
    
    console.log(`[multi_select_component_engine] Multi-select initialized: ${this.options.id}`);
    return true;
  }
  
  /**
   * Create the multi-select structure
   * @param {HTMLElement} containerEl - Container element
   */
  createMultiSelect(containerEl) {
    // Apply container class to existing container (matches button approach)
    containerEl.classList.add('multi-select-container');
    this.container = containerEl;
    
    // Create multi-select selector
    const selector = document.createElement('div');
    selector.className = this.options.containerClass;
    
    // Add options
    this.options.options.forEach((option, index) => {
      const optionEl = this.createOption(option, index);
      selector.appendChild(optionEl);
      this.optionElements.set(option.value, optionEl);
    });
    
    // Add to container
    this.container.appendChild(selector);
  }
  
  /**
   * Create an option element
   * @param {Object} option - Option configuration
   * @param {number} index - Option index
   * @returns {HTMLElement} Option element
   */
  createOption(option, index) {
    const optionEl = document.createElement('div');
    optionEl.className = 'option';
    optionEl.dataset.value = option.value;
    optionEl.dataset.position = index + 1;
    
    if (option.dataAttributes) {
      const attrs = option.dataAttributes.split(' ');
      attrs.forEach(attr => {
        const [key, value] = attr.split('=');
        if (key && value) {
          optionEl.dataset[key.replace('data-', '')] = value.replace(/"/g, '');
        }
      });
    }
    
    // Create option content
    const content = document.createElement('div');
    content.className = 'option-content';
    
    // Add icon if provided
    if (option.icon) {
      const icon = document.createElement('span');
      icon.className = 'option-icon';
      icon.innerHTML = option.icon;
      content.appendChild(icon);
    }
    
    // Add text
    const h3 = document.createElement('h3');
    h3.textContent = option.text || option.value;
    content.appendChild(h3);
    
    // Build DOM structure
    optionEl.appendChild(content);
    
    // Add click handler
    optionEl.addEventListener('click', () => this.toggleOption(option.value));
    
    return optionEl;
  }
  
  /**
   * Toggle option selection
   * @param {string} value - Option value
   */
  toggleOption(value) {
    const optionEl = this.optionElements.get(value);
    if (!optionEl) return;
    
    const isActive = optionEl.classList.contains('active');
    const selector = this.container.querySelector(`.${this.options.containerClass}`);
    
    // Check selection limits
    if (!isActive && this.options.maxSelection) {
      const currentCount = selector.querySelectorAll('.option.active').length;
      if (currentCount >= this.options.maxSelection) {
        console.log(`[multi_select_component_engine] Maximum selection limit reached: ${this.options.maxSelection}`);
        return;
      }
    }
    
    if (isActive && this.options.minSelection) {
      const currentCount = selector.querySelectorAll('.option.active').length;
      if (currentCount <= this.options.minSelection) {
        console.log(`[multi_select_component_engine] Minimum selection limit reached: ${this.options.minSelection}`);
        return;
      }
    }
    
    // Toggle selection
    if (isActive) {
      optionEl.classList.remove('active');
      this.options.selectedValues = this.options.selectedValues.filter(v => v !== value);
    } else {
      optionEl.classList.add('active');
      if (!this.options.selectedValues.includes(value)) {
        this.options.selectedValues.push(value);
      }
    }
    
    // Save to storage
    if (this.options.storageKey) {
      localStorage.setItem(this.options.storageKey, JSON.stringify(this.options.selectedValues));
    }
    
    // Call change handler
    if (this.changeHandler) {
      this.changeHandler(this.options.selectedValues, value, !isActive);
    }
    
    console.log(`[multi_select_component_engine] Option ${isActive ? 'deselected' : 'selected'}: ${value}`);
  }
  
  /**
   * Apply stored values from localStorage
   */
  applyStoredValues() {
    if (!this.options.storageKey) return;
    
    const stored = localStorage.getItem(this.options.storageKey);
    if (stored) {
      try {
        this.options.selectedValues = JSON.parse(stored);
        console.log(`[multi_select_component_engine] Applied stored values:`, this.options.selectedValues);
      } catch (e) {
        console.error(`[multi_select_component_engine] Error parsing stored values:`, e);
      }
    }
  }
  
  /**
   * Update visual selections based on selectedValues
   */
  updateSelections() {
    this.optionElements.forEach((optionEl, value) => {
      if (this.options.selectedValues.includes(value)) {
        optionEl.classList.add('active');
      } else {
        optionEl.classList.remove('active');
      }
    });
  }
  

  /**
   * Get selected values
   * @returns {Array} Selected values
   */
  getSelectedValues() {
    return [...this.options.selectedValues];
  }
  
  /**
   * Set selected values
   * @param {Array} values - Values to select
   */
  setSelectedValues(values) {
    this.options.selectedValues = [...values];
    this.updateSelections();
    
    if (this.options.storageKey) {
      localStorage.setItem(this.options.storageKey, JSON.stringify(this.options.selectedValues));
    }
    
    if (this.changeHandler) {
      this.changeHandler(this.options.selectedValues, null, null);
    }
  }
  
  /**
   * Select all options
   */
  selectAll() {
    const allValues = this.options.options.map(opt => opt.value);
    if (this.options.maxSelection && allValues.length > this.options.maxSelection) {
      console.log(`[multi_select_component_engine] Cannot select all - exceeds maximum: ${this.options.maxSelection}`);
      return;
    }
    this.setSelectedValues(allValues);
  }
  
  /**
   * Clear all selections
   */
  clearAll() {
    if (this.options.minSelection && this.options.minSelection > 0) {
      console.log(`[multi_select_component_engine] Cannot clear all - minimum required: ${this.options.minSelection}`);
      return;
    }
    this.setSelectedValues([]);
  }
  
  /**
   * Destroy the component
   */
  destroy() {
    // Remove the selector element from container
    const selector = this.container.querySelector(`.${this.options.containerClass}`);
    if (selector && selector.parentNode) {
      selector.parentNode.removeChild(selector);
    }
    
    // Remove the multi-select-container class we added
    if (this.container) {
      this.container.classList.remove('multi-select-container');
    }
    
    this.container = null;
    this.optionElements.clear();
    console.log(`[multi_select_component_engine] Destroyed:`, this.options.id);
  }
}

// Export for ES6 modules
export { multi_select_component_engine };
