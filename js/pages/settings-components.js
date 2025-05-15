/**
 * Settings Page Component Configurations
 *
 * This file registers all the components needed to replace the hardcoded
 * UI elements from the main branch with our new universal components.
 */

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('Setting up component configurations...');
  
  // Enable debug mode for development
  if (window.location.hostname === 'localhost' || window.location.search.includes('debug=true')) {
    ComponentFactory.setDebug(true);
  }
  
  // Register Theme Selector Configuration
  console.log('Registering theme selector...');
  const themeRegistered = ComponentFactory.registerSelector('theme', {
    name: 'theme',
    options: ['dark', 'system', 'light'],
    labels: ['Dark', 'System Theme', 'Light'],
    defaultValue: 'dark',
    storageKey: 'userThemePreference',
    container: '.theme-selector', // Match the actual selector class from main branch
    onValueChange: (value) => {
      console.log(`Theme changed to: ${value}`);
      
      // Integrate with existing theme functionality
      if (window.themeSelector && typeof window.themeSelector.applyThemeByName === 'function') {
        console.log('Applying theme via existing themeSelector...');
        window.themeSelector.applyThemeByName(value);
      } else {
        console.warn('themeSelector not found, trying alternative approaches...');
        
        // Try alternative theme application methods
        if (window.themeManager) {
          window.themeManager.setTheme(value);
        } else if (document.documentElement) {
          // Direct theme application as fallback
          document.documentElement.setAttribute('data-theme', value);
          localStorage.setItem('userThemePreference', value);
        }
      }
    }
  });
  
  if (!themeRegistered) {
    console.error('Failed to register theme selector');
    return;
  }
  
  console.log('Theme selector registered successfully');
  
  // Register Time Format Selector Configuration
  console.log('Registering time format selector...');
  const timeFormatRegistered = ComponentFactory.registerSelector('timeFormat', {
    name: 'timeFormat',
    options: ['24', 'system', '12'],
    labels: ['24h', 'System', '12h'],
    defaultValue: '24',
    storageKey: 'userTimeFormatPreference',
    container: '.time-format-selector', // Match the actual selector class from main branch
    onValueChange: (value) => {
      console.log(`Time format changed to: ${value}`);
      
      // Integrate with existing time format functionality
      if (window.timeFormatManager && typeof window.timeFormatManager.setFormat === 'function') {
        console.log('Applying time format via existing timeFormatManager...');
        window.timeFormatManager.setFormat(value);
      } else if (window.formatManager) {
        window.formatManager.setTimeFormat(value);
      } else {
        console.warn('timeFormatManager not found, saving to localStorage...');
        // Direct localStorage save as fallback
        localStorage.setItem('userTimeFormatPreference', value);
        
        // Dispatch custom event for other components
        const event = new CustomEvent('timeFormatChanged', { 
          detail: { format: value } 
        });
        document.dispatchEvent(event);
      }
    }
  });
  
  if (!timeFormatRegistered) {
    console.error('Failed to register time format selector');
    return;
  }
  
  console.log('Time format selector registered successfully');
  
  // Register Text Input Configurations
  console.log('Registering text inputs...');
  
  // First Name Input
  const firstNameRegistered = ComponentFactory.registerInput('firstName', {
    id: 'first-name', // Match main branch kebab-case ID
    name: 'firstName',
    type: 'text',
    placeholder: 'Enter first name',
    storageKey: 'userFirstName',
    onValueChange: (value, instance) => {
      console.log(`First name changed to: ${value}`);
      
      // Could integrate with user profile system
      if (window.userProfile && typeof window.userProfile.updateFirstName === 'function') {
        window.userProfile.updateFirstName(value);
      }
      
      // Dispatch custom event
      const event = new CustomEvent('firstNameChanged', { 
        detail: { value, instance } 
      });
      document.dispatchEvent(event);
    }
  });
  
  // Last Name Input
  const lastNameRegistered = ComponentFactory.registerInput('lastName', {
    id: 'last-name', // Match main branch kebab-case ID
    name: 'lastName',
    type: 'text',
    placeholder: 'Enter last name',
    storageKey: 'userLastName',
    onValueChange: (value, instance) => {
      console.log(`Last name changed to: ${value}`);
      
      // Could integrate with user profile system
      if (window.userProfile && typeof window.userProfile.updateLastName === 'function') {
        window.userProfile.updateLastName(value);
      }
      
      // Dispatch custom event
      const event = new CustomEvent('lastNameChanged', { 
        detail: { value, instance } 
      });
      document.dispatchEvent(event);
    }
  });
  
  // Nickname Input
  const nicknameRegistered = ComponentFactory.registerInput('nickname', {
    id: 'nickname', // Main branch already uses lowercase
    name: 'nickname',
    type: 'text',
    placeholder: 'Enter nickname (optional)',
    storageKey: 'userNickname',
    validator: TextInput.createValidator('nickname'),
    onValueChange: (value, instance) => {
      console.log(`Nickname changed to: ${value}`);
      
      // Could integrate with user profile system
      if (window.userProfile && typeof window.userProfile.updateNickname === 'function') {
        window.userProfile.updateNickname(value);
      }
      
      // Dispatch custom event
      const event = new CustomEvent('nicknameChanged', { 
        detail: { value, instance } 
      });
      document.dispatchEvent(event);
    }
  });
  
  if (!firstNameRegistered || !lastNameRegistered || !nicknameRegistered) {
    console.error('Failed to register text inputs');
    return;
  }
  
  console.log('Text inputs registered successfully');
  
  // Initialize the theme selector with a small delay to ensure DOM is ready
  setTimeout(async () => {
    console.log('Initializing components...');
    
    try {
      // Initialize theme selector
      console.log('Initializing theme selector...');
      const themeInstance = ComponentFactory.createSelector('theme');
      if (themeInstance) {
        const initialized = await themeInstance.init();
        if (initialized) {
          console.log('✅ Theme selector initialized successfully');
          
          // Get the current theme from localStorage and set it without triggering callback
          const currentTheme = localStorage.getItem('userThemePreference') || 'dark';
          console.log(`Setting initial theme value: ${currentTheme}`);
          themeInstance.setValue(currentTheme, true); // skip callback on initial set
          
          // Store reference for debugging
          window.debugThemeSelector = themeInstance;
        } else {
          console.error('❌ Failed to initialize theme selector');
        }
      } else {
        console.error('❌ Failed to create theme selector instance');
      }
      
      // Initialize time format selector
      console.log('Initializing time format selector...');
      const timeFormatInstance = ComponentFactory.createSelector('timeFormat');
      if (timeFormatInstance) {
        const initialized = await timeFormatInstance.init();
        if (initialized) {
          console.log('✅ Time format selector initialized successfully');
          
          // Get the current format from localStorage and set it without triggering callback
          const currentFormat = localStorage.getItem('userTimeFormatPreference') || '24';
          console.log(`Setting initial time format value: ${currentFormat}`);
          timeFormatInstance.setValue(currentFormat, true); // skip callback on initial set
          
          // Store reference for debugging
          window.debugTimeFormatSelector = timeFormatInstance;
        } else {
          console.error('❌ Failed to initialize time format selector');
        }
      } else {
        console.error('❌ Failed to create time format selector instance');
      }
      
      // Initialize text inputs
      console.log('Initializing text inputs...');
      
      const inputConfigs = [
        { name: 'firstName', displayName: 'First Name' },
        { name: 'lastName', displayName: 'Last Name' },
        { name: 'nickname', displayName: 'Nickname' }
      ];
      
      for (const config of inputConfigs) {
        try {
          console.log(`Initializing ${config.displayName} input...`);
          const inputInstance = ComponentFactory.createInput(config.name);
          if (inputInstance) {
            const initialized = inputInstance.init();
            if (initialized) {
              console.log(`✅ ${config.displayName} input initialized successfully`);
              
              // Restore saved value if exists
              const savedValue = localStorage.getItem(inputInstance.options.storageKey);
              if (savedValue) {
                console.log(`Restoring ${config.displayName} value: ${savedValue}`);
                inputInstance.setValue(savedValue, true); // skip callback on initial set
              }
              
              // Store reference for debugging
              window[`debug${config.name.charAt(0).toUpperCase() + config.name.slice(1)}Input`] = inputInstance;
            } else {
              console.error(`❌ Failed to initialize ${config.displayName} input`);
            }
          } else {
            console.error(`❌ Failed to create ${config.displayName} input instance`);
          }
        } catch (error) {
          console.error(`❌ Error initializing ${config.displayName} input:`, error);
        }
      }
    } catch (error) {
      console.error('❌ Error during component initialization:', error);
    }
  }, 100);
});

