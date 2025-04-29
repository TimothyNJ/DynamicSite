this is a newer file than component refactoring.md

# Component Architecture Plan

## Overview

This document outlines the comprehensive architecture for UI components in our application. The system is designed around a modular, inheritance-based approach with shared core functionality and specialized implementations.

## Folder Structure

```
js/
  core/
    component-base.js          // Base component class for all UI components
    component-styles.css       // Core styles shared by all components
    component-utils.js         // Utility functions
    alpha-numeric-input.js     // Core input implementation with validation
    selector-base.js           // Base selector implementation
    user-settings-config.js    // Central configuration for all components
  components/
    slider-selector.js         // Slider style selector implementation
    time-picker.js             // Time selection component
    round-button.js            // Single round button implementation
    date-picker.js             // Date selection implementation
    dropdown-select.js         // Dropdown menu implementation (includes icon support)
    searchable-select.js       // Enhanced dropdown with search functionality
    file-uploader.js           // File upload component
```

## Core Components

### ComponentBase (`component-base.js`)

- Abstract base class for all UI components
- Handles lifecycle (initialization, updates, cleanup)
- Provides event management
- Manages DOM interaction
- Handles state persistence

### AlphaNumericInput (`alpha-numeric-input.js`)

- Extends ComponentBase
- Provides text input with validation
- Supports patterns, required fields, and error messages
- Handles different input modes (text, numeric, email, etc.)
- Replaces basic text input with more sophisticated functionality

### SelectorBase (`selector-base.js`)

- Extends ComponentBase
- Base for all selector-type components
- Handles option selection and management
- Provides consistent interaction patterns

### Component Utilities (`component-utils.js`)

- Shared utility functions
- DOM measurement and manipulation
- Text and layout calculations
- Event handling helpers

### Core Styles (`component-styles.css`)

- Unified styling for all components
- CSS variables for theming
- Responsive design rules
- Animation and transition definitions

## Component Implementations

### Slider Selector

- Multi-option selection with sliding indicator
- Used for preferences like theme, language, time format

### Time Picker

- Specialized input for time selection
- Can be combined for time ranges

### Round Button

- Circular button component
- Used for toggles and simple interactions

### Date Picker

- Calendar-based date selection
- Supports various date formats

### Dropdown Select

- Menu-based selection for longer lists
- Supports icons and custom rendering

### Searchable Select

- Enhanced dropdown with filtering capability
- For large data sets like countries or languages

### File Uploader

- File selection and upload interface
- Preview and validation capabilities

## Configuration

The `user-settings-config.js` file provides centralized configuration for all components, including:

- Default values
- Validation rules
- Labels and options
- Storage keys for persistence

## Implementation Strategy

1. Complete the core architecture files first
2. Implement basic components that others depend on
3. Add specialized components
4. Create consistent styling across all components
5. Implement validation and feedback mechanisms
6. Ensure proper event propagation between components

## User Settings Configuration

The user settings system includes:

- Personal information (name, profile)
- Appearance preferences (theme, language)
- Time and date settings (format, timezone)
- Work hours and availability
- Measurement units and regional settings
- Contact information
- Notification preferences

Each section uses appropriate component types with consistent styling and interaction patterns.
