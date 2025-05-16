/**
 * Settings Page Integration Script
 *
 * This script handles the complete integration of universal components
 * with the settings page, replacing hardcoded main branch elements.
 */

// Main integration function
const integrateSettingsComponents = () => {
  console.log('=== Settings Page Integration Starting ===');
  
  // Check if all required dependencies are available
  const dependencies = [
    'ComponentFactory',
    'GenericSelector', 
    'TextInput',
    'TimeRangePicker',
    'MultiSelect',
    'SelectorBase',
    'InputBase'
  ];
  
  const missingDeps = dependencies.filter(dep => typeof window[dep] === 'undefined');
  
  if (missingDeps.length > 0) {
    console.error('❌ Missing dependencies:', missingDeps);
    console.log('Please ensure all component files are loaded before settings-integration.js');
    return false;
  }
  
  console.log('✅ All dependencies available');
  
  // Enable debug mode if needed
  const isDebugMode = window.location.hostname === 'localhost' || 
                     window.location.search.includes('debug=true') ||
                     localStorage.getItem('settingsDebug') === 'true';
  
  if (isDebugMode) {
    ComponentFactory.setDebug(true);
    console.log('Debug mode enabled');
  }
  
  // Register all components
  registerAllComponents();
  
  // Wait for DOM to be ready, then initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeComponents);
  } else {
    initializeComponents();
  }
  
  // Handle SPA navigation
  document.addEventListener('pageLoaded', handlePageNavigation);
  
  return true;
};

