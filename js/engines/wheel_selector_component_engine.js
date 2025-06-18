// wheel_selector_component_engine.js
// True 3D infinite scrolling wheel with dynamic repositioning
// Creates illusion of numbers painted on a rotating drum

class wheel_selector_component_engine {
    constructor(options = {}, onChange = null) {
        // Configuration
        this.options = this.normalizeOptions(options.options || []);
        this.value = options.value || options.defaultValue || null;
        this.dragSensitivity = options.dragSensitivity || 1.7;
        this.touchSensitivity = options.touchSensitivity || 1.7;
        this.wheelSensitivity = options.wheelSensitivity || 1;
        this.emptyText = options.emptyText || 'No Options Available';
        this.onChange = onChange || options.onChange || (() => {});
        
        // 3D Configuration
        this.visibleItems = 7; // Items visible in viewport
        this.bufferItems = 2; // Extra items above/below for smooth scrolling
        this.itemHeight = 30; // Height of each item
        this.perspective = 300; // Perspective distance in pixels
        
        // Calculate radius and angle
        const circumference = this.visibleItems * this.itemHeight;
        this.radius = circumference / (2 * Math.PI);
        this.anglePerItem = 360 / this.visibleItems;
        
        // State
        this.currentAngle = 0; // Current rotation angle of drum
        this.currentIndex = this.findInitialIndex();
        this.itemPool = new Map(); // Pool of DOM elements to reuse
        this.activeItems = new Map(); // Currently visible items
        this.transitionTimeout = null;
        this.gestureState = null;
        this.wheelTimeout = null;
        this.animationFrame = null;
        this.resizeObserver = null;
        
        // Event options for better performance
        this.eventOptions = { passive: false };
        
        // Create DOM structure
        this.element = this.createElement();
        
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
        const index = this.options.findIndex(option => option.value == this.value);
        return Math.max(index, 0);
    }
    
    createElement() {
        // Main container with perspective
        const container = document.createElement('div');
        container.className = 'vue-scroll-picker vue-scroll-picker-3d';
        container.style.perspective = `${this.perspective}px`;
        
        // 3D drum container
        this.drum = document.createElement('div');
        this.drum.className = 'vue-scroll-picker-drum';
        this.drum.setAttribute('role', 'listbox');
        this.drum.style.transformStyle = 'preserve-3d';
        
        // Create initial visible items
        this.updateVisibleItems();
        
        // Layer container
        const layerContainer = document.createElement('div');
        layerContainer.className = 'vue-scroll-picker-layer';
        
        // Layer elements
        this.layerTopEl = document.createElement('div');
        this.layerTopEl.className = 'vue-scroll-picker-layer-top';
        
        this.layerSelectionEl = document.createElement('div');
        this.layerSelectionEl.className = 'vue-scroll-picker-layer-selection';
        
        this.layerBottomEl = document.createElement('div');
        this.layerBottomEl.className = 'vue-scroll-picker-layer-bottom';
        
        // Assemble
        layerContainer.appendChild(this.layerTopEl);
        layerContainer.appendChild(this.layerSelectionEl);
        layerContainer.appendChild(this.layerBottomEl);
        
        container.appendChild(this.drum);
        container.appendChild(layerContainer);
        
        return container;
    }
    
    getOrCreateItem(index) {
        // Reuse existing item from pool if available
        if (this.itemPool.has(index)) {
            return this.itemPool.get(index);
        }
        
        // Create new item
        const itemContainer = document.createElement('div');
        itemContainer.className = 'vue-scroll-picker-item vue-scroll-picker-item-3d';
        itemContainer.setAttribute('role', 'option');
        itemContainer.style.position = 'absolute';
        itemContainer.style.width = '100%';
        itemContainer.style.transformOrigin = 'center center';
        itemContainer.style.backfaceVisibility = 'hidden';
        
        const itemText = document.createElement('h3');
        itemContainer.appendChild(itemText);
        
        this.itemPool.set(index, itemContainer);
        return itemContainer;
    }
    
