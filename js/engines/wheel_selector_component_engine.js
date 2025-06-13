// wheel_selector_component_engine.js
// Complete implementation of vue-scroll-picker without Vue dependency
// Retains all functionality: momentum, elasticity, animations, gestures

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
        
        // State
        this.internalIndex = this.findInitialIndex();
        this.transitionTimeout = null;
        this.itemOffsets = [];
        this.scrollOffset = 0;
        this.scrollY = 0;
        this.scrollYMax = 0;
        this.gestureState = null;
        this.wheelTimeout = null;
        this.scrollRaf = null;
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
        // Main container
        const container = document.createElement('div');
        container.className = 'vue-scroll-picker';
        
        // Rotator (contains items)
        this.rotatorEl = document.createElement('div');
        this.rotatorEl.className = 'vue-scroll-picker-rotator';
        this.rotatorEl.setAttribute('role', 'listbox');
        
        // Create items
        this.updateItems();
        
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
        
        container.appendChild(this.rotatorEl);
        container.appendChild(layerContainer);
        
        return container;
    }
    
    updateItems() {
        // Clear existing items
        this.rotatorEl.innerHTML = '';
        
        if (this.options.length === 0) {
            // Empty state
            const emptyItem = document.createElement('div');
            emptyItem.className = 'vue-scroll-picker-item';
            emptyItem.setAttribute('role', 'option');
            emptyItem.setAttribute('aria-disabled', 'true');
            emptyItem.setAttribute('aria-selected', 'false');
            emptyItem.textContent = this.emptyText;
            this.rotatorEl.appendChild(emptyItem);
        } else {
            // Create option items
            this.options.forEach((option, index) => {
                const item = document.createElement('div');
                item.className = 'vue-scroll-picker-item';
                item.setAttribute('role', 'option');
                item.setAttribute('aria-disabled', option.disabled ? 'true' : 'false');
                item.setAttribute('aria-selected', this.internalIndex === index ? 'true' : 'false');
                item.setAttribute('data-value', option.value ?? '');
                item.textContent = option.name;
                this.rotatorEl.appendChild(item);
            });
        }
    }
    
    init() {
        // Add event listeners
        this.element.addEventListener('wheel', this.handleWheel.bind(this), this.eventOptions);
        this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), this.eventOptions);
        this.element.addEventListener('mousedown', this.handleMouseDown.bind(this), this.eventOptions);
        
        // Setup resize observer
        if (typeof window.ResizeObserver !== 'undefined') {
            let raf = null;
            this.resizeObserver = new window.ResizeObserver(() => {
                if (raf) {
                    cancelAnimationFrame(raf);
                }
                raf = requestAnimationFrame(() => {
                    this.updateItemOffsets();
                    raf = null;
                });
            });
            this.resizeObserver.observe(this.element);
        } else {
            this.updateItemOffsets();
        }
        
        // Initial positioning
        this.updateItemOffsets();
    }
    
    updateItemOffsets() {
        const rotatorEl = this.rotatorEl;
        const layerSelectionEl = this.layerSelectionEl;
        
        if (!rotatorEl || !layerSelectionEl) {
            return;
        }
        
        // Set scrollOffset
        const { top: selTop, bottom: selBottom } = layerSelectionEl.getBoundingClientRect();
        const elTop = this.element?.getBoundingClientRect().top ?? 0;
        this.scrollOffset = (selTop + selBottom) / 2 - elTop;
        
        // Calculate item offsets
        let firstItemOffset = 0;
        this.itemOffsets = Array.from(rotatorEl.children).map((itemEl, index) => {
            const { top, bottom } = itemEl.getBoundingClientRect();
            const itemOffset = (top + bottom) / 2;
            if (index === 0) {
                this.scrollOffset -= itemOffset - top;
                firstItemOffset = itemOffset;
            }
            return itemOffset - firstItemOffset;
        });
        
        this.scrollYMax = Math.max(...this.itemOffsets);
        this.setScroll(this.findScrollByIndex(this.internalIndex));
    }
    
    findIndexFromScroll(scroll, ignoreDisabled) {
        let minDiff = Infinity;
        let foundIndex = 0;
        
        for (const [index, offset] of this.itemOffsets.entries()) {
            if (!ignoreDisabled && this.options[index]?.disabled) {
                continue;
            }
            if (Math.abs(offset - scroll) < minDiff) {
                minDiff = Math.abs(offset - scroll);
                foundIndex = index;
            }
        }
        
        return foundIndex;
    }
    
    findScrollByIndex(index) {
        return this.itemOffsets[Math.min(Math.max(index, 0), this.itemOffsets.length - 1)];
    }
    
    scrollTo(scroll) {
        this.setScroll(scroll);
        
        if (this.transitionTimeout) {
            clearTimeout(this.transitionTimeout);
        }
        
        // Add transition class
        this.rotatorEl.classList.add('vue-scroll-picker-rotator-transition');
        
        this.transitionTimeout = setTimeout(() => {
            this.rotatorEl.classList.remove('vue-scroll-picker-rotator-transition');
            this.transitionTimeout = null;
        }, 150);
    }
    
    setScroll(scroll) {
        this.scrollY = scroll;
        
        if (this.scrollRaf) {
            cancelAnimationFrame(this.scrollRaf);
        }
        
        this.scrollRaf = requestAnimationFrame(() => {
            if (this.rotatorEl) {
                this.rotatorEl.style.top = `${this.scrollOffset - scroll}px`;
            }
            this.scrollRaf = null;
        });
        
        return scroll;
    }
    
    bounceEffect(value, min, max, tension = 0.2) {
        if (value < min) {
            return min + (value - min) * tension;
        }
        if (value > max) {
            return max + (value - max) * tension;
        }
        return value;
    }
    
    handleWheel(e) {
        if (!this.wheelTimeout && this.scrollY <= 0 && e.deltaY < 0) {
            return;
        }
        if (!this.wheelTimeout && this.scrollY >= this.scrollYMax && e.deltaY > 0) {
            return;
        }
        if (this.itemOffsets.length === 1) {
            return;
        }
        
        e.preventDefault();
        
        const scrollYValue = this.setScroll(
            this.bounceEffect(this.scrollY + e.deltaY * this.wheelSensitivity, 0, this.scrollYMax)
        );
        
        const nextIndex = this.findIndexFromScroll(scrollYValue, true);
        const nextOption = this.options[nextIndex];
        const nextValue = nextOption?.value;
        
        this.emitEvent('wheel', nextValue);
        
        if (nextOption && !nextOption.disabled) {
            this.internalIndex = nextIndex;
            this.emitUpdateValue(nextValue);
        }
        
        if (this.wheelTimeout) {
            clearTimeout(this.wheelTimeout);
        }
        
        this.wheelTimeout = setTimeout(() => {
            this.scrollTo(this.findScrollByIndex(this.findIndexFromScroll(scrollYValue, false)));
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
        
        this.gestureState = [this.scrollY, e.touches[0].clientY, false];
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
        
        this.gestureState = [this.scrollY, e.clientY, false];
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
        
        const diff = this.gestureState[1] - e.touches[0].clientY;
        
        if (Math.abs(diff) > 1.5) {
            const nextGestureState = this.gestureState.slice();
            nextGestureState[2] = true;
            this.gestureState = nextGestureState;
        }
        
        this.emitMove(
            this.setScroll(
                this.bounceEffect(
                    this.gestureState[0] + diff * this.touchSensitivity,
                    0,
                    this.scrollYMax
                )
            )
        );
    }
    
    handleMouseMove = (e) => {
        if (!this.gestureState) {
            return;
        }
        
        if (e.cancelable) {
            e.preventDefault();
        }
        
        const diff = this.gestureState[1] - e.clientY;
        
        if (Math.abs(diff) > 1.5) {
            const nextGestureState = this.gestureState.slice();
            nextGestureState[2] = true;
            this.gestureState = nextGestureState;
        }
        
        this.emitMove(
            this.setScroll(
                this.bounceEffect(
                    this.gestureState[0] + diff * this.dragSensitivity,
                    0,
                    this.scrollYMax
                )
            )
        );
    }
    
    emitMove(scrollY) {
        const index = this.findIndexFromScroll(scrollY, true);
        const value = this.options[index]?.value ?? undefined;
        this.emitEvent('move', value);
    }
    
    handleMouseUp = (e) => {
        if (!this.gestureState) {
            return;
        }
        
        if (e.cancelable) {
            e.preventDefault();
        }
        
        this.endGesture(this.gestureState[2], e.clientX, e.clientY);
        this.gestureState = null;
        
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
            this.gestureState[2],
            e.changedTouches[0].clientX,
            e.changedTouches[0].clientY
        );
        this.gestureState = null;
        
        document.removeEventListener('touchmove', this.handleTouchMove);
        document.removeEventListener('touchend', this.handleTouchEnd);
        document.removeEventListener('touchcancel', this.handleTouchCancel);
    }
    
    endGesture(isDragging, x, y) {
        if (isDragging) {
            const nextIndex = this.findIndexFromScroll(this.scrollY, false);
            const nextValue = this.options[nextIndex]?.value ?? null;
            this.scrollTo(this.findScrollByIndex(nextIndex));
            this.internalIndex = nextIndex;
            this.emitEvent('end', nextValue);
            this.emitUpdateValue(nextValue);
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
        
        let nextIndex = this.internalIndex;
        
        if (
            topRect.left <= x && x <= topRect.right &&
            topRect.top <= y && y <= topRect.bottom
        ) {
            if (this.internalIndex === 0) {
                return; // top
            }
            nextIndex--;
            while (
                this.options[nextIndex] &&
                this.options[nextIndex].disabled
            ) {
                nextIndex--;
            }
        } else if (
            bottomRect.left <= x && x <= bottomRect.right &&
            bottomRect.top <= y && y <= bottomRect.bottom
        ) {
            if (this.internalIndex === this.options.length - 1) {
                return; // bottom
            }
            nextIndex++;
            while (
                this.options[nextIndex] &&
                this.options[nextIndex].disabled
            ) {
                nextIndex++;
            }
        }
        
        if (this.internalIndex !== nextIndex && this.options[nextIndex]) {
            this.internalIndex = nextIndex;
            const nextValue = this.options[nextIndex].value;
            this.emitEvent('end', nextValue);
            this.emitEvent('click', nextValue);
            this.emitUpdateValue(nextValue);
            this.scrollTo(this.findScrollByIndex(nextIndex));
            this.updateSelection();
        }
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
        this.scrollTo(this.findScrollByIndex(this.internalIndex));
        this.gestureState = null;
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
        const items = this.rotatorEl.querySelectorAll('.vue-scroll-picker-item');
        items.forEach((item, index) => {
            item.setAttribute('aria-selected', this.internalIndex === index ? 'true' : 'false');
        });
    }
    
    setValue(value) {
        const nextIndex = this.options.findIndex(option => option.value == value);
        if (this.internalIndex !== nextIndex && nextIndex >= 0) {
            this.internalIndex = nextIndex;
            this.value = value;
            this.scrollTo(this.findScrollByIndex(nextIndex));
            this.updateSelection();
        }
    }
    
    setOptions(newOptions) {
        this.options = this.normalizeOptions(newOptions);
        this.internalIndex = Math.max(
            this.options.findIndex(option => option.value == this.value),
            0
        );
        
        this.updateItems();
        this.updateSelection();
        
        requestAnimationFrame(() => {
            this.updateItemOffsets();
            this.setScroll(this.findScrollByIndex(this.internalIndex));
        });
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
        if (this.scrollRaf) {
            cancelAnimationFrame(this.scrollRaf);
        }
    }
}

// Export for use with ComponentFactory
export { wheel_selector_component_engine };