// Register all components with proper configurations
const registerAllComponents = () => {
  console.log('Registering all components...');
  
  // Theme Selector
  if (!ComponentFactory.registerSelector('theme', {
    name: 'theme',
    options: ['dark', 'system', 'light'],
    labels: ['Dark', 'System Theme', 'Light'],
    defaultValue: 'dark',
    storageKey: 'userThemePreference',
    container: '.theme-selector',
    onValueChange: (value) => {
      console.log(`Theme changed to: ${value}`);
      applyTheme(value);
    }
  })) {
    console.error('❌ Failed to register theme selector');
    return false;
  }
  
  // Time Format Selector
  if (!ComponentFactory.registerSelector('timeFormat', {
    name: 'timeFormat',
    options: ['24', 'system', '12'],
    labels: ['24h', 'System', '12h'],
    defaultValue: '24',
    storageKey: 'userTimeFormatPreference',
    container: '.time-format-selector',
    onValueChange: (value) => {
      console.log(`Time format changed to: ${value}`);
      applyTimeFormat(value);
    }
  })) {
    console.error('❌ Failed to register time format selector');
    return false;
  }
  
  // Language Selector (Phase 2)
  if (!ComponentFactory.registerSelector('language', {
    name: 'language',
    options: ['en', 'es', 'fr', 'de', 'ja', 'zh'],
    labels: ['English', 'Español', 'Français', 'Deutsch', '日本語', '中文'],
    defaultValue: 'en',
    storageKey: 'userLanguagePreference',
    container: '.language-selector',
    onValueChange: (value) => {
      console.log(`Language changed to: ${value}`);
      applyLanguage(value);
    }
  })) {
    console.error('❌ Failed to register language selector');
    return false;
  }
  
  // Timezone Selector (Phase 2)
  if (!ComponentFactory.registerSelector('timezone', {
    name: 'timezone',
    options: ['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo'],
    labels: ['UTC', 'EDT (Eastern)', 'CDT (Central)', 'MDT (Mountain)', 'PDT (Pacific)', 'BST (London)', 'CEST (Paris)', 'JST (Tokyo)'],
    defaultValue: 'UTC',
    storageKey: 'userTimezonePreference',
    container: '.timezone-selector',
    onValueChange: (value) => {
      console.log(`Timezone changed to: ${value}`);
      applyTimezone(value);
    }
  })) {
    console.error('❌ Failed to register timezone selector');
    return false;
  }
  
  // Date Format Selector (Phase 2)
  if (!ComponentFactory.registerSelector('dateFormat', {
    name: 'dateFormat',
    options: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'DD MMM YYYY'],
    labels: ['MM/DD/YYYY (US)', 'DD/MM/YYYY (EU)', 'YYYY-MM-DD (ISO)', 'DD MMM YYYY (Verbose)'],
    defaultValue: 'YYYY-MM-DD',
    storageKey: 'userDateFormatPreference',
    container: '.date-format-selector',
    onValueChange: (value) => {
      console.log(`Date format changed to: ${value}`);
      applyDateFormat(value);
    }
  })) {
    console.error('❌ Failed to register date format selector');
    return false;
  }
  
  // Currency Selector (Phase 2)
  if (!ComponentFactory.registerSelector('currency', {
    name: 'currency',
    options: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'],
    labels: ['USD ($)', 'EUR (€)', 'GBP (£)', 'JPY (¥)', 'CAD (C$)', 'AUD (A$)'],
    defaultValue: 'USD',
    storageKey: 'userCurrencyPreference',
    container: '.currency-selector',
    onValueChange: (value) => {
      console.log(`Currency changed to: ${value}`);
      applyCurrency(value);
    }
  })) {
    console.error('❌ Failed to register currency selector');
    return false;
  }
  
  // Units Selector (Phase 2)
  if (!ComponentFactory.registerSelector('units', {
    name: 'units',
    options: ['metric', 'imperial', 'mixed'],
    labels: ['Metric (kg, cm)', 'Imperial (lbs, inches)', 'Mixed (metric/imperial)'],
    defaultValue: 'metric',
    storageKey: 'userUnitsPreference',
    container: '.units-selector',
    onValueChange: (value) => {
      console.log(`Units changed to: ${value}`);
      applyUnits(value);
    }
  })) {
    console.error('❌ Failed to register units selector');
    return false;
  }
  
  // Text Inputs
  const inputConfigs = [
    {
      name: 'firstName',
      id: 'first-name', // Match main branch kebab-case ID
      placeholder: 'Enter first name',
      storageKey: 'userFirstName',
      required: true
    },
    {
      name: 'lastName',
      id: 'last-name', // Match main branch kebab-case ID
      placeholder: 'Enter last name',
      storageKey: 'userLastName',
      required: true
    },
    {
      name: 'nickname',
      id: 'nickname', // Main branch already uses lowercase
      placeholder: 'Enter nickname (optional)',
      storageKey: 'userNickname',
      validator: TextInput.createValidator('nickname')
    },
    // Phase 2 - New input types
    {
      name: 'email',
      id: 'email-input',
      type: 'email',
      placeholder: 'Enter email address',
      storageKey: 'userEmail',
      required: true,
      validator: TextInput.createValidator('email')
    },
    {
      name: 'phone',
      id: 'phone-input',
      type: 'tel',
      placeholder: 'Enter phone number',
      storageKey: 'userPhone',
      validator: TextInput.createValidator('phone')
    },
    {
      name: 'sms',
      id: 'sms-input',
      type: 'tel',
      placeholder: 'Enter SMS number (if different)',
      storageKey: 'userSMS',
      validator: TextInput.createValidator('sms')
    }
  ];
  
  for (const config of inputConfigs) {
    if (!ComponentFactory.registerInput(config.name, {
      ...config,
      type: config.type || 'text',
      onValueChange: (value, instance) => {
        console.log(`${config.name} changed to: ${value}`);
        handleInputChange(config.name, value, instance);
      }
    })) {
      console.error(`❌ Failed to register ${config.name} input`);
      return false;
    }
  }
  
  // TimeRangePicker for working hours (Phase 2)
  if (!ComponentFactory.registerTimeRangePicker('workingHours', {
    name: 'workingHours',
    startTime: '09:00',
    endTime: '17:00',
    format: '24h',
    storageKey: 'userWorkingHours',
    container: '.working-hours-picker',
    onValueChange: (startTime, endTime) => {
      console.log(`Working hours changed to: ${startTime} - ${endTime}`);
      applyWorkingHours(startTime, endTime);
    }
  })) {
    console.error('❌ Failed to register working hours picker');
    return false;
  }
  
  // MultiSelect for categories/interests (Phase 2)
  if (!ComponentFactory.registerMultiSelect('categories', {
    name: 'categories',
    options: ['technology', 'science', 'business', 'sports', 'entertainment', 'health', 'education', 'travel'],
    labels: ['Technology', 'Science', 'Business', 'Sports', 'Entertainment', 'Health', 'Education', 'Travel'],
    defaultValue: [],
    maxSelections: 5,
    searchable: true,
    storageKey: 'userCategories',
    container: '.categories-multiselect',
    placeholder: 'Select interests (max 5)',
    onValueChange: (selectedValues) => {
      console.log(`Categories changed to:`, selectedValues);
      applyCategories(selectedValues);
    }
  })) {
    console.error('❌ Failed to register categories multi-select');
    return false;
  }
  
  console.log('✅ All components registered successfully');
  return true;
};