// Also initialize when navigating to settings (for SPA behavior)
document.addEventListener('pageLoaded', (event) => {
  if (event.detail && event.detail.pageName === 'settings') {
    console.log('Settings page loaded via navigation');
    
    // Small delay to ensure DOM is ready
    setTimeout(async () => {
      console.log('Re-initializing components for settings page...');
      
      // Check if theme selector needs re-initialization
      const themeInstance = ComponentFactory.getInstance('selector', 'theme');
      if (!themeInstance || !themeInstance.isInitialized) {
        console.log('Re-creating theme selector...');
        
        const newInstance = ComponentFactory.createSelector('theme');
        if (newInstance) {
          await newInstance.init();
          console.log('Theme selector re-initialized');
        }
      } else {
        console.log('Theme selector already initialized and ready');
      }
      
      // Check if time format selector needs re-initialization
      const timeFormatInstance = ComponentFactory.getInstance('selector', 'timeFormat');
      if (!timeFormatInstance || !timeFormatInstance.isInitialized) {
        console.log('Re-creating time format selector...');
        
        const newInstance = ComponentFactory.createSelector('timeFormat');
        if (newInstance) {
          await newInstance.init();
          console.log('Time format selector re-initialized');
        }
      } else {
        console.log('Time format selector already initialized and ready');
      }
      
      // Check if text inputs need re-initialization
      const inputNames = ['firstName', 'lastName', 'nickname'];
      
      for (const inputName of inputNames) {
        const inputInstance = ComponentFactory.getInstance('input', inputName);
        if (!inputInstance || !inputInstance.element) {
          console.log(`Re-creating ${inputName} input...`);
          
          const newInstance = ComponentFactory.createInput(inputName);
          if (newInstance) {
            newInstance.init();
            console.log(`${inputName} input re-initialized`);
          }
        } else {
          console.log(`${inputName} input already initialized and ready`);
        }
      }
    }, 150);
  }
});

