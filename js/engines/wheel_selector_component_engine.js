// wheel_selector_component_engine.js
// Based on vue-scroll-picker vanilla JS implementation
// Creates iOS-style wheel picker components with smooth scrolling and 3D effects

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
        this.changeHandler = changeHandler;
        
        // Component properties
        this.itemHeight = 44; // Standard iOS picker height
        this.visibleItems = 5;
        this.currentIndex = 0;
        this.value = this.config.defaultValue;
        
        // Physics properties for momentum scrolling
        this.velocity = 0;
        this.amplitude = 0;
        this.frame = 0;
        this.timestamp = 0;
        this.ticker = null;
        this.lastY = 0;
        this.lastTime = 0;
        this.velocityBuffer = [];
        this.maxVelocityBuffer = 5;
        this.friction = 0.95;
        this.snapThreshold = 0.5;
        
        // 3D perspective properties
        this.perspective = 1000;
        this.rotationUnit = 0;
        this.radius = 150;
        this.currentRotation = 0;
        
        // Touch/mouse state
        this.isScrolling = false;
        this.startY = 0;
        this.currentY = 0;
        
        // Generate unique ID
        this.id = 'wheel-' + Math.random().toString(36).substr(2, 9);
        
        // Styles are now handled by SCSS, not injected dynamically
    }
    
    render(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container with id "${containerId}" not found`);
            return;
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
        
        // Create the scroll picker structure
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'scroll-picker-wrapper';
        this.wrapper.id = this.id;
        
        // Add 3D scene container
        this.scene = document.createElement('div');
        this.scene.className = 'scroll-picker-scene';
        
        // Create scroller
        this.scroller = document.createElement('div');
        this.scroller.className = 'scroll-picker-scroller';
        
        // Calculate rotation unit based on visible items
        this.rotationUnit = this.config.options.length > 0 ? 360 / (this.config.options.length * 4) : 30;
        
        // Create option elements with 3D positioning
        this.config.options.forEach((option, index) => {
            const elem = document.createElement('div');
            elem.className = 'scroll-picker-item';
            elem.textContent = typeof option === 'object' ? option.name : option;
            elem.dataset.value = typeof option === 'object' ? option.value : option;
            elem.dataset.index = index;
            
            // Apply initial 3D transform
            const rotateX = index * this.rotationUnit;
            elem.style.transform = `rotateX(${rotateX}deg) translateZ(${this.radius}px)`;
            
            this.scroller.appendChild(elem);
        });
        
        // Create overlay gradient
        this.overlay = document.createElement('div');
        this.overlay.className = 'scroll-picker-overlay';
        
        // Create selection indicator
        this.indicator = document.createElement('div');
        this.indicator.className = 'scroll-picker-indicator';
        
        // Assemble structure
        this.scene.appendChild(this.scroller);
        this.wrapper.appendChild(this.scene);
        this.wrapper.appendChild(this.overlay);
        this.wrapper.appendChild(this.indicator);
        this.componentWrapper.appendChild(this.wrapper);
        
        // Add to container
        container.appendChild(this.componentWrapper);
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Set initial value
        if (this.value !== null) {
            this.setValue(this.value);
        } else if (this.config.options.length > 0) {
            this.setValue(this.config.options[0]);
        }
        
        // Update visual states
        this.updateItemVisuals();
        
        // Return the component wrapper element
        return this.componentWrapper;
    }
    
    setupEventListeners() {
        // Touch events
        this.scroller.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.scroller.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.scroller.addEventListener('touchend', this.handleTouchEnd.bind(this));
        
        // Mouse events
        this.scroller.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
        // Wheel events
        this.scroller.addEventListener('wheel', this.handleWheel.bind(this));
        
        // Click events for item selection
        this.scroller.addEventListener('click', this.handleClick.bind(this));
        
        // Keyboard events
        this.wrapper.setAttribute('tabindex', '0');
        this.wrapper.addEventListener('keydown', this.handleKeyDown.bind(this));
    }
    
    handleTouchStart(e) {
        if (this.config.disabled) return;
        
        this.startY = e.touches[0].clientY;
        this.lastY = this.startY;
        this.lastTime = Date.now();
        this.velocityBuffer = [];
        this.isScrolling = true;
        
        // Stop any ongoing momentum
        if (this.ticker) {
            cancelAnimationFrame(this.ticker);
            this.ticker = null;
        }
    }
    
    handleTouchMove(e) {
        if (!this.isScrolling || this.config.disabled) return;
        e.preventDefault();
        
        this.currentY = e.touches[0].clientY;
        const currentTime = Date.now();
        const timeDelta = currentTime - this.lastTime;
        
        if (timeDelta > 0) {
            const distance = this.currentY - this.lastY;
            const velocity = (distance / timeDelta) * 1000 * this.config.touchSensitivity;
            
            this.velocityBuffer.push(velocity);
            if (this.velocityBuffer.length > this.maxVelocityBuffer) {
                this.velocityBuffer.shift();
            }
            
            this.velocity = this.velocityBuffer.reduce((a, b) => a + b, 0) / this.velocityBuffer.length;
        }
        
        const diff = (this.currentY - this.startY) * this.config.touchSensitivity;
        this.scroll(diff);
        
        this.lastY = this.currentY;
        this.lastTime = currentTime;
        this.startY = this.currentY;
    }
    
    handleTouchEnd() {
        if (!this.isScrolling || this.config.disabled) return;
        this.isScrolling = false;
        
        if (Math.abs(this.velocity) > this.snapThreshold) {
            this.startMomentum();
        } else {
            this.snapToItem();
        }
    }
    
    handleMouseDown(e) {
        if (this.config.disabled) return;
        
        this.startY = e.clientY;
        this.lastY = this.startY;
        this.lastTime = Date.now();
        this.velocityBuffer = [];
        this.isScrolling = true;
        e.preventDefault();
        
        if (this.ticker) {
            cancelAnimationFrame(this.ticker);
            this.ticker = null;
        }
    }
    
    handleMouseMove(e) {
        if (!this.isScrolling || this.config.disabled) return;
        
        this.currentY = e.clientY;
        const currentTime = Date.now();
        const timeDelta = currentTime - this.lastTime;
        
        if (timeDelta > 0) {
            const distance = this.currentY - this.lastY;
            const velocity = (distance / timeDelta) * 1000 * this.config.dragSensitivity;
            
            this.velocityBuffer.push(velocity);
            if (this.velocityBuffer.length > this.maxVelocityBuffer) {
                this.velocityBuffer.shift();
            }
            
            this.velocity = this.velocityBuffer.reduce((a, b) => a + b, 0) / this.velocityBuffer.length;
        }
        
        const diff = (this.currentY - this.startY) * this.config.dragSensitivity;
        this.scroll(diff);
        
        this.lastY = this.currentY;
        this.lastTime = currentTime;
        this.startY = this.currentY;
    }
    
    handleMouseUp() {
        if (!this.isScrolling || this.config.disabled) return;
        this.isScrolling = false;
        
        if (Math.abs(this.velocity) > this.snapThreshold) {
            this.startMomentum();
        } else {
            this.snapToItem();
        }
    }
    
    handleWheel(e) {
        if (this.config.disabled) return;
        e.preventDefault();
        
        const delta = -e.deltaY * this.config.wheelSensitivity * 0.5;
        this.scroll(delta);
        
        const currentTime = Date.now();
        if (this.lastTime && currentTime - this.lastTime < 100) {
            this.velocity = delta * 2;
        }
        this.lastTime = currentTime;
        
        clearTimeout(this.wheelTimeout);
        this.wheelTimeout = setTimeout(() => {
            if (Math.abs(this.velocity) < 2) {
                this.snapToItem();
            } else {
                this.startMomentum();
            }
            this.velocity = 0;
        }, 150);
    }
    
    handleClick(e) {
        if (this.config.disabled) return;
        
        const item = e.target.closest('.scroll-picker-item');
        if (item) {
            const index = parseInt(item.dataset.index);
            this.animateToIndex(index);
        }
    }
    
    handleKeyDown(e) {
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
                this.animateToIndex(0);
                break;
            case 'End':
                e.preventDefault();
                this.animateToIndex(this.config.options.length - 1);
                break;
        }
    }
    
    scroll(delta) {
        const currentRotation = this.currentRotation || 0;
        const newRotation = currentRotation + (delta / this.itemHeight) * this.rotationUnit;
        
        // Apply rotation to the cylinder
        this.scroller.style.transform = `translateZ(-${this.radius}px) rotateX(${newRotation}deg)`;
        this.currentRotation = newRotation;
        
        // Update visual states
        this.updateItemVisuals();
    }
    
    updateItemVisuals() {
        const items = this.scroller.querySelectorAll('.scroll-picker-item');
        const currentRotation = this.currentRotation || 0;
        
        items.forEach((item, index) => {
            // Calculate item's rotation relative to current position
            const itemRotation = (index * this.rotationUnit) + currentRotation;
            
            // Normalize rotation to -180 to 180 range
            let normalizedRotation = itemRotation % 360;
            if (normalizedRotation > 180) normalizedRotation -= 360;
            if (normalizedRotation < -180) normalizedRotation += 360;
            
            // Items in front (near 0 degrees) are visible
            const absRotation = Math.abs(normalizedRotation);
            
            // Calculate opacity based on rotation
            let opacity = 1;
            if (absRotation > 90) {
                opacity = Math.max(0, 1 - ((absRotation - 90) / 90));
            } else {
                opacity = Math.max(0.3, 1 - (absRotation / 90) * 0.7);
            }
            
            // Calculate scale
            const scale = Math.max(0.85, 1 - (absRotation / 90) * 0.15);
            
            // Apply visual properties
            item.style.opacity = opacity;
            
            // Update selection state
            if (absRotation < this.rotationUnit / 2) {
                item.classList.add('selected');
                item.style.color = '#007AFF';
                item.style.fontWeight = '500';
            } else {
                item.classList.remove('selected');
                item.style.color = '';
                item.style.fontWeight = '';
            }
        });
    }
    
    startMomentum() {
        this.amplitude = this.velocity;
        this.timestamp = Date.now();
        this.frame = this.currentRotation;
        
        this.ticker = requestAnimationFrame(() => this.autoScroll());
    }
    
    autoScroll() {
        if (!this.amplitude) {
            return;
        }
        
        const elapsed = Date.now() - this.timestamp;
        const delta = -this.amplitude * Math.exp(-elapsed / 325);
        
        if (Math.abs(delta) > 0.5) {
            const newRotation = this.currentRotation + (delta / this.itemHeight) * this.rotationUnit;
            
            // Check boundaries
            const maxRotation = this.rotationUnit * 2;
            const minRotation = -(this.config.options.length - 1) * this.rotationUnit - this.rotationUnit * 2;
            
            if (newRotation > maxRotation || newRotation < minRotation) {
                this.amplitude = 0;
                this.bounceBack();
            } else {
                this.scroller.style.transform = `translateZ(-${this.radius}px) rotateX(${newRotation}deg)`;
                this.currentRotation = newRotation;
                this.updateItemVisuals();
                this.ticker = requestAnimationFrame(() => this.autoScroll());
            }
        } else {
            this.amplitude = 0;
            this.snapToItem();
        }
    }
    
    bounceBack() {
        const maxRotation = 0;
        const minRotation = -(this.config.options.length - 1) * this.rotationUnit;
        
        let targetRotation = this.currentRotation;
        if (this.currentRotation > maxRotation) {
            targetRotation = maxRotation;
        } else if (this.currentRotation < minRotation) {
            targetRotation = minRotation;
        }
        
        this.scroller.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        this.scroller.style.transform = `translateZ(-${this.radius}px) rotateX(${targetRotation}deg)`;
        this.currentRotation = targetRotation;
        
        setTimeout(() => {
            this.scroller.style.transition = '';
            this.snapToItem();
        }, 300);
    }
    
    snapToItem() {
        if (this.ticker) {
            cancelAnimationFrame(this.ticker);
            this.ticker = null;
        }
        this.amplitude = 0;
        
        const currentRotation = this.currentRotation || 0;
        const itemAngle = this.rotationUnit;
        const nearestIndex = Math.round(-currentRotation / itemAngle);
        
        this.currentIndex = Math.max(0, Math.min(nearestIndex, this.config.options.length - 1));
        
        const targetRotation = -this.currentIndex * itemAngle;
        
        this.scroller.style.transition = 'transform 0.3s ease';
        this.scroller.style.transform = `translateZ(-${this.radius}px) rotateX(${targetRotation}deg)`;
        this.currentRotation = targetRotation;
        
        // Update value and trigger callback
        const selectedOption = this.config.options[this.currentIndex];
        this.value = typeof selectedOption === 'object' ? selectedOption.value : selectedOption;
        
        if (this.changeHandler) {
            this.changeHandler(this.value);
        }
        
        // Store in localStorage
        const storageKey = `wheel_${this.id}_value`;
        localStorage.setItem(storageKey, JSON.stringify(this.value));
        
        this.updateItemVisuals();
        
        setTimeout(() => {
            this.scroller.style.transition = '';
        }, 300);
    }
    
    animateToIndex(index) {
        this.currentIndex = Math.max(0, Math.min(index, this.config.options.length - 1));
        const targetRotation = -this.currentIndex * this.rotationUnit;
        
        this.scroller.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        this.scroller.style.transform = `translateZ(-${this.radius}px) rotateX(${targetRotation}deg)`;
        this.currentRotation = targetRotation;
        
        // Update value
        const selectedOption = this.config.options[this.currentIndex];
        this.value = typeof selectedOption === 'object' ? selectedOption.value : selectedOption;
        
        if (this.changeHandler) {
            this.changeHandler(this.value);
        }
        
        // Store in localStorage
        const storageKey = `wheel_${this.id}_value`;
        localStorage.setItem(storageKey, JSON.stringify(this.value));
        
        this.updateItemVisuals();
        
        setTimeout(() => {
            this.scroller.style.transition = '';
        }, 500);
    }
    
    selectNext() {
        if (this.currentIndex < this.config.options.length - 1) {
            this.animateToIndex(this.currentIndex + 1);
        }
    }
    
    selectPrevious() {
        if (this.currentIndex > 0) {
            this.animateToIndex(this.currentIndex - 1);
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
            this.animateToIndex(index);
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
        
        // Recreate items with 3D positioning
        this.rotationUnit = newOptions.length > 0 ? 360 / (newOptions.length * 4) : 30;
        
        newOptions.forEach((option, index) => {
            const elem = document.createElement('div');
            elem.className = 'scroll-picker-item';
            elem.textContent = typeof option === 'object' ? option.name : option;
            elem.dataset.value = typeof option === 'object' ? option.value : option;
            elem.dataset.index = index;
            
            const rotateX = index * this.rotationUnit;
            elem.style.transform = `rotateX(${rotateX}deg) translateZ(${this.radius}px)`;
            
            this.scroller.appendChild(elem);
        });
        
        // Reset to first item
        this.currentIndex = 0;
        this.currentRotation = 0;
        this.scroller.style.transform = `translateZ(-${this.radius}px) rotateX(0deg)`;
        
        if (newOptions.length > 0) {
            this.setValue(newOptions[0]);
        }
    }

}

// Export for ES6 modules
export { wheel_selector_component_engine };
