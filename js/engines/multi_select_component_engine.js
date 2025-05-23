/**
 * multi_select_component_engine.js
 * 
 * Engine for creating multi-select components that look exactly like
 * sliders but allow multiple options to be selected simultaneously.
 * Each option acts as an independent toggle button.
 * 
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
    
    console.log(`[multi_select_component_engine] Multi-select initialized: ${this.options.containerClass}`);
    return true;
  }
  
  /**
   * Create the multi-select structure
   * @param {HTMLElement} containerEl - Container element
   */
  createMultiSelect(containerEl) {
    // Create wrapper (like slider-container)
    const wrapper = document.createElement('div');
    wrapper.className = `${this.options.containerClass}-container`;
    wrapper.style.cssText = `
      display: flex;
      justify-content: center;
      margin: 5px 0;
    `;
    
    // Create multi-select container (like slider-selector)
    this.container = document.createElement('div');
    this.container.className = this.options.containerClass;
    this.container.style.cssText = `
      display: inline-flex;
      position: relative;
      height: auto;
      border-radius: 9999px;
      background: linear-gradient(
        -25deg,
        var(--light-slider-start) 0%,
        var(--light-slider-end) 100%
      );
      overflow: visible;
      padding: 0;
      gap: 4px;
    `;
    
    // Add options
    this.options.options.forEach((option, index) => {
      const optionEl = this.createOption(option, index);
      this.container.appendChild(optionEl);
      this.optionElements.set(option.value, optionEl);
    });
    
    // Add to wrapper and container
    wrapper.appendChild(this.container);
    containerEl.appendChild(wrapper);
    
    // Apply dark theme support
    this.applyThemeSupport();
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
    
    // Style like slider option
    optionEl.style.cssText = `
      display: flex;
      justify-content: center;
      align-items: center;
      position: relative;
      cursor: pointer;
      z-index: 1;
      transition: all 0.3s ease;
      padding: 0;
      border-radius: 9999px;
      overflow: visible;
      min-width: 80px;
    `;
    
    // Create option content
    optionEl.innerHTML = `
      <div class="option-background"></div>
      <div class="option-content">
        ${option.icon ? `<span class="option-icon">${option.icon}</span>` : ''}
        <h3>${option.text || option.value}</h3>
      </div>
    `;
    
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
    
    // Check selection limits
    if (!isActive && this.options.maxSelection) {
      const currentCount = this.container.querySelectorAll('.option.active').length;
      if (currentCount >= this.options.maxSelection) {
        console.log(`[multi_select_component_engine] Maximum selection limit reached: ${this.options.maxSelection}`);
        return;
      }
    }
    
    if (isActive && this.options.minSelection) {
      const currentCount = this.container.querySelectorAll('.option.active').length;
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
   * Apply theme support and styles
   */
  applyThemeSupport() {
    // Add styles if not already present
    if (!document.getElementById('multi-select-engine-styles')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'multi-select-engine-styles';
      styleSheet.textContent = `
        /* Dark theme support */
        body[data-theme="dark"] .${this.options.containerClass} {
          background: linear-gradient(
            -25deg,
            var(--dark-slider-start) 0%,
            var(--dark-slider-end) 100%
          );
        }
        
        /* Option background */
        .${this.options.containerClass} .option-background {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          height: 100%;
          width: 100%;
          border-radius: 9999px;
          background: linear-gradient(
            145deg,
            var(--active-button-start),
            var(--active-button-end)
          );
          z-index: 0;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        
        /* Active state shows background */
        .${this.options.containerClass} .option.active .option-background {
          opacity: 1;
        }
        
        /* Option content */
        .${this.options.containerClass} .option-content {
          display: flex;
          justify-content: center;
          align-items: center;
          position: relative;
          z-index: 2;
          padding: 2px 16px;
          gap: 5px;
        }
        
        .${this.options.containerClass} .option-content h3 {
          white-space: nowrap;
          overflow: visible;
          text-overflow: clip;
          max-width: none;
          font-size: clamp(0.5rem, 1.2vw, 2.3rem);
          margin: 0;
          font-weight: bold;
          color: #ffffff;
          transition: color 0.3s ease;
        }
        
        /* Hover effect */
        .${this.options.containerClass} .option:hover {
          transform: scale(1.05);
        }
        
        /* Icon styling */
        .${this.options.containerClass} .option-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: inherit;
        }
      `;
      document.head.appendChild(styleSheet);
    }
    
    // Watch for theme changes
    const observer = new MutationObserver(() => {
      const isDark = document.body.getAttribute('data-theme') === 'dark';
      this.container.style.background = isDark
        ? 'linear-gradient(-25deg, var(--dark-slider-start) 0%, var(--dark-slider-end) 100%)'
        : 'linear-gradient(-25deg, var(--light-slider-start) 0%, var(--light-slider-end) 100%)';
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
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
    if (this.container && this.container.parentNode) {
      this.container.parentNode.parentNode.removeChild(this.container.parentNode);
    }
    this.container = null;
    this.optionElements.clear();
    console.log(`[multi_select_component_engine] Destroyed:`, this.options.containerClass);
  }
}

// Export for ES6 modules
export { multi_select_component_engine };

console.log('[multi_select_component_engine] Engine class loaded as ES6 module');
