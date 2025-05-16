/**
 * TimeRangePicker Component
 *
 * A specialized component for selecting start and end times with format support
 * and proper validation for time ranges.
 */
class TimeRangePicker extends ComponentBase {
  /**
   * Create a new TimeRangePicker
   * @param {Object} config - Configuration object
   * @param {string} config.name - Unique identifier
   * @param {string} [config.startTime='09:00'] - Default start time
   * @param {string} [config.endTime='17:00'] - Default end time
   * @param {string} [config.format='24h'] - Time format ('24h' or '12h')
   * @param {number} [config.step=15] - Step in minutes
   * @param {string} [config.storageKey] - localStorage key
   * @param {string} [config.container] - CSS selector for container
   * @param {Function} [config.onValueChange] - Callback for changes
   */
  constructor(config) {
    // Validate configuration
    if (!config || !config.name) {
      throw new Error('TimeRangePicker requires a name in config');
    }

    // Set up container selector
    const containerSelector = config.container || `.${config.name}-picker`;

    // Prepare options for parent constructor
    const options = {
      startTime: config.startTime || '09:00',
      endTime: config.endTime || '17:00',
      format: config.format || '24h',
      step: config.step || 15,
      storageKey: config.storageKey || `user${config.name.charAt(0).toUpperCase() + config.name.slice(1)}Range`,
      minTime: config.minTime || '00:00',
      maxTime: config.maxTime || '23:59'
    };

    // Call parent constructor
    super(containerSelector, config.name, options);

    // Store callback and initialize state
    this.onValueChange = config.onValueChange;
    this.currentValue = {
      start: options.startTime,
      end: options.endTime
    };

    // DOM elements
    this.domElements = {
      startInput: null,
      endInput: null,
      formatToggle: null,
      container: null
    };

    this.log(`TimeRangePicker created: ${config.name}`);
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
      
      // Get time inputs
      this.domElements.startInput = container.querySelector('.start-time-input');
      this.domElements.endInput = container.querySelector('.end-time-input');
      this.domElements.formatToggle = container.querySelector('.format-toggle');

      if (!this.domElements.startInput || !this.domElements.endInput) {
        this.error('Required time input elements not found');
        return false;
      }

      this.domElements.container = container;
      return true;
    } catch (error) {
      this.error('Error getting TimeRangePicker DOM elements:', error);
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

      // Set format
      this.setFormat(this.options.format);

      return true;
    } catch (error) {
      this.error('Error initializing TimeRangePicker:', error);
      return false;
    }
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Start time change
    this.addEventListener(this.domElements.startInput, 'change', (event) => {
      this.handleTimeChange('start', event.target.value);
    });

    // End time change
    this.addEventListener(this.domElements.endInput, 'change', (event) => {
      this.handleTimeChange('end', event.target.value);
    });

    // Format toggle
    if (this.domElements.formatToggle) {
      this.addEventListener(this.domElements.formatToggle, 'click', () => {
        this.toggleFormat();
      });
    }

    // Real-time validation
    this.addEventListener(this.domElements.startInput, 'input', () => {
      this.validateRange();
    });

