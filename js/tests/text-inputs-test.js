/**
 * Text Input Test Script
 *
 * This script tests the TextInput components configured to replace the hardcoded
 * text inputs from the main branch (firstName, lastName, nickname).
 */

// Wait for all components to be loaded
window.addEventListener('load', () => {
  console.log('=== Text Input Components Test ===');
  
  // Test 1: Check if ComponentFactory is available
  if (typeof ComponentFactory === 'undefined') {
    console.error('❌ ComponentFactory not available');
    return;
  }
  console.log('✅ ComponentFactory is available');
  
  // Test 2: Check if all text inputs are registered
  const registered = ComponentFactory.getRegistered();
  const inputNames = ['firstName', 'lastName', 'nickname'];
  
  const registeredInputs = registered.inputs.map(([name]) => name);
  const allRegistered = inputNames.every(name => registeredInputs.includes(name));
  
  if (!allRegistered) {
    console.error('❌ Not all text inputs are registered. Expected:', inputNames, 'Found:', registeredInputs);
    return;
  }
  console.log('✅ All text inputs are registered');
  
  // Test 3: Get all input instances
  const instances = {};
  let allInstancesExist = true;
  
  for (const inputName of inputNames) {
    const instance = ComponentFactory.getInstance('input', inputName);
    if (!instance) {
      console.error(`❌ ${inputName} instance not created`);
      allInstancesExist = false;
    } else {
      instances[inputName] = instance;
    }
  }
  
  if (!allInstancesExist) {
    return;
  }
  console.log('✅ All text input instances exist');
  
  // Test 4: Check if instances are initialized
  let allInitialized = true;
  for (const [name, instance] of Object.entries(instances)) {
    if (!instance.element) {
      console.error(`❌ ${name} input not initialized (no DOM element)`);
      allInitialized = false;
    }
  }
  
  if (!allInitialized) {
    return;
  }
  console.log('✅ All text inputs are initialized');
  
  // Test 5: Check configurations
  console.log('\\n=== Input Configurations ===');
  for (const [name, instance] of Object.entries(instances)) {
    const config = instance.getConfig();
    console.log(`${name} config:`, config);
  }
  
  // Test 6: Test value changes
  console.log('\\n=== Testing value changes ===');
  
  setTimeout(() => {
    // Test firstName
    console.log('Setting first name to "John"...');
    const firstNameSuccess = instances.firstName.setValue('John');
    if (firstNameSuccess) {
      console.log('✅ First name set successfully');
      
      setTimeout(() => {
        const currentValue = instances.firstName.getValue();
        console.log(`Current first name value: ${currentValue}`);
        
        // Test lastName
        console.log('Setting last name to "Doe"...');
        const lastNameSuccess = instances.lastName.setValue('Doe');
        if (lastNameSuccess) {
          console.log('✅ Last name set successfully');
          
          setTimeout(() => {
            // Test nickname
            console.log('Setting nickname to "Johnny"...');
            const nicknameSuccess = instances.nickname.setValue('Johnny');
            if (nicknameSuccess) {
              console.log('✅ Nickname set successfully');
              
              console.log('\\n=== Current Values ===');
              console.log('First Name:', instances.firstName.getValue());
              console.log('Last Name:', instances.lastName.getValue());
              console.log('Nickname:', instances.nickname.getValue());
            } else {
              console.error('❌ Failed to set nickname');
            }
          }, 500);
        } else {
          console.error('❌ Failed to set last name');
        }
      }, 500);
    } else {
      console.error('❌ Failed to set first name');
    }
  }, 1000);
  
  // Test 7: Test localStorage persistence
  setTimeout(() => {
    console.log('\\n=== Testing localStorage persistence ===');
    
    const persistenceTests = [
      { name: 'firstName', instance: instances.firstName, storageKey: 'userFirstName' },
      { name: 'lastName', instance: instances.lastName, storageKey: 'userLastName' },
      { name: 'nickname', instance: instances.nickname, storageKey: 'userNickname' }
    ];
    
    persistenceTests.forEach(test => {
      const storedValue = localStorage.getItem(test.storageKey);
      const currentValue = test.instance.getValue();
      
      if (storedValue === currentValue) {
        console.log(`✅ ${test.name} properly persisted: ${storedValue}`);
      } else {
        console.error(`❌ ${test.name} not properly persisted. Stored: ${storedValue}, Current: ${currentValue}`);
      }
    });
  }, 3000);
  
  // Test 8: Test validation
  setTimeout(() => {
    console.log('\\n=== Testing validation ===');
    
    // Test empty values
    console.log('Testing empty values...');
    const emptyFirstName = instances.firstName.setValue('');
    const emptyLastName = instances.lastName.setValue('');
    const emptyNickname = instances.nickname.setValue('');
    
    console.log(`Empty first name: ${emptyFirstName ? 'allowed' : 'blocked'}`);
    console.log(`Empty last name: ${emptyLastName ? 'allowed' : 'blocked'}`);
    console.log(`Empty nickname: ${emptyNickname ? 'allowed' : 'blocked'} (should be allowed)`);
    
    // Test nickname length validation
    setTimeout(() => {
      console.log('\\nTesting nickname length validation...');
      const longNickname = 'A'.repeat(51); // Too long
      const validNickname = 'A'.repeat(25); // Valid length
      
      if (instances.nickname.validator) {
        const longResult = instances.nickname.validator(longNickname);
        const validResult = instances.nickname.validator(validNickname);
        
        console.log(`Long nickname (51 chars): ${longResult.isValid ? '✅ allowed' : '❌ rejected'} - ${longResult.message}`);
        console.log(`Valid nickname (25 chars): ${validResult.isValid ? '✅ allowed' : '❌ rejected'}`);
      } else {
        console.log('❌ Nickname validator not found');
      }
    }, 1000);
  }, 4000);
  
  // Test 9: Test custom events
  setTimeout(() => {
    console.log('\\n=== Testing custom events ===');
    
    let eventsFired = [];
    
    // Add event listeners
    ['firstNameChanged', 'lastNameChanged', 'nicknameChanged'].forEach(eventName => {
      document.addEventListener(eventName, (event) => {
        console.log(`✅ ${eventName} event fired with value: ${event.detail.value}`);
        eventsFired.push(eventName);
      });
    });
    
    // Change values to trigger events
    setTimeout(() => {
      instances.firstName.setValue('Jane');
      instances.lastName.setValue('Smith');
      instances.nickname.setValue('Janie');
      
      // Check if all events were fired
      setTimeout(() => {
        console.log('\\nEvent summary:');
        console.log(`Events fired: ${eventsFired.length}/3`);
        
        if (eventsFired.length === 3) {
          console.log('✅ All custom events working properly');
        } else {
          console.error('❌ Some custom events not fired');
        }
      }, 500);
    }, 500);
  }, 6000);
  
  // Test 10: Test bulk operations
  setTimeout(() => {
    console.log('\\n=== Testing bulk operations ===');
    
    const testValues = {
      firstName: 'Alice',
      lastName: 'Johnson',
      nickname: 'Ali'
    };
    
    console.log('Setting all values:', testValues);
    const results = window.debugTextInputs.setAllValues(testValues);
    console.log('Results:', results);
    
    setTimeout(() => {
      const currentValues = window.debugTextInputs.getAllValues();
      console.log('Current values:', currentValues);
      
      const allMatch = Object.keys(testValues).every(key => 
        testValues[key] === currentValues[key]
      );
      
      if (allMatch) {
        console.log('✅ Bulk operations working correctly');
      } else {
        console.error('❌ Bulk operations failed');
      }
      
      console.log('\\n=== Text Input Test Complete ===');
    }, 500);
  }, 8000);
});

