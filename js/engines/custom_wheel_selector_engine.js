// custom_wheel_selector_engine.js
// Custom 3D wheel implementation with proper trackpad/mouse wheel support

class custom_wheel_selector_engine {
    constructor(options = {}, onChange = null) {
        // Configuration
        this.options = this.normalizeOptions(options.options || []);
        this.value = options.value || options.defaultValue || null;
        this.onChange = onChange || options.onChange || (() => {});
        this.emptyText = options.emptyText || 'No Options Available';
        
        // State
        this.currentIndex = this.findInitialIndex();
        
        // Physics parameters
        this.physics = {
            position: 0,          // Current scroll position
            velocity: 0,          // Current velocity
            targetPosition: 0,    // Where we want to be
            itemHeight: 24,       // Height of each item (reduced for tighter spacing)
            friction: 0.92,       // Friction coefficient (reduced for longer scrolling)
            snapThreshold: 0.5,   // Velocity threshold for snapping
            lastTouchY: 0,
            isDragging: false,
            lastTime: Date.now(),
            momentumTracking: [],  // Track recent movements for momentum
            touchVelocityScale: 250  // Scale factor for touch velocity (increased for iPhone)
        };
        
        // Visual parameters
        this.visual = {
            perspective: 1000,    // CSS perspective
            rotateX: 25,         // Max rotation angle
            itemsVisible: 7,     // Number of items visible
            fadeStart: 2,        // When to start fading
            minOpacity: 0.3      // Minimum opacity for distant items
        };
        
        // Initialize DOM element references
        this.itemsEls = [];
        
        // Create DOM structure
        this.element = this.createElement();
        this.wheelEl = this.element.querySelector('.custom-wheel-items');
        
        // Methods are auto-bound with arrow functions
        
        // Start animation loop
        this.animationId = null;
        this.startAnimation();
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
        const container = document.createElement('div');
        container.className = 'custom-wheel-selector';
        
        // Create wheel viewport
        const viewport = document.createElement('div');
        viewport.className = 'custom-wheel-viewport';
        
        // Create items container
        const items = document.createElement('div');
        items.className = 'custom-wheel-items';
        
        // Render options
        this.options.forEach((option, index) => {
            const item = document.createElement('div');
            item.className = 'custom-wheel-item';
            item.setAttribute('data-index', index);
            item.textContent = option.name;
            items.appendChild(item);
            this.itemsEls.push(item);
        });
        
        // Create selection indicator
        const indicator = document.createElement('div');
        indicator.className = 'custom-wheel-indicator';
        
        // Assemble
        viewport.appendChild(items);
        container.appendChild(viewport);
        container.appendChild(indicator);
        
        // Add styles
        this.addStyles();
        
        // Add event listeners
        container.addEventListener('wheel', this.handleWheel, { passive: false });
        container.addEventListener('touchstart', this.handleTouchStart, { passive: false });
        container.addEventListener('touchmove', this.handleTouchMove, { passive: false });
        container.addEventListener('touchend', this.handleTouchEnd, { passive: false });
        container.addEventListener('click', this.handleClick, { passive: false });
        
        // Set initial position
        this.physics.position = this.currentIndex * this.physics.itemHeight;
        this.physics.targetPosition = this.physics.position;
        
        return container;
    }
    