// Initialize all components
const initializeComponents = async () => {
  console.log('\\n=== Initializing Components ===');
  
  try {
    // Add a small delay to ensure DOM is fully ready
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Initialize selectors
    const selectorResults = await initializeSelectors();
    
    // Initialize inputs
    const inputResults = await initializeInputs();
    
    // Initialize TimeRangePickers
    const timePickerResults = await initializeTimeRangePickers();
    
    // Initialize MultiSelects
    const multiSelectResults = await initializeMultiSelects();
    
    // Hide fallback elements if initialization was successful
    if (selectorResults.success && inputResults.success && timePickerResults.success && multiSelectResults.success) {
      hideOriginalElements();
      console.log('✅ All components initialized successfully');
      
      // Set up global event listeners
      setupGlobalEventListeners();
      
      // Create debugging interface
      createDebuggingInterface();
      
      console.log('\\n=== Settings Integration Complete ===');
      return true;
    } else {
      console.error('❌ Some components failed to initialize');
      showFallbackElements();
      return false;
    }
  } catch (error) {
    console.error('❌ Error during initialization:', error);
    showFallbackElements();
    return false;
  }
};

// Initialize selectors
const initializeSelectors = async () => {
  console.log('Initializing selectors...');
  const results = { success: 0, failed: 0, errors: [] };
  
  const selectors = ['theme', 'timeFormat', 'language', 'timezone', 'dateFormat', 'currency', 'units'];
  
  for (const selectorName of selectors) {
    try {
      console.log(`Initializing ${selectorName} selector...`);
      
      const instance = ComponentFactory.createSelector(selectorName);
      if (!instance) {
        throw new Error(`Failed to create ${selectorName} selector`);
      }
      
      const initialized = await instance.init();
      if (!initialized) {
        throw new Error(`Failed to initialize ${selectorName} selector`);
      }
      
      // Restore saved value
      const config = ComponentFactory.getRegistered().selectors.find(([name]) => name === selectorName)[1];
      const savedValue = localStorage.getItem(config.storageKey) || config.defaultValue;
      
      console.log(`Restoring ${selectorName} to: ${savedValue}`);
      instance.setValue(savedValue, true); // Skip callback on initial set
      
      results.success++;
      console.log(`✅ ${selectorName} selector initialized`);
    } catch (error) {
      results.failed++;
      results.errors.push(`${selectorName}: ${error.message}`);
      console.error(`❌ ${selectorName} selector failed:`, error);
    }
  }
  
  console.log(`Selector initialization results: ${results.success} success, ${results.failed} failed`);
  return results;
};

// Initialize inputs
const initializeInputs = async () => {
  console.log('Initializing inputs...');
  const results = { success: 0, failed: 0, errors: [] };
  
  const inputs = ['firstName', 'lastName', 'nickname', 'email', 'phone', 'sms'];
  
  for (const inputName of inputs) {
    try {
      console.log(`Initializing ${inputName} input...`);
      
      const instance = ComponentFactory.createInput(inputName);
      if (!instance) {
        throw new Error(`Failed to create ${inputName} input`);
      }
      
      const initialized = instance.init();
      if (!initialized) {
        throw new Error(`Failed to initialize ${inputName} input`);
      }
      
      // Restore saved value
      const savedValue = localStorage.getItem(instance.options.storageKey);
      if (savedValue) {
        console.log(`Restoring ${inputName} to: ${savedValue}`);
        instance.setValue(savedValue, true); // Skip callback on initial set
      }
      
      results.success++;
      console.log(`✅ ${inputName} input initialized`);
    } catch (error) {
      results.failed++;
      results.errors.push(`${inputName}: ${error.message}`);
      console.error(`❌ ${inputName} input failed:`, error);
    }
  }
  
  console.log(`Input initialization results: ${results.success} success, ${results.failed} failed`);
  return results;
};

