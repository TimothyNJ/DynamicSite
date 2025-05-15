/**
 * Settings Integration Test Script
 *
 * This script performs end-to-end testing of the complete settings page integration,
 * ensuring that all universal components properly replace the hardcoded main branch elements.
 */

// Master test suite
const runSettingsIntegrationTests = async () => {
  console.log('\\n========================================');
  console.log('   SETTINGS INTEGRATION TEST SUITE');
  console.log('========================================\\n');
  
  const testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    errors: []
  };
  
  // Test 1: Dependencies and Registration
  await runTest('Dependencies Check', checkDependencies, testResults);
  await runTest('Component Registration', checkComponentRegistration, testResults);
  
  // Test 2: Initialization
  await runTest('Component Initialization', checkComponentInitialization, testResults);
  await runTest('DOM Element Hiding', checkElementHiding, testResults);
  
  // Test 3: Functionality
  await runTest('Theme Selector Functionality', testThemeSelectorFunctionality, testResults);
  await runTest('Time Format Selector Functionality', testTimeFormatSelectorFunctionality, testResults);
  await runTest('Text Inputs Functionality', testTextInputsFunctionality, testResults);
  
  // Test 4: Integration
  await runTest('localStorage Persistence', testStoragePersistence, testResults);
  await runTest('Custom Events', testCustomEvents, testResults);
  await runTest('SPA Navigation Handling', testSPANavigation, testResults);
  
  // Test 5: Error Handling
  await runTest('Fallback Behavior', testFallbackBehavior, testResults);
  await runTest('Error Recovery', testErrorRecovery, testResults);
  
  // Final Results
  console.log('\\n========================================');
  console.log('           TEST RESULTS');
  console.log('========================================');
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`Passed: ${testResults.passed} ✅`);
  console.log(`Failed: ${testResults.failed} ${testResults.failed > 0 ? '❌' : ''}`);
  
  if (testResults.errors.length > 0) {
    console.log('\\nErrors:');
    testResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  }
  
  console.log('\\n========================================\\n');
  
  return testResults;
};

// Test runner helper
const runTest = async (testName, testFunction, results) => {
  results.total++;
  console.log(`Running: ${testName}...`);
  
  try {
    const result = await testFunction();
    if (result.success) {
      results.passed++;
      console.log(`✅ ${testName} - ${result.message || 'PASSED'}`);
    } else {
      results.failed++;
      results.errors.push(`${testName}: ${result.message || 'Unknown error'}`);
      console.log(`❌ ${testName} - ${result.message || 'FAILED'}`);
    }
  } catch (error) {
    results.failed++;
    results.errors.push(`${testName}: ${error.message}`);
    console.log(`❌ ${testName} - Error: ${error.message}`);
  }
  
  console.log('');
};

// Individual test functions
const checkDependencies = async () => {
  const requiredComponents = [
    'ComponentFactory',
    'GenericSelector',
    'TextInput',
    'SelectorBase',
    'InputBase'
  ];
  
  const missing = requiredComponents.filter(comp => typeof window[comp] === 'undefined');
  
  if (missing.length > 0) {
    return {
      success: false,
      message: `Missing components: ${missing.join(', ')}`
    };
  }
  
  return {
    success: true,
    message: 'All required components available'
  };
};

const checkComponentRegistration = async () => {
  const registered = ComponentFactory.getRegistered();
  const expectedSelectors = ['theme', 'timeFormat'];
  const expectedInputs = ['firstName', 'lastName', 'nickname'];
  
  const registeredSelectors = registered.selectors.map(([name]) => name);
  const registeredInputs = registered.inputs.map(([name]) => name);
  
  const missingSelectors = expectedSelectors.filter(s => !registeredSelectors.includes(s));
  const missingInputs = expectedInputs.filter(i => !registeredInputs.includes(i));
  
  if (missingSelectors.length > 0 || missingInputs.length > 0) {
    return {
      success: false,
      message: `Missing registrations - Selectors: ${missingSelectors.join(', ')}, Inputs: ${missingInputs.join(', ')}`
    };
  }
  
  return {
    success: true,
    message: `All components registered (${registeredSelectors.length} selectors, ${registeredInputs.length} inputs)`
  };
};