    updateVisibleItems() {
        if (this.options.length === 0) {
            // Empty state
            this.drum.innerHTML = '';
            const itemContainer = document.createElement('div');
            itemContainer.className = 'vue-scroll-picker-item';
            itemContainer.setAttribute('role', 'option');
            itemContainer.setAttribute('aria-disabled', 'true');
            itemContainer.setAttribute('aria-selected', 'false');
            
            const emptyText = document.createElement('h3');
            emptyText.textContent = this.emptyText;
            itemContainer.appendChild(emptyText);
            
            this.drum.appendChild(itemContainer);
            return;
        }
        
        // Calculate which items should be visible
        const centerAngle = this.currentAngle;
        const visibleRange = Math.floor(this.visibleItems / 2) + this.bufferItems;
        
        // Determine which logical indices need to be displayed
        const centerLogicalIndex = Math.round(centerAngle / this.anglePerItem);
        const startLogicalIndex = centerLogicalIndex - visibleRange;
        const endLogicalIndex = centerLogicalIndex + visibleRange;
        
        // Remove items that are no longer visible
        for (const [logicalIndex, element] of this.activeItems) {
            if (logicalIndex < startLogicalIndex || logicalIndex > endLogicalIndex) {
                element.remove();
                this.activeItems.delete(logicalIndex);
            }
        }
        
        // Add/update visible items
        for (let logicalIndex = startLogicalIndex; logicalIndex <= endLogicalIndex; logicalIndex++) {
            // Calculate which option this logical index represents
            const optionIndex = this.getOptionIndex(logicalIndex);
            const option = this.options[optionIndex];
            
            if (!option) continue;
            
            // Get or create item element
            const item = this.getOrCreateItem(logicalIndex);
            const itemText = item.querySelector('h3');
            
            // Update content
            itemText.textContent = option.name;
            item.setAttribute('aria-disabled', option.disabled ? 'true' : 'false');
            item.setAttribute('aria-selected', optionIndex === this.currentIndex ? 'true' : 'false');
            item.setAttribute('data-value', option.value ?? '');
            item.setAttribute('data-logical-index', logicalIndex);
            item.setAttribute('data-option-index', optionIndex);
            
            // Position on cylinder
            const itemAngle = logicalIndex * this.anglePerItem;
            const relativeAngle = itemAngle - centerAngle;
            
            // Calculate opacity based on position (fade items rotating away)
            const normalizedAngle = ((relativeAngle % 360) + 360) % 360;
            const opacity = this.calculateOpacity(normalizedAngle);
            
            // Apply 3D transform
            item.style.transform = `
                rotateX(${itemAngle}deg)
                translateZ(${this.radius}px)
            `;
            item.style.opacity = opacity;
            
            // Add to drum if not already there
            if (!this.activeItems.has(logicalIndex)) {
                this.drum.appendChild(item);
                this.activeItems.set(logicalIndex, item);
            }
        }
    }
    
    getOptionIndex(logicalIndex) {
        // Handle negative indices and wrap around
        const optionsLength = this.options.length;
        return ((logicalIndex % optionsLength) + optionsLength) % optionsLength;
    }
    
    calculateOpacity(angle) {
        // Normalize angle to [0, 360)
        angle = ((angle % 360) + 360) % 360;
        
        // Items facing viewer (around 0 or 360 degrees) are fully visible
        // Items rotating away fade out
        if (angle <= 90 || angle >= 270) {
            // Front-facing hemisphere
            const distance = angle <= 90 ? angle : 360 - angle;
            return 1 - (distance / 90) * 0.5; // Fade to 0.5 opacity at edges
        } else {
            // Back-facing hemisphere - hide completely
            return 0;
        }
    }
    
