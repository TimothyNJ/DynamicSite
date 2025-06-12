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
            ...options
        };
        
        this.isOpen = false;
        this.selectedIndex = -1;
        this.selectedValue = null;
        this.wheelInstance = null;
        this.componentId = `wheel-selector-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.triggerButton = null;
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
        
        // Create wheel panel
        const wheelPanel = document.createElement('div');
        wheelPanel.className = 'wheel-panel';
        wheelPanel.style.display = 'none';
        wheelPanel.innerHTML = `
            <div class="wheel-overlay top"></div>
            <div class="wheel-content">
                <div class="options-wheel" data-wheel="options">
                    <div class="wheel-items">
                        ${this.renderOptions()}
                    </div>
                </div>
            </div>
            <div class="wheel-overlay bottom"></div>
            <div class="wheel-selection-indicator"></div>
        `;
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
            if (!this.config.disabled) {
                this.toggleWheel();
            }
        });
        
        // Render the button
        this.triggerButton.render(buttonContainer);
        
        // Attach remaining event listeners
        this.attachEventListeners();
        
        // Set default selection if not already set
        if (this.config.defaultValue && !this.selectedValue) {
            const defaultIndex = this.config.options.findIndex(opt => 
                opt.value === this.config.defaultValue || opt === this.config.defaultValue
            );
            if (defaultIndex !== -1) {
                this.selectOption(defaultIndex);
            }
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
    
    renderOptions() {
        return this.config.options.map((option, index) => {
            const isObject = typeof option === 'object';
            const text = isObject ? option.text : option;
            const value = isObject ? option.value : option;
            const icon = isObject ? option.icon : null;
            
            return `
                <div class="wheel-item ${index === this.selectedIndex ? 'selected' : ''}" 
                     data-index="${index}"
                     data-value="${value}">
                    ${icon ? `<span class="option-icon">${icon}</span>` : ''}
                    <span class="option-text">${text}</span>
                </div>
            `;
        }).join('');
    }
    
    attachEventListeners() {
        const component = this.container.querySelector('.wheel-selector-component');
        const wheelPanel = component.querySelector('.wheel-panel');
        
        // Close on outside click
        document.addEventListener('click', (e) => {
            if (this.isOpen && !component.contains(e.target)) {
                this.closeWheel();
            }
        });
        
        // Initialize wheel scrolling
        if (wheelPanel) {
            this.initializeWheel(component.querySelector('.options-wheel'));
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
    
    initializeWheel(wheel) {
        const itemHeight = 40; // Height of each item
        let startY = 0;
        let currentY = 0;
        let isDragging = false;
        let velocity = 0;
        let animationId = null;
        
        const wheelItems = wheel.querySelector('.wheel-items');
        
        // Set initial position if there's a selected item
        if (this.selectedIndex >= 0) {
            const offset = -(this.selectedIndex * itemHeight) + (itemHeight * 2);
            wheelItems.style.transform = `translateY(${offset}px)`;
        }
        
        const handleStart = (e) => {
            isDragging = true;
            startY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
            velocity = 0;
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
            wheel.style.cursor = 'grabbing';
        };
        
        const handleMove = (e) => {
            if (!isDragging) return;
            
            const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
            const deltaY = clientY - startY;
            currentY += deltaY;
            startY = clientY;
            
            velocity = deltaY;
            
            const transform = wheelItems.style.transform;
            const currentTranslateY = transform ? parseFloat(transform.match(/translateY\(([-\d.]+)px\)/)?.[1] || 0) : 0;
            const newTranslateY = currentTranslateY + deltaY;
            
            // Apply boundaries
            const maxTranslateY = itemHeight * 2;
            const minTranslateY = -(this.config.options.length - 1) * itemHeight + (itemHeight * 2);
            const boundedTranslateY = Math.max(minTranslateY, Math.min(maxTranslateY, newTranslateY));
            
            wheelItems.style.transform = `translateY(${boundedTranslateY}px)`;
            this.updateActiveItem(boundedTranslateY, itemHeight);
        };
        
        const handleEnd = () => {
            if (!isDragging) return;
            isDragging = false;
            wheel.style.cursor = 'grab';
            
            // Momentum scrolling
            const decelerate = () => {
                if (Math.abs(velocity) > 0.5) {
                    velocity *= 0.95;
                    
                    const transform = wheelItems.style.transform;
                    const currentTranslateY = parseFloat(transform.match(/translateY\(([-\d.]+)px\)/)?.[1] || 0);
                    const newTranslateY = currentTranslateY + velocity;
                    
                    const maxTranslateY = itemHeight * 2;
                    const minTranslateY = -(this.config.options.length - 1) * itemHeight + (itemHeight * 2);
                    const boundedTranslateY = Math.max(minTranslateY, Math.min(maxTranslateY, newTranslateY));
                    
                    wheelItems.style.transform = `translateY(${boundedTranslateY}px)`;
                    this.updateActiveItem(boundedTranslateY, itemHeight);
                    
                    animationId = requestAnimationFrame(decelerate);
                } else {
                    // Snap to nearest item
                    this.snapToItem(itemHeight);
                }
            };
            
            animationId = requestAnimationFrame(decelerate);
        };
        
        // Mouse events
        wheel.addEventListener('mousedown', handleStart);
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
        
        // Touch events
        wheel.addEventListener('touchstart', handleStart, { passive: true });
        wheel.addEventListener('touchmove', handleMove, { passive: true });
        wheel.addEventListener('touchend', handleEnd);
        
        // Click on items
        wheelItems.addEventListener('click', (e) => {
            const item = e.target.closest('.wheel-item');
            if (item) {
                const index = parseInt(item.dataset.index);
                this.selectOption(index);
                setTimeout(() => this.confirmSelection(), 150);
            }
        });
    }
    
    updateActiveItem(translateY, itemHeight) {
        const centerOffset = -translateY + (itemHeight * 2);
        const activeIndex = Math.round(centerOffset / itemHeight);
        const clampedIndex = Math.max(0, Math.min(this.config.options.length - 1, activeIndex));
        
        // Update visual selection
        const items = this.container.querySelectorAll('.wheel-item');
        items.forEach((item, index) => {
            item.classList.toggle('active', index === clampedIndex);
        });
    }
    
    snapToItem(itemHeight) {
        const wheelItems = this.container.querySelector('.wheel-items');
        const transform = wheelItems.style.transform;
        const currentTranslateY = parseFloat(transform.match(/translateY\(([-\d.]+)px\)/)?.[1] || 0);
        
        const centerOffset = -currentTranslateY + (itemHeight * 2);
        const activeIndex = Math.round(centerOffset / itemHeight);
        const clampedIndex = Math.max(0, Math.min(this.config.options.length - 1, activeIndex));
        
        const targetTranslateY = -(clampedIndex * itemHeight) + (itemHeight * 2);
        
        wheelItems.style.transition = 'transform 0.3s ease';
        wheelItems.style.transform = `translateY(${targetTranslateY}px)`;
        
        setTimeout(() => {
            wheelItems.style.transition = '';
        }, 300);
    }
    
    scrollWheel(direction) {
        const itemHeight = 40;
        const wheelItems = this.container.querySelector('.wheel-items');
        const transform = wheelItems.style.transform;
        const currentTranslateY = parseFloat(transform.match(/translateY\(([-\d.]+)px\)/)?.[1] || 0);
        
        const centerOffset = -currentTranslateY + (itemHeight * 2);
        const currentIndex = Math.round(centerOffset / itemHeight);
        const newIndex = Math.max(0, Math.min(this.config.options.length - 1, currentIndex + direction));
        
        const targetTranslateY = -(newIndex * itemHeight) + (itemHeight * 2);
        
        wheelItems.style.transition = 'transform 0.3s ease';
        wheelItems.style.transform = `translateY(${targetTranslateY}px)`;
        
        this.updateActiveItem(targetTranslateY, itemHeight);
        
        setTimeout(() => {
            wheelItems.style.transition = '';
        }, 300);
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
        
        // Ensure selected item is centered
        if (this.selectedIndex >= 0) {
            const itemHeight = 40;
            const wheelItems = wheelPanel.querySelector('.wheel-items');
            const offset = -(this.selectedIndex * itemHeight) + (itemHeight * 2);
            wheelItems.style.transform = `translateY(${offset}px)`;
            this.updateActiveItem(offset, itemHeight);
        }
        
        // Focus for keyboard navigation
        component.focus();
    }
    
    closeWheel() {
        if (!this.isOpen) return;
        
        const component = this.container.querySelector('.wheel-selector-component');
        const wheelPanel = component.querySelector('.wheel-panel');
        
        this.isOpen = false;
        component.dataset.open = 'false';
        wheelPanel.style.display = 'none';
    }
    
    confirmSelection() {
        // Get the currently active item
        const activeItem = this.container.querySelector('.wheel-item.active');
        if (activeItem) {
            const index = parseInt(activeItem.dataset.index);
            this.selectOption(index);
        }
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
        const items = this.container.querySelectorAll('.wheel-item');
        items.forEach((item, i) => {
            item.classList.toggle('selected', i === index);
        });
        
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
        }
    }
    
    setOptions(newOptions) {
        this.config.options = newOptions;
        this.selectedIndex = -1;
        this.selectedValue = null;
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
