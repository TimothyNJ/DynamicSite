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
    }
  ];
  
  for (const config of inputConfigs) {
    if (!ComponentFactory.registerInput(config.name, {
      ...config,
      type: 'text',
      onValueChange: (value, instance) => {
        console.log(`${config.name} changed to: ${value}`);
        handleInputChange(config.name, value, instance);
      }
    })) {
      console.error(`❌ Failed to register ${config.name} input`);
      return false;
    }
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
    
    // Hide fallback elements if initialization was successful
    if (selectorResults.success && inputResults.success) {
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
  
  const selectors = ['theme', 'timeFormat'];
  
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
  
  const inputs = ['firstName', 'lastName', 'nickname'];
  
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
  const selectors = ['theme', 'timeFormat'];
  const inputs = ['firstName', 'lastName', 'nickname'];
  
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
        <p>Registered: ${stats.registered.selectors} selectors, ${stats.registered.inputs} inputs</p>
        <p>Instances: ${stats.instances.selectors} selectors, ${stats.instances.inputs} inputs</p>
        <p>Debug: ${stats.debug}</p>
      `;
    },
    
    testAll: () => {
      console.log('Running all tests...');
      window.testThemeSelector?.run();
      window.testTimeFormatSelector?.run();
      window.testTextInputs?.run();
    },
    
    clearStorage: () => {
      const keys = ['userThemePreference', 'userTimeFormatPreference', 'userFirstName', 'userLastName', 'userNickname'];
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
