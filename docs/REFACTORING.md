# UI Components Refactoring - Implementation Plan

## Overview

We've created modular, extensible systems for interactive UI components that separate core functionality from specific implementations. These systems include slider-based selectors and text input fields with consistent styling and no labels for a clean, minimal interface.

## Files Created

### Core Files

- **js/core/slider-core.js** - Core UI/animation functionality for sliders
- **js/core/slider-styles.css** - Unified styling for all sliders
- **js/core/input-styles.css** - Unified styling for all input fields

### Selector System

- **js/selectors/selector-base.js** - Abstract base class for selectors
- **js/selectors/selector-factory.js** - Registration and lifecycle management
- **js/selectors/selector-init.js** - Module loader
- **js/selectors/selector-manager.js** - Manages creation and HTML generation

### Input System

- **js/inputs/input-base.js** - Abstract base class for input fields
- **js/inputs/input-factory.js** - Registration and lifecycle management
- **js/inputs/input-config.js** - Configuration for all input fields
- **js/inputs/input-manager.js** - Manages creation and HTML generation

### Implementations

- **js/selectors/theme-selector.js** - Theme selection implementation
- **js/selectors/time-format-selector.js** - Time format selection implementation

### Updated Files

- **js/navigation/router.js** - Updated to use new module systems
- **js/main.js** - Updated to work with new structure
- **pages/settings/index.html** - Updated HTML with new structure and no labels

## Files to Remove

- js/settings/slider-integration.js
- js/navigation/time-format-slider-integration.js
- js/settings/theme-slider-integration.js

## Implementation Steps

1. **Create Directory Structure**

   - Create `/js/core/` directory
   - Create `/js/selectors/` directory
   - Create `/js/inputs/` directory

2. **Remove Obsolete Files**

   - Remove integration files that are no longer needed

3. **Copy New Files**

   - Copy all the new files to their respective directories

4. **Update Existing Files**

   - Update router.js, main.js, and settings/index.html
   - Remove all labels from selector and input HTML generation

5. **Test**
   - Test navigation to settings page
   - Test all selector functionality
   - Test all input field functionality
   - Verify consistent styling across components

## Adding New Selectors

To add a new selector type:

1. Create a new implementation file in `/js/selectors/` that extends `SelectorBase`
2. Register it with the `SelectorFactory` in that file
3. Add the selector to the configuration in `selector-config.js`

For example, to add a language selector:

```javascript
// In selector-config.js
language: {
  type: 'generic',
  name: 'language',
  selector: '.language-selector',
  values: ['en-gb', 'en-us', 'fr', 'de', 'es'],
  labels: ['UK English', 'US English', 'Français', 'Deutsch', 'Español'],
  defaultValue: 'en-gb',
  storageKey: 'userLanguagePreference'
}
```
