# Main Branch Slider Specifications - Reference for slider_component_engine

**Date**: 21-May-2025 23:31  
**Purpose**: Exact specifications for implementing slider_component_engine  
**Source**: Main branch sliders (theme-slider.js, time-format-slider.js, slider-buttons.js)  
**Deployment Timestamp**: 20250521233132  

## Overview

This document provides the complete specification for main branch sliders that must be replicated exactly by the slider_component_engine. Every visual detail, behavioral pattern, and animation characteristic documented here represents the exact standard that the engine must achieve.

## Visual Specifications

### Container Structure
```html
<div class="theme-selector">               <!-- Or .time-format-selector -->
  <div class="border-container">
    <div class="border-segment border-top"></div>
    <div class="border-segment border-bottom"></div>
  </div>
  <div class="selector-background"></div>
  <div class="option active" data-position="1" data-theme="dark">
    <h3>Dark</h3>
  </div>
  <div class="option" data-position="2" data-theme="system">
    <h3>System</h3>
  </div>
  <div class="option" data-position="3" data-theme="light">
    <h3>Light</h3>
  </div>
</div>
```

### Visual Appearance (Screenshot Reference)
- **Rounded Container**: Fully rounded slider container with sophisticated styling
- **Purple-to-Blue Gradient**: Active button shows purple-to-royal-blue gradient background
- **Three Options**: Clean three-option layout with equal-width buttons
- **Centered Text**: All text centered within each option area
- **Professional Styling**: Elegant, polished appearance matching screenshot

### Color Specifications
Based on main branch CSS and visual reference:
- **Active Button**: Purple-to-blue gradient (`linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)`)
- **Container Background**: Sophisticated dark background with subtle gradient
- **Text Color**: White text on active button, muted text on inactive buttons
- **Border Effects**: Animated borders that appear on hover

### Typography
- **Font**: Bold, responsive sizing using clamp()
- **Text Content**: Exact text as shown in screenshot:
  - Theme Selector: "Dark", "System", "Light"
  - Time Format Selector: "24h 23:31", "System", "12h 11:31pm"
- **Responsive**: Text scales appropriately with container size

## Behavioral Specifications

### Core Interaction Patterns

#### 1. Button Selection
```javascript
// When option is clicked:
option.addEventListener('click', () => {
  // Remove active class from all options
  options.forEach(opt => opt.classList.remove('active'));
  
  // Add active class to clicked option
  option.classList.add('active');
  
  // Move selector background with animation
  moveBackground(option);
  
  // Call custom handler
  if (onOptionSelected) onOptionSelected(option);
});
```

#### 2. Background Animation
- **Duration**: 0.5s cubic-bezier(0.77, 0, 0.175, 1)
- **Properties**: `left` and `width` (though width stays constant for equal-width buttons)
- **Smooth Movement**: Elegant slide animation between options

#### 3. Hover Border Effects
**Border Animation System:**
- **Border Elements**: `.border-top` and `.border-bottom` elements
- **Width**: 90% of shortest text width in slider
- **Animation In**: Borders slide in from edge (direction based on active button position)
- **Animation Out**: Borders slide out to edge when mouse leaves
- **Duration**: 0.8s cubic-bezier(0.1, 0.8, 0.2, 1)
- **Positioning**: Centered under hovered option text

**Animation Direction Logic:**
- Active position 1 (left): Borders enter from left
- Active position 3 (right): Borders enter from right  
- Active position 2 (center): Direction based on mouse entry side

#### 4. Button Width Equalization
```javascript
// All buttons set to width of widest content
let maxWidth = 0;
options.forEach(option => {
  maxWidth = Math.max(maxWidth, option.offsetWidth);
});
options.forEach(option => {
  option.style.width = `${maxWidth}px`;
});
```

### State Management

#### Active State
- **Single Active**: Only one option can be active at a time
- **data-position**: Each option has position attribute (1, 2, 3)
- **Active Class**: `.active` class applied to selected option
- **Background Position**: Selector background positioned under active option

#### Mouse Tracking
- **Global Tracking**: Mouse position tracked globally for smooth interactions
- **Entry Detection**: Determines which side mouse entered slider from
- **Continuous Monitoring**: Updates every 100ms for responsive behavior
- **State Flags**: Tracks animation state, hover state, recent selection

