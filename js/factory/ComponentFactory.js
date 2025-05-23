/**
 * ComponentFactory - Engine-Based Component Management
 * 
 * Updated factory to work with component-type-specific engines.
 * Focuses on slider_component_engine for Phase 1 implementation.
 * 
 * Date: 21-May-2025 23:44  
 * Deployment Timestamp: 20250521234420
 */

class ComponentFactory {
  constructor() {
    this.sliderInstances = new Map();
    this.initialized = false;
    
    console.log('[ComponentFactory] Factory initialized for engine-based components [Deployment: 20250521234420]');
  }

  /**
   * Create a slider using slider_component_engine
   * 
   * @param {Object} config - Slider configuration
   * @param {Function} handler - Selection callback function
   * @returns {Object} Slider engine instance
   */
  createSlider(config, handler) {
    console.log(`[ComponentFactory] STEP 1: Creating slider: ${config.sliderClass}`);
    console.log(`[ComponentFactory] STEP 2: Container ID: ${config.containerId}`);
    console.log(`[ComponentFactory] STEP 3: Options count: ${config.options ? config.options.length : 0}`);
    
    if (!window.slider_component_engine) {
      console.error('[ComponentFactory] ERROR: slider_component_engine not available');
      return null;
    }
    console.log('[ComponentFactory] STEP 4: slider_component_engine is available');

    try {
      console.log('[ComponentFactory] STEP 5: Creating new slider_component_engine instance...');
      const sliderEngine = new window.slider_component_engine(config, handler);
      console.log('[ComponentFactory] STEP 6: Engine instance created successfully');
      
      console.log('[ComponentFactory] STEP 7: Calling engine.init()...');
      const initResult = sliderEngine.init();
      console.log(`[ComponentFactory] STEP 8: engine.init() returned: ${initResult}`);
      
      if (initResult) {
        console.log('[ComponentFactory] STEP 9: Adding to sliderInstances map...');
        this.sliderInstances.set(config.sliderClass, sliderEngine);
        console.log(`[ComponentFactory] STEP 10: Slider created successfully: ${config.sliderClass}`);
        return sliderEngine;
      } else {
        console.error(`[ComponentFactory] ERROR: engine.init() returned false for: ${config.sliderClass}`);
        return null;
      }
    } catch (error) {
      console.error('[ComponentFactory] ERROR: Exception during slider creation:', error);
      console.error('[ComponentFactory] Stack trace:', error.stack);
      return null;
    }
  }

