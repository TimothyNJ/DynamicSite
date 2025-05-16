/**
 * Theme Selector Test Script
 *
 * This script tests the GenericSelector component configured as a theme selector
 * to ensure it properly replaces the hardcoded theme selector from main branch.
 */

// Wait for all components to be loaded
window.addEventListener('load', () => {
  console.log('=== Theme Selector Test ===');
  
  // Test 1: Check if ComponentFactory is available
  if (typeof ComponentFactory === 'undefined') {
    console.error('❌ ComponentFactory not available');
    return;
  }
  console.log('✅ ComponentFactory is available');
  
  // Test 2: Check if theme selector is registered
  const registered = ComponentFactory.getRegistered();
  if (!registered.selectors.find(([name]) => name === 'theme')) {
    console.error('❌ Theme selector not registered');
    return;
  }
  console.log('✅ Theme selector is registered');
  
  // Test 3: Get theme selector instance
  const themeInstance = ComponentFactory.getInstance('selector', 'theme');
  if (!themeInstance) {
    console.error('❌ Theme selector instance not created');
    return;
  }
  console.log('✅ Theme selector instance exists');
  
  // Test 4: Check if instance is initialized
  if (!themeInstance.isInitialized) {
    console.error('❌ Theme selector not initialized');
    return;
  }
  console.log('✅ Theme selector is initialized');
  
  // Test 5: Check configuration
  const config = themeInstance.getConfig();
  console.log('Theme selector config:', config);
  
  // Test 6: Test value changes
  console.log('\\n=== Testing theme changes ===');
  
  // Test setting to light theme
  setTimeout(() => {
    console.log('Setting theme to light...');
    const success = themeInstance.setValue('light');
    if (success) {
      console.log('✅ Set to light theme');
      
      // Check if it was applied
      setTimeout(() => {
        const current = themeInstance.currentValue;
        console.log(`Current theme value: ${current}`);
        
        // Test setting back to dark
        setTimeout(() => {
          console.log('Setting theme back to dark...');
          themeInstance.setValue('dark');
          console.log('✅ Set back to dark theme');
          
          console.log('\\n=== Theme Selector Test Complete ===');
        }, 1000);
      }, 500);
    } else {
      console.error('❌ Failed to set light theme');
    }
  }, 1000);
  
  // Test 7: Test invalid value
  setTimeout(() => {
    console.log('\\n=== Testing invalid value ===');
    const result = themeInstance.setValue('invalid');
    if (!result) {
      console.log('✅ Correctly rejected invalid theme value');
    } else {
      console.error('❌ Should have rejected invalid theme value');
    }
  }, 3000);
  
  // Test 8: Test localStorage persistence
  setTimeout(() => {
    console.log('\\n=== Testing localStorage persistence ===');
    const storedValue = localStorage.getItem('userThemePreference');
    console.log(`Stored theme preference: ${storedValue}`);
    
    if (storedValue === themeInstance.currentValue) {
      console.log('✅ Theme properly persisted to localStorage');
    } else {
      console.error('❌ Theme not properly persisted to localStorage');
    }
  }, 4000);
});

// Add debugging helper
window.testThemeSelector = {
  run: () => {
    console.log('Running theme selector test...');
    const event = new Event('load');
    window.dispatchEvent(event);
  },
  
  getConfig: () => {
    const instance = ComponentFactory.getInstance('selector', 'theme');
    return instance ? instance.getConfig() : null;
  },
  
  setTheme: (theme) => {
    const instance = ComponentFactory.getInstance('selector', 'theme');
    return instance ? instance.setValue(theme) : false;
  },
  
  getCurrentTheme: () => {
    const instance = ComponentFactory.getInstance('selector', 'theme');
    return instance ? instance.currentValue : null;
  }
};