    init() {
        // Add event listeners
        this.element.addEventListener('wheel', this.handleWheel.bind(this), this.eventOptions);
        this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), this.eventOptions);
        this.element.addEventListener('mousedown', this.handleMouseDown.bind(this), this.eventOptions);
        
        // Setup resize observer
        if (typeof window.ResizeObserver !== 'undefined') {
            this.resizeObserver = new window.ResizeObserver(() => {
                if (this.animationFrame) {
                    cancelAnimationFrame(this.animationFrame);
                }
                this.animationFrame = requestAnimationFrame(() => {
                    this.updateVisibleItems();
                    this.animationFrame = null;
                });
            });
            this.resizeObserver.observe(this.element);
        }
        
        // Initial positioning
        this.setAngle(-this.currentIndex * this.anglePerItem);
    }
    
    setAngle(angle, animate = false) {
        this.currentAngle = angle;
        
        if (animate && !this.transitionTimeout) {
            this.drum.classList.add('vue-scroll-picker-drum-transition');
            this.transitionTimeout = setTimeout(() => {
                this.drum.classList.remove('vue-scroll-picker-drum-transition');
                this.transitionTimeout = null;
            }, 300);
        }
        
        // Apply rotation to drum
        this.drum.style.transform = `rotateX(${-angle}deg)`;
        
        // Update visible items
        this.updateVisibleItems();
        
        // Determine current selected index
        const newIndex = this.getOptionIndex(Math.round(angle / this.anglePerItem));
        if (newIndex !== this.currentIndex && !this.options[newIndex]?.disabled) {
            this.currentIndex = newIndex;
            this.value = this.options[newIndex].value;
            this.updateSelection();
        }
    }
    
    snapToNearestItem(animate = true) {
        // Find nearest item angle
        const nearestLogicalIndex = Math.round(this.currentAngle / this.anglePerItem);
        const targetAngle = nearestLogicalIndex * this.anglePerItem;
        
        // Check if the option at this position is disabled
        const optionIndex = this.getOptionIndex(nearestLogicalIndex);
        if (this.options[optionIndex]?.disabled) {
            // Find next non-disabled option
            let searchIndex = nearestLogicalIndex;
            let found = false;
            
            // Search forward then backward
            for (let offset = 1; offset < this.options.length; offset++) {
                const forwardIndex = this.getOptionIndex(nearestLogicalIndex + offset);
                const backwardIndex = this.getOptionIndex(nearestLogicalIndex - offset);
                
                if (!this.options[forwardIndex]?.disabled) {
                    searchIndex = nearestLogicalIndex + offset;
                    found = true;
                    break;
                }
                if (!this.options[backwardIndex]?.disabled) {
                    searchIndex = nearestLogicalIndex - offset;
                    found = true;
                    break;
                }
            }
            
            if (found) {
                this.setAngle(searchIndex * this.anglePerItem, animate);
                return;
            }
        }
        
        this.setAngle(targetAngle, animate);
    }
    
    handleWheel(e) {
        if (this.options.length <= 1) {
            return;
        }
        
        e.preventDefault();
        
        // Update angle based on wheel delta
        const deltaAngle = (e.deltaY * this.wheelSensitivity) / 2;
        this.setAngle(this.currentAngle + deltaAngle);
        
        // Clear existing timeout
        if (this.wheelTimeout) {
            clearTimeout(this.wheelTimeout);
        }
        
        // Snap to nearest item after scrolling stops
        this.wheelTimeout = setTimeout(() => {
            this.snapToNearestItem();
            this.emitUpdateValue(this.value);
            this.wheelTimeout = null;
        }, 100);
    }
    
    handleTouchStart(e) {
        if (this.gestureState) {
            return;
        }
        
        if (e.cancelable) {
            e.preventDefault();
        }
        
        this.gestureState = {
            startAngle: this.currentAngle,
            startY: e.touches[0].clientY,
            isDragging: false
        };
        
        this.emitEvent('start');
        
        document.addEventListener('touchmove', this.handleTouchMove, this.eventOptions);
        document.addEventListener('touchend', this.handleTouchEnd, this.eventOptions);
        document.addEventListener('touchcancel', this.handleTouchCancel);
    }
    
    handleMouseDown(e) {
        if (this.gestureState) {
            return;
        }
        
        if (e.cancelable) {
            e.preventDefault();
        }
        
        this.gestureState = {
            startAngle: this.currentAngle,
            startY: e.clientY,
            isDragging: false
        };
        
        this.emitEvent('start');
        
        document.addEventListener('mousemove', this.handleMouseMove, this.eventOptions);
        document.addEventListener('mouseup', this.handleMouseUp, this.eventOptions);
        document.addEventListener('mouseout', this.handleMouseOut);
    }
    
    handleTouchMove = (e) => {
        if (!this.gestureState) {
            return;
        }
        
        if (e.cancelable) {
            e.preventDefault();
        }
        
        const deltaY = this.gestureState.startY - e.touches[0].clientY;
        
        if (Math.abs(deltaY) > 1.5) {
            this.gestureState.isDragging = true;
        }
        
        // Convert pixel movement to rotation angle
        const deltaAngle = (deltaY * this.touchSensitivity) / 2;
        this.setAngle(this.gestureState.startAngle + deltaAngle);
        
        this.emitEvent('move', this.value);
    }
    
    handleMouseMove = (e) => {
        if (!this.gestureState) {
            return;
        }
        
        if (e.cancelable) {
            e.preventDefault();
        }
        
        const deltaY = this.gestureState.startY - e.clientY;
        
        if (Math.abs(deltaY) > 1.5) {
            this.gestureState.isDragging = true;
        }
        
        // Convert pixel movement to rotation angle
        const deltaAngle = (deltaY * this.dragSensitivity) / 2;
        this.setAngle(this.gestureState.startAngle + deltaAngle);
        
        this.emitEvent('move', this.value);
    }
    
    handleMouseUp = (e) => {
        if (!this.gestureState) {
            return;
        }
        
        if (e.cancelable) {
            e.preventDefault();
        }
        
        this.endGesture(e.clientX, e.clientY);
        
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
        document.removeEventListener('mouseout', this.handleMouseOut);
    }
    
    handleTouchEnd = (e) => {
        if (!this.gestureState) {
            return;
        }
        
        if (e.cancelable) {
            e.preventDefault();
        }
        
        this.endGesture(
            e.changedTouches[0].clientX,
            e.changedTouches[0].clientY
        );
        
        document.removeEventListener('touchmove', this.handleTouchMove);
        document.removeEventListener('touchend', this.handleTouchEnd);
        document.removeEventListener('touchcancel', this.handleTouchCancel);
    }
    
    endGesture(x, y) {
        const isDragging = this.gestureState.isDragging;
        this.gestureState = null;
        
        if (isDragging) {
            this.snapToNearestItem();
            this.emitEvent('end', this.value);
            this.emitUpdateValue(this.value);
        } else {
            this.triggerClick(x, y);
        }
    }
    
    triggerClick(x, y) {
        if (!this.layerTopEl || !this.layerBottomEl) {
            return;
        }
        
        const topRect = this.layerTopEl.getBoundingClientRect();
        const bottomRect = this.layerBottomEl.getBoundingClientRect();
        
        let targetAngle = this.currentAngle;
        
        if (
            topRect.left <= x && x <= topRect.right &&
            topRect.top <= y && y <= topRect.bottom
        ) {
            // Click on top - move up one item
            targetAngle -= this.anglePerItem;
        } else if (
            bottomRect.left <= x && x <= bottomRect.right &&
            bottomRect.top <= y && y <= bottomRect.bottom
        ) {
            // Click on bottom - move down one item
            targetAngle += this.anglePerItem;
        } else {
            return;
        }
        
        this.setAngle(targetAngle, true);
        this.emitEvent('click', this.value);
        this.emitUpdateValue(this.value);
    }
    
    handleMouseOut = (e) => {
        if (e.relatedTarget === null) {
            this.cancelGesture();
        }
    }
    
    handleTouchCancel = () => {
        this.cancelGesture();
    }
    
    cancelGesture() {
        this.gestureState = null;
        this.snapToNearestItem();
        this.emitEvent('cancel');
    }
    
    emitUpdateValue(value) {
        if (this.value !== value) {
            this.value = value;
            this.onChange(value);
        }
    }
    
    emitEvent(eventName, value) {
        const event = new CustomEvent(`wheel-${eventName}`, {
            detail: { value },
            bubbles: true
        });
        this.element.dispatchEvent(event);
    }
    
    updateSelection() {
        // Update aria-selected attributes
        this.activeItems.forEach((item, logicalIndex) => {
            const optionIndex = parseInt(item.getAttribute('data-option-index'));
            const isSelected = optionIndex === this.currentIndex;
            item.setAttribute('aria-selected', isSelected ? 'true' : 'false');
        });
    }
    
    setValue(value) {
        const nextIndex = this.options.findIndex(option => option.value == value);
        if (nextIndex >= 0 && nextIndex !== this.currentIndex) {
            this.currentIndex = nextIndex;
            this.value = value;
            this.setAngle(-nextIndex * this.anglePerItem, true);
        }
    }
    
    setOptions(newOptions) {
        this.options = this.normalizeOptions(newOptions);
        this.currentIndex = Math.max(
            this.options.findIndex(option => option.value == this.value),
            0
        );
        
        // Clear existing items
        this.activeItems.clear();
        this.drum.innerHTML = '';
        
        // Update with new options
        this.updateVisibleItems();
        this.setAngle(-this.currentIndex * this.anglePerItem);
    }
    
    render(containerId) {
        // Get container element
        const container = typeof containerId === 'string' 
            ? document.getElementById(containerId)
            : containerId;
            
        if (!container) {
            console.error(`[wheel_selector_component_engine] Container not found:`, containerId);
            return null;
        }
        
        // Append element to container
        container.appendChild(this.element);
        
        console.log(`[wheel_selector_component_engine] Rendered in container:`, containerId);
        return this.element;
    }
    
    destroy() {
        // Remove event listeners
        this.element.removeEventListener('wheel', this.handleWheel);
        this.element.removeEventListener('touchstart', this.handleTouchStart);
        this.element.removeEventListener('mousedown', this.handleMouseDown);
        
        // Clean up document listeners if active
        document.removeEventListener('touchmove', this.handleTouchMove);
        document.removeEventListener('touchend', this.handleTouchEnd);
        document.removeEventListener('touchcancel', this.handleTouchCancel);
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
        document.removeEventListener('mouseout', this.handleMouseOut);
        
        // Disconnect observer
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
        
        // Clear timeouts
        if (this.transitionTimeout) {
            clearTimeout(this.transitionTimeout);
        }
        if (this.wheelTimeout) {
            clearTimeout(this.wheelTimeout);
        }
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    }
}

// Export for use with ComponentFactory
export { wheel_selector_component_engine };
