/**
 * ComponentFactory - Engine-Based Component Management
 * 
 * Updated factory to work with component-type-specific engines.
 * Focuses on slider_component_engine for Phase 1 implementation.
 * 
 * Date: 21-May-2025 23:44  
 * Deployment Timestamp: 20250522201023
 */

import { slider_component_engine } from '../engines/slider_component_engine.js';
import { text_input_component_engine } from '../engines/text_input_component_engine.js';
import { button_component_engine } from '../engines/button_component_engine.js';
import { multi_select_component_engine } from '../engines/multi_select_component_engine.js';
import { file_upload_input_component_engine } from '../engines/file_upload_input_component_engine.js';
import { wheel_time_selector_component_engine } from '../engines/wheel_time_selector_component_engine.js';
import { wheel_date_picker_component_engine } from '../engines/wheel_date_picker_component_engine.js';
import { calendar_picker_component_engine } from '../engines/calendar_picker_component_engine.js';
import { ThreeD_component_engine } from '../engines/threed_component_engine.js';

import { wheel_selector_component_engine } from '../engines/wheel_selector_component_engine.js';
import { custom_wheel_selector_engine } from '../engines/custom_wheel_selector_engine.js';
import { ios_drum_wheel_engine } from '../engines/ios_drum_wheel_engine.js';


class ComponentFactory {
  constructor() {
    this.sliderInstances = new Map();
    this.textInputInstances = new Map();
    this.buttonInstances = new Map();
    this.multiSelectInstances = new Map();
    this.fileUploadInstances = new Map();
    this.wheelTimeInstances = new Map();
    this.wheelDateInstances = new Map();
    this.calendarInstances = new Map();
    this.wheelSelectorInstances = new Map();
    this.customWheelInstances = new Map();

    this.initialized = false;
    
    console.log('[ComponentFactory] Factory initialized for engine-based components');
  }