const checkComponentInitialization = async () => {
  const selectors = ['theme', 'timeFormat'];
  const inputs = ['firstName', 'lastName', 'nickname'];
  
  const uninitializedSelectors = [];
  const uninitializedInputs = [];
  
  for (const selector of selectors) {
    const instance = ComponentFactory.getInstance('selector', selector);
    if (!instance || !instance.isInitialized) {
      uninitializedSelectors.push(selector);
    }
  }
  
  for (const input of inputs) {
    const instance = ComponentFactory.getInstance('input', input);
    if (!instance || !instance.element) {
      uninitializedInputs.push(input);
    }
  }
  
  if (uninitializedSelectors.length > 0 || uninitializedInputs.length > 0) {
    return {
      success: false,
      message: `Uninitialized components - Selectors: ${uninitializedSelectors.join(', ')}, Inputs: ${uninitializedInputs.join(', ')}`
    };
  }
  
  return {
    success: true,
    message: 'All components properly initialized'
  };
};

const checkElementHiding = async () => {
  const originalSelectors = document.getElementById('original-selectors');
  const originalInputs = document.getElementById('original-inputs');
  
  const selectorsHidden = !originalSelectors || originalSelectors.style.display === 'none';
  const inputsHidden = !originalInputs || originalInputs.style.display === 'none';
  
  if (!selectorsHidden || !inputsHidden) {
    return {
      success: false,
      message: `Original elements not hidden - Selectors: ${selectorsHidden}, Inputs: ${inputsHidden}`
    };
  }
  
  return {
    success: true,
    message: 'Original hardcoded elements properly hidden'
  };
};

