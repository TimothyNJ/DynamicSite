// wheel_selector_component_engine.js
// iOS-style wheel selector with 3D cylinder effect

class wheel_selector_component_engine {
    constructor(options = {}, onChange = null) {
        // Configuration
        this.options = this.normalizeOptions(options.options || []);
        this.value = options.value || options.defaultValue || null;
        this.onChange = onChange || options.onChange || (() => {});
        
        // UI Configuration
        this.itemHeight = 30;
        this.visibleItems = 7;
        this.wheelHeight = this.itemHeight * this.visibleItems;
        
        // State
        this.currentIndex = this.findInitialIndex();
        this.scrollPosition = 0;
        this.isDragging = false;
        this.startY = 0;
        this.startScrollPosition = 0;
        
        // Create DOM structure
        this.element = this.createElement();
        
        // Bind event handlers
        this.handleWheel = this.handleWheel.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        
        // Initialize after DOM is ready
        requestAnimationFrame(() => {
            this.init();
        });
    }
    
    normalizeOptions(options) {
        return options.map(option => {
            if (option === null) {
                return { value: null, name: '' };
            }
            switch (typeof option) {
                case 'string':
                    return { value: option, name: option };
                case 'number':
                case 'boolean':
                    return { value: option, name: `${option}` };
                default:
                    return option;
            }
        });
    }
    
    findInitialIndex() {
        if (this.value === null || this.value === undefined) {
            return 0;
        }
        const index = this.options.findIndex(option => option.value == this.value);
        return Math.max(index, 0);
    }
    
    createElement() {
        // Main container
        const container = document.createElement('div');
        container.className = 'wheel-selector-3d';
        
        // Wheel wrapper (provides perspective)
        const wrapper = document.createElement('div');
        wrapper.className = 'wheel-selector-wrapper';
        
        // Items container (the rotating drum)
        this.itemsContainer = document.createElement('div');
        this.itemsContainer.className = 'wheel-selector-items';
        
        // Create items
        this.createItems();
        
        // Selection indicator
        const indicator = document.createElement('div');
        indicator.className = 'wheel-selector-indicator';
        
        // Gradient overlays
        const topGradient = document.createElement('div');
        topGradient.className = 'wheel-selector-gradient-top';
        
        const bottomGradient = document.createElement('div');
        bottomGradient.className = 'wheel-selector-gradient-bottom';
        
        // Assemble
        wrapper.appendChild(this.itemsContainer);
        container.appendChild(wrapper);
        container.appendChild(indicator);
        container.appendChild(topGradient);
        container.appendChild(bottomGradient);
        
        return container;
    }
    
    createItems() {
        this.itemsContainer.innerHTML = '';
        
        if (this.options.length === 0) {
            const emptyItem = document.createElement('div');
            emptyItem.className = 'wheel-selector-item';
            emptyItem.textContent = 'No options';
            this.itemsContainer.appendChild(emptyItem);
            return;
        }
        
        // Create multiple copies for infinite scroll effect
        const copies = 5;
        for (let copy = 0; copy < copies; copy++) {
            this.options.forEach((option, index) => {
                const item = document.createElement('div');
                item.className = 'wheel-selector-item';
                item.setAttribute('data-index', index);
                item.setAttribute('data-copy', copy);
                item.textContent = option.name;
                this.itemsContainer.appendChild(item);
            });
        }
        
        // Store references
        this.totalItems = this.options.length * copies;
        this.centerCopy = Math.floor(copies / 2);
    }
    
    init() {
        // Add event listeners
        this.element.addEventListener('wheel', this.handleWheel, { passive: false });
        this.element.addEventListener('mousedown', this.handleMouseDown);
        this.element.addEventListener('touchstart', this.handleTouchStart, { passive: false });
        
        // Set initial position
        this.scrollToIndex(this.currentIndex, false);
        
        // Apply initial styles
        this.updateItemStyles();
        
        // Notify initial value
        if (this.value !== null && this.onChange) {
            setTimeout(() => this.onChange(this.value), 0);
        }
    }
    
    scrollToIndex(index, animate = true) {
        // Calculate target position (center copy + index)
        const targetPosition = (this.centerCopy * this.options.length + index) * this.itemHeight;
        this.scrollPosition = targetPosition;
        
        // Apply transform
        if (animate) {
            this.itemsContainer.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        } else {
            this.itemsContainer.style.transition = 'none';
        }
        
        this.itemsContainer.style.transform = `translateY(${-this.scrollPosition + this.wheelHeight / 2 - this.itemHeight / 2}px)`;
        
        // Update current index
        this.currentIndex = index;
        this.value = this.options[index].value;
        
        // Update styles
        this.updateItemStyles();
        
        // Reset transition after animation
        if (animate) {
            setTimeout(() => {
                this.itemsContainer.style.transition = 'none';
            }, 300);
        }
    }
    