    this.addEventListener(this.domElements.endInput, 'input', () => {
      this.validateRange();
    });
  }

  /**
   * Handle time change
   * @param {string} type - 'start' or 'end'
   * @param {string} value - New time value
   */
  handleTimeChange(type, value) {
    this.log(`${type} time changed to: ${value}`);

    // Update current value
    this.currentValue[type] = value;

    // Validate the range
    if (this.validateRange()) {
      // Save to localStorage
      this.saveValue();

      // Call callback if provided
      if (this.onValueChange && typeof this.onValueChange === 'function') {
        try {
          this.onValueChange(this.currentValue.start, this.currentValue.end);
        } catch (error) {
          this.error('Error in onValueChange callback:', error);
        }
      }

      // Trigger event
      this.triggerEvent('change', {
        start: this.currentValue.start,
        end: this.currentValue.end
      });
    }
  }

  /**
   * Validate time range
   * @returns {boolean} - Is valid
   */
  validateRange() {
    const start = this.parseTime(this.currentValue.start);
    const end = this.parseTime(this.currentValue.end);

    const isValid = start < end;

    // Add visual feedback
    this.domElements.container.classList.toggle('invalid-range', !isValid);

    return isValid;
  }

  /**
   * Parse time string to minutes
   * @param {string} timeStr - Time string (HH:MM)
   * @returns {number} - Minutes since midnight
   */
  parseTime(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Format time for display
   * @param {string} time24 - Time in 24h format
   * @returns {string} - Formatted time
   */
  formatTime(time24) {
    if (this.options.format === '12h') {
      return this.convertTo12Hour(time24);
    }
    return time24;
  }

  /**
   * Convert 24h to 12h format
   * @param {string} time24 - 24h time string
   * @returns {string} - 12h time string
   */
  convertTo12Hour(time24) {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  }

  /**
   * Convert 12h to 24h format
   * @param {string} time12 - 12h time string
   * @returns {string} - 24h time string
   */
  convertTo24Hour(time12) {
    const match = time12.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return time12;

    let [, hours, minutes, period] = match;
    hours = parseInt(hours);
    
    if (period.toUpperCase() === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period.toUpperCase() === 'AM' && hours === 12) {
      hours = 0;
    }

    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  }

  /**
   * Set time format
   * @param {string} format - '24h' or '12h'
   */
  setFormat(format) {
    this.options.format = format;

    // Update display if needed
    if (format === '12h') {
      this.domElements.startInput.value = this.formatTime(this.currentValue.start);
      this.domElements.endInput.value = this.formatTime(this.currentValue.end);
    } else {
      this.domElements.startInput.value = this.currentValue.start;
      this.domElements.endInput.value = this.currentValue.end;
    }

    // Update format toggle button
    if (this.domElements.formatToggle) {
      this.domElements.formatToggle.textContent = format === '24h' ? '12h' : '24h';
    }
  }

  /**
   * Toggle time format
   */
  toggleFormat() {
    const newFormat = this.options.format === '24h' ? '12h' : '24h';
    this.setFormat(newFormat);
  }

  /**
   * Set values programmatically
   * @param {string} startTime - Start time
   * @param {string} endTime - End time
   * @param {boolean} [skipCallback=false] - Skip callback
   * @returns {boolean} - Success status
   */
  setValue(startTime, endTime, skipCallback = false) {
    // Convert to 24h format for consistency
    const start24 = this.options.format === '12h' ? this.convertTo24Hour(startTime) : startTime;
    const end24 = this.options.format === '12h' ? this.convertTo24Hour(endTime) : endTime;

    // Update current values
    this.currentValue.start = start24;
    this.currentValue.end = end24;

    // Update inputs
    this.domElements.startInput.value = this.formatTime(start24);
    this.domElements.endInput.value = this.formatTime(end24);

    // Validate
    if (this.validateRange()) {
      // Save to localStorage
      this.saveValue();

      // Call callback if not skipped
      if (!skipCallback && this.onValueChange && typeof this.onValueChange === 'function') {
        try {
          this.onValueChange(start24, end24);
        } catch (error) {
          this.error('Error in onValueChange callback:', error);
        }
      }

      return true;
    }

    return false;
  }

  /**
   * Get current values
   * @returns {Object} - Current start and end times
   */
  getValue() {
    return {
      start: this.currentValue.start,
      end: this.currentValue.end,
      formatted: {
        start: this.formatTime(this.currentValue.start),
        end: this.formatTime(this.currentValue.end)
      }
    };
  }

  /**
   * Save value to localStorage
   */
  saveValue() {
    if (this.options.storageKey) {
      const value = JSON.stringify(this.currentValue);
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
          this.currentValue.start = parsed.start || this.options.startTime;
          this.currentValue.end = parsed.end || this.options.endTime;
          this.log(`Loaded from localStorage: ${saved}`);
        } catch (error) {
          this.error('Error parsing saved time range:', error);
        }
      }
    }

    // Set initial values
    this.domElements.startInput.value = this.formatTime(this.currentValue.start);
    this.domElements.endInput.value = this.formatTime(this.currentValue.end);
  }

  /**
   * Generate HTML for the component
   * @returns {string} - HTML markup
   */
  generateHTML() {
    return `
      <div class="time-range-picker ${this.name}-picker">
        <div class="time-inputs">
          <div class="time-input-group">
            <label for="${this.name}-start">Start Time</label>
            <input type="time" class="start-time-input" id="${this.name}-start">
          </div>
          <div class="time-input-group">
            <label for="${this.name}-end">End Time</label>
            <input type="time" class="end-time-input" id="${this.name}-end">
          </div>
        </div>
        <button type="button" class="format-toggle">${this.options.format === '24h' ? '12h' : '24h'}</button>
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
      startTime: this.currentValue.start,
      endTime: this.currentValue.end,
      format: this.options.format,
      step: this.options.step,
      storageKey: this.options.storageKey,
      isInitialized: this.isInitialized
    };
  }

  /**
   * Clean up component
   */
  cleanupComponent() {
    // Clear any timers or additional resources
    this.currentValue = null;
    this.domElements = {};
  }
}

// Make globally available
window.TimeRangePicker = TimeRangePicker;

// Add to components namespace
if (!window.Components) {
  window.Components = {};
}
window.Components.TimeRangePicker = TimeRangePicker;
