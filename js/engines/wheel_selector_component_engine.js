// wheel_selector_component_engine.js

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
        
        // Cylinder effect properties
        this.currentRotation = 0;
        this.itemAngle = 36; // Degrees between items
        this.radius = 100; // Cylinder radius
        this.isDragging = false;
        this.startY = 0;
        this.velocity = 0;
        this.animationId = null;
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
        
        // Create wheel panel with 3D structure
        const wheelPanel = document.createElement('div');
        wheelPanel.className = 'wheel-panel';
        wheelPanel.style.display = 'none';
        
        const wheelPerspective = document.createElement('div');
        wheelPerspective.className = 'wheel-perspective';
        
        const wheelCylinder = document.createElement('div');
        wheelCylinder.className = 'wheel-cylinder';
        
        // Create wheel items
        this.createWheelItems(wheelCylinder);
        
        wheelPerspective.appendChild(wheelCylinder);
        wheelPanel.appendChild(wheelPerspective);
        
        // Add selection indicator
        const indicator = document.createElement('div');
        indicator.className = 'wheel-selection-indicator';
        wheelPanel.appendChild(indicator);
        
        component.appendChild(wheelPanel);
        
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
                this.toggleWheel();
            }
        });
        
        // Render the button
        this.triggerButton.render(buttonContainer);
        
        // Attach event listeners
        this.attachEventListeners();
        
        // Set default selection if not already set
        if (this.config.defaultValue && !this.selectedValue) {
            const defaultIndex = this.config.options.findIndex(opt => 
                opt.value === this.config.defaultValue || opt === this.config.defaultValue
            );
            if (defaultIndex !== -1) {
                this.selectOption(defaultIndex);
                this.currentRotation = -defaultIndex * this.itemAngle;
                this.updateCylinderRotation();
            }
        }
        
        return component;
    }
    
    createWheelItems(cylinder) {
        // Create items for the visible range (about 9 items visible at once)
        const visibleItems = 9;
        const halfVisible = Math.floor(visibleItems / 2);
        
        for (let i = -halfVisible; i <= halfVisible; i++) {
            const item = document.createElement('div');
            item.className = 'wheel-item';
            item.dataset.offset = i;
            
            const span = document.createElement('span');
            span.className = 'wheel-item-text';
            
            item.appendChild(span);
            cylinder.appendChild(item);
        }
        
        this.updateWheelItems();
    }
    
    updateWheelItems() {
        const items = this.container.querySelectorAll('.wheel-item');
        const currentIndex = Math.round(-this.currentRotation / this.itemAngle);
        const optionsLength = this.config.options.length;
        
        items.forEach((item) => {
            const offset = parseInt(item.dataset.offset);
            const index = ((currentIndex + offset) % optionsLength + optionsLength) % optionsLength;
            const option = this.config.options[index];
            
            const text = typeof option === 'object' ? option.text : option;
            const span = item.querySelector('.wheel-item-text');
            span.textContent = text;
            
            // Update selection state
            item.classList.toggle('selected', index === this.selectedIndex);
            
            // Position on cylinder
            const angle = offset * this.itemAngle;
            const transform = `rotateX(${angle}deg) translateZ(${this.radius}px)`;
            item.style.transform = transform;
            
            // Calculate opacity based on position
            const absOffset = Math.abs(offset);
            let opacity = 1;
            if (absOffset === 0) opacity = 1;
            else if (absOffset === 1) opacity = 0.8;
            else if (absOffset === 2) opacity = 0.6;
            else if (absOffset === 3) opacity = 0.4;
            else opacity = 0.2;
            
            item.style.opacity = opacity;
        });
    }
    
    updateCylinderRotation() {
        const cylinder = this.container.querySelector('.wheel-cylinder');
        if (cylinder) {
            cylinder.style.transform = `rotateX(${this.currentRotation}deg)`;
        }
        this.updateWheelItems();
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
        const wheelPanel = component.querySelector('.wheel-panel');
        const buttonContainer = component.querySelector(`#${this.componentId}-button`);
        
        // Hover functionality
        if (this.config.showOnHover) {
            component.addEventListener('mouseenter', () => {
                if (!this.config.disabled) {
                    clearTimeout(this.closeTimeout);
                    this.hoverTimeout = setTimeout(() => {
                        this.openWheel();
                    }, 200);
                }
            });
            
            component.addEventListener('mouseleave', () => {
                clearTimeout(this.hoverTimeout);
                this.closeTimeout = setTimeout(() => {
                    this.closeWheel();
                }, 300);
            });
        }
        
        // Click functionality (only if not hover mode)
        if (!this.config.showOnHover) {
            buttonContainer.addEventListener('click', (e) => {
                if (!this.config.disabled) {
                    e.stopPropagation();
                    this.toggleWheel();
                }
            });
        }
        
        // Close on outside click
        document.addEventListener('click', (e) => {
            if (this.isOpen && !component.contains(e.target)) {
                this.closeWheel();
            }
        });
        
        // Initialize wheel interactions
        if (wheelPanel) {
            this.initializeWheelInteractions(wheelPanel);
        }
        
        // Keyboard navigation
        component.addEventListener('keydown', (e) => {
            if (this.config.disabled) return;
            
            switch(e.key) {
                case 'Enter':
                case ' ':
                    e.preventDefault();
                    if (!this.isOpen) {
                        this.openWheel();
                    } else {
                        this.confirmSelection();
                    }
                    break;
                case 'Escape':
                    if (this.isOpen) {
                        this.closeWheel();
                    }
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    if (this.isOpen) {
                        this.scrollWheel(-1);
                    }
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    if (this.isOpen) {
                        this.scrollWheel(1);
                    } else {
                        this.openWheel();
                    }
                    break;
            }
        });
    }
    
    initializeWheelInteractions(wheelPanel) {
        const handleStart = (e) => {
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }
            
            this.isDragging = true;
            this.startY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
            this.velocity = 0;
            
            wheelPanel.style.cursor = 'grabbing';
        };
        
        const handleMove = (e) => {
            if (!this.isDragging) return;
            
            const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
            const deltaY = clientY - this.startY;
            this.startY = clientY;
            
            // Convert pixel movement to rotation
            const rotationDelta = deltaY * 0.5; // Adjust sensitivity
            this.currentRotation += rotationDelta;
            this.velocity = rotationDelta;
            
            this.updateCylinderRotation();
        };
        
        const handleEnd = () => {
            if (!this.isDragging) return;
            this.isDragging = false;
            wheelPanel.style.cursor = 'grab';
            
            // Start momentum animation
            this.startMomentum();
        };
        
        // Mouse events
        wheelPanel.addEventListener('mousedown', handleStart);
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
        
        // Touch events
        wheelPanel.addEventListener('touchstart', handleStart, { passive: true });
        wheelPanel.addEventListener('touchmove', handleMove, { passive: true });
        wheelPanel.addEventListener('touchend', handleEnd);
        
        // Click on items
        wheelPanel.addEventListener('click', (e) => {
            const item = e.target.closest('.wheel-item');
            if (item && !this.isDragging) {
                const offset = parseInt(item.dataset.offset);
                if (offset !== 0) {
                    // Animate to clicked item
                    this.animateToOffset(-offset);
                } else {
                    // Select current item
                    this.confirmSelection();
                }
            }
        });
    }
    
    startMomentum() {
        const deceleration = 0.95;
        const snapThreshold = 0.5;
        
        const animate = () => {
            if (Math.abs(this.velocity) > snapThreshold) {
                this.velocity *= deceleration;
                this.currentRotation += this.velocity;
                this.updateCylinderRotation();
                
                this.animationId = requestAnimationFrame(animate);
            } else {
                // Snap to nearest item
                this.snapToNearestItem();
            }
        };
        
        this.animationId = requestAnimationFrame(animate);
    }
    
    snapToNearestItem() {
        const nearestIndex = Math.round(-this.currentRotation / this.itemAngle);
        const targetRotation = -nearestIndex * this.itemAngle;
        
        this.animateToRotation(targetRotation);
    }
    
    animateToRotation(targetRotation) {
        const startRotation = this.currentRotation;
        const deltaRotation = targetRotation - startRotation;
        const duration = 300;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease out cubic
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            this.currentRotation = startRotation + deltaRotation * easeProgress;
            this.updateCylinderRotation();
            
            if (progress < 1) {
                this.animationId = requestAnimationFrame(animate);
            }
        };
        
        this.animationId = requestAnimationFrame(animate);
    }
    
    animateToOffset(offset) {
        const targetRotation = this.currentRotation + (offset * this.itemAngle);
        this.animateToRotation(targetRotation);
    }
    
    scrollWheel(direction) {
        this.animateToOffset(direction);
    }
    
    toggleWheel() {
        if (this.isOpen) {
            this.closeWheel();
        } else {
            this.openWheel();
        }
    }
    
    openWheel() {
        if (this.isOpen) return;
        
        const component = this.container.querySelector('.wheel-selector-component');
        const wheelPanel = component.querySelector('.wheel-panel');
        
        this.isOpen = true;
        component.dataset.open = 'true';
        wheelPanel.style.display = 'block';
        
        // Add opening animation
        setTimeout(() => {
            wheelPanel.classList.add('open');
        }, 10);
        
        // Focus for keyboard navigation
        component.focus();
    }
    
    closeWheel() {
        if (!this.isOpen) return;
        
        const component = this.container.querySelector('.wheel-selector-component');
        const wheelPanel = component.querySelector('.wheel-panel');
        
        this.isOpen = false;
        component.dataset.open = 'false';
        wheelPanel.classList.remove('open');
        
        // Hide after animation
        setTimeout(() => {
            wheelPanel.style.display = 'none';
        }, 300);
    }
    
    confirmSelection() {
        // Get the current index based on rotation
        const currentIndex = Math.round(-this.currentRotation / this.itemAngle);
        const optionsLength = this.config.options.length;
        const normalizedIndex = ((currentIndex % optionsLength) + optionsLength) % optionsLength;
        
        this.selectOption(normalizedIndex);
        this.closeWheel();
    }
    
    selectOption(index) {
        if (index < 0 || index >= this.config.options.length) return;
        
        const option = this.config.options[index];
        const value = typeof option === 'object' ? option.value : option;
        const text = typeof option === 'object' ? option.text : option;
        
        this.selectedIndex = index;
        this.selectedValue = value;
        
        // Update button text using text button's method
        if (this.triggerButton) {
            this.triggerButton.setText(text);
        }
        
        // Update visual selection
        this.updateWheelItems();
        
        // Save to storage
        if (this.config.storageKey) {
            localStorage.setItem(this.config.storageKey, JSON.stringify(value));
        }
        
        // Trigger callback
        this.config.onChange(value, option);
    }
    
    getValue() {
        return this.selectedValue;
    }
    
    setValue(value) {
        const index = this.config.options.findIndex(opt => 
            (typeof opt === 'object' ? opt.value : opt) === value
        );
        if (index !== -1) {
            this.selectOption(index);
            this.currentRotation = -index * this.itemAngle;
            this.updateCylinderRotation();
        }
    }
    
    setOptions(newOptions) {
        this.config.options = newOptions;
        this.selectedIndex = -1;
        this.selectedValue = null;
        this.currentRotation = 0;
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