## Theme Selector Specifications

### Theme Options and Functionality
```javascript
// Theme selector specific options
const themes = [
  { name: 'dark', position: 1, dataAttribute: 'data-theme="dark"' },
  { name: 'system', position: 2, dataAttribute: 'data-theme="system"' },
  { name: 'light', position: 3, dataAttribute: 'data-theme="light"' }
];

// Theme application logic
function applyTheme(themeName) {
  const body = document.body;
  
  if (themeName === 'light') {
    body.setAttribute('data-theme', 'light');
    body.style.backgroundImage = 'linear-gradient(-25deg, var(--light-page-start) 0%, var(--light-page-end) 100%)';
  } else if (themeName === 'dark') {
    body.setAttribute('data-theme', 'dark');
    body.style.backgroundImage = 'linear-gradient(-25deg, var(--dark-page-start) 0%, var(--dark-page-end) 100%)';
  } else if (themeName === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
  }
}
```

### localStorage Integration
```javascript
// Save preference
localStorage.setItem('userThemePreference', themeName);

// Load preference
const savedTheme = localStorage.getItem('userThemePreference') || 'system';
```

## Time Format Selector Specifications

### Live Time Display Feature
**Critical Requirement**: Time format selector shows actual current time

```javascript
// Time formatting function
function formatCurrentTime(use24Hour = false) {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');

  if (use24Hour) {
    hours = hours.toString().padStart(2, '0');
    return `24h ${hours}:${minutes}`;
  } else {
    const period = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `12h ${hours}:${minutes}${period}`;
  }
}

// Update display every second
setInterval(updateTimeDisplay, 1000);
```

### Time Format Options
- **24-hour**: "24h HH:mm" (e.g., "24h 23:31")
- **System**: "System" (static text)
- **12-hour**: "12h H:mmam/pm" (e.g., "12h 11:31pm")

### Time Display Updates
- **Update Interval**: Every 1000ms (1 second)
- **Format Persistence**: Selected format saved to localStorage
- **Dynamic Content**: Live time updates in real-time

## CSS Styling Requirements

### Container Styling
```css
.theme-selector, .time-format-selector {
  border-radius: 9999px;
  background: sophisticated-gradient;
  position: relative;
  display: flex;
  align-items: center;
  /* Additional styling from main branch */
}
```

### Option Styling
```css
.option {
  flex: 1;
  text-align: center;
  cursor: pointer;
  position: relative;
  z-index: 2;
  /* Equal width set by JavaScript */
}

.option.active {
  color: white;
}

.option h3 {
  font-weight: bold;
  font-size: clamp(0.5rem, 1.2vw, 2.3rem);
  margin: 0;
  padding: 0.5rem 1rem;
}
```

### Background Selector Styling
```css
.selector-background {
  position: absolute;
  background: linear-gradient(135deg, #6366f1 0%, #3b82f6 100%);
  border-radius: 9999px;
  height: 100%;
  transition: left 0.5s cubic-bezier(0.77, 0, 0.175, 1), 
              width 0.5s cubic-bezier(0.77, 0, 0.175, 1);
  z-index: 1;
}
```

### Border Animation Styling
```css
.border-top, .border-bottom {
  position: absolute;
  height: 2px;
  background: border-color;
  transition: transform 0.8s cubic-bezier(0.1, 0.8, 0.2, 1);
  z-index: 3;
}

.border-top {
  top: 0;
}

.border-bottom {
  bottom: 0;
}
```

## Animation Specifications

### Background Slide Animation
- **Trigger**: Option click
- **Duration**: 500ms
- **Easing**: cubic-bezier(0.77, 0, 0.175, 1)
- **Properties**: left position (width constant for equal buttons)

### Border Hover Animation
- **Trigger**: Mouse enter/leave slider area
- **Duration**: 800ms
- **Easing**: cubic-bezier(0.1, 0.8, 0.2, 1)
- **Entry**: Slide in from appropriate edge
- **Exit**: Slide out to appropriate edge
- **Width**: 90% of shortest option text width

### Responsive Behavior
- **Window Resize**: Recalculate button widths and positions
- **Text Changes**: Mutation observer recalculates dimensions
- **Dynamic Updates**: Real-time time display updates

## Integration Requirements

### Event Handlers
```javascript
// Custom option selection handler
function handleOptionSelected(option) {
  const value = option.getAttribute('data-theme') || 
                option.getAttribute('data-format');
  
  // Apply functionality (theme change, time format change)
  applySelection(value);
  
  // Save to localStorage
  localStorage.setItem(preferenceKey, value);
}

// Set custom handler
sliderInstance.onOptionSelected = handleOptionSelected;
```

### Initialization Pattern
```javascript
// Standard initialization
const result = sliderButtons.init('.theme-selector');
if (result) {
  sliderButtons.onOptionSelected = customHandler;
  
  // Apply saved preference
  const saved = localStorage.getItem(preferenceKey);
  if (saved) {
    const option = document.querySelector(`[data-value="${saved}"]`);
    if (option) {
      sliderButtons.setActiveOption(option, true); // Skip animation
    }
  }
}
```

## slider_component_engine Requirements

### Engine Interface
```javascript
class slider_component_engine {
  constructor(options, handler) {
    this.options = options;           // Array of option objects
    this.handler = handler;           // Selection callback function
    this.containerId = options.containerId;
    this.sliderClass = options.sliderClass;
  }
  
  // Must replicate exact main branch behavior
  init() { /* Implementation */ }
  setActiveOption(option, skipAnimation) { /* Implementation */ }
  destroy() { /* Cleanup */ }
}
```

### Usage Pattern
```javascript
// Creating theme selector
const themeEngine = new slider_component_engine({
  containerId: 'theme-container',
  sliderClass: 'theme-selector',
  options: [
    { text: 'Dark', value: 'dark', position: 1 },
    { text: 'System', value: 'system', position: 2 },
    { text: 'Light', value: 'light', position: 3 }
  ]
}, (selectedOption) => {
  applyTheme(selectedOption.value);
});

// Creating time format selector
const timeEngine = new slider_component_engine({
  containerId: 'time-format-container', 
  sliderClass: 'time-format-selector',
  options: [
    { text: '24h 00:00', value: '24', position: 1, dynamic: true },
    { text: 'System', value: 'system', position: 2 },
    { text: '12h 12:00am', value: '12', position: 3, dynamic: true }
  ],
  liveTimeUpdate: true
}, (selectedOption) => {
  applyTimeFormat(selectedOption.value);
});
```

## Success Criteria

### Visual Match Requirements
1. **Exact Visual Replication**: Engine sliders must be visually indistinguishable from main branch
2. **Screenshot Comparison**: Side-by-side comparison must show identical appearance
3. **All States Match**: Default, hover, active, and transition states identical
4. **Responsive Behavior**: Identical behavior at all screen sizes

### Behavioral Match Requirements
1. **Animation Timing**: All animations match exact timing and easing
2. **Interaction Patterns**: Click, hover, and keyboard interactions identical
3. **State Management**: Active states and transitions work identically
4. **Live Updates**: Time format selector updates in real-time

### Implementation Requirements
1. **Code Simplicity**: Creating new slider requires minimal code
2. **Configuration-Driven**: All slider variations configurable through options
3. **Reusable Engine**: Same engine handles theme, time format, and future sliders
4. **Memory Management**: Proper cleanup and event handler management

## Reference Files

### Main Branch Implementation Files
- `/js/settings/slider-buttons.js` - Core slider functionality and animations
- `/js/settings/theme-slider.js` - Theme-specific logic and handlers
- `/js/navigation/time-format-slider.js` - Time format logic and live updates
- `/styles/slider-buttons.css` - Sophisticated visual styling

### Visual Reference
- Screenshot: `main_branch_slider_reference` - Shows exact visual appearance
- Live Environment: https://tnjdynamicsite.s3.us-west-2.amazonaws.com/index.html#settings

## Implementation Priority

### Phase 1 Focus
**ONLY** implement slider_component_engine to replicate these exact specifications. No other component types should be developed until the slider engine achieves perfect main branch replication.

### Verification Requirements
1. **Visual Verification**: Screenshot comparison with main branch
2. **Behavioral Verification**: All interactions work identically
3. **Code Verification**: Engine creates sliders with minimal configuration
4. **Performance Verification**: Animations smooth and responsive

This specification document provides the complete blueprint for implementing slider_component_engine to exactly match main branch slider behavior and appearance.

Last Updated: 21-May-2025 23:31