    addStyles() {
        if (document.getElementById('custom-wheel-styles')) {
            return;
        }
        
        const style = document.createElement('style');
        style.id = 'custom-wheel-styles';
        style.textContent = `
            .custom-wheel-selector {
                position: relative;
                width: 100%;
                max-width: 300px;
                height: 168px; /* 7 items * 24px */
                margin: 0 auto;
                background: var(--component-background, #ffffff);
                border-radius: 8px;
                overflow: hidden;
                user-select: none;
                -webkit-user-select: none;
                touch-action: none;
            }
            
            .custom-wheel-viewport {
                position: relative;
                width: 100%;
                height: 100%;
                overflow: hidden;
                perspective: 1000px;
                mask-image: linear-gradient(
                    to bottom,
                    transparent,
                    black 20%,
                    black 80%,
                    transparent
                );
                -webkit-mask-image: linear-gradient(
                    to bottom,
                    transparent,
                    black 20%,
                    black 80%,
                    transparent
                );
            }
            
            .custom-wheel-items {
                position: absolute;
                width: 100%;
                top: 50%;
                transform: translateY(-50%);
                transform-style: preserve-3d;
            }
            
            .custom-wheel-item {
                position: absolute;
                width: 100%;
                height: 24px;
                line-height: 24px;
                text-align: center;
                font-size: 16px;
                color: var(--text-color, #333);
                transform-origin: center center;
                backface-visibility: hidden;
                transition: none; /* We'll handle animation in JS */
                cursor: pointer;
            }
            
            .custom-wheel-item.selected {
                color: var(--text-color-primary, #000);
                font-weight: 600;
                font-size: 18px;
                transform-origin: center center;
            }
            
            .custom-wheel-indicator {
                position: absolute;
                top: 50%;
                left: 5%;
                right: 5%;
                height: 24px;
                transform: translateY(-50%);
                pointer-events: none;
                border-top: 2px solid var(--accent-color, #007AFF);
                border-bottom: 2px solid var(--accent-color, #007AFF);
                background: var(--indicator-bg, rgba(0, 122, 255, 0.05));
                border-radius: 4px;
            }
            
            /* Dark mode support */
            @media (prefers-color-scheme: dark) {
                .custom-wheel-selector {
                    --component-background: #1c1c1e;
                    --text-color: #ffffff;
                    --text-color-primary: #ffffff;
                    --border-color: rgba(255, 255, 255, 0.1);
                    --accent-color: #0A84FF;
                    --indicator-bg: rgba(10, 132, 255, 0.1);
                }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    handleWheel = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Add velocity based on wheel delta
        const delta = e.deltaY;
        const scaleFactor = 1.2; // Increased for faster rotation
        
        // Update velocity directly without any limits
        this.physics.velocity += delta * scaleFactor;
        
        // Start animation if not running
        this.startAnimation();
        
        console.log(`[custom_wheel] Wheel delta: ${delta}, velocity: ${this.physics.velocity.toFixed(2)}`);
    }
    
    handleTouchStart = (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        this.physics.lastTouchY = touch.clientY;
        this.physics.isDragging = true;
        this.physics.velocity = 0;
        this.physics.momentumTracking = [];
    }
    
    handleTouchMove = (e) => {
        if (!this.physics.isDragging) return;
        e.preventDefault();
        
        const touch = e.touches[0];
        const deltaY = this.physics.lastTouchY - touch.clientY;
        
        // Update position directly when dragging
        this.physics.position += deltaY;
        
        // Track momentum
        const now = Date.now();
        this.physics.momentumTracking.push({
            deltaY,
            time: now
        });
        
        // Keep only recent tracking (last 100ms)
        this.physics.momentumTracking = this.physics.momentumTracking.filter(
            track => now - track.time < 100
        );
        
        this.physics.lastTouchY = touch.clientY;
    }
    
    handleTouchEnd = (e) => {
        if (!this.physics.isDragging) return;
        e.preventDefault();
        
        this.physics.isDragging = false;
        
        // Calculate velocity from recent movements
        if (this.physics.momentumTracking.length > 0) {
            const totalDelta = this.physics.momentumTracking.reduce((sum, track) => sum + track.deltaY, 0);
            const timeSpan = Date.now() - this.physics.momentumTracking[0].time;
            
            if (timeSpan > 0) {
                this.physics.velocity = (totalDelta / timeSpan) * this.physics.touchVelocityScale; // Increased scale for better iPhone response
            }
        }
    }
    
    handleClick = (e) => {
        // Find which item was clicked
        const rect = this.element.getBoundingClientRect();
        const clickY = e.clientY - rect.top;
        const centerY = rect.height / 2;
        const offset = (clickY - centerY) / this.physics.itemHeight;
        
        // Calculate target index
        const currentIndex = Math.round(this.physics.position / this.physics.itemHeight);
        const targetIndex = Math.round(currentIndex + offset);
        
        // Clamp to valid range
        const clampedIndex = Math.max(0, Math.min(this.options.length - 1, targetIndex));
        
        // Set position directly to clicked item
        this.physics.position = clampedIndex * this.physics.itemHeight;
        this.physics.velocity = 0;
        
        console.log(`[custom_wheel] Clicked item at index: ${clampedIndex}`);
        this.startAnimation();
    }
    
    updateItemTransforms() {
        const centerIndex = this.physics.position / this.physics.itemHeight;
        
        // Calculate the center offset to properly position items
        // We need to know where the center of the viewport is
        const viewportHeight = 168; // 7 items * 24px as defined in CSS
        const centerOffset = (viewportHeight / 2) - (this.physics.itemHeight / 2);
        
        this.itemsEls.forEach((item, index) => {
            const offset = index - centerIndex;
            const absOffset = Math.abs(offset);
            
            // Calculate Y position - adjust so offset=0 appears at center
            const y = (offset * this.physics.itemHeight) - centerOffset;
            
            // Calculate rotation for 3D effect
            const maxRotation = this.visual.rotateX;
            const rotation = Math.max(-maxRotation, Math.min(maxRotation, offset * 15));
            
            // Calculate opacity
            let opacity = 1;
            if (absOffset > this.visual.fadeStart) {
                opacity = Math.max(this.visual.minOpacity, 
                    1 - (absOffset - this.visual.fadeStart) / (this.visual.itemsVisible / 2 - this.visual.fadeStart));
            }
            
            // Calculate scale for perspective effect
            const scale = 1 - (absOffset * 0.05);
            
            // Apply transforms
            item.style.transform = `translateY(${y}px) translateZ(${-absOffset * 20}px) rotateX(${-rotation}deg) scale(${scale})`;
            item.style.opacity = opacity;
            
            // Update selected state
            const isSelected = Math.round(centerIndex) === index;
            item.classList.toggle('selected', isSelected);
        });
    }
    
    animate = () => {
        const now = Date.now();
        const deltaTime = (now - this.physics.lastTime) / 1000; // Convert to seconds
        this.physics.lastTime = now;
        
        let isMoving = false;
        
        if (!this.physics.isDragging) {
            // Consider velocity effectively zero if below threshold
            if (Math.abs(this.physics.velocity) > 0.1) {
                isMoving = true;
                this.physics.position += this.physics.velocity * deltaTime;
                
                // Apply friction
                this.physics.velocity *= Math.pow(this.physics.friction, deltaTime * 60); // Normalize to 60fps
                
                // Clamp position to valid range
                const minPos = 0;
                const maxPos = (this.options.length - 1) * this.physics.itemHeight;
                
                if (this.physics.position < minPos) {
                    this.physics.position = minPos;
                    this.physics.velocity = 0;
                } else if (this.physics.position > maxPos) {
                    this.physics.position = maxPos;
                    this.physics.velocity = 0;
                }
            } else {
                // Velocity is effectively zero, snap to nearest item
                this.physics.velocity = 0; // Force to exact zero
                
                const targetIndex = Math.round(this.physics.position / this.physics.itemHeight);
                const targetPos = targetIndex * this.physics.itemHeight;
                const diff = targetPos - this.physics.position;
                
                if (Math.abs(diff) > 0.01) {
                    // Animate to snap position
                    this.physics.position += diff * 0.3;
                    isMoving = true;
                } else {
                    // Exactly at snap position
                    this.physics.position = targetPos;
                }
            }
        } else {
            isMoving = true;
        }
        
        // Update selection continuously based on current position
        const currentIndex = Math.round(this.physics.position / this.physics.itemHeight);
        if (currentIndex !== this.currentIndex && currentIndex >= 0 && currentIndex < this.options.length) {
            this.currentIndex = currentIndex;
            const selectedOption = this.options[currentIndex];
            if (selectedOption) {
                this.value = selectedOption.value;
                this.onChange(this.value);
                console.log(`[custom_wheel] Selected: ${selectedOption.name} (${selectedOption.value})`);
            }
        }
        
        // Update visual transforms
        this.updateItemTransforms();
        
        // Continue animation only if moving or dragging
        if (isMoving || this.physics.isDragging) {
            this.animationId = requestAnimationFrame(this.animate);
        } else {
            // Stop animation when settled
            this.animationId = null;
            console.log('[custom_wheel] Animation stopped - wheel settled');
        }
    }
    
    startAnimation() {
        if (!this.animationId) {
            this.physics.lastTime = Date.now();
            this.animationId = requestAnimationFrame(this.animate);
            console.log('[custom_wheel] Animation started');
        }
    }
    
    setValue(value) {
        const index = this.options.findIndex(option => option.value == value);
        if (index >= 0 && index !== this.currentIndex) {
            this.currentIndex = index;
            this.physics.targetPosition = index * this.physics.itemHeight;
            this.physics.position = this.physics.targetPosition;
            this.physics.velocity = 0;
            this.value = value;
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
            console.error(`[custom_wheel_selector] Container not found:`, containerId);
            return null;
        }
        
        container.appendChild(this.element);
        console.log(`[custom_wheel_selector] Rendered in container:`, containerId);
        return this.element;
    }
    
    destroy() {
        // Stop animation
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // Remove event listeners
        this.element.removeEventListener('wheel', this.handleWheel);
        this.element.removeEventListener('touchstart', this.handleTouchStart);
        this.element.removeEventListener('touchmove', this.handleTouchMove);
        this.element.removeEventListener('touchend', this.handleTouchEnd);
        this.element.removeEventListener('click', this.handleClick);
        
        // Remove from DOM
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        
        console.log('[custom_wheel_selector] Destroyed');
    }
}

// Export for use with ComponentFactory
export { custom_wheel_selector_engine };