// Add some utility functions for debugging
window.debugThemeSelector = {
  // Get current theme selector instance
  getInstance: () => ComponentFactory.getInstance('selector', 'theme'),
  
  // Get selector configuration
  getConfig: () => {
    const instance = ComponentFactory.getInstance('selector', 'theme');
    return instance ? instance.getConfig() : null;
  },
  
  // Manually set theme (for testing)
  setTheme: (theme) => {
    const instance = ComponentFactory.getInstance('selector', 'theme');
    if (instance) {
      return instance.setValue(theme);
    }
    return false;
  },
  
  // Get factory stats
  getStats: () => ComponentFactory.getStats()
};

window.debugTimeFormatSelector = {
  // Get current time format selector instance
  getInstance: () => ComponentFactory.getInstance('selector', 'timeFormat'),
  
  // Get selector configuration
  getConfig: () => {
    const instance = ComponentFactory.getInstance('selector', 'timeFormat');
    return instance ? instance.getConfig() : null;
  },
  
  // Manually set time format (for testing)
  setFormat: (format) => {
    const instance = ComponentFactory.getInstance('selector', 'timeFormat');
    if (instance) {
      return instance.setValue(format);
    }
    return false;
  },
  
  // Get current format
  getCurrentFormat: () => {
    const instance = ComponentFactory.getInstance('selector', 'timeFormat');
    return instance ? instance.currentValue : null;
  }
};

