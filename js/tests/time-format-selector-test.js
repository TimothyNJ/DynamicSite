/**
 * Time Format Selector Test Script
 *
 * This script tests the GenericSelector component configured as a time format selector
 * to ensure it properly replaces the hardcoded time format selector from main branch.
 */

// Wait for all components to be loaded
window.addEventListener('load', () => {
  console.log('=== Time Format Selector Test ===');
  
  // Test 1: Check if ComponentFactory is available
  if (typeof ComponentFactory === 'undefined') {
    console.error('❌ ComponentFactory not available');
    return;
  }
  console.log('✅ ComponentFactory is available');
  
  // Test 2: Check if time format selector is registered
  const registered = ComponentFactory.getRegistered();
  if (!registered.selectors.find(([name]) => name === 'timeFormat')) {
    console.error('❌ Time format selector not registered');
    return;
  }
  console.log('✅ Time format selector is registered');
  
  // Test 3: Get time format selector instance
  const timeFormatInstance = ComponentFactory.getInstance('selector', 'timeFormat');
  if (!timeFormatInstance) {
    console.error('❌ Time format selector instance not created');
    return;
  }
  console.log('✅ Time format selector instance exists');
  
  // Test 4: Check if instance is initialized
  if (!timeFormatInstance.isInitialized) {
    console.error('❌ Time format selector not initialized');
    return;
  }
  console.log('✅ Time format selector is initialized');
  
  // Test 5: Check configuration
  const config = timeFormatInstance.getConfig();
  console.log('Time format selector config:', config);
  
  // Test 6: Test value changes
  console.log('\\n=== Testing time format changes ===');
  
  // Test setting to 12h format
  setTimeout(() => {
    console.log('Setting time format to 12h...');
    const success = timeFormatInstance.setValue('12');
    if (success) {
      console.log('✅ Set to 12h format');
      
      // Check if it was applied
      setTimeout(() => {
        const current = timeFormatInstance.currentValue;
        console.log(`Current time format value: ${current}`);
        
        // Test setting to system format
        setTimeout(() => {
          console.log('Setting time format to system...');
          timeFormatInstance.setValue('system');
          console.log('✅ Set to system format');
          
          // Test setting back to 24h
          setTimeout(() => {
            console.log('Setting time format back to 24h...');
            timeFormatInstance.setValue('24');
            console.log('✅ Set back to 24h format');
            
            console.log('\\n=== Time Format Selector Test Complete ===');
          }, 1000);
        }, 1000);
      }, 500);
    } else {
      console.error('❌ Failed to set 12h format');
    }
  }, 1000);
  
  // Test 7: Test invalid value
  setTimeout(() => {
    console.log('\\n=== Testing invalid value ===');
    const result = timeFormatInstance.setValue('invalid');
    if (!result) {
      console.log('✅ Correctly rejected invalid time format value');
    } else {
      console.error('❌ Should have rejected invalid time format value');
    }
  }, 4000);
  
  // Test 8: Test localStorage persistence
  setTimeout(() => {
    console.log('\\n=== Testing localStorage persistence ===');
    const storedValue = localStorage.getItem('userTimeFormatPreference');
    console.log(`Stored time format preference: ${storedValue}`);
    
    if (storedValue === timeFormatInstance.currentValue) {
      console.log('✅ Time format properly persisted to localStorage');
    } else {
      console.error('❌ Time format not properly persisted to localStorage');
    }
  }, 5000);
  
  // Test 9: Test custom event dispatch
  setTimeout(() => {
    console.log('\\n=== Testing custom event dispatch ===');
    
    let eventFired = false;
    const eventListener = (event) => {
      if (event.detail && event.detail.format) {
        console.log(`✅ timeFormatChanged event fired with format: ${event.detail.format}`);
        eventFired = true;
      }
    };
    
    // Add event listener
    document.addEventListener('timeFormatChanged', eventListener);
    
    // Change format to trigger event
    timeFormatInstance.setValue('12');
    
    // Check if event was fired
    setTimeout(() => {
      if (eventFired) {
        console.log('✅ Custom event system working properly');
      } else {
        console.error('❌ Custom event not fired or not received');
      }
      
      // Clean up event listener
      document.removeEventListener('timeFormatChanged', eventListener);
    }, 500);
  }, 6000);
});

// Add debugging helper
window.testTimeFormatSelector = {
  run: () => {
    console.log('Running time format selector test...');
    const event = new Event('load');
    window.dispatchEvent(event);
  },
  
  getConfig: () => {
    const instance = ComponentFactory.getInstance('selector', 'timeFormat');
    return instance ? instance.getConfig() : null;
  },
  
  setFormat: (format) => {
    const instance = ComponentFactory.getInstance('selector', 'timeFormat');
    return instance ? instance.setValue(format) : false;
  },
  
  getCurrentFormat: () => {
    const instance = ComponentFactory.getInstance('selector', 'timeFormat');
    return instance ? instance.currentValue : null;
  },
  
  // Test all formats
  testAllFormats: async () => {
    const formats = ['24', 'system', '12'];
    const instance = ComponentFactory.getInstance('selector', 'timeFormat');
    
    if (!instance) {
      console.error('Time format selector not available');
      return;
    }
    
    console.log('Testing all time formats...');
    
    for (const format of formats) {
      console.log(`Setting format to: ${format}`);
      const success = instance.setValue(format);
      
      if (success) {
        console.log(`✅ Successfully set to ${format}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        console.error(`❌ Failed to set to ${format}`);
      }
    }
    
    console.log('All format tests complete');
  }
};