// Initialize TimeRangePickers
const initializeTimeRangePickers = async () => {
  console.log('Initializing TimeRangePickers...');
  const results = { success: 0, failed: 0, errors: [] };
  
  const timeRangePickers = ['workingHours'];
  
  for (const pickerName of timeRangePickers) {
    try {
      console.log(`Initializing ${pickerName} TimeRangePicker...`);
      
      const instance = ComponentFactory.createTimeRangePicker(pickerName);
      if (!instance) {
        throw new Error(`Failed to create ${pickerName} TimeRangePicker`);
      }
      
      const initialized = await instance.init();
      if (!initialized) {
        throw new Error(`Failed to initialize ${pickerName} TimeRangePicker`);
      }
      
      // Restore saved value
      const config = ComponentFactory.getRegistered().timeRangePickers.find(([name]) => name === pickerName)[1];
      const savedValue = localStorage.getItem(config.storageKey);
      if (savedValue) {
        try {
          const { start, end } = JSON.parse(savedValue);
          console.log(`Restoring ${pickerName} to: ${start} - ${end}`);
          instance.setValue(start, end, true); // Skip callback on initial set
        } catch (error) {
          console.error(`Error parsing saved ${pickerName} value:`, error);
        }
      }
      
      results.success++;
      console.log(`✅ ${pickerName} TimeRangePicker initialized`);
    } catch (error) {
      results.failed++;
      results.errors.push(`${pickerName}: ${error.message}`);
      console.error(`❌ ${pickerName} TimeRangePicker failed:`, error);
    }
  }
  
  console.log(`TimeRangePicker initialization results: ${results.success} success, ${results.failed} failed`);
  return results;
};

// Initialize MultiSelects
const initializeMultiSelects = async () => {
  console.log('Initializing MultiSelects...');
  const results = { success: 0, failed: 0, errors: [] };
  
  const multiSelects = ['categories'];
  
  for (const multiSelectName of multiSelects) {
    try {
      console.log(`Initializing ${multiSelectName} MultiSelect...`);
      
      const instance = ComponentFactory.createMultiSelect(multiSelectName);
      if (!instance) {
        throw new Error(`Failed to create ${multiSelectName} MultiSelect`);
      }
      
      const initialized = await instance.init();
      if (!initialized) {
        throw new Error(`Failed to initialize ${multiSelectName} MultiSelect`);
      }
      
      // Restore saved value
      const config = ComponentFactory.getRegistered().multiSelects.find(([name]) => name === multiSelectName)[1];
      const savedValue = localStorage.getItem(config.storageKey);
      if (savedValue) {
        try {
          const values = JSON.parse(savedValue);
          console.log(`Restoring ${multiSelectName} to:`, values);
          instance.setValue(values, true); // Skip callback on initial set
        } catch (error) {
          console.error(`Error parsing saved ${multiSelectName} value:`, error);
        }
      }
      
      results.success++;
      console.log(`✅ ${multiSelectName} MultiSelect initialized`);
    } catch (error) {
      results.failed++;
      results.errors.push(`${multiSelectName}: ${error.message}`);
      console.error(`❌ ${multiSelectName} MultiSelect failed:`, error);
    }
  }
  
  console.log(`MultiSelect initialization results: ${results.success} success, ${results.failed} failed`);
  return results;
};

// Hide original hardcoded elements
const hideOriginalElements = () => {
  console.log('Hiding original hardcoded elements...');
  
  const originalSelectors = document.getElementById('original-selectors');
  const originalInputs = document.getElementById('original-inputs');
  
  if (originalSelectors) {
    originalSelectors.style.display = 'none';
    console.log('✅ Original selectors hidden');
  }
  
  if (originalInputs) {
    originalInputs.style.display = 'none';
    console.log('✅ Original inputs hidden');
  }
};

// Show fallback elements if initialization fails
const showFallbackElements = () => {
  console.log('Showing fallback elements...');
  
  const originalSelectors = document.getElementById('original-selectors');
  const originalInputs = document.getElementById('original-inputs');
  
  if (originalSelectors) {
    originalSelectors.style.display = 'block';
    console.log('✅ Original selectors shown (fallback)');
  }
  
  if (originalInputs) {
    originalInputs.style.display = 'block';
    console.log('✅ Original inputs shown (fallback)');
  }
};

