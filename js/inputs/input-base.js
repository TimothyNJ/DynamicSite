/**
 * Input Base Class
 *
 * This abstract base class provides common functionality for all input fields.
 */
class InputBase {
    /**
     * Create a new input field
     * @param {string} id - ID for the input element
     * @param {string} name - Name for the input field
     * @param {Object} options - Configuration options
     */
    constructor(id, name, options = {}) {
      this.id = id;
      this.name = name;
      this.options = Object.assign(
        {
          storageKey: `user${this.capitalizeFirstLetter(name)}`,
          type: 'text',
          placeholder: '',
          required: false
        },
        options
      );
  
      // Bind methods
      this.init = this.init.bind(this);
      this.getValue = this.getValue.bind(this);
      this.setValue = this.setValue.bind(this);
    }
  
    /**
     * Helper to capitalize first letter
     * @param {string} str - The string to capitalize
     * @returns {string} - The string with first letter capitalized
     */
    capitalizeFirstLetter(str) {
      return str.charAt(0).toUpperCase() + str.slice(1);
    }
  
    /**
     * Initialize the input field
     * This is called after DOM is loaded
     * @returns {boolean} - Success status
     */
    init() {
      // Find input element in DOM
      this.element = document.getElementById(this.id);
      if (!this.element) {
        console.log(`Input element with ID "${this.id}" not found`);
        return false;
      }
  
      // Set up event listeners
      this.element.addEventListener('change', this.handleChange.bind(this));
      
      // Apply stored value if available
      this.applyStoredValue();
      
      return true;
    }
  
    /**
     * Apply stored value from localStorage
     */
    applyStoredValue() {
      const storedValue = localStorage.getItem(this.options.storageKey);
      if (storedValue) {
        this.setValue(storedValue);
      }
    }
  
    /**
     * Handle change event
     * @param {Event} event - Change event
     */
    handleChange(event) {
      const value = event.target.value;
      this.saveValue(value);
    }
  
    /**
     * Save value to localStorage
     * @param {string} value - Value to save
     */
    saveValue(value) {
      localStorage.setItem(this.options.storageKey, value);
    }
  
    /**
     * Get current value
     * @returns {string} - Current value
     */
    getValue() {
      return this.element ? this.element.value : '';
    }
  
    /**
     * Set value
     * @param {string} value - Value to set
     */
    setValue(value) {
      if (this.element) {
        this.element.value = value;
      }
    }
  
    /**
     * Generate HTML for this input
     * @returns {string} - HTML markup
     */
    generateHTML() {
      return `
        <input
          type="${this.options.type}"
          id="${this.id}"
          name="${this.name}"
          class="text-input"
          placeholder="${this.options.placeholder}"
          ${this.options.required ? 'required' : ''}
        />
      `;
    }
  }
  
  // Make available globally
  window.InputBase = InputBase;