// Add debugging helper
window.testTextInputs = {
  run: () => {
    console.log('Running text input tests...');
    const event = new Event('load');
    window.dispatchEvent(event);
  },
  
  getAllConfigs: () => {
    return window.debugTextInputs.getAllConfigs();
  },
  
  getAllValues: () => {
    return window.debugTextInputs.getAllValues();
  },
  
  setAllValues: (values) => {
    return window.debugTextInputs.setAllValues(values);
  },
  
  testValidation: () => {
    return window.debugTextInputs.testValidation();
  },
  
  // Test specific input
  testInput: (inputName, value) => {
    const instance = ComponentFactory.getInstance('input', inputName);
    if (!instance) {
      console.error(`Input ${inputName} not found`);
      return false;
    }
    
    console.log(`Testing ${inputName} with value: "${value}"`);
    const success = instance.setValue(value);
    
    if (success) {
      console.log(`✅ ${inputName} set to: ${instance.getValue()}`);
    } else {
      console.error(`❌ Failed to set ${inputName}`);
    }
    
    return success;
  },
  
  // Restore from localStorage
  restoreAllFromStorage: () => {
    console.log('Restoring all inputs from localStorage...');
    
    const inputs = ['firstName', 'lastName', 'nickname'];
    const results = {};
    
    inputs.forEach(inputName => {
      const instance = ComponentFactory.getInstance('input', inputName);
      if (instance) {
        const storageKey = instance.options.storageKey;
        const storedValue = localStorage.getItem(storageKey);
        
        if (storedValue) {
          const success = instance.setValue(storedValue, true);
          results[inputName] = { 
            success, 
            value: storedValue,
            storageKey 
          };
          console.log(`${inputName}: ${success ? '✅' : '❌'} restored "${storedValue}"`);
        } else {
          results[inputName] = { 
            success: false, 
            value: null,
            storageKey 
          };
          console.log(`${inputName}: no stored value found`);
        }
      }
    });
    
    return results;
  }
};