  /**
   * Create a 3D object component
   * @param {string} containerId - ID of the container element
   * @param {Object} config - Configuration for the 3D object
   * @returns {threed_component_engine} The 3D component instance
   */
  create3DObject(containerId, config = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`[ComponentFactory] Container ${containerId} not found`);
      return null;
    }
    
    // Check if Three.js is loaded
    if (typeof THREE === 'undefined') {
      console.error('[ComponentFactory] Three.js not loaded. Add Three.js script before using 3D components.');
      return null;
    }
    
    console.log('[ComponentFactory] Creating 3D object with config:', config);
    
    const threeDObject = new ThreeD_component_engine(container, config);
    threeDObject.init();
    
    return threeDObject;
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
    
    if (!slider_component_engine) {
      console.error('[ComponentFactory] ERROR: slider_component_engine not available');
      return null;
    }
    console.log('[ComponentFactory] STEP 4: slider_component_engine is available');

    try {
      console.log('[ComponentFactory] STEP 5: Creating new slider_component_engine instance...');
      const sliderEngine = new slider_component_engine(config, handler);
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
      // Background is now handled by CSS pseudo-element
    } else if (themeName === "dark") {
      body.setAttribute("data-theme", "dark");
      // Background is now handled by CSS pseudo-element
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
   * Create a text input using text_input_component_engine
   * 
   * @param {string} containerId - Container element ID
   * @param {Object} options - Input configuration options
   * @param {Function} changeHandler - Change callback function
   * @returns {Object} Text input engine instance
   */
  createTextInput(containerId, options = {}, changeHandler = null) {
    console.log(`[ComponentFactory] Creating text input in container: ${containerId}`);
    
    if (!text_input_component_engine) {
      console.error('[ComponentFactory] ERROR: text_input_component_engine not available');
      return null;
    }
    
    try {
      // Extract onChange from options for backward compatibility
      const handler = changeHandler || options.onChange || null;
      
      // Create clean options without onChange to maintain separation of concerns
      const cleanOptions = { ...options };
      delete cleanOptions.onChange;
      
      // Pass handler as second parameter as expected by the engine
      const textInputEngine = new text_input_component_engine(cleanOptions, handler);
      const element = textInputEngine.render(containerId);
      
      if (element) {
        const key = options.id || containerId;
        this.textInputInstances.set(key, textInputEngine);
        console.log(`[ComponentFactory] Text input created successfully: ${key}`);
        return textInputEngine;
      } else {
        console.error(`[ComponentFactory] Failed to render text input in: ${containerId}`);
        return null;
      }
    } catch (error) {
      console.error('[ComponentFactory] Error creating text input:', error);
      return null;
    }
  }

  /**
   * Create first name input
   */
  createFirstNameInput(containerId = 'first-name-container') {
    return this.createTextInput(containerId, {
      id: 'first-name',
      name: 'firstName',
      placeholder: 'Enter first name',
      storageKey: 'userFirstName',
      required: false,
      expandable: true
    });
  }

  /**
   * Create last name input
   */
  createLastNameInput(containerId = 'last-name-container') {
    return this.createTextInput(containerId, {
      id: 'last-name',
      name: 'lastName',
      placeholder: 'Enter last name',
      storageKey: 'userLastName',
      required: false,
      expandable: true
    });
  }

  /**
   * Create nickname input
   */
  createNicknameInput(containerId = 'nickname-container') {
    return this.createTextInput(containerId, {
      id: 'nickname',
      name: 'nickname',
      placeholder: 'Enter nickname (optional)',
      storageKey: 'userNickname',
      required: false,
      expandable: true
    });
  }

  /**
   * Create email input
   */
  createEmailInput(containerId = 'email-container') {
    return this.createTextInput(containerId, {
      id: 'email',
      name: 'email',
      type: 'email',
      placeholder: 'Enter email',
      storageKey: 'userEmail',
      required: true
    });
  }

  /**
   * Create phone input
   */
  createPhoneInput(containerId = 'phone-container') {
    return this.createTextInput(containerId, {
      id: 'phone',
      name: 'phone',
      type: 'tel',
      placeholder: 'Enter phone number',
      storageKey: 'userPhone',
      required: false
    });
  }

  /**
   * Create notes/bio input (example of larger starting size)
   */
  createNotesInput(containerId = 'notes-container') {
    return this.createTextInput(containerId, {
      id: 'notes',
      name: 'notes',
      placeholder: 'Enter notes or bio...',
      storageKey: 'userNotes',
      required: false,
      expandable: true,
      multiline: true,
      minHeight: '80px', // Start larger for multi-line content
      maxHeight: '300px'
    });
  }

  /**
   * Create a button using button_component_engine
   * 
   * @param {string} containerId - Container element ID
   * @param {Object} options - Button configuration options
   * @param {Function} clickHandler - Click callback function
   * @returns {Object} Button engine instance
   */
  createButton(containerId, options = {}, clickHandler = null) {
    console.log(`[ComponentFactory] Creating button in container: ${containerId}`);
    
    if (!button_component_engine) {
      console.error('[ComponentFactory] ERROR: button_component_engine not available');
      return null;
    }
    
    try {
      // Extract onClick from options for backward compatibility
      const handler = clickHandler || options.onClick || null;
      
      // Create clean options without onClick to maintain separation of concerns
      const cleanOptions = { ...options };
      delete cleanOptions.onClick;
      
      // Pass handler as second parameter as expected by the engine
      const buttonEngine = new button_component_engine(cleanOptions, handler);
      const element = buttonEngine.render(containerId);
      
      if (element) {
        const key = options.id || containerId;
        this.buttonInstances.set(key, buttonEngine);
        console.log(`[ComponentFactory] Button created successfully: ${key}`);
        return buttonEngine;
      } else {
        console.error(`[ComponentFactory] Failed to render button in: ${containerId}`);
        return null;
      }
    } catch (error) {
      console.error('[ComponentFactory] Error creating button:', error);
      return null;
    }
  }

  /**
   * Create submit button
   */
  createSubmitButton(containerId = 'submit-button-container', clickHandler) {
    return this.createButton(containerId, {
      id: 'submit-button',
      text: 'Submit',
      value: 'submit',
      type: 'primary',
      active: false
    }, clickHandler);
  }

  /**
   * Create cancel button
   */
  createCancelButton(containerId = 'cancel-button-container', clickHandler) {
    return this.createButton(containerId, {
      id: 'cancel-button',
      text: 'Cancel',
      value: 'cancel',
      type: 'secondary',
      active: false
    }, clickHandler);
  }

  /**
   * Create delete button
   */
  createDeleteButton(containerId = 'delete-button-container', clickHandler) {
    return this.createButton(containerId, {
      id: 'delete-button',
      text: 'Delete',
      value: 'delete',
      type: 'danger',
      active: false
    }, clickHandler);
  }

  /**
   * Create icon button example
   */
  createSaveButton(containerId = 'save-button-container', clickHandler) {
    return this.createButton(containerId, {
      id: 'save-button',
      text: 'Save',
      value: 'save',
      type: 'primary',
      icon: '💾',
      active: false
    }, clickHandler);
  }

  /**
   * Create a multi-select using multi_select_component_engine
   * 
   * @param {string} containerId - Container element ID
   * @param {Object} config - Multi-select configuration
   * @param {Function} changeHandler - Change callback function
   * @returns {Object} Multi-select engine instance
   */
  createMultiSelect(containerId, config, changeHandler) {
    console.log(`[ComponentFactory] Creating multi-select in container: ${containerId}`);
    
    if (!multi_select_component_engine) {
      console.error('[ComponentFactory] ERROR: multi_select_component_engine not available');
      return null;
    }
    
    try {
      const multiSelectEngine = new multi_select_component_engine(config, changeHandler);
      const success = multiSelectEngine.init(containerId);
      
      if (success) {
        const key = config.id || config.containerClass || containerId;
        this.multiSelectInstances.set(key, multiSelectEngine);
        console.log(`[ComponentFactory] Multi-select created successfully: ${key}`);
        return multiSelectEngine;
      } else {
        console.error(`[ComponentFactory] Failed to initialize multi-select in: ${containerId}`);
        return null;
      }
    } catch (error) {
      console.error('[ComponentFactory] Error creating multi-select:', error);
      return null;
    }
  }

  /**
   * Create notification preferences multi-select
   */
  createNotificationPreferences(containerId = 'notification-preferences-container') {
    const config = {
      id: 'notification-preferences',
      containerClass: 'notification-selector',
      options: [
        { value: 'email', text: 'Email', icon: '📧' },
        { value: 'phone', text: 'Phone', icon: '📱' },
        { value: 'sms', text: 'SMS', icon: '💬' },
        { value: 'push', text: 'Push', icon: '🔔' }
      ],
      selectedValues: ['email'], // Default to email
      storageKey: 'userNotificationPreferences',
      minSelection: 1 // At least one method required
    };
    
    const handler = (selectedValues, toggledValue, isSelected) => {
      console.log(`[ComponentFactory] Notification preferences updated:`, selectedValues);
      if (toggledValue) {
        console.log(`[ComponentFactory] ${toggledValue} ${isSelected ? 'enabled' : 'disabled'}`);
      }
    };
    
    return this.createMultiSelect(containerId, config, handler);
  }

  /**
   * Create days of week multi-select
   */
  createDaysOfWeek(containerId = 'days-of-week-container') {
    const config = {
      id: 'days-of-week',
      containerClass: 'days-selector',
      options: [
        { value: 'mon', text: 'Mon' },
        { value: 'tue', text: 'Tue' },
        { value: 'wed', text: 'Wed' },
        { value: 'thu', text: 'Thu' },
        { value: 'fri', text: 'Fri' },
        { value: 'sat', text: 'Sat' },
        { value: 'sun', text: 'Sun' }
      ],
      selectedValues: ['mon', 'tue', 'wed', 'thu', 'fri'], // Weekdays default
      storageKey: 'userWorkDays'
    };
    
    const handler = (selectedValues) => {
      console.log(`[ComponentFactory] Work days updated:`, selectedValues);
    };
    
    return this.createMultiSelect(containerId, config, handler);
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

  /**
   * Create a file upload using file_upload_input_component_engine
   * 
   * @param {string} containerId - Container element ID
   * @param {Object} options - File upload configuration options
   * @param {Function} changeHandler - Change callback function
   * @returns {Object} File upload engine instance
   */
  createFileUpload(containerId, options = {}, changeHandler = null) {
    console.log(`[ComponentFactory] Creating file upload in container: ${containerId}`);
    
    if (!file_upload_input_component_engine) {
      console.error('[ComponentFactory] ERROR: file_upload_input_component_engine not available');
      return null;
    }
    
    try {
      const fileUploadEngine = new file_upload_input_component_engine(options, changeHandler);
      const element = fileUploadEngine.render(containerId);
      
      if (element) {
        const key = options.id || containerId;
        this.fileUploadInstances.set(key, fileUploadEngine);
        console.log(`[ComponentFactory] File upload created successfully: ${key}`);
        return fileUploadEngine;
      } else {
        console.error(`[ComponentFactory] Failed to render file upload in: ${containerId}`);
        return null;
      }
    } catch (error) {
      console.error('[ComponentFactory] Error creating file upload:', error);
      return null;
    }
  }

  /**
   * Create profile picture upload
   */
  createProfilePictureUpload(containerId = 'profile-picture-container', changeHandler) {
    return this.createFileUpload(containerId, {
      id: 'profile-picture',
      text: 'Upload Profile Picture',
      acceptedFiles: 'image/*',
      multiple: false,
      maxSize: 5 * 1024 * 1024, // 5MB
      icon: '📷'
    }, changeHandler);
  }

  /**
   * Create document upload
   */
  createDocumentUpload(containerId = 'document-upload-container', changeHandler) {
    return this.createFileUpload(containerId, {
      id: 'document-upload',
      text: 'Drag & Drop Documents or Click to Browse',
      acceptedFiles: '.pdf,.doc,.docx,.txt',
      multiple: true,
      maxFiles: 10,
      maxSize: 10 * 1024 * 1024, // 10MB
      icon: '📄'
    }, changeHandler);
  }

  /**
   * Create CSV upload
   */
  createCSVUpload(containerId = 'csv-upload-container', changeHandler) {
    return this.createFileUpload(containerId, {
      id: 'csv-upload',
      text: 'Upload CSV File',
      acceptedFiles: '.csv,text/csv',
      multiple: false,
      maxSize: 50 * 1024 * 1024, // 50MB
      icon: '📊'
    }, changeHandler);
  }

  /**
   * Create general file upload
   */
  createGeneralFileUpload(containerId = 'file-upload-container', changeHandler) {
    return this.createFileUpload(containerId, {
      id: 'general-upload',
      text: 'Drag & Drop To Upload or Select to Browse',
      acceptedFiles: '*', // Accept all files
      multiple: true,
      maxFiles: 20,
      maxSize: 100 * 1024 * 1024, // 100MB
      icon: '📁'
    }, changeHandler);
  }

  /**
   * Create a wheel time selector using wheel_time_selector_component_engine
   * 
   * @param {string} containerId - Container element ID
   * @param {Object} config - Configuration options
   * @returns {Object} Wheel time selector engine instance
   */
  createWheelTimeSelector(containerId, config = {}) {
    console.log(`[ComponentFactory] Creating wheel time selector in container: ${containerId}`);
    
    if (!wheel_time_selector_component_engine) {
      console.error('[ComponentFactory] ERROR: wheel_time_selector_component_engine not available');
      return null;
    }
    
    try {
      const container = document.getElementById(containerId);
      if (!container) {
        console.error(`[ComponentFactory] Container not found: ${containerId}`);
        return null;
      }
      
      const wheelTimeEngine = new wheel_time_selector_component_engine(container, config.id || containerId, config);
      const key = config.id || containerId;
      this.wheelTimeInstances.set(key, wheelTimeEngine);
      console.log(`[ComponentFactory] Wheel time selector created successfully: ${key}`);
      return wheelTimeEngine;
    } catch (error) {
      console.error('[ComponentFactory] Error creating wheel time selector:', error);
      return null;
    }
  }

  /**
   * Create morning work hours selector
   */
  createMorningHoursSelector(containerId = 'morning-hours-container') {
    return this.createWheelTimeSelector(containerId, {
      id: 'morning-hours',
      label: 'Morning Hours',
      defaultTime: { hours: 9, minutes: 0 },
      onChange: (time) => {
        console.log('[ComponentFactory] Morning hours selected:', time);
        localStorage.setItem('userMorningStartTime', JSON.stringify(time));
      }
    });
  }

  /**
   * Create afternoon work hours selector
   */
  createAfternoonHoursSelector(containerId = 'afternoon-hours-container') {
    return this.createWheelTimeSelector(containerId, {
      id: 'afternoon-hours',
      label: 'Afternoon Hours',
      defaultTime: { hours: 17, minutes: 0 },
      onChange: (time) => {
        console.log('[ComponentFactory] Afternoon hours selected:', time);
        localStorage.setItem('userAfternoonEndTime', JSON.stringify(time));
      }
    });
  }

  /**
   * Create meeting time selector
   */
  createMeetingTimeSelector(containerId = 'meeting-time-container') {
    return this.createWheelTimeSelector(containerId, {
      id: 'meeting-time',
      label: 'Meeting Time',
      minuteInterval: 15, // 15-minute intervals
      onChange: (time) => {
        console.log('[ComponentFactory] Meeting time selected:', time);
      }
    });
  }

  /**
   * Create a wheel date picker using wheel_date_picker_component_engine
   * 
   * @param {string} containerId - Container element ID
   * @param {Object} config - Configuration options
   * @returns {Object} Wheel date picker engine instance
   */
  createWheelDatePicker(containerId, config = {}) {
    console.log(`[ComponentFactory] Creating wheel date picker in container: ${containerId}`);
    
    if (!wheel_date_picker_component_engine) {
      console.error('[ComponentFactory] ERROR: wheel_date_picker_component_engine not available');
      return null;
    }
    
    try {
      const container = document.getElementById(containerId);
      if (!container) {
        console.error(`[ComponentFactory] Container not found: ${containerId}`);
        return null;
      }
      
      const wheelDateEngine = new wheel_date_picker_component_engine(container, config.id || containerId, config);
      const key = config.id || containerId;
      this.wheelDateInstances.set(key, wheelDateEngine);
      console.log(`[ComponentFactory] Wheel date picker created successfully: ${key}`);
      return wheelDateEngine;
    } catch (error) {
      console.error('[ComponentFactory] Error creating wheel date picker:', error);
      return null;
    }
  }

  /**
   * Create birthdate picker
   */
  createBirthdatePicker(containerId = 'birthdate-container') {
    const today = new Date();
    const minYear = today.getFullYear() - 100;
    const maxYear = today.getFullYear() - 13; // Minimum age 13
    
    return this.createWheelDatePicker(containerId, {
      id: 'birthdate',
      label: 'Date of Birth',
      format: 'DD-MMM-YYYY', // 22-May-2025 format
      yearRange: { min: minYear, max: maxYear },
      defaultDate: new Date(maxYear - 25, 0, 1), // Default to ~38 years old
      onChange: (date) => {
        console.log('[ComponentFactory] Birthdate selected:', date);
        localStorage.setItem('userBirthdate', date.toISOString());
      }
    });
  }

  /**
   * Create project deadline picker
   */
  createDeadlinePicker(containerId = 'deadline-container') {
    return this.createWheelDatePicker(containerId, {
      id: 'deadline',
      label: 'Project Deadline',
      format: 'YYYY-MM-DD', // 2025-05-22 format
      minDate: new Date(), // Can't select past dates
      onChange: (date) => {
        console.log('[ComponentFactory] Deadline selected:', date);
      }
    });
  }

  /**
   * Create expiry date picker
   */
  createExpiryDatePicker(containerId = 'expiry-date-container') {
    return this.createWheelDatePicker(containerId, {
      id: 'expiry-date',
      label: 'Expiry Date',
      format: 'DD-MM-YYYY', // 22-05-2025 format
      minDate: new Date(),
      onChange: (date) => {
        console.log('[ComponentFactory] Expiry date selected:', date);
      }
    });
  }

  /**
   * Create a calendar picker using calendar_picker_component_engine
   * 
   * @param {string} containerId - Container element ID
   * @param {Object} config - Configuration options
   * @returns {Object} Calendar picker engine instance
   */
  createCalendarPicker(containerId, config = {}) {
    console.log(`[ComponentFactory] Creating calendar picker in container: ${containerId}`);
    
    if (!calendar_picker_component_engine) {
      console.error('[ComponentFactory] ERROR: calendar_picker_component_engine not available');
      return null;
    }
    
    try {
      const container = document.getElementById(containerId);
      if (!container) {
        console.error(`[ComponentFactory] Container not found: ${containerId}`);
        return null;
      }
      
      const calendarEngine = new calendar_picker_component_engine(container, config.id || containerId, config);
      const key = config.id || containerId;
      this.calendarInstances.set(key, calendarEngine);
      console.log(`[ComponentFactory] Calendar picker created successfully: ${key}`);
      return calendarEngine;
    } catch (error) {
      console.error('[ComponentFactory] Error creating calendar picker:', error);
      return null;
    }
  }

  /**
   * Create appointment date picker
   */
  createAppointmentPicker(containerId = 'appointment-container') {
    return this.createCalendarPicker(containerId, {
      id: 'appointment-date',
      label: 'Select Appointment Date',
      minDate: new Date(), // Can't book past appointments
      expandable: true,
      onChange: (date) => {
        console.log('[ComponentFactory] Appointment date selected:', date);
        localStorage.setItem('selectedAppointmentDate', date.toISOString());
      },
      onExpand: (expanded) => {
        console.log('[ComponentFactory] Calendar expanded:', expanded);
      }
    });
  }

  /**
   * Create vacation date range picker
   */
  createVacationPicker(containerId = 'vacation-container') {
    return this.createCalendarPicker(containerId, {
      id: 'vacation-dates',
      label: 'Vacation Dates',
      expandable: true,
      monthsToShow: 3, // Show 3 months when expanded
      onChange: (date) => {
        console.log('[ComponentFactory] Vacation date selected:', date);
      }
    });
  }

  /**
   * Create task due date picker
   */
  createTaskDueDatePicker(containerId = 'task-due-date-container') {
    return this.createCalendarPicker(containerId, {
      id: 'task-due-date',
      label: 'Task Due Date',
      minDate: new Date(),
      expandable: false, // Single month view only
      onChange: (date) => {
        console.log('[ComponentFactory] Task due date selected:', date);
      }
    });
  }

  /**
   * Create a wheel selector using custom_wheel_selector_engine
   * 
   * @param {string} containerId - Container element ID
   * @param {Object} config - Configuration options
   * @returns {Object} Wheel selector engine instance
   */
  createWheelSelector(containerId, config = {}) {
    console.log(`[ComponentFactory] Creating iOS drum wheel selector in container: ${containerId}`);
    
    if (!ios_drum_wheel_engine) {
      console.error('[ComponentFactory] ERROR: ios_drum_wheel_engine not available');
      return null;
    }
    
    try {
      // Extract onChange from config for backward compatibility
      const handler = config.onChange || null;
      
      // Create clean options without onChange to maintain separation of concerns
      const cleanOptions = { ...config };
      delete cleanOptions.onChange;
      
      // Pass handler as second parameter as expected by the engine
      const wheelSelectorEngine = new ios_drum_wheel_engine(cleanOptions, handler);
      const element = wheelSelectorEngine.render(containerId);
      
      if (element) {
        const key = config.id || containerId;
        this.customWheelInstances.set(key, wheelSelectorEngine);
        console.log(`[ComponentFactory] iOS drum wheel selector created successfully: ${key}`);
        return wheelSelectorEngine;
      } else {
        console.error(`[ComponentFactory] Failed to render iOS drum wheel selector in: ${containerId}`);
        return null;
      }
    } catch (error) {
      console.error('[ComponentFactory] Error creating iOS drum wheel selector:', error);
      return null;
    }
  }

  /**
   * Create language selector dropdown
   */
  createLanguageSelector(containerId = 'language-selector-container') {
    return this.createWheelSelector(containerId, {
      id: 'language-selector',
      label: 'Language',
      options: [
        { value: 'en-UK', text: 'UK English', icon: '🇬🇧' },
        { value: 'en-US', text: 'US English', icon: '🇺🇸' },
        { value: 'es', text: 'Español', icon: '🇪🇸' },
        { value: 'fr', text: 'Français', icon: '🇫🇷' },
        { value: 'de', text: 'Deutsch', icon: '🇩🇪' },
        { value: 'it', text: 'Italiano', icon: '🇮🇹' },
        { value: 'pt', text: 'Português', icon: '🇵🇹' },
        { value: 'ja', text: '日本語', icon: '🇯🇵' },
        { value: 'ko', text: '한국어', icon: '🇰🇷' },
        { value: 'zh', text: '中文', icon: '🇨🇳' }
      ],
      defaultValue: 'en-UK',
      storageKey: 'userLanguagePreference',
      onChange: (value, option) => {
        console.log('[ComponentFactory] Language selected:', value);
      }
    });
  }

  /**
   * Create timezone selector dropdown
   */
  createTimezoneSelector(containerId = 'timezone-selector-container') {
    return this.createWheelSelector(containerId, {
      id: 'timezone-selector',
      label: 'Time Zone',
      icon: '🌍',
      options: [
        { value: 'system', text: 'System Time Zone' },
        { value: 'UTC', text: 'UTC (Coordinated Universal Time)' },
        { value: 'America/New_York', text: 'New York (EST/EDT)' },
        { value: 'America/Chicago', text: 'Chicago (CST/CDT)' },
        { value: 'America/Denver', text: 'Denver (MST/MDT)' },
        { value: 'America/Los_Angeles', text: 'Los Angeles (PST/PDT)' },
        { value: 'Europe/London', text: 'London (GMT/BST)' },
        { value: 'Europe/Paris', text: 'Paris (CET/CEST)' },
        { value: 'Asia/Tokyo', text: 'Tokyo (JST)' },
        { value: 'Asia/Shanghai', text: 'Shanghai (CST)' },
        { value: 'Australia/Sydney', text: 'Sydney (AEST/AEDT)' }
      ],
      defaultValue: 'system',
      storageKey: 'userTimezonePreference',
      onChange: (value) => {
        console.log('[ComponentFactory] Timezone selected:', value);
      }
    });
  }

  /**
   * Create currency selector dropdown
   */
  createCurrencySelector(containerId = 'currency-selector-container') {
    return this.createWheelSelector(containerId, {
      id: 'currency-selector',
      label: 'Default Currency',
      options: [
        { value: 'system', text: 'System Currency' },
        { value: 'USD', text: 'USD - US Dollar', icon: '$' },
        { value: 'EUR', text: 'EUR - Euro', icon: '€' },
        { value: 'GBP', text: 'GBP - British Pound', icon: '£' },
        { value: 'JPY', text: 'JPY - Japanese Yen', icon: '¥' },
        { value: 'CHF', text: 'CHF - Swiss Franc', icon: '₣' },
        { value: 'CAD', text: 'CAD - Canadian Dollar', icon: 'C$' },
        { value: 'AUD', text: 'AUD - Australian Dollar', icon: 'A$' },
        { value: 'CNY', text: 'CNY - Chinese Yuan', icon: '¥' }
      ],
      defaultValue: 'system',
      storageKey: 'userCurrencyPreference',
      onChange: (value, option) => {
        console.log('[ComponentFactory] Currency selected:', value);
      }
    });
  }

  /**
   * Create first day of week dropdown
   */
  createFirstDayOfWeekSelector(containerId = 'first-day-selector-container') {
    return this.createWheelSelector(containerId, {
      id: 'first-day-selector',
      label: 'First Day of Week',
      options: [
        { value: 'monday', text: 'Monday' },
        { value: 'sunday', text: 'Sunday' },
        { value: 'saturday', text: 'Saturday' }
      ],
      defaultValue: 'monday',
      storageKey: 'userFirstDayOfWeek',
      onChange: (value) => {
        console.log('[ComponentFactory] First day of week selected:', value);
      }
    });
  }

  /**
   * Create date format dropdown
   */
  createDateFormatSelector(containerId = 'date-format-selector-container') {
    const today = new Date();
    const formats = [
      { value: 'dd-MMM-yyyy', text: today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-') },
      { value: 'yyyy-mm-dd', text: today.toISOString().split('T')[0] },
      { value: 'mm/dd/yyyy', text: today.toLocaleDateString('en-US') },
      { value: 'dd/mm/yyyy', text: today.toLocaleDateString('en-GB') },
      { value: 'dd.mm.yyyy', text: today.toLocaleDateString('de-DE') }
    ];
    
    return this.createWheelSelector(containerId, {
      id: 'date-format-selector',
      label: 'Date Format',
      options: formats,
      defaultValue: 'dd-MMM-yyyy',
      storageKey: 'userDateFormat',
      onChange: (value) => {
        console.log('[ComponentFactory] Date format selected:', value);
      }
    });
  }
}

// Create and export factory instance
const componentFactory = new ComponentFactory();

export { ComponentFactory, componentFactory };
