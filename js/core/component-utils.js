/**
 * Component Utilities
 *
 * Shared utility functions for UI components including selectors and inputs.
 * This module centralizes common operations to reduce code duplication and
 * ensure consistent behavior across all components.
 */
window.ComponentUtils = (function () {
  /**
   * Calculate font-adjusted width for an element with specific text
   * @param {string} text - The text to measure
   * @param {string} fontStyle - CSS font specification
   * @returns {number} - The calculated width in pixels
   */
  function measureTextWidth(text, fontStyle = null) {
    // Create a temporary span to measure text width
    const tempSpan = document.createElement("span");
    tempSpan.style.visibility = "hidden";
    tempSpan.style.position = "absolute";
    tempSpan.style.whiteSpace = "nowrap";

    // Apply font style if provided, otherwise use default
    if (fontStyle) {
      tempSpan.style.font = fontStyle;
    } else {
      // Get font style from CSS variables if available
      const fontSize = getComputedStyle(document.documentElement)
        .getPropertyValue("--component-font-size")
        .trim();
      const fontWeight = getComputedStyle(document.documentElement)
        .getPropertyValue("--component-font-weight")
        .trim();

      tempSpan.style.font = `${fontWeight} ${fontSize} Helvetica, Tahoma, sans-serif`;
    }

    // Append to document, measure, then remove
    tempSpan.textContent = text;
    document.body.appendChild(tempSpan);
    const width = tempSpan.offsetWidth;
    document.body.removeChild(tempSpan);

    // Ensure a minimum width
    return Math.max(width, 50);
  }

  /**
   * Find which DOM element the mouse is currently over
   * @param {number} mouseX - Mouse X position
   * @param {NodeList|Array} elements - Elements to check
   * @returns {Element|null} - The element under the mouse or null
   */
  function findElementUnderMouse(mouseX, elements) {
    if (!elements || elements.length === 0) return null;

    let hoveredElement = null;
    elements.forEach((element) => {
      const rect = element.getBoundingClientRect();
      if (mouseX >= rect.left && mouseX <= rect.right) {
        hoveredElement = element;
      }
    });

    return hoveredElement;
  }

  /**
   * Set all elements to equal width based on widest content
   * @param {NodeList|Array} elements - Elements to equalize
   * @returns {number} - The equalized width
   */
  function equalizeElementWidths(elements) {
    if (!elements || elements.length === 0) return 0;

    let maxWidth = 0;

    // First reset any previously set widths to get natural content width
    elements.forEach((element) => {
      element.style.width = "auto";
    });

    // Measure natural width of each element
    elements.forEach((element) => {
      const width = element.offsetWidth;
      maxWidth = Math.max(maxWidth, width);
    });

    // Set all elements to the max width
    elements.forEach((element) => {
      element.style.width = `${maxWidth}px`;
    });

    return maxWidth;
  }

  /**
   * Get CSS variable value from root
   * @param {string} variableName - CSS variable name (without --)
   * @param {string} fallback - Fallback value if variable not found
   * @returns {string} - The variable value or fallback
   */
  function getCSSVariable(variableName, fallback = null) {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(`--${variableName}`)
      .trim();

    return value || fallback;
  }

  /**
   * Create an element with specified attributes and children
   * @param {string} tag - HTML tag name
   * @param {Object} attributes - Key-value pairs of attributes
   * @param {string|Element|Array} children - Child content
   * @returns {Element} - The created element
   */
  function createElement(tag, attributes = {}, children = null) {
    const element = document.createElement(tag);

    // Apply attributes
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === "className") {
        element.className = value;
      } else if (key === "style" && typeof value === "object") {
        Object.assign(element.style, value);
      } else {
        element.setAttribute(key, value);
      }
    });

    // Add children
    if (children) {
      if (Array.isArray(children)) {
        children.forEach((child) => {
          if (typeof child === "string") {
            element.appendChild(document.createTextNode(child));
          } else if (child instanceof Element) {
            element.appendChild(child);
          }
        });
      } else if (typeof children === "string") {
        element.textContent = children;
      } else if (children instanceof Element) {
        element.appendChild(children);
      }
    }

    return element;
  }

  /**
   * Generate unique identifier
   * @param {string} prefix - Optional prefix for the ID
   * @returns {string} - Unique ID
   */
  function generateId(prefix = "component") {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Helper for debouncing function calls
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @returns {Function} - Debounced function
   */
  function debounce(func, wait = 100) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  /**
   * Setup a mutation observer to watch for text changes
   * @param {Element|NodeList} elements - Elements to observe
   * @param {Function} callback - Function to call when changes detected
   * @returns {MutationObserver} - The observer instance
   */
  function observeTextChanges(elements, callback) {
    if (!elements) return null;

    // Convert to array if NodeList
    const elementsArray = NodeList.prototype.isPrototypeOf(elements)
      ? Array.from(elements)
      : [elements];

    // Create observer
    const observer = new MutationObserver((mutations) => {
      let textChanged = false;

      // Check if any mutations changed the text content
      mutations.forEach((mutation) => {
        if (
          mutation.type === "characterData" ||
          mutation.type === "childList"
        ) {
          textChanged = true;
        }
      });

      // Call callback if text changed
      if (textChanged && callback) {
        callback(mutations);
      }
    });

    // Observe each element
    elementsArray.forEach((element) => {
      observer.observe(element, {
        characterData: true,
        childList: true,
        subtree: true,
      });
    });

    return observer;
  }

  /**
   * Add event with automatic cleanup
   * @param {Element} element - Element to attach event to
   * @param {string} eventType - Event type (e.g., "click")
   * @param {Function} handler - Event handler
   * @param {Object} options - Event listener options
   * @returns {Function} - Function to remove the listener
   */
  function addManagedEventListener(element, eventType, handler, options = {}) {
    if (!element) return () => {};

    element.addEventListener(eventType, handler, options);

    // Return removeEventListener function
    return () => element.removeEventListener(eventType, handler, options);
  }

  /**
   * Apply CSS transition with proper timing
   * @param {Element} element - Element to apply transition to
   * @param {Object} properties - CSS properties to change
   * @param {Object} options - Transition options
   * @returns {Promise} - Resolves when transition completes
   */
  function applyTransition(element, properties, options = {}) {
    if (!element) return Promise.reject(new Error("No element provided"));

    const {
      duration = 300,
      easing = "ease",
      delay = 0,
      immediate = false,
    } = options;

    return new Promise((resolve) => {
      if (immediate) {
        // Apply properties immediately without transition
        element.style.transition = "none";
        Object.entries(properties).forEach(([prop, value]) => {
          element.style[prop] = value;
        });

        // Force reflow
        void element.offsetWidth;

        // Restore transition
        setTimeout(() => {
          element.style.transition = "";
          resolve();
        }, 0);
      } else {
        // Set up transition
        element.style.transition = `all ${duration}ms ${easing} ${delay}ms`;

        // Set up transition end handler
        const handleTransitionEnd = (e) => {
          if (e.target === element) {
            element.removeEventListener("transitionend", handleTransitionEnd);
            resolve();
          }
        };

        element.addEventListener("transitionend", handleTransitionEnd);

        // Apply properties
        Object.entries(properties).forEach(([prop, value]) => {
          element.style[prop] = value;
        });

        // Safety timeout in case transitionend doesn't fire
        setTimeout(() => {
          element.removeEventListener("transitionend", handleTransitionEnd);
          resolve();
        }, duration + delay + 50);
      }
    });
  }

  /**
   * Safely get a deeply nested property from an object
   * @param {Object} obj - Object to get property from
   * @param {string} path - Property path (e.g., "a.b.c")
   * @param {*} defaultValue - Default value if property not found
   * @returns {*} - The property value or default
   */
  function getNestedProperty(obj, path, defaultValue = null) {
    if (!obj || !path) return defaultValue;

    const keys = path.split(".");
    let current = obj;

    for (const key of keys) {
      if (
        current === null ||
        current === undefined ||
        typeof current !== "object"
      ) {
        return defaultValue;
      }
      current = current[key];
    }

    return current !== undefined ? current : defaultValue;
  }

  /**
   * Capitalize first letter of a string
   * @param {string} str - String to capitalize
   * @returns {string} - Capitalized string
   */
  function capitalizeFirstLetter(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // Public API
  return {
    measureTextWidth,
    findElementUnderMouse,
    equalizeElementWidths,
    getCSSVariable,
    createElement,
    generateId,
    debounce,
    observeTextChanges,
    addManagedEventListener,
    applyTransition,
    getNestedProperty,
    capitalizeFirstLetter,
  };
})();
