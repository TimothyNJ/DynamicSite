// wheel_selector_component_engine.js
// Based on vue-scroll-picker vanilla JS implementation

class wheel_selector_component_engine {
    constructor(options = {}, changeHandler = null) {
        this.config = {
            label: options.label || '',
            options: options.options || [],
            defaultValue: options.defaultValue || null,
            onChange: changeHandler || options.onChange || (() => {}),
            disabled: options.disabled || false,
            storageKey: options.storageKey || null,
            ...options
        };
        
        this.container = null;
        this.wrapper = null;
        this.scroller = null;
        this.overlay = null;
        this.indicator = null;
        
        this.value = this.config.defaultValue;
        this.itemHeight = 44; // Standard iOS picker height
        this.visibleItems = 5;
        this.currentIndex = 0;
        
        // Scrolling state
        this.startY = 0;
        this.currentY = 0;
        this.isScrolling = false;
        this.wheelTimeout = null;
        
        // Momentum physics properties
        this.velocity = 0;
        this.amplitude = 0;
        this.frame = 0;
        this.timestamp = 0;
        this.ticker = null;
        this.lastY = 0;
        this.lastTime = 0;
        this.lastDelta = 0; // Track last animation delta
        this.velocityBuffer = []; // Track last N velocities for smoothing
        this.maxVelocityBuffer = 5;
        this.friction = 0.95; // Deceleration factor
        this.snapThreshold = 0.5; // Velocity threshold for snapping
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
        
        // Load stored value
        this.loadStoredValue();
        
        // Create HTML structure
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'scroll-picker-wrapper';
        
        this.scroller = document.createElement('div');
        this.scroller.className = 'scroll-picker-scroller';
        
        // Create option elements
        this.config.options.forEach((option, index) => {
            const elem = document.createElement('div');
            elem.className = 'scroll-picker-item';
            elem.textContent = typeof option === 'object' ? option.name || option.text : option;
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
        
        // Add label if provided
        if (this.config.label) {
            const label = document.createElement('label');
            label.className = 'scroll-picker-label';
            label.textContent = this.config.label;
            this.container.appendChild(label);
        }
        
        // Assemble structure
        this.wrapper.appendChild(this.scroller);
        this.wrapper.appendChild(this.overlay);
        this.wrapper.appendChild(this.indicator);
        this.container.appendChild(this.wrapper);
        
        // Add event listeners
        this.setupEventListeners();
        
        // Set initial value
        if (this.value !== null) {
            this.setValue(this.value);
        } else {
            // Update visuals even if no initial value
            this.updateItemVisuals();
        }
        
        return this.wrapper;
    }
    
    setupEventListeners() {
        // Touch events
        this.scroller.addEventListener('touchstart', (e) => {
            if (this.config.disabled) return;
            this.startY = e.touches[0].clientY;
            this.lastY = this.startY;
            this.lastTime = Date.now();
            this.velocityBuffer = [];
            this.isScrolling = true;
            
            // Stop any ongoing momentum animation
            if (this.ticker) {
                cancelAnimationFrame(this.ticker);
                this.ticker = null;
            }
        });
        
        this.scroller.addEventListener('touchmove', (e) => {
            if (!this.isScrolling || this.config.disabled) return;
            e.preventDefault();
            
            this.currentY = e.touches[0].clientY;
            const currentTime = Date.now();
            const timeDelta = currentTime - this.lastTime;
            
            if (timeDelta > 0) {
                const distance = this.currentY - this.lastY;
                const velocity = distance / timeDelta * 16; // Increased from 1000 to 16 (frame-based)
                
                // Add to velocity buffer for smoothing
                this.velocityBuffer.push(velocity);
                if (this.velocityBuffer.length > this.maxVelocityBuffer) {
                    this.velocityBuffer.shift();
                }
                
                // Calculate average velocity
                this.velocity = this.velocityBuffer.reduce((a, b) => a + b, 0) / this.velocityBuffer.length;
            }
            
            const diff = this.currentY - this.startY;
            this.scroll(diff);
            this.startY = this.currentY;
            this.lastY = this.currentY;
            this.lastTime = currentTime;
        });
        
        this.scroller.addEventListener('touchend', () => {
            if (this.config.disabled) return;
            this.isScrolling = false;
            
            // Check if we have enough velocity for momentum
            if (Math.abs(this.velocity) > this.snapThreshold) {
                this.startMomentum();
            } else {
                // Low velocity, just snap
                this.snapToItem();
            }
        });
        
        // Mouse events
        this.scroller.addEventListener('mousedown', (e) => {
            if (this.config.disabled) return;
            this.startY = e.clientY;
            this.lastY = this.startY;
            this.lastTime = Date.now();
            this.velocityBuffer = [];
            this.isScrolling = true;
            e.preventDefault();
            
            // Stop any ongoing momentum animation
            if (this.ticker) {
                cancelAnimationFrame(this.ticker);
                this.ticker = null;
            }
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!this.isScrolling || this.config.disabled) return;
            
            this.currentY = e.clientY;
            const currentTime = Date.now();
            const timeDelta = currentTime - this.lastTime;
            
            if (timeDelta > 0) {
                const distance = this.currentY - this.lastY;
                const velocity = distance / timeDelta * 16; // Increased from 1000 to 16 (frame-based)
                
                // Add to velocity buffer for smoothing
                this.velocityBuffer.push(velocity);
                if (this.velocityBuffer.length > this.maxVelocityBuffer) {
                    this.velocityBuffer.shift();
                }
                
                // Calculate average velocity
                this.velocity = this.velocityBuffer.reduce((a, b) => a + b, 0) / this.velocityBuffer.length;
            }
            
            const diff = this.currentY - this.startY;
            this.scroll(diff);
            this.startY = this.currentY;
            this.lastY = this.currentY;
            this.lastTime = currentTime;
        });
        
        document.addEventListener('mouseup', () => {
            if (this.isScrolling && !this.config.disabled) {
                this.isScrolling = false;
                
                // Check if we have enough velocity for momentum
                if (Math.abs(this.velocity) > this.snapThreshold) {
                    this.startMomentum();
                } else {
                    // Low velocity, just snap
                    this.snapToItem();
                }
            }
        });
        
        // Wheel events
        this.scroller.addEventListener('wheel', (e) => {
            if (this.config.disabled) return;
            e.preventDefault();
            
            // More sensitive wheel scrolling
            const delta = -e.deltaY * 0.5; // Reduced multiplier for smoother control
            this.scroll(delta);
            
            // Track velocity for momentum
            const currentTime = Date.now();
            if (this.lastTime && currentTime - this.lastTime < 100) {
                this.velocity = delta * 2; // Simple velocity from wheel
            }
            this.lastTime = currentTime;
            
            clearTimeout(this.wheelTimeout);
            this.wheelTimeout = setTimeout(() => {
                // Only snap if velocity is low
                if (Math.abs(this.velocity) < 2) {
                    this.snapToItem();
                } else {
                    this.startMomentum();
                }
                this.velocity = 0;
            }, 150);
        });
    }
    
    scroll(delta) {
        const currentTransform = this.getCurrentTransform();
        const newTransform = currentTransform + delta;
        
        // Apply boundaries with slight overscroll
        const maxTransform = 50; // Allow 50px overscroll at top
        const minTransform = -(this.config.options.length - 1) * this.itemHeight - 50; // Allow 50px overscroll at bottom
        
        if (newTransform > maxTransform) {
            // Apply resistance at boundary
            const excess = newTransform - maxTransform;
            this.scroller.style.transform = `translateY(${maxTransform + excess * 0.3}px)`;
        } else if (newTransform < minTransform) {
            // Apply resistance at boundary
            const excess = newTransform - minTransform;
            this.scroller.style.transform = `translateY(${minTransform + excess * 0.3}px)`;
        } else {
            this.scroller.style.transform = `translateY(${newTransform}px)`;
        }
        
        // Update visual states based on current position
        this.updateItemVisuals();
    }
    
    getCurrentTransform() {
        const transform = window.getComputedStyle(this.scroller).transform;
        if (transform === 'none') return 0;
        
        const matrix = transform.match(/matrix.*\((.+)\)/)[1].split(', ');
        return parseFloat(matrix[5]);
    }
    
    snapToItem() {
        // Cancel any ongoing momentum
        if (this.ticker) {
            cancelAnimationFrame(this.ticker);
            this.ticker = null;
        }
        this.amplitude = 0;
        
        const currentTransform = this.getCurrentTransform();
        const index = Math.round(-currentTransform / this.itemHeight);
        
        this.currentIndex = Math.max(0, Math.min(index, this.config.options.length - 1));
        this.scroller.style.transform = `translateY(${-this.currentIndex * this.itemHeight}px)`;
        this.scroller.style.transition = 'transform 0.3s ease';
        
        // Update value and trigger callback
        const selectedOption = this.config.options[this.currentIndex];
        this.value = typeof selectedOption === 'object' ? selectedOption.value : selectedOption;
        this.config.onChange(this.value);
        
        // Save to storage
        if (this.config.storageKey) {
            localStorage.setItem(this.config.storageKey, JSON.stringify(this.value));
        }
        
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
    
    // Update visual properties of items based on their position
    updateItemVisuals() {
        const currentTransform = this.getCurrentTransform();
        const centerPosition = -currentTransform + (this.itemHeight * 2); // Center of viewport
        
        const items = this.scroller.querySelectorAll('.scroll-picker-item');
        items.forEach((item, index) => {
            const itemPosition = index * this.itemHeight;
            const distanceFromCenter = Math.abs(itemPosition - centerPosition);
            
            // Calculate opacity (1 at center, fade to 0.3 at edges)
            const maxDistance = this.itemHeight * 2.5;
            const opacity = Math.max(0.3, 1 - (distanceFromCenter / maxDistance) * 0.7);
            
            // Calculate scale (1 at center, scale down to 0.85 at edges)
            const scale = Math.max(0.85, 1 - (distanceFromCenter / maxDistance) * 0.15);
            
            // Apply visual properties
            item.style.opacity = opacity;
            item.style.transform = `scale(${scale})`;
            
            // Update text color intensity based on proximity
            if (distanceFromCenter < this.itemHeight / 2) {
                item.style.color = '#007AFF'; // iOS blue for near-selected
                item.style.fontWeight = '500';
            } else {
                item.style.color = ''; // Reset to CSS default
                item.style.fontWeight = '';
            }
        });
    }
    
    // Start momentum animation based on release velocity
    startMomentum() {
        // Amplify the velocity for more dramatic momentum
        this.amplitude = this.velocity * 2.5; // Increased from 1x to 2.5x
        this.timestamp = Date.now();
        this.frame = this.getCurrentTransform();
        
        // Start the animation loop
        this.ticker = requestAnimationFrame(() => this.autoScroll());
    }
    
    // Auto-scroll animation frame
    autoScroll() {
        if (!this.amplitude) {
            return;
        }
        
        const elapsed = Date.now() - this.timestamp;
        // Increased time constant from 325 to 500 for longer momentum
        const delta = this.amplitude * Math.exp(-elapsed / 500);
        
        if (Math.abs(delta) > 0.5) {
            // Apply delta directly as it already includes direction
            const currentTransform = this.getCurrentTransform();
            const newTransform = currentTransform + (delta * 0.016); // ~60fps frame time
            
            // Check boundaries
            const maxTransform = 50; // Allow overscroll
            const minTransform = -(this.config.options.length - 1) * this.itemHeight - 50;
            
            if (newTransform > maxTransform || newTransform < minTransform) {
                // Hit boundary, stop momentum and bounce back
                this.amplitude = 0;
                this.bounceBack();
            } else {
                // Apply the transform
                this.scroller.style.transform = `translateY(${newTransform}px)`;
                
                // Update visual states
                this.updateItemVisuals();
                
                // Continue animation
                this.ticker = requestAnimationFrame(() => this.autoScroll());
            }
        } else {
            // Momentum exhausted, snap to nearest item
            this.amplitude = 0;
            this.snapToItem();
        }
    }
    
    // Bounce back from overscroll
    bounceBack() {
        const currentTransform = this.getCurrentTransform();
        const maxTransform = 0;
        const minTransform = -(this.config.options.length - 1) * this.itemHeight;
        
        let targetTransform = currentTransform;
        if (currentTransform > maxTransform) {
            targetTransform = maxTransform;
        } else if (currentTransform < minTransform) {
            targetTransform = minTransform;
        }
        
        // Animate bounce back
        this.scroller.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        this.scroller.style.transform = `translateY(${targetTransform}px)`;
        
        setTimeout(() => {
            this.scroller.style.transition = '';
            this.snapToItem();
        }, 300);
    }
    
    setValue(value) {
        const index = this.config.options.findIndex(option => {
            return typeof option === 'object' ? option.value === value : option === value;
        });
        
        if (index !== -1) {
            this.currentIndex = index;
            this.scroller.style.transform = `translateY(${-index * this.itemHeight}px)`;
            this.updateItemStates();
            this.updateItemVisuals(); // Update visual states
        }
    }
    
    getValue() {
        return this.value;
    }
    
    loadStoredValue() {
        if (this.config.storageKey) {
            try {
                const stored = localStorage.getItem(this.config.storageKey);
                if (stored) {
                    this.value = JSON.parse(stored);
                }
            } catch (e) {
                console.error('[WheelSelector] Error loading stored value:', e);
            }
        }
    }
    
    disable() {
        this.config.disabled = true;
        if (this.wrapper) {
            this.wrapper.classList.add('disabled');
        }
    }
    
    enable() {
        this.config.disabled = false;
        if (this.wrapper) {
            this.wrapper.classList.remove('disabled');
        }
    }
    
    setOptions(newOptions) {
        this.config.options = newOptions;
        this.currentIndex = 0;
        this.value = null;
        this.render(this.container);
    }
    
    // Add styles method for consistency with other engines
    static addStyles() {
        const styleId = 'wheel-selector-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .scroll-picker-wrapper {
                    position: relative;
                    height: 220px;
                    overflow: hidden;
                    background: #fff;
                    user-select: none;
                    border-radius: 10px;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                }
                
                .scroll-picker-wrapper.disabled {
                    opacity: 0.5;
                    pointer-events: none;
                }
                
                .scroll-picker-scroller {
                    position: relative;
                    transition: transform 0.3s ease;
                }
                
                .scroll-picker-item {
                    height: 44px;
                    line-height: 44px;
                    text-align: center;
                    color: #999;
                    font-size: 16px;
                    cursor: pointer;
                    transition: opacity 0.1s ease, transform 0.1s ease, color 0.2s ease;
                    transform-origin: center;
                }
                
                .scroll-picker-item.selected {
                    color: #007AFF;
                    font-weight: 500;
                }
                
                .scroll-picker-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    pointer-events: none;
                    background: linear-gradient(
                        to bottom,
                        rgba(255, 255, 255, 0.9) 0%,
                        rgba(255, 255, 255, 0) 35%,
                        rgba(255, 255, 255, 0) 65%,
                        rgba(255, 255, 255, 0.9) 100%
                    );
                }
                
                /* Dark theme support */
                .dark-mode .scroll-picker-overlay {
                    background: linear-gradient(
                        to bottom,
                        rgba(0, 0, 0, 0.9) 0%,
                        rgba(0, 0, 0, 0) 35%,
                        rgba(0, 0, 0, 0) 65%,
                        rgba(0, 0, 0, 0.9) 100%
                    );
                }
                
                .dark-mode .scroll-picker-wrapper {
                    background: #1a1a1a;
                }
                
                .dark-mode .scroll-picker-item {
                    color: #666;
                }
                
                .dark-mode .scroll-picker-item.selected {
                    color: #007AFF;
                }
                
                .scroll-picker-indicator {
                    position: absolute;
                    top: 50%;
                    left: 0;
                    right: 0;
                    height: 44px;
                    transform: translateY(-50%);
                    pointer-events: none;
                    border-top: 1px solid #ccc;
                    border-bottom: 1px solid #ccc;
                }
                
                .dark-mode .scroll-picker-indicator {
                    border-color: #444;
                }
                
                .scroll-picker-label {
                    display: block;
                    margin-bottom: 8px;
                    font-size: 14px;
                    font-weight: 600;
                    color: #333;
                }
                
                .dark-mode .scroll-picker-label {
                    color: #ccc;
                }
            `;
            document.head.appendChild(style);
        }
    }
}

// Auto-add styles when the class is loaded
wheel_selector_component_engine.addStyles();

// Export the class directly
export { wheel_selector_component_engine };