  /**
   * Create theme selector using slider_component_engine
   */
  createThemeSelector(containerId = 'theme-selector-container') {
    console.log(`[ComponentFactory] createThemeSelector called with containerId: ${containerId}`);
    
    // Check if container exists
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`[ComponentFactory] ERROR: Container '${containerId}' not found in DOM`);
      return null;
    }
    console.log(`[ComponentFactory] Container found. Current innerHTML length: ${container.innerHTML.length}`);
    
    const config = {
      containerId: containerId,
      sliderClass: 'theme-selector',
      options: [
        { 
          text: 'Dark', 
          value: 'dark', 
          position: 1, 
          dataAttributes: 'data-theme="dark"',
          active: true // Default active
        },
        { 
          text: 'System', 
          value: 'system', 
          position: 2, 
          dataAttributes: 'data-theme="system"'
        },
        { 
          text: 'Light', 
          value: 'light', 
          position: 3, 
          dataAttributes: 'data-theme="light"'
        }
      ]
    };

    const handler = (selectedOption) => {
      const themeName = selectedOption.getAttribute('data-theme') || 
                       selectedOption.querySelector('h3').textContent.toLowerCase();
      
      console.log(`[ComponentFactory] Theme selected: ${themeName}`);
      
      // Apply theme (simplified version of main branch logic)
      this.applyTheme(themeName);
      
      // Save to localStorage
      localStorage.setItem('userThemePreference', themeName);
    };

    return this.createSlider(config, handler);
  }

  /**
   * Create time format selector using slider_component_engine
   */
  createTimeFormatSelector(containerId = 'time-format-selector-container') {
    const config = {
      containerId: containerId,
      sliderClass: 'time-format-selector',
      options: [
        { 
          text: this.formatCurrentTime(true), // 24h format
          value: '24', 
          position: 1, 
          dataAttributes: 'data-format="24"'
        },
        { 
          text: 'System', 
          value: 'system', 
          position: 2, 
          dataAttributes: 'data-format="system"',
          active: true // Default active
        },
        { 
          text: this.formatCurrentTime(false), // 12h format
          value: '12', 
          position: 3, 
          dataAttributes: 'data-format="12"'
        }
      ]
    };

    const handler = (selectedOption) => {
      const formatName = selectedOption.getAttribute('data-format');
      
      console.log(`[ComponentFactory] Time format selected: ${formatName}`);
      
      // Apply time format
      this.applyTimeFormat(formatName);
      
      // Save to localStorage
      localStorage.setItem('userTimeFormatPreference', formatName);
    };

    const sliderEngine = this.createSlider(config, handler);
    
    // Set up live time updates for time format selector
    if (sliderEngine) {
      this.setupLiveTimeUpdates(sliderEngine);
    }
    
    return sliderEngine;
  }

  /**
   * Format current time (from main branch time-format-slider.js)
   */
  formatCurrentTime(use24Hour = false) {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, "0");

    if (use24Hour) {
      hours = hours.toString().padStart(2, "0");
      return `24h ${hours}:${minutes}`;
    } else {
      const period = hours >= 12 ? "pm" : "am";
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `12h ${hours}:${minutes}${period}`;
    }
  }

  /**
   * Setup live time updates for time format selector
   */
  setupLiveTimeUpdates(sliderEngine) {
    const updateTimeDisplay = () => {
      const timeSelector = document.querySelector('.time-format-selector');
      if (!timeSelector) return;

      const option24h = timeSelector.querySelector('.option[data-format="24"] h3');
      const option12h = timeSelector.querySelector('.option[data-format="12"] h3');

      if (option24h) {
        option24h.textContent = this.formatCurrentTime(true);
      }

      if (option12h) {
        option12h.textContent = this.formatCurrentTime(false);
      }
    };

    // Update every second
    setInterval(updateTimeDisplay, 1000);
    
    console.log('[ComponentFactory] Live time updates started for time format selector');
  }

  /**
   * Apply theme (simplified from main branch theme-slider.js)
   */
  applyTheme(themeName) {
    console.log(`[ComponentFactory] Applying theme: ${themeName}`);
    const body = document.body;

    if (themeName === "light") {
      body.setAttribute("data-theme", "light");
      body.style.backgroundImage = "linear-gradient(-25deg, var(--light-page-start) 0%, var(--light-page-end) 100%)";
    } else if (themeName === "dark") {
      body.setAttribute("data-theme", "dark");
      body.style.backgroundImage = "linear-gradient(-25deg, var(--dark-page-start) 0%, var(--dark-page-end) 100%)";
    } else if (themeName === "system") {
      const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      this.applyTheme(prefersDark ? "dark" : "light");
    }
  }

  /**
   * Apply time format (simplified from main branch time-format-slider.js)
   */
  applyTimeFormat(formatName) {
    console.log(`[ComponentFactory] Applying time format: ${formatName}`);
    
    // In a full implementation, this would update time displays throughout the app
    // For now, just log the change
    if (formatName === "24") {
      console.log('[ComponentFactory] Using 24-hour time format');
    } else if (formatName === "12") {
      console.log('[ComponentFactory] Using 12-hour time format');
    } else if (formatName === "system") {
      console.log('[ComponentFactory] Using system time format');
    }
  }

  /**
   * Initialize all sliders based on available containers
   */
  initializeAll() {
    console.log('[ComponentFactory] Initializing all available slider components');
    
    const results = [];
    
    // Check for theme selector container
    if (document.getElementById('theme-selector-container')) {
      const themeSlider = this.createThemeSelector();
      results.push({ type: 'theme', success: !!themeSlider });
    }
    
    // Check for time format selector container
    if (document.getElementById('time-format-selector-container')) {
      const timeSlider = this.createTimeFormatSelector();
      results.push({ type: 'time-format', success: !!timeSlider });
    }
    
    this.initialized = true;
    console.log(`[ComponentFactory] Initialization complete. Results:`, results);
    
    return results;
  }

  /**
   * Get slider instance by class name
   */
  getSlider(sliderClass) {
    return this.sliderInstances.get(sliderClass);
  }

  /**
   * Destroy all slider instances
   */
  destroyAll() {
    console.log('[ComponentFactory] Destroying all slider instances');
    
    this.sliderInstances.forEach((slider, className) => {
      slider.destroy();
    });
    
    this.sliderInstances.clear();
    this.initialized = false;
  }

  /**
   * Get factory status and instance count
   */
  getStatus() {
    return {
      initialized: this.initialized,
      sliderCount: this.sliderInstances.size,
      sliders: Array.from(this.sliderInstances.keys())
    };
  }
}

// Create global factory instance
window.ComponentFactory = new ComponentFactory();

console.log('[ComponentFactory] Engine-based ComponentFactory loaded [Deployment: 20250521234420]');
