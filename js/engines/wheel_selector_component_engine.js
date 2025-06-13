// wheel_selector_component_engine.js
// Based on vue-scroll-picker vanilla JS implementation from log 20250612213336_001.md
// Creates iOS-style wheel picker components with smooth scrolling

class wheel_selector_component_engine {
    constructor(options = {}, changeHandler = null) {
        // Configuration with defaults
        this.config = {
            options: options.options || [],
            defaultValue: options.defaultValue || null,
            disabled: options.disabled || false,
            label: options.label || 'Select',
            emptyText: options.emptyText || 'No options available',
            dragSensitivity: options.dragSensitivity || 1.7,
            touchSensitivity: options.touchSensitivity || 1.7,
            wheelSensitivity: options.wheelSensitivity || 1
        };
        
        // Store change handler
        this.changeHandler = changeHandler || options.onChange || (() => {});
        
        // Component properties
        this.itemHeight = 44; // Standard iOS picker height
        this.visibleItems = 5;
        this.currentIndex = 0;
        this.value = this.config.defaultValue;
        
        // Touch/mouse state
        this.isScrolling = false;
        this.startY = 0;
        this.currentY = 0;
        
        // Generate unique ID
        this.id = 'wheel-' + Math.random().toString(36).substr(2, 9);
    }
    
