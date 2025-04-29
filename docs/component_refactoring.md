# Component System Refactoring Plan

## Overview

This document outlines the comprehensive plan for refactoring the UI component system to create a more unified, maintainable, and extensible architecture. The goal is to establish a consistent design system that can easily accommodate 12-20 selectors while eliminating redundancy and fragmentation.

## Core Principles

1. **Unified Styling**: All components should share a common style foundation
2. **Consistent Interfaces**: All components should have predictable, uniform APIs
3. **Modular Architecture**: Components should be easily composable and extendable
4. **Minimal Redundancy**: Code duplication should be eliminated
5. **Clear Documentation**: Code should be well-documented for future development

## Phase 1: CSS Consolidation (Completed)

1. ✅ Created unified `component-styles.css` in `js/core/` replacing `slider-styles.css`
2. ✅ Updated `input-styles.css` to import from core styles
3. ✅ Established CSS variables for consistent styling across components

## Phase 2: JavaScript Core Architecture

### 2.1 Component Base Classes

1. Update `selector-base.js` to be more robust and flexible

   - Improve initialization and error handling
   - Create standardized lifecycle methods
   - Establish consistent event handling

2. Create a unified utility module (`js/core/component-utils.js`)

   - Move common DOM manipulation functions here
   - Create shared rendering and measurement utilities
   - Provide consistent animation and transition helpers

3. Update `input-base.js` to align with selector-base patterns
   - Match method signatures and naming conventions
   - Use same initialization approach
   - Share utility functions where appropriate

### 2.2 Factory & Registration System

1. Update `selector-factory.js` to handle all selector types efficiently

   - Improve registration process
   - Add better error handling
   - Support dynamic loading
   - Add type checking

2. Update `input-factory.js` to match selector-factory patterns
   - Align APIs between the two factory systems
   - Consider merging factories into a unified component factory

### 2.3 Configuration System

1. Enhance `selector-config.js` to support all planned selector types

   - Create standardized configuration schema
   - Add validation
   - Support advanced features like dependencies between selectors

2. Update `input-config.js` to use the same configuration approach
   - Match the structure of selector-config
   - Use consistent naming conventions

## Phase 3: Component Implementation

### 3.1 Selector Types

1. Create or update specific selector implementations:

   - `theme-selector.js` (update existing)
   - `time-format-selector.js` (update existing)
   - `language-selector.js` (new)
   - `first-day-selector.js` (new)
   - `date-format-selector.js` (new)
   - `units-selector.js` (new)
   - Additional selectors as needed

2. Consider creating a unified pattern for simple selectors
   - `generic-selector.js` for standard cases
   - Specialized implementations only when needed

### 3.2 Input Types

1. Update input implementations to match new patterns
   - Ensure consistent interface with selectors
   - Create specialized input types as needed

## Phase 4: Integration & HTML Updates

1. Update HTML template in `pages/settings/index.html`

   - Create consistent container structure
   - Use standardized class names
   - Remove redundant containers

2. Update Manager Classes

   - Update `selector-manager.js` to use new system
   - Update `input-manager.js` to match patterns

3. Update initialization scripts
   - Modify `selector-init.js` for new architecture
   - Ensure proper loading order and dependencies

## Phase 5: Testing & Documentation

1. Test all component types

   - Verify initialization
   - Check responsiveness
   - Ensure theme switching works properly
   - Validate all selectors function correctly

2. Create comprehensive documentation
   - Add detailed comments to code
   - Create developer guide for adding new components
   - Document CSS variables and naming conventions

## Implementation Order

1. ✅ CSS Consolidation
2. Core Utility Functions
3. Base Class Updates
4. Factory & Configuration Updates
5. Component Implementation
6. HTML & Integration Updates
7. Testing & Documentation

## Next Immediate Tasks

1. Create `js/core/component-utils.js` utility module
2. Update `selector-base.js` with improved architecture
3. Update `selector-factory.js` to support expanded selector types
4. Update `selector-config.js` with configurations for all planned selectors

This file should be saved as `docs/COMPONENT_REFACTORING.md` to document our approach.
