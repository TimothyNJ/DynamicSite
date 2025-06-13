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
        this.currentAngle = 0;
        this.distance = 0;
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
        
        // Add empty cells at beginning and end for scrolling
        for (let i = 0; i < 3; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'ios-picker-cell';
            scroll.appendChild(emptyCell);
        }
        
        // Add option cells
        this.config.options.forEach((option, index) => {
            const cell = document.createElement('div');
            cell.className = 'ios-picker-cell';
            cell.dataset.index = index;
            
            const text = typeof option === 'object' ? option.text : option;
            cell.textContent = text;
            
            if (index === this.selectedIndex) {
                cell.classList.add('selected');
                this.selected = cell;
            }
            
            scroll.appendChild(cell);
        });
        
        // Add empty cells at end
        for (let i = 0; i < 3; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'ios-picker-cell';
            scroll.appendChild(emptyCell);
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
        
        // Initialize scroll position if we have a selection
        if (this.selectedIndex >= 0) {
            this.currentAngle = this.selectedIndex * this.cellAngle;
            this.scroll.style.transform = `translateY(${-this.selectedIndex * this.cellHeight + 88}px)`;
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
        const scroll = this.scroll;
        
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
            scroll.style.transition = 'none';
            e.preventDefault();
        };
        
        const handleMove = (e) => {
            if (!this.isScrolling) return;
            
            const currentY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
            const deltaY = currentY - this.startY;
            
            const currentTransform = scroll.style.transform || 'translateY(88px)';
            const currentY_transform = parseInt(currentTransform.match(/translateY\((-?\d+)px\)/)[1]);
            
            scroll.style.transform = `translateY(${currentY_transform + deltaY}px)`;
            this.startY = currentY;
            
            // Update current angle based on position
            this.currentAngle = -(currentY_transform + deltaY - 88) / this.cellHeight * this.cellAngle;
            
            // Apply 3D rotation to cells
            this.updateCellRotations();
            
            e.preventDefault();
        };
        
        const handleEnd = (e) => {
            if (!this.isScrolling) return;
            
            this.isScrolling = false;
            scroll.style.transition = 'transform 0.3s ease-out';
            
            // Snap to nearest item
            this.snapToNearest();
            
            e.preventDefault();
        };
        
        // Mouse events
        scroll.addEventListener('mousedown', handleStart);
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
        
        // Touch events
        scroll.addEventListener('touchstart', handleStart, { passive: false });
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('touchend', handleEnd, { passive: false });
        
        // Click on cells
        scroll.addEventListener('click', (e) => {
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
    
    updateCellRotations() {
        const cells = this.scroll.querySelectorAll('.ios-picker-cell');
        const angle = this.currentAngle;
        
        cells.forEach((cell, index) => {
            const cellAngle = angle - (index - 3) * this.cellAngle;
            
            // Only apply rotation to cells near the center
            if (Math.abs(cellAngle) < 90) {
                cell.style.transform = `rotateX(${cellAngle}deg) translateZ(150px)`;
                cell.style.opacity = Math.cos(cellAngle * Math.PI / 180);
            } else {
                cell.style.transform = 'none';
                cell.style.opacity = 0;
            }
        });
    }
    
    snapToNearest() {
        const currentTransform = this.scroll.style.transform || 'translateY(88px)';
        const currentY = parseInt(currentTransform.match(/translateY\((-?\d+)px\)/)[1]);
        
        // Calculate nearest index
        const offset = -(currentY - 88);
        const nearestIndex = Math.round(offset / this.cellHeight);
        
        // Clamp to valid range
        const clampedIndex = Math.max(0, Math.min(nearestIndex, this.config.options.length - 1));
        
        this.animateToIndex(clampedIndex);
    }
    
    animateToIndex(index) {
        if (index < 0 || index >= this.config.options.length) return;
        
        // Calculate target position
        const targetY = -index * this.cellHeight + 88;
        this.scroll.style.transform = `translateY(${targetY}px)`;
        
        // Update angle
        this.currentAngle = index * this.cellAngle;
        
        // Update rotations with animation
        setTimeout(() => {
            this.updateCellRotations();
        }, 10);
        
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
        
        // Initialize rotation
        setTimeout(() => {
            this.updateCellRotations();
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
                // Set initial position
                this.currentAngle = index * this.cellAngle;
                this.scroll.style.transform = `translateY(${-index * this.cellHeight + 88}px)`;
            }
        }
    }
    
    setOptions(newOptions) {
        this.config.options = newOptions;
        this.selectedIndex = -1;
        this.selectedValue = null;
        this.currentAngle = 0;
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
