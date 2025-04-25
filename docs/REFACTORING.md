# Slider System Refactoring - Implementation Plan

## Overview

We've created a modular, extensible system for slider-based selectors that separates core functionality from specific implementations. This allows for easy addition of new selector types without modifying existing code.

## Files Created

### Core Files

- **js/core/slider-core.js** - Core UI/animation functionality
- **js/core/slider-styles.css** - Unified styling for all sliders

### Base Structure

- **js/selectors/selector-base.js** - Abstract base class
- **js/selectors/selector-factory.js** - Registration and lifecycle management
- **js/selectors/selector-init.js** - Module loader

### Implementations

- **js/selectors/theme-selector.js** - Theme selection implementation
- **js/selectors/time-format-selector.js** - Time format selection implementation

### Updated Files

- **js/navigation/router.js** - Updated to use new module system
- **js/main.js** - Updated to work with new structure
- **pages/settings/index.html** - Updated HTML with new class names

## Files to Remove

- js/settings/slider-integration.js
- js/navigation/time-format-slider-integration.js
- js/settings/theme-slider-integration.js

## Implementation Steps

1. **Create Directory Structure**

   - Create `/js/core/` directory
   - Create `/js/selectors/` directory

2. **Remove Obsolete Files**

   - Remove integration files that are no longer needed

3. **Copy New Files**

   - Copy all the new files to their respective directories

4. **Update Existing Files**

   - Update router.js, main.js, and settings/index.html

5. **Test**
   - Test navigation to settings page
   - Test theme selection functionality
   - Test time format selection functionality

## Adding New Selectors

To add a new selector type:

1. Create a new implementation file in `/js/selectors/` that extends `SelectorBase`
2. Register it with the `SelectorFactory` in that file
3. Add the HTML markup to `settings/index.html` using the standard structure

For example, to add a language selector:

```javascript
// js/selectors/language-selector.js
class LanguageSelector extends SelectorBase {
  // Implementation here
}

// Register
window.SelectorFactory.register(
  "language",
  LanguageSelector,
  ".language-selector",
  {
    /* options */
  }
);
```

```html
<!-- HTML in settings/index.html -->
<div class="settings-section">
  <h3>Language</h3>
  <div class="slider-container language-container">
    <div class="slider-selector language-selector">
      <!-- Standard structure -->
    </div>
  </div>
</div>
```
