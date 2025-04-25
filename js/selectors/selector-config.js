/**
 * Selector Configuration
 *
 * Central configuration for all selectors used in the application.
 * This allows for easy addition and modification of selectors.
 */
window.SelectorConfig = {
    // Theme selector
    theme: {
      type: 'generic',
      name: 'theme',
      selector: '.theme-selector',
      values: ['dark', 'system', 'light'],
      labels: ['Dark', 'System', 'Light'],
      defaultValue: 'system',
      storageKey: 'userThemePreference',
      onValueChange: function(value) {
        // Use existing theme functionality
        if (window.themeSelector && typeof window.themeSelector.applyThemeByName === 'function') {
          window.themeSelector.applyThemeByName(value);
        }
      }
    },
    
    // Time format selector
    timeFormat: {
      type: 'time-format',
      name: 'timeFormat',
      selector: '.time-format-selector',
      values: ['12', '24'],
      labels: ['12-hour', '24-hour'],
      defaultValue: '24',
      storageKey: 'userTimeFormatPreference'
    },
    
    // Language selector
    language: {
      type: 'generic',
      name: 'language',
      selector: '.language-selector',
      values: ['en-gb', 'en-us', 'fr', 'de', 'es'],
      labels: ['UK English', 'US English', 'Français', 'Deutsch', 'Español'],
      defaultValue: 'en-gb',
      storageKey: 'userLanguagePreference',
      onValueChange: function(value) {
        console.log(`Language changed to: ${value}`);
        // Language change logic would go here
      }
    },
    
    // First day of week selector
    firstDayOfWeek: {
      type: 'generic',
      name: 'firstDayOfWeek',
      selector: '.first-day-selector',
      values: ['monday', 'sunday', 'saturday'],
      labels: ['Monday', 'Sunday', 'Saturday'],
      defaultValue: 'monday',
      storageKey: 'userFirstDayPreference'
    },
    
    // Date format selector
    dateFormat: {
      type: 'generic',
      name: 'dateFormat',
      selector: '.date-format-selector',
      values: ['dd-mmm-yyyy', 'yyyymmdd', 'mm/dd/yyyy', 'dd/mm/yyyy'],
      labels: ['dd-MMM-yyyy', 'yyyyMMdd', 'MM/dd/yyyy', 'dd/MM/yyyy'],
      defaultValue: 'dd-mmm-yyyy',
      storageKey: 'userDateFormatPreference'
    },
    
    // Measurement units selector
    units: {
      type: 'generic',
      name: 'units',
      selector: '.units-selector',
      values: ['metric', 'imperial'],
      labels: ['Metric', 'Imperial'],
      defaultValue: 'metric',
      storageKey: 'userUnitsPreference'
    }
  };