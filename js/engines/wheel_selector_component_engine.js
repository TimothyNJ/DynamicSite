// wheel_selector_component_engine.js
// Based on iOS7 picker from https://codepen.io/billdami/pen/ExZEoJ

import { text_button_component_engine } from './text_button_component_engine.js';

class wheel_selector_component_engine {
    constructor(options = {}, changeHandler = null) {
        this.config = {
            label: options.label || '',
            options: options.options || [],
            defaultValue: options.defaultValue || null,
            placeholder: options.placeholder || 'Select an option',
            icon: options.icon || null,
            onChange: changeHandler || options.onChange || (() => {}),
            disabled: options.disabled || false,
            required: options.required || false,
            storageKey: options.storageKey || null,
            showOnHover: options.showOnHover !== false, // Default true
            ...options
        };
        
        this.isOpen = false;
        this.selectedIndex = -1;
        this.selectedValue = null;
        this.componentId = `wheel-selector-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.triggerButton = null;
        this.hoverTimeout = null;
        this.closeTimeout = null;
        
        // iOS picker specific properties
        this.cellHeight = 44;
        this.cellAngle = 360 / 58;
        this.radius = 150;
        this.rotation = 0;
        this.startY = 0;
        this.scroll = null;
        this.selected = null;
        this.isScrolling = false;
    }
    
    render(containerId) {
        const container = typeof containerId === 'string' 
            ? document.getElementById(containerId) 
            : containerId;
            
        if (!container) {
            console.error('[WheelSelector] Container not found:', containerId);
            return null;
        }
        
        this.container = container;
        this.container.innerHTML = '';
        
        // Load stored value before rendering
        this.loadStoredValue();
        
        // Get display text
        const selectedOption = this.selectedIndex >= 0 ? this.config.options[this.selectedIndex] : null;
        const displayText = selectedOption ? 
            (typeof selectedOption === 'object' ? selectedOption.text : selectedOption) : 
            this.config.placeholder;
        
        // Create main component wrapper
        const componentWrapper = document.createElement('div');
        componentWrapper.className = 'wheel-selector-container';
        
        const component = document.createElement('div');
        component.className = `wheel-selector-component ${this.config.disabled ? 'disabled' : ''}`;
        component.id = this.componentId;
        component.dataset.open = 'false';
        component.tabIndex = 0;
        
        // Add label if provided
        if (this.config.label) {
            const label = document.createElement('label');
            label.className = 'wheel-selector-label';
            label.textContent = this.config.label;
            component.appendChild(label);
        }
        
        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.id = `${this.componentId}-button`;
        component.appendChild(buttonContainer);
        
        // Create iOS-style picker
        const pickerContainer = document.createElement('div');
        pickerContainer.className = 'ios-picker-container';
        pickerContainer.style.display = 'none';
        
        const picker = document.createElement('div');
        picker.className = 'ios-picker';
        
        // Create the scrollable list
        const scroll = document.createElement('div');
        scroll.className = 'ios-picker-scroll';
        this.scroll = scroll;
        
        // Create all cells positioned around cylinder
        const totalOptions = this.config.options.length;
        for (let i = 0; i < totalOptions; i++) {
            const cell = document.createElement('div');
            cell.className = 'ios-picker-cell';
            cell.dataset.index = i;
            
            const option = this.config.options[i];
            const text = typeof option === 'object' ? option.text : option;
            cell.textContent = text;
            
            if (i === this.selectedIndex) {
                cell.classList.add('selected');
                this.selected = cell;
            }
            
            // Position cell on cylinder
            const angle = i * this.cellAngle;
            cell.style.transform = `rotateX(${angle}deg) translateZ(${this.radius}px)`;
            
            scroll.appendChild(cell);
        }
        
        // Create highlight overlay
        const highlight = document.createElement('div');
        highlight.className = 'ios-picker-highlight';
        
        picker.appendChild(scroll);
        picker.appendChild(highlight);
        pickerContainer.appendChild(picker);
        component.appendChild(pickerContainer);
        
        // Add to container
        componentWrapper.appendChild(component);
        this.container.appendChild(componentWrapper);
        
        // Create text button as trigger
        this.triggerButton = new text_button_component_engine({
            text: displayText,
            active: false,
            disabled: this.config.disabled
        }, () => {
            if (!this.config.disabled && !this.config.showOnHover) {
                this.togglePicker();
            }
        });
        
        // Render the button
        this.triggerButton.render(buttonContainer);
        
        // Attach event listeners
        this.attachEventListeners();
        
        // Set default selection if not already set
        if (this.config.defaultValue && this.selectedValue === null) {
            const defaultIndex = this.config.options.findIndex(opt => 
                opt.value === this.config.defaultValue || opt === this.config.defaultValue
            );
            if (defaultIndex !== -1) {
                this.selectOption(defaultIndex, false);
            }
        }
        
        // Initialize rotation if we have a selection
        if (this.selectedIndex >= 0) {
            this.rotation = -this.selectedIndex * this.cellAngle;
            this.updateRotation();
        }
        
        return component;
    }
    
    loadStoredValue() {
        if (this.config.storageKey) {
            try {
                const stored = localStorage.getItem(this.config.storageKey);
                if (stored) {
                    this.selectedValue = JSON.parse(stored);
                    const index = this.config.options.findIndex(opt => 
                        (typeof opt === 'object' ? opt.value : opt) === this.selectedValue
                    );
                    if (index !== -1) {
                        this.selectedIndex = index;
                    }
                }
            } catch (e) {
                console.error('[WheelSelector] Error loading stored value:', e);
            }
        }
    }
    
    attachEventListeners() {
        const component = this.container.querySelector('.wheel-selector-component');
        const pickerContainer = component.querySelector('.ios-picker-container');
        const buttonContainer = component.querySelector(`#${this.componentId}-button`);
        const picker = component.querySelector('.ios-picker');
        
        // Hover functionality
        if (this.config.showOnHover) {
            component.addEventListener('mouseenter', () => {
                if (!this.config.disabled) {
                    clearTimeout(this.closeTimeout);
                    this.hoverTimeout = setTimeout(() => {
                        this.openPicker();
                    }, 200);
                }
            });
            
            component.addEventListener('mouseleave', () => {
                clearTimeout(this.hoverTimeout);
                this.closeTimeout = setTimeout(() => {
                    this.closePicker();
                }, 300);
            });
        }
        
        // Click functionality (only if not hover mode)
        if (!this.config.showOnHover) {
            buttonContainer.addEventListener('click', (e) => {
                if (!this.config.disabled) {
                    e.stopPropagation();
                    this.togglePicker();
                }
            });
        }
        
        // Close on outside click
        document.addEventListener('click', (e) => {
            if (this.isOpen && !component.contains(e.target)) {
                this.closePicker();
            }
        });
        
        // Touch/Mouse events for scrolling
        const handleStart = (e) => {
            if (this.config.disabled) return;
            
            this.isScrolling = true;
            this.startY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
            e.preventDefault();
        };
        
        const handleMove = (e) => {
            if (!this.isScrolling) return;
            
            const currentY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
            const deltaY = currentY - this.startY;
            this.startY = currentY;
            
            // Convert pixel movement to rotation
            this.rotation += deltaY * 0.3; // Adjust sensitivity
            this.updateRotation();
            
            e.preventDefault();
        };
        
        const handleEnd = (e) => {
            if (!this.isScrolling) return;
            
            this.isScrolling = false;
            
            // Snap to nearest item
            this.snapToNearest();
            
            e.preventDefault();
        };
        
        // Mouse events
        picker.addEventListener('mousedown', handleStart);
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
        
        // Touch events
        picker.addEventListener('touchstart', handleStart, { passive: false });
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('touchend', handleEnd, { passive: false });
        
        // Click on cells
        picker.addEventListener('click', (e) => {
            if (this.isScrolling) return; // Don't select during scroll
            
            const cell = e.target.closest('.ios-picker-cell');
            if (cell && cell.dataset.index) {
                const index = parseInt(cell.dataset.index);
                this.animateToIndex(index);
            }
        });
        
        // Keyboard navigation
        component.addEventListener('keydown', (e) => {
            if (this.config.disabled) return;
            
            switch(e.key) {
                case 'Enter':
                case ' ':
                    e.preventDefault();
                    if (!this.isOpen) {
                        this.openPicker();
                    } else {
                        this.confirmSelection();
                    }
                    break;
                case 'Escape':
                    if (this.isOpen) {
                        this.closePicker();
                    }
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    if (this.isOpen && this.selectedIndex > 0) {
                        this.animateToIndex(this.selectedIndex - 1);
                    }
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    if (this.isOpen && this.selectedIndex < this.config.options.length - 1) {
                        this.animateToIndex(this.selectedIndex + 1);
                    } else if (!this.isOpen) {
                        this.openPicker();
                    }
                    break;
            }
        });
    }
    
    updateRotation() {
        if (this.scroll) {
            this.scroll.style.transform = `rotateX(${this.rotation}deg)`;
            
            // Update cell visibility based on rotation
            const cells = this.scroll.querySelectorAll('.ios-picker-cell');
            cells.forEach((cell, index) => {
                const cellAngle = (index * this.cellAngle + this.rotation) % 360;
                const normalizedAngle = cellAngle > 180 ? cellAngle - 360 : cellAngle;
                
                // Only show cells that are visible (front half of cylinder)
                if (Math.abs(normalizedAngle) < 90) {
                    cell.style.opacity = Math.cos(normalizedAngle * Math.PI / 180);
                    cell.style.visibility = 'visible';
                } else {
                    cell.style.opacity = 0;
                    cell.style.visibility = 'hidden';
                }
            });
        }
    }
    
    snapToNearest() {
        // Calculate nearest index based on rotation
        const totalRotation = -this.rotation;
        const nearestIndex = Math.round(totalRotation / this.cellAngle);
        
        // Clamp to valid range
        const clampedIndex = Math.max(0, Math.min(nearestIndex, this.config.options.length - 1));
        
        this.animateToIndex(clampedIndex);
    }
    
    animateToIndex(index) {
        if (index < 0 || index >= this.config.options.length) return;
        
        // Calculate target rotation
        const targetRotation = -index * this.cellAngle;
        
        // Animate to target
        this.rotation = targetRotation;
        
        if (this.scroll) {
            this.scroll.style.transition = 'transform 0.3s ease-out';
            this.updateRotation();
            
            // Remove transition after animation
            setTimeout(() => {
                if (this.scroll) {
                    this.scroll.style.transition = '';
                }
            }, 300);
        }
        
        // Select the option
        this.selectOption(index);
    }
    
    togglePicker() {
        if (this.isOpen) {
            this.closePicker();
        } else {
            this.openPicker();
        }
    }
    
    openPicker() {
        if (this.isOpen) return;
        
        const component = this.container.querySelector('.wheel-selector-component');
        const pickerContainer = component.querySelector('.ios-picker-container');
        
        this.isOpen = true;
        component.dataset.open = 'true';
        pickerContainer.style.display = 'block';
        
        // Initialize rotation and show
        setTimeout(() => {
            this.updateRotation();
            pickerContainer.classList.add('open');
        }, 10);
        
        // Focus for keyboard navigation
        component.focus();
    }
    
    closePicker() {
        if (!this.isOpen) return;
        
        const component = this.container.querySelector('.wheel-selector-component');
        const pickerContainer = component.querySelector('.ios-picker-container');
        
        this.isOpen = false;
        component.dataset.open = 'false';
        pickerContainer.classList.remove('open');
        
        // Hide after animation
        setTimeout(() => {
            pickerContainer.style.display = 'none';
        }, 300);
    }
    
    confirmSelection() {
        this.closePicker();
    }
    
    selectOption(index, triggerChange = true) {
        if (index < 0 || index >= this.config.options.length) return;
        
        const option = this.config.options[index];
        const value = typeof option === 'object' ? option.value : option;
        const text = typeof option === 'object' ? option.text : option;
        
        this.selectedIndex = index;
        this.selectedValue = value;
        
        // Update visual selection
        if (this.selected) {
            this.selected.classList.remove('selected');
        }
        
        const cells = this.scroll.querySelectorAll('.ios-picker-cell[data-index]');
        cells.forEach(cell => {
            if (parseInt(cell.dataset.index) === index) {
                cell.classList.add('selected');
                this.selected = cell;
            }
        });
        
        // Update button text
        if (this.triggerButton) {
            this.triggerButton.setText(text);
        }
        
        // Save to storage
        if (this.config.storageKey) {
            localStorage.setItem(this.config.storageKey, JSON.stringify(value));
        }
        
        // Trigger callback
        if (triggerChange) {
            this.config.onChange(value, option);
        }
    }
    
    getValue() {
        return this.selectedValue;
    }
    
    setValue(value) {
        const index = this.config.options.findIndex(opt => 
            (typeof opt === 'object' ? opt.value : opt) === value
        );
        if (index !== -1) {
            this.selectOption(index, false);
            if (this.isOpen) {
                this.animateToIndex(index);
            } else {
                // Set initial rotation
                this.rotation = -index * this.cellAngle;
                this.updateRotation();
            }
        }
    }
    
    setOptions(newOptions) {
        this.config.options = newOptions;
        this.selectedIndex = -1;
        this.selectedValue = null;
        this.rotation = 0;
        this.render(this.container);
    }
    
    disable() {
        this.config.disabled = true;
        const component = this.container.querySelector('.wheel-selector-component');
        if (component) {
            component.classList.add('disabled');
        }
        if (this.triggerButton) {
            this.triggerButton.disable();
        }
    }
    
    enable() {
        this.config.disabled = false;
        const component = this.container.querySelector('.wheel-selector-component');
        if (component) {
            component.classList.remove('disabled');
        }
        if (this.triggerButton) {
            this.triggerButton.enable();
        }
    }
}

// Export the class directly
export { wheel_selector_component_engine };