    updateItemStyles() {
        const items = this.itemsContainer.querySelectorAll('.wheel-selector-item');
        const centerY = this.wheelHeight / 2;
        
        items.forEach((item, i) => {
            const itemY = i * this.itemHeight - this.scrollPosition + this.itemHeight / 2;
            const distanceFromCenter = itemY - centerY;
            const absDistance = Math.abs(distanceFromCenter);
            
            // Calculate opacity and scale based on distance from center
            const maxDistance = this.wheelHeight / 2;
            const opacity = Math.max(0.3, 1 - (absDistance / maxDistance) * 0.7);
            const scale = Math.max(0.8, 1 - (absDistance / maxDistance) * 0.2);
            
            // Apply 3D rotation effect
            const rotateX = (distanceFromCenter / this.wheelHeight) * 30; // Max 30 degrees
            
            item.style.opacity = opacity;
            item.style.transform = `scale(${scale}) rotateX(${rotateX}deg)`;
            
            // Mark selected item
            const itemIndex = parseInt(item.getAttribute('data-index'));
            if (itemIndex === this.currentIndex && absDistance < this.itemHeight / 2) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }
    
    handleScroll(deltaY) {
        // Update scroll position
        this.scrollPosition += deltaY;
        
        // Get bounds for infinite scroll
        const itemCount = this.options.length;
        const copyHeight = itemCount * this.itemHeight;
        const minScroll = copyHeight;
        const maxScroll = copyHeight * 4;
        
        // Wrap around for infinite scroll
        if (this.scrollPosition < minScroll) {
            this.scrollPosition += copyHeight * 2;
        } else if (this.scrollPosition > maxScroll) {
            this.scrollPosition -= copyHeight * 2;
        }
        
        // Apply transform
        this.itemsContainer.style.transform = `translateY(${-this.scrollPosition + this.wheelHeight / 2 - this.itemHeight / 2}px)`;
        
        // Update current index
        const exactIndex = this.scrollPosition / this.itemHeight;
        const newIndex = Math.round(exactIndex) % this.options.length;
        
        if (newIndex !== this.currentIndex && newIndex >= 0 && newIndex < this.options.length) {
            this.currentIndex = newIndex;
            this.value = this.options[newIndex].value;
            this.updateItemStyles();
            
            if (this.onChange) {
                this.onChange(this.value);
            }
        } else {
            this.updateItemStyles();
        }
    }
    
    snapToNearest() {
        const exactIndex = this.scrollPosition / this.itemHeight;
        const nearestIndex = Math.round(exactIndex) % this.options.length;
        this.scrollToIndex(nearestIndex, true);
    }
    
    handleWheel(e) {
        e.preventDefault();
        this.handleScroll(e.deltaY * 0.5);
        
        // Clear existing timeout
        if (this.snapTimeout) {
            clearTimeout(this.snapTimeout);
        }
        
        // Snap after scrolling stops
        this.snapTimeout = setTimeout(() => {
            this.snapToNearest();
        }, 100);
    }
    
    handleMouseDown(e) {
        this.isDragging = true;
        this.startY = e.clientY;
        this.startScrollPosition = this.scrollPosition;
        
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseup', this.handleMouseUp);
        
        e.preventDefault();
    }
    
    handleMouseMove(e) {
        if (!this.isDragging) return;
        
        const deltaY = this.startY - e.clientY;
        this.scrollPosition = this.startScrollPosition + deltaY;
        
        this.handleScroll(0); // Process the new position
    }
    
    handleMouseUp() {
        this.isDragging = false;
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
        
        this.snapToNearest();
    }
    
    handleTouchStart(e) {
        this.isDragging = true;
        this.startY = e.touches[0].clientY;
        this.startScrollPosition = this.scrollPosition;
        
        document.addEventListener('touchmove', this.handleTouchMove, { passive: false });
        document.addEventListener('touchend', this.handleTouchEnd);
        
        e.preventDefault();
    }
    
    handleTouchMove(e) {
        if (!this.isDragging) return;
        
        const deltaY = this.startY - e.touches[0].clientY;
        this.scrollPosition = this.startScrollPosition + deltaY;
        
        this.handleScroll(0); // Process the new position
        e.preventDefault();
    }
    
    handleTouchEnd() {
        this.isDragging = false;
        document.removeEventListener('touchmove', this.handleTouchMove);
        document.removeEventListener('touchend', this.handleTouchEnd);
        
        this.snapToNearest();
    }
    
    setValue(value) {
        const index = this.options.findIndex(option => option.value == value);
        if (index >= 0) {
            this.scrollToIndex(index, true);
        }
    }
    
    getValue() {
        return this.value;
    }
    
    render(containerId) {
        const container = typeof containerId === 'string' 
            ? document.getElementById(containerId)
            : containerId;
            
        if (!container) {
            console.error(`[wheel_selector_component_engine] Container not found:`, containerId);
            return null;
        }
        
        container.appendChild(this.element);
        return this.element;
    }
    
    destroy() {
        // Remove event listeners
        this.element.removeEventListener('wheel', this.handleWheel);
        this.element.removeEventListener('mousedown', this.handleMouseDown);
        this.element.removeEventListener('touchstart', this.handleTouchStart);
        
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
        document.removeEventListener('touchmove', this.handleTouchMove);
        document.removeEventListener('touchend', this.handleTouchEnd);
        
        if (this.snapTimeout) {
            clearTimeout(this.snapTimeout);
        }
    }
}

// Export for use with ComponentFactory
export { wheel_selector_component_engine };