// Handle theme changes
const applyTheme = (theme) => {
  console.log(`Applying theme: ${theme}`);
  
  // Try multiple integration approaches
  if (window.themeSelector && typeof window.themeSelector.applyThemeByName === 'function') {
    window.themeSelector.applyThemeByName(theme);
  } else if (window.themeManager && typeof window.themeManager.setTheme === 'function') {
    window.themeManager.setTheme(theme);
  } else {
    // Direct application as fallback
    document.documentElement.setAttribute('data-theme', theme);
    
    // Dispatch event for other components
    const event = new CustomEvent('themeChanged', { 
      detail: { theme } 
    });
    document.dispatchEvent(event);
  }
};

// Handle time format changes
const applyTimeFormat = (format) => {
  console.log(`Applying time format: ${format}`);
  
  // Try multiple integration approaches
  if (window.timeFormatManager && typeof window.timeFormatManager.setFormat === 'function') {
    window.timeFormatManager.setFormat(format);
  } else if (window.formatManager && typeof window.formatManager.setTimeFormat === 'function') {
    window.formatManager.setTimeFormat(format);
  } else {
    // Dispatch event for other components
    const event = new CustomEvent('timeFormatChanged', { 
      detail: { format } 
    });
    document.dispatchEvent(event);
  }
};

// Handle language changes
const applyLanguage = (language) => {
  console.log(`Applying language: ${language}`);
  
  // Try multiple integration approaches
  if (window.i18n && typeof window.i18n.changeLanguage === 'function') {
    window.i18n.changeLanguage(language);
  } else if (window.langManager && typeof window.langManager.setLanguage === 'function') {
    window.langManager.setLanguage(language);
  } else {
    // Set HTML lang attribute
    document.documentElement.lang = language;
    
    // Dispatch event for other components
    const event = new CustomEvent('languageChanged', { 
      detail: { language } 
    });
    document.dispatchEvent(event);
  }
};

// Handle timezone changes
const applyTimezone = (timezone) => {
  console.log(`Applying timezone: ${timezone}`);
  
  // Try multiple integration approaches
  if (window.timezoneManger && typeof window.timezoneManger.setTimezone === 'function') {
    window.timezoneManger.setTimezone(timezone);
  } else if (window.dateTime && typeof window.dateTime.setTimezone === 'function') {
    window.dateTime.setTimezone(timezone);
  } else {
    // Dispatch event for other components
    const event = new CustomEvent('timezoneChanged', { 
      detail: { timezone } 
    });
    document.dispatchEvent(event);
  }
};

// Handle date format changes
const applyDateFormat = (format) => {
  console.log(`Applying date format: ${format}`);
  
  // Try multiple integration approaches
  if (window.dateFormatManager && typeof window.dateFormatManager.setFormat === 'function') {
    window.dateFormatManager.setFormat(format);
  } else if (window.formatManager && typeof window.formatManager.setDateFormat === 'function') {
    window.formatManager.setDateFormat(format);
  } else {
    // Dispatch event for other components
    const event = new CustomEvent('dateFormatChanged', { 
      detail: { format } 
    });
    document.dispatchEvent(event);
  }
};

// Handle currency changes
const applyCurrency = (currency) => {
  console.log(`Applying currency: ${currency}`);
  
  // Try multiple integration approaches
  if (window.currencyManager && typeof window.currencyManager.setCurrency === 'function') {
    window.currencyManager.setCurrency(currency);
  } else if (window.formatManager && typeof window.formatManager.setCurrency === 'function') {
    window.formatManager.setCurrency(currency);
  } else {
    // Dispatch event for other components
    const event = new CustomEvent('currencyChanged', { 
      detail: { currency } 
    });
    document.dispatchEvent(event);
  }
};

// Handle units changes
const applyUnits = (units) => {
  console.log(`Applying units: ${units}`);
  
  // Try multiple integration approaches
  if (window.unitsManager && typeof window.unitsManager.setUnits === 'function') {
    window.unitsManager.setUnits(units);
  } else if (window.formatManager && typeof window.formatManager.setUnits === 'function') {
    window.formatManager.setUnits(units);
  } else {
    // Dispatch event for other components
    const event = new CustomEvent('unitsChanged', { 
      detail: { units } 
    });
    document.dispatchEvent(event);
  }
};

// Handle working hours changes
const applyWorkingHours = (startTime, endTime) => {
  console.log(`Applying working hours: ${startTime} - ${endTime}`);
  
  // Try multiple integration approaches
  if (window.scheduleManager && typeof window.scheduleManager.setWorkingHours === 'function') {
    window.scheduleManager.setWorkingHours(startTime, endTime);
  } else if (window.timeManager && typeof window.timeManager.setWorkingHours === 'function') {
    window.timeManager.setWorkingHours(startTime, endTime);
  } else {
    // Dispatch event for other components
    const event = new CustomEvent('workingHoursChanged', { 
      detail: { startTime, endTime } 
    });
    document.dispatchEvent(event);
  }
};