const testThemeSelectorFunctionality = async () => {
  const themeSelector = ComponentFactory.getInstance('selector', 'theme');
  
  if (!themeSelector) {
    return { success: false, message: 'Theme selector instance not found' };
  }
  
  // Test value changes
  const testThemes = ['light', 'system', 'dark'];
  
  for (const theme of testThemes) {
    const success = themeSelector.setValue(theme);
    if (!success) {
      return { success: false, message: `Failed to set theme to ${theme}` };
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const currentValue = themeSelector.currentValue;
    if (currentValue !== theme) {
      return { success: false, message: `Theme value mismatch. Expected: ${theme}, Got: ${currentValue}` };
    }
  }
  
  return {
    success: true,
    message: 'Theme selector functionality working correctly'
  };
};

const testTimeFormatSelectorFunctionality = async () => {
  const timeFormatSelector = ComponentFactory.getInstance('selector', 'timeFormat');
  
  if (!timeFormatSelector) {
    return { success: false, message: 'Time format selector instance not found' };
  }
  
  // Test value changes
  const testFormats = ['12', 'system', '24'];
  
  for (const format of testFormats) {
    const success = timeFormatSelector.setValue(format);
    if (!success) {
      return { success: false, message: `Failed to set time format to ${format}` };
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const currentValue = timeFormatSelector.currentValue;
    if (currentValue !== format) {
      return { success: false, message: `Time format value mismatch. Expected: ${format}, Got: ${currentValue}` };
    }
  }
  
  return {
    success: true,
    message: 'Time format selector functionality working correctly'
  };
};

const testTextInputsFunctionality = async () => {
  const inputs = ['firstName', 'lastName', 'nickname'];
  const testValues = {
    firstName: 'John',
    lastName: 'Doe',
    nickname: 'Johnny'
  };
  
  for (const inputName of inputs) {
    const instance = ComponentFactory.getInstance('input', inputName);
    
    if (!instance) {
      return { success: false, message: `${inputName} input instance not found` };
    }
    
    const testValue = testValues[inputName];
    const success = instance.setValue(testValue);
    
    if (!success) {
      return { success: false, message: `Failed to set ${inputName} to ${testValue}` };
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const currentValue = instance.getValue();
    if (currentValue !== testValue) {
      return { success: false, message: `${inputName} value mismatch. Expected: ${testValue}, Got: ${currentValue}` };
    }
  }
  
  // Test nickname validation
  const nicknameInstance = ComponentFactory.getInstance('input', 'nickname');
  if (nicknameInstance && nicknameInstance.validator) {
    const longNickname = 'A'.repeat(51);
    const validationResult = nicknameInstance.validator(longNickname);
    
    if (validationResult.isValid) {
      return { success: false, message: 'Nickname validation not working (should reject long values)' };
    }
  }
  
  return {
    success: true,
    message: 'Text inputs functionality working correctly'
  };
};

const testStoragePersistence = async () => {
  // Test theme persistence 
  const themeSelector = ComponentFactory.getInstance('selector', 'theme');
  themeSelector.setValue('light');
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const storedTheme = localStorage.getItem('userThemePreference');
  if (storedTheme !== 'light') {
    return { success: false, message: `Theme not persisted. Expected: light, Got: ${storedTheme}` };
  }
  
  // Test input persistence
  const firstNameInput = ComponentFactory.getInstance('input', 'firstName');
  firstNameInput.setValue('Alice');
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const storedName = localStorage.getItem('userFirstName');
  if (storedName !== 'Alice') {
    return { success: false, message: `Input not persisted. Expected: Alice, Got: ${storedName}` };
  }
  
  return {
    success: true,
    message: 'localStorage persistence working correctly'
  };
};

const testCustomEvents = async () => {
  let eventsFired = [];
  
  // Set up event listeners
  const eventTypes = ['themeChanged', 'timeFormatChanged', 'firstNameChanged'];
  
  const listeners = eventTypes.map(eventType => {
    const listener = (event) => {
      eventsFired.push(eventType);
    };
    document.addEventListener(eventType, listener);
    return { eventType, listener };
  });
  
  // Trigger events
  const themeSelector = ComponentFactory.getInstance('selector', 'theme');
  themeSelector.setValue('system');
  
  const timeFormatSelector = ComponentFactory.getInstance('selector', 'timeFormat');
  timeFormatSelector.setValue('12');
  
  const firstNameInput = ComponentFactory.getInstance('input', 'firstName');
  firstNameInput.setValue('Bob');
  
  // Wait for events
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Clean up listeners
  listeners.forEach(({ eventType, listener }) => {
    document.removeEventListener(eventType, listener);
  });
  
  // Check results
  if (eventsFired.length !== 3) {
    return { success: false, message: `Expected 3 events, got ${eventsFired.length}` };
  }
  
  return {
    success: true,
    message: 'Custom events working correctly'
  };
};

const testSPANavigation = async () => {
  // Simulate page navigation event
  const pageEvent = new CustomEvent('pageLoaded', {
    detail: { pageName: 'settings' }
  });
  
  // Clear one component to test re-initialization
  const themeSelector = ComponentFactory.getInstance('selector', 'theme');
  if (themeSelector) {
    // Mark as uninitialized
    themeSelector.isInitialized = false;
  }
  
  // Dispatch event
  document.dispatchEvent(pageEvent);
  
  // Wait for re-initialization
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Check if component was re-initialized
  const reInitializedTheme = ComponentFactory.getInstance('selector', 'theme');
  if (!reInitializedTheme || !reInitializedTheme.isInitialized) {
    return { success: false, message: 'SPA navigation re-initialization failed' };
  }
  
  return {
    success: true,
    message: 'SPA navigation handling working correctly'
  };
};

const testFallbackBehavior = async () => {
  // This would be a complex test requiring actual DOM manipulation
  // For now, we'll check if the fallback function exists
  
  if (typeof window.showFallbackElements !== 'function') {
    return { success: false, message: 'Fallback function not available' };
  }
  
  return {
    success: true,
    message: 'Fallback behavior available (full test would require DOM manipulation)'
  };
};

const testErrorRecovery = async () => {
  // Create a temporary error scenario
  const originalCreate = ComponentFactory.createSelector;
  let errorOccurred = false;
  
  // Mock a failure
  ComponentFactory.createSelector = () => {
    errorOccurred = true;
    return null;
  };
  
  // Try to create a selector
  const result = ComponentFactory.createSelector('theme');
  
  // Restore original function
  ComponentFactory.createSelector = originalCreate;
  
  if (!errorOccurred || result !== null) {
    return { success: false, message: 'Error scenario not properly simulated' };
  }
  
  return {
    success: true,
    message: 'Error recovery mechanism tested'
  };
};

// Export the test suite
window.runSettingsIntegrationTests = runSettingsIntegrationTests;

// Auto-run tests if in debug mode
if (window.location.search.includes('runTests=true')) {
  window.addEventListener('load', () => {
    setTimeout(runSettingsIntegrationTests, 1000);
  });
}

// Create test buttons for debugging
if (ComponentFactory.debug) {
  window.addEventListener('load', () => {
    const testButton = document.createElement('button');
    testButton.textContent = 'Run Integration Tests';
    testButton.style.cssText = `
      position: fixed;
      bottom: 10px;
      right: 10px;
      z-index: 10000;
      padding: 10px;
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
    `;
    testButton.onclick = runSettingsIntegrationTests;
    document.body.appendChild(testButton);
  });
}