// Add text input debugging utilities
window.debugTextInputs = {
  // Get all input instances
  getAllInstances: () => ({
    firstName: ComponentFactory.getInstance('input', 'firstName'),
    lastName: ComponentFactory.getInstance('input', 'lastName'),
    nickname: ComponentFactory.getInstance('input', 'nickname')
  }),
  
  // Get all input configurations
  getAllConfigs: () => {
    const instances = window.debugTextInputs.getAllInstances();
    const configs = {};
    
    Object.keys(instances).forEach(key => {
      const instance = instances[key];
      configs[key] = instance ? instance.getConfig() : null;
    });
    
    return configs;
  },
  
  // Set all input values
  setAllValues: (values) => {
    const instances = window.debugTextInputs.getAllInstances();
    const results = {};
    
    Object.keys(values).forEach(key => {
      const instance = instances[key];
      if (instance) {
        results[key] = instance.setValue(values[key]);
      } else {
        results[key] = false;
      }
    });
    
    return results;
  },
  
  // Get all current values
  getAllValues: () => {
    const instances = window.debugTextInputs.getAllInstances();
    const values = {};
    
    Object.keys(instances).forEach(key => {
      const instance = instances[key];
      values[key] = instance ? instance.getValue() : null;
    });
    
    return values;
  },
  
  // Test input validation
  testValidation: () => {
    console.log('Testing input validation...');
    
    const tests = [
      { input: 'firstName', value: 'John', expected: true },
      { input: 'firstName', value: '', expected: false },
      { input: 'lastName', value: 'Doe', expected: true },
      { input: 'lastName', value: '', expected: false },
      { input: 'nickname', value: 'Johnny', expected: true },
      { input: 'nickname', value: 'A'.repeat(51), expected: false }, // Too long
      { input: 'nickname', value: '', expected: true } // Optional
    ];
    
    const instances = window.debugTextInputs.getAllInstances();
    
    tests.forEach(test => {
      const instance = instances[test.input];
      if (instance && instance.validator) {
        const result = instance.validator(test.value);
        const passed = result.isValid === test.expected;
        
        console.log(`${test.input} "${test.value}": ${passed ? '✅' : '❌'} (expected: ${test.expected}, got: ${result.isValid})`);
      }
    });
  }
};

// Specific input debugging helpers
window.debugFirstNameInput = {
  getInstance: () => ComponentFactory.getInstance('input', 'firstName'),
  getConfig: () => {
    const instance = ComponentFactory.getInstance('input', 'firstName');
    return instance ? instance.getConfig() : null;
  },
  setValue: (value) => {
    const instance = ComponentFactory.getInstance('input', 'firstName');
    return instance ? instance.setValue(value) : false;
  },
  getValue: () => {
    const instance = ComponentFactory.getInstance('input', 'firstName');
    return instance ? instance.getValue() : null;
  }
};

window.debugLastNameInput = {
  getInstance: () => ComponentFactory.getInstance('input', 'lastName'),
  getConfig: () => {
    const instance = ComponentFactory.getInstance('input', 'lastName');
    return instance ? instance.getConfig() : null;
  },
  setValue: (value) => {
    const instance = ComponentFactory.getInstance('input', 'lastName');
    return instance ? instance.setValue(value) : false;
  },
  getValue: () => {
    const instance = ComponentFactory.getInstance('input', 'lastName');
    return instance ? instance.getValue() : null;
  }
};

window.debugNicknameInput = {
  getInstance: () => ComponentFactory.getInstance('input', 'nickname'),
  getConfig: () => {
    const instance = ComponentFactory.getInstance('input', 'nickname');
    return instance ? instance.getConfig() : null;
  },
  setValue: (value) => {
    const instance = ComponentFactory.getInstance('input', 'nickname');
    return instance ? instance.setValue(value) : false;
  },
  getValue: () => {
    const instance = ComponentFactory.getInstance('input', 'nickname');
    return instance ? instance.getValue() : null;
  },
  testValidation: (value) => {
    const instance = ComponentFactory.getInstance('input', 'nickname');
    if (instance && instance.validator) {
      return instance.validator(value);
    }
    return null;
  }
};

// Export for potential ES6 module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ComponentFactory };
}
