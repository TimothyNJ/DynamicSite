// wheel_selector_component_engine.js
// Direct implementation from https://codepen.io/billdami/pen/ExZEoJ

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
        
        // iOS picker specific properties from CodePen
        this.scroll = null;
        this.cells = null;
        this.cellHeight = 0;
        this.cellAngle = 0;
        this.currentAngle = 0;
        this.startY = null;
        this.distance = 0;
        this.elDistanceToAngle = 0;
        this.tracker = null;
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
        
        // Create iOS picker exactly like CodePen
        const pickerContainer = document.createElement('div');
        pickerContainer.className = 'ios-ui-select';
        pickerContainer.style.display = 'none';
        
        // Create inner structure from CodePen
        const pickerInner = document.createElement('div');
        pickerInner.innerHTML = `
            <div class="ios-ui-select-inner">
                <div class="ios-ui-select-options">
                    <div class="ios-ui-select-options-container">
                        ${this.config.options.map((option, index) => {
                            const text = typeof option === 'object' ? option.text : option;
                            const selectedClass = index === this.selectedIndex ? ' ios-ui-select-options-selected' : '';
                            return `<div class="ios-ui-select-options-option${selectedClass}" data-index="${index}">${text}</div>`;
                        }).join('')}
                    </div>
                </div>
                <div class="ios-ui-select-overlay"></div>
                <div class="ios-ui-select-highlight">
                    <div class="ios-ui-select-highlight-bar"></div>
                </div>
            </div>
        `;
        
        pickerContainer.appendChild(pickerInner);
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
        
        // Initialize picker after DOM is ready
        setTimeout(() => {
            this.initializePicker();
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
        }, 0);
        
        return component;
    }
    
    initializePicker() {
        // Initialize exactly like CodePen
        this.scroll = this.container.querySelector('.ios-ui-select-options-container');
        this.cells = this.scroll.querySelectorAll('.ios-ui-select-options-option');
        this.cellHeight = this.cells[0].offsetHeight;
        this.cellAngle = 360 / 58;
        this.elDistanceToAngle = this.cellHeight / this.cellAngle;
        
        // Position cells around cylinder
        this.cells.forEach((cell, index) => {
            const angle = this.cellAngle * index;
            cell.style.transform = `rotateX(${angle}deg) translateZ(100px)`;
        });
        
        // Set initial position if we have a selection
        if (this.selectedIndex >= 0) {
            this.currentAngle = this.cellAngle * this.selectedIndex * -1;
            this.scroll.style.transform = `translateZ(-100px) rotateX(${this.currentAngle}deg)`;
        }
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
        const pickerContainer = component.querySelector('.ios-ui-select');
        const buttonContainer = component.querySelector(`#${this.componentId}-button`);
        const options = component.querySelector('.ios-ui-select-options');
        
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
        
        // Touch/Mouse events - exactly from CodePen
        const handleStart = (e) => {
            if (this.config.disabled) return;
            
            e.preventDefault();
            this.startY = e.touches ? e.touches[0].clientY : e.clientY;
            this.isScrolling = true;
            this.distance = 0;
            
            if (this.tracker) {
                this.tracker.stop();
            }
        };
        
        const handleMove = (e) => {
            if (!this.isScrolling) return;
            
            e.preventDefault();
            const currentY = e.touches ? e.touches[0].clientY : e.clientY;
            this.distance = currentY - this.startY;
            this.startY = currentY;
            
            this.currentAngle += this.distance * this.elDistanceToAngle;
            this.scroll.style.transform = `translateZ(-100px) rotateX(${this.currentAngle}deg)`;
        };
        
        const handleEnd = (e) => {
            if (!this.isScrolling) return;
            
            e.preventDefault();
            this.isScrolling = false;
            
            // Snap to nearest cell
            const anglePerCell = this.cellAngle;
            const nearestCellAngle = Math.round(this.currentAngle / anglePerCell) * anglePerCell;
            this.currentAngle = nearestCellAngle;
            
            // Animate to position
            this.scroll.style.transition = 'transform 0.3s ease-out';
            this.scroll.style.transform = `translateZ(-100px) rotateX(${this.currentAngle}deg)`;
            
            // Update selection
            const selectedIndex = Math.round(Math.abs(this.currentAngle) / anglePerCell) % this.cells.length;
            this.selectOption(selectedIndex);
            
            // Remove transition after animation
            setTimeout(() => {
                this.scroll.style.transition = '';
            }, 300);
        };
        
        // Bind events
        if (options) {
            options.addEventListener('mousedown', handleStart);
            options.addEventListener('touchstart', handleStart);
            
            document.addEventListener('mousemove', handleMove);
            document.addEventListener('touchmove', handleMove);
            
            document.addEventListener('mouseup', handleEnd);
            document.addEventListener('touchend', handleEnd);
        }
        
        // Click on cells
        this.cells.forEach((cell, index) => {
            cell.addEventListener('click', (e) => {
                if (!this.isScrolling) {
                    this.animateToIndex(index);
                }
            });
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
    
    animateToIndex(index) {
        if (index < 0 || index >= this.config.options.length) return;
        
        this.currentAngle = this.cellAngle * index * -1;
        this.scroll.style.transition = 'transform 0.3s ease-out';
        this.scroll.style.transform = `translateZ(-100px) rotateX(${this.currentAngle}deg)`;
        
        this.selectOption(index);
        
        setTimeout(() => {
            this.scroll.style.transition = '';
        }, 300);
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
        const pickerContainer = component.querySelector('.ios-ui-select');
        
        this.isOpen = true;
        component.dataset.open = 'true';
        pickerContainer.style.display = 'block';
        
        // Show with animation
        setTimeout(() => {
            pickerContainer.classList.add('open');
        }, 10);
        
        // Focus for keyboard navigation
        component.focus();
    }
    
    closePicker() {
        if (!this.isOpen) return;
        
        const component = this.container.querySelector('.wheel-selector-component');
        const pickerContainer = component.querySelector('.ios-ui-select');
        
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
        this.cells.forEach((cell, i) => {
            if (i === index) {
                cell.classList.add('ios-ui-select-options-selected');
            } else {
                cell.classList.remove('ios-ui-select-options-selected');
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
                this.currentAngle = this.cellAngle * index * -1;
                if (this.scroll) {
                    this.scroll.style.transform = `translateZ(-100px) rotateX(${this.currentAngle}deg)`;
                }
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