// Handle categories changes
const applyCategories = (categories) => {
  console.log(`Applying categories:`, categories);
  
  // Try multiple integration approaches
  if (window.categoryManager && typeof window.categoryManager.setCategories === 'function') {
    window.categoryManager.setCategories(categories);
  } else if (window.userProfile && typeof window.userProfile.updateCategories === 'function') {
    window.userProfile.updateCategories(categories);
  } else {
    // Dispatch event for other components
    const event = new CustomEvent('categoriesChanged', { 
      detail: { categories } 
    });
    document.dispatchEvent(event);
  }
};

// Handle input changes
const handleInputChange = (inputName, value, instance) => {
  console.log(`Handling ${inputName} change: ${value}`);
  
  // Integrate with user profile system if available
  if (window.userProfile) {
    const methodName = `update${inputName.charAt(0).toUpperCase() + inputName.slice(1)}`;
    if (typeof window.userProfile[methodName] === 'function') {
      window.userProfile[methodName](value);
    }
  }
  
  // Dispatch custom event
  const event = new CustomEvent(`${inputName}Changed`, { 
    detail: { value, instance } 
  });
  document.dispatchEvent(event);
};

// Handle SPA navigation
const handlePageNavigation = (event) => {
  console.log('Page navigation detected:', event.detail);
  
  if (event.detail && event.detail.pageName === 'settings') {
    console.log('Navigated to settings page, re-initializing components...');
    
    // Small delay to ensure new DOM is ready
    setTimeout(() => {
      reinitializeComponents();
    }, 200);
  }
};

// Re-initialize components for SPA navigation
const reinitializeComponents = async () => {
  console.log('Re-initializing components for SPA navigation...');
  
  // Check if components are already initialized
  const selectors = ['theme', 'timeFormat', 'language', 'timezone', 'dateFormat', 'currency', 'units'];
  const inputs = ['firstName', 'lastName', 'nickname', 'email', 'phone', 'sms'];
  const timeRangePickers = ['workingHours'];
  const multiSelects = ['categories'];
  
  // Re-initialize selectors if needed
  for (const selectorName of selectors) {
    const instance = ComponentFactory.getInstance('selector', selectorName);
    if (!instance || !instance.isInitialized) {
      console.log(`Re-creating ${selectorName} selector...`);
      const newInstance = ComponentFactory.createSelector(selectorName);
      if (newInstance) {
        await newInstance.init();
        // Restore value
        const config = ComponentFactory.getRegistered().selectors.find(([name]) => name === selectorName)[1];
        const savedValue = localStorage.getItem(config.storageKey) || config.defaultValue;
        newInstance.setValue(savedValue, true);
      }
    }
  }
  
  // Re-initialize inputs if needed
  for (const inputName of inputs) {
    const instance = ComponentFactory.getInstance('input', inputName);
    if (!instance || !instance.element) {
      console.log(`Re-creating ${inputName} input...`);
      const newInstance = ComponentFactory.createInput(inputName);
      if (newInstance) {
        newInstance.init();
        // Restore value
        const savedValue = localStorage.getItem(newInstance.options.storageKey);
        if (savedValue) {
          newInstance.setValue(savedValue, true);
        }
      }
    }
  }
  
  // Re-initialize TimeRangePickers if needed
  for (const pickerName of timeRangePickers) {
    const instance = ComponentFactory.getInstance('timeRangePicker', pickerName);
    if (!instance || !instance.isInitialized) {
      console.log(`Re-creating ${pickerName} TimeRangePicker...`);
      const newInstance = ComponentFactory.createTimeRangePicker(pickerName);
      if (newInstance) {
        await newInstance.init();
        // Restore value
        const config = ComponentFactory.getRegistered().timeRangePickers.find(([name]) => name === pickerName)[1];
        const savedValue = localStorage.getItem(config.storageKey);
        if (savedValue) {
          try {
            const { start, end } = JSON.parse(savedValue);
            newInstance.setValue(start, end, true);
          } catch (error) {
            console.error(`Error restoring ${pickerName}:`, error);
          }
        }
      }
    }
  }
  
  // Re-initialize MultiSelects if needed
  for (const multiSelectName of multiSelects) {
    const instance = ComponentFactory.getInstance('multiSelect', multiSelectName);
    if (!instance || !instance.isInitialized) {
      console.log(`Re-creating ${multiSelectName} MultiSelect...`);
      const newInstance = ComponentFactory.createMultiSelect(multiSelectName);
      if (newInstance) {
        await newInstance.init();
        // Restore value
        const config = ComponentFactory.getRegistered().multiSelects.find(([name]) => name === multiSelectName)[1];
        const savedValue = localStorage.getItem(config.storageKey);
        if (savedValue) {
          try {
            const values = JSON.parse(savedValue);
            newInstance.setValue(values, true);
          } catch (error) {
            console.error(`Error restoring ${multiSelectName}:`, error);
          }
        }
      }
    }
  }
  
  // Hide original elements again
  hideOriginalElements();
  
  console.log('Re-initialization complete');
};