    render(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container with id "${containerId}" not found`);
            return null;
        }
        
        // Create component wrapper
        this.componentWrapper = document.createElement('div');
        this.componentWrapper.className = 'component-wrapper wheel-selector-wrapper';
        
        // Create label if provided
        if (this.config.label) {
            const label = document.createElement('label');
            label.className = 'component-label';
            label.textContent = this.config.label;
            label.htmlFor = this.id;
            this.componentWrapper.appendChild(label);
        }
        
        // Create HTML structure
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'scroll-picker-wrapper';
        this.wrapper.id = this.id;
        
        this.scroller = document.createElement('div');
        this.scroller.className = 'scroll-picker-scroller';
        
        // Create option elements
        this.config.options.forEach((option, index) => {
            const elem = document.createElement('div');
            elem.className = 'scroll-picker-item';
            elem.textContent = typeof option === 'object' ? option.name : option;
            elem.dataset.value = typeof option === 'object' ? option.value : option;
            elem.dataset.index = index;
            this.scroller.appendChild(elem);
        });
        
        // Add padding for centering
        const paddingTop = document.createElement('div');
        paddingTop.style.height = `${(this.visibleItems - 1) / 2 * this.itemHeight}px`;
        this.scroller.insertBefore(paddingTop, this.scroller.firstChild);
        
        const paddingBottom = document.createElement('div');
        paddingBottom.style.height = `${(this.visibleItems - 1) / 2 * this.itemHeight}px`;
        this.scroller.appendChild(paddingBottom);
        
        // Create overlay gradient
        this.overlay = document.createElement('div');
        this.overlay.className = 'scroll-picker-overlay';
        
        // Create selection indicator
        this.indicator = document.createElement('div');
        this.indicator.className = 'scroll-picker-indicator';
        
        // Assemble structure
        this.wrapper.appendChild(this.scroller);
        this.wrapper.appendChild(this.overlay);
        this.wrapper.appendChild(this.indicator);
        this.componentWrapper.appendChild(this.wrapper);
        
        // Add to container
        container.appendChild(this.componentWrapper);
        
        // Add event listeners
        this.setupEventListeners();
        
        // Set initial value
        if (this.value !== null) {
            this.setValue(this.value);
        } else if (this.config.options.length > 0) {
            const firstOption = this.config.options[0];
            this.setValue(typeof firstOption === 'object' ? firstOption.value : firstOption);
        }
        
        // Return the component wrapper element
        return this.componentWrapper;
    }
    
    setupEventListeners() {
        // Touch events
        this.scroller.addEventListener('touchstart', (e) => {
            if (this.config.disabled) return;
            this.startY = e.touches[0].clientY;
            this.isScrolling = true;
        });
        
        this.scroller.addEventListener('touchmove', (e) => {
            if (!this.isScrolling || this.config.disabled) return;
            e.preventDefault();
            
            this.currentY = e.touches[0].clientY;
            const diff = (this.currentY - this.startY) * this.config.touchSensitivity;
            this.scroll(diff);
            this.startY = this.currentY;
        });
        
        this.scroller.addEventListener('touchend', () => {
            if (!this.isScrolling || this.config.disabled) return;
            this.isScrolling = false;
            this.snapToItem();
        });
        
        // Mouse events
        this.scroller.addEventListener('mousedown', (e) => {
            if (this.config.disabled) return;
            this.startY = e.clientY;
            this.isScrolling = true;
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!this.isScrolling || this.config.disabled) return;
            
            this.currentY = e.clientY;
            const diff = (this.currentY - this.startY) * this.config.dragSensitivity;
            this.scroll(diff);
            this.startY = this.currentY;
        });
        
        document.addEventListener('mouseup', () => {
            if (this.isScrolling && !this.config.disabled) {
                this.isScrolling = false;
                this.snapToItem();
            }
        });
        
        // Wheel events
        this.scroller.addEventListener('wheel', (e) => {
            if (this.config.disabled) return;
            e.preventDefault();
            this.scroll(-e.deltaY * this.config.wheelSensitivity);
            clearTimeout(this.wheelTimeout);
            this.wheelTimeout = setTimeout(() => {
                this.snapToItem();
            }, 100);
        });
        
        // Keyboard events
        this.wrapper.setAttribute('tabindex', '0');
        this.wrapper.addEventListener('keydown', (e) => {
            if (this.config.disabled) return;
            
            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    this.selectPrevious();
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.selectNext();
                    break;
                case 'Home':
                    e.preventDefault();
                    this.currentIndex = 0;
                    this.snapToItem();
                    break;
                case 'End':
                    e.preventDefault();
                    this.currentIndex = this.config.options.length - 1;
                    this.snapToItem();
                    break;
            }
        });
    }
    
    scroll(delta) {
        const currentTransform = this.getCurrentTransform();
        const newTransform = currentTransform + delta;
        
        // Apply boundaries
        const maxTransform = 0;
        const minTransform = -(this.config.options.length - 1) * this.itemHeight;
        
        if (newTransform > maxTransform) {
            this.scroller.style.transform = `translateY(${maxTransform}px)`;
        } else if (newTransform < minTransform) {
            this.scroller.style.transform = `translateY(${minTransform}px)`;
        } else {
            this.scroller.style.transform = `translateY(${newTransform}px)`;
        }
    }
    
    getCurrentTransform() {
        const transform = window.getComputedStyle(this.scroller).transform;
        if (transform === 'none') return 0;
        
        const matrix = transform.match(/matrix.*\((.+)\)/)[1].split(', ');
        return parseFloat(matrix[5]);
    }
    
    snapToItem() {
        const currentTransform = this.getCurrentTransform();
        const index = Math.round(-currentTransform / this.itemHeight);
        
        this.currentIndex = Math.max(0, Math.min(index, this.config.options.length - 1));
        this.scroller.style.transform = `translateY(${-this.currentIndex * this.itemHeight}px)`;
        this.scroller.style.transition = 'transform 0.3s ease';
        
        // Update value and trigger callback
        const selectedOption = this.config.options[this.currentIndex];
        this.value = typeof selectedOption === 'object' ? selectedOption.value : selectedOption;
        this.changeHandler(this.value);
        
        // Store in localStorage
        const storageKey = `wheel_${this.id}_value`;
        localStorage.setItem(storageKey, JSON.stringify(this.value));
        
        // Update visual state
        this.updateItemStates();
        
        setTimeout(() => {
            this.scroller.style.transition = '';
        }, 300);
    }
    
    updateItemStates() {
        const items = this.scroller.querySelectorAll('.scroll-picker-item');
        items.forEach((item, index) => {
            if (index === this.currentIndex) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }
    
    selectNext() {
        if (this.currentIndex < this.config.options.length - 1) {
            this.currentIndex++;
            this.snapToItem();
        }
    }
    
    selectPrevious() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.snapToItem();
        }
    }
    
    // Public API methods
    getValue() {
        return this.value;
    }
    
    setValue(value) {
        const index = this.config.options.findIndex(option => {
            return typeof option === 'object' ? option.value === value : option === value;
        });
        
        if (index !== -1) {
            this.currentIndex = index;
            this.scroller.style.transform = `translateY(${-index * this.itemHeight}px)`;
            this.updateItemStates();
            this.value = value;
        }
    }
    
    disable() {
        this.config.disabled = true;
        this.wrapper.classList.add('disabled');
    }
    
    enable() {
        this.config.disabled = false;
        this.wrapper.classList.remove('disabled');
    }
    
    setOptions(newOptions) {
        this.config.options = newOptions;
        
        // Clear existing items
        this.scroller.innerHTML = '';
        
        // Recreate items
        newOptions.forEach((option, index) => {
            const elem = document.createElement('div');
            elem.className = 'scroll-picker-item';
            elem.textContent = typeof option === 'object' ? option.name : option;
            elem.dataset.value = typeof option === 'object' ? option.value : option;
            elem.dataset.index = index;
            this.scroller.appendChild(elem);
        });
        
        // Re-add padding
        const paddingTop = document.createElement('div');
        paddingTop.style.height = `${(this.visibleItems - 1) / 2 * this.itemHeight}px`;
        this.scroller.insertBefore(paddingTop, this.scroller.firstChild);
        
        const paddingBottom = document.createElement('div');
        paddingBottom.style.height = `${(this.visibleItems - 1) / 2 * this.itemHeight}px`;
        this.scroller.appendChild(paddingBottom);
        
        // Reset to first item
        this.currentIndex = 0;
        this.scroller.style.transform = 'translateY(0)';
        
        if (newOptions.length > 0) {
            const firstOption = newOptions[0];
            this.setValue(typeof firstOption === 'object' ? firstOption.value : firstOption);
        }
    }
}

// Export for ES6 modules
export { wheel_selector_component_engine };