// Set up global event listeners
const setupGlobalEventListeners = () => {
  console.log('Setting up global event listeners...');
  
  // Listen for component errors
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.message && event.reason.message.includes('Component')) {
      console.error('Component error detected:', event.reason);
      // Could trigger fallback behavior here
    }
  });
  
  // Listen for localStorage changes (from other tabs)
  window.addEventListener('storage', (event) => {
    if (event.key && (event.key.includes('user') || event.key.includes('theme') || event.key.includes('format'))) {
      console.log('Settings changed in another tab:', event.key, event.newValue);
      // Could sync changes here
    }
  });
  
  console.log('✅ Global event listeners set up');
};

// Create debugging interface
const createDebuggingInterface = () => {
  if (!ComponentFactory.debug) return;
  
  console.log('Creating debugging interface...');
  
  // Create debug panel
  const debugPanel = document.createElement('div');
  debugPanel.id = 'settings-debug-panel';
  debugPanel.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 10px;
    border-radius: 5px;
    font-family: monospace;
    font-size: 12px;
    z-index: 9999;
    max-width: 300px;
  `;
  
  debugPanel.innerHTML = `
    <h3>Settings Debug</h3>
    <button onclick="window.settingsDebug.showStats()">Show Stats</button>
    <button onclick="window.settingsDebug.testAll()">Test All</button>
    <button onclick="window.settingsDebug.clearStorage()">Clear Storage</button>
    <div id="debug-output"></div>
  `;
  
  document.body.appendChild(debugPanel);
  
  // Create debugging utilities
  window.settingsDebug = {
    showStats: () => {
      const stats = ComponentFactory.getStats();
      const registered = ComponentFactory.getRegistered();
      const output = document.getElementById('debug-output');
      output.innerHTML = `
        <p><strong>Factory Stats:</strong></p>
        <p>Registered: ${stats.registered.selectors} selectors, ${stats.registered.inputs} inputs, ${stats.registered.timeRangePickers} time pickers, ${stats.registered.multiSelects} multi-selects</p>
        <p>Instances: ${stats.instances.selectors} selectors, ${stats.instances.inputs} inputs, ${stats.instances.timeRangePickers} time pickers, ${stats.instances.multiSelects} multi-selects</p>
        <p>Debug: ${stats.debug}</p>
      `;
    },
    
    testAll: () => {
      console.log('Running all tests...');
      window.testThemeSelector?.run();
      window.testTimeFormatSelector?.run();
      window.testTextInputs?.run();
      window.testTimeRangePicker?.run();
      window.testMultiSelect?.run();
    },
    
    clearStorage: () => {
      const keys = [
        'userThemePreference', 'userTimeFormatPreference', 'userLanguagePreference',
        'userTimezonePreference', 'userDateFormatPreference', 'userCurrencyPreference',
        'userUnitsPreference', 'userFirstName', 'userLastName', 'userNickname',
        'userEmail', 'userPhone', 'userSMS', 'userWorkingHours', 'userCategories'
      ];
      keys.forEach(key => localStorage.removeItem(key));
      console.log('Settings storage cleared');
      location.reload();
    }
  };
  
  console.log('✅ Debug interface created');
};

// Initialize everything when script loads
integrateSettingsComponents();

// Export for external use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    integrateSettingsComponents,
    initializeComponents,
    reinitializeComponents
  };
}
