// wheel_selector_component_engine.js
// BetterScroll implementation for iOS-style 3D wheel picker
// Uses @better-scroll/core, @better-scroll/wheel, and @better-scroll/pull-down plugins

// Import BetterScroll and plugins
import BScroll from '@better-scroll/core';
import Wheel from '@better-scroll/wheel';
import PullDown from '@better-scroll/pull-down';
import MouseWheel from '@better-scroll/mouse-wheel';

// Register plugins
BScroll.use(Wheel);
BScroll.use(PullDown);
BScroll.use(MouseWheel);

class wheel_selector_component_engine {
    constructor(options = {}, onChange = null) {
        // Configuration
        this.options = this.normalizeOptions(options.options || []);
        this.value = options.value || options.defaultValue || null;
        this.onChange = onChange || options.onChange || (() => {});
        this.emptyText = options.emptyText || 'No Options Available';
        
        // BetterScroll instance
        this.bs = null;
        
        // State
        this.currentIndex = this.findInitialIndex();
        this.wheelListEl = null;
        this.wrapperEl = null;
        this.physicsScrolling = false; // Track if physics is controlling scroll
        
        // Physics state for custom wheel handling
        this.physics = {
            position: 0,
            velocity: 0,
            lastEventTime: Date.now(),
            scrollAccumulator: 0,
            isScrolling: false,
            animationId: null,
            itemHeight: 36, // Height of each wheel item
            friction: 0.92  // How quickly it slows down
        };
        
        // Create DOM structure
        this.element = this.createElement();
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
        container.className = 'wheel-selector-container vue-scroll-picker vue-scroll-picker-3d';
        
        // Wrapper for BetterScroll
        this.wrapperEl = document.createElement('div');
        this.wrapperEl.className = 'wheel-selector-wrapper';
        
        // Create scroll container with items as direct children
        this.wheelListEl = document.createElement('ul');
        this.wheelListEl.className = 'wheel-scroll';
        
        // Render all options
        this.renderOptions();
        
        // Mask layers for visual effect
        const maskTop = document.createElement('div');
        maskTop.className = 'wheel-selector-mask wheel-selector-mask-top';
        
        const maskBottom = document.createElement('div');
        maskBottom.className = 'wheel-selector-mask wheel-selector-mask-bottom';
        
        // Selection indicator
        const indicator = document.createElement('div');
        indicator.className = 'wheel-selector-indicator';
        
        // Assemble with wheel-scroll as direct child of wrapper
        this.wrapperEl.appendChild(this.wheelListEl);
        
        container.appendChild(this.wrapperEl);
        container.appendChild(maskTop);
        container.appendChild(maskBottom);
        container.appendChild(indicator);
        
        // Add styles
        this.addStyles();
        
        return container;
    }
    
    renderOptions() {
        // Clear existing
        this.wheelListEl.innerHTML = '';
        
        if (this.options.length === 0) {
            // Empty state
            const item = document.createElement('li');
            item.className = 'wheel-item wheel-disabled-item';
            item.setAttribute('role', 'option');
            item.setAttribute('aria-disabled', 'true');
            item.textContent = this.emptyText;
            this.wheelListEl.appendChild(item);
            return;
        }
        
        // Render all options
        this.options.forEach((option, index) => {
            const item = document.createElement('li');
            item.className = 'wheel-item';
            if (option.disabled) {
                item.className += ' wheel-disabled-item';
            }
            item.setAttribute('role', 'option');
            item.setAttribute('aria-disabled', option.disabled ? 'true' : 'false');
            item.setAttribute('aria-selected', index === this.currentIndex ? 'true' : 'false');
            item.setAttribute('data-value', option.value ?? '');
            item.setAttribute('data-index', index);
            item.textContent = option.name;
            
            this.wheelListEl.appendChild(item);
        });
    }
    
    addStyles() {
        // Check if styles already exist
        if (document.getElementById('wheel-selector-styles')) {
            return;
        }
        
        const style = document.createElement('style');
        style.id = 'wheel-selector-styles';
        style.textContent = `
            .wheel-selector-container {
                position: relative;
                overflow: hidden;
                background: var(--component-background, #ffffff);
                border-radius: 8px;
                width: 100%;
                max-width: 300px;
                margin: 0 auto;
            }
            
            .wheel-selector-wrapper {
                position: relative;
                height: 210px;
                overflow: hidden;
                font-size: 18px;
            }
            
            .wheel-scroll {
                padding: 87px 0;
                margin: 0;
                line-height: 36px;
                list-style: none;
            }
            
            .wheel-item {
                list-style: none;
                height: 36px;
                overflow: hidden;
                white-space: nowrap;
                color: #333;
            }
            
            .wheel-item[aria-selected="true"] {
                color: var(--text-color, #000);
                font-weight: 500;
            }
            
            .wheel-disabled-item {
                opacity: 0.2;
            }
            
            /* Mask layers for fade effect */
            .wheel-selector-mask {
                position: absolute;
                left: 0;
                width: 100%;
                height: 90px;
                pointer-events: none;
                z-index: 2;
            }
            
            .wheel-selector-mask-top {
                top: 0;
                background: linear-gradient(
                    to bottom,
                    var(--component-background, rgba(255, 255, 255, 0.95)),
                    var(--component-background-transparent, rgba(255, 255, 255, 0))
                );
            }
            
            .wheel-selector-mask-bottom {
                bottom: 0;
                background: linear-gradient(
                    to top,
                    var(--component-background, rgba(255, 255, 255, 0.95)),
                    var(--component-background-transparent, rgba(255, 255, 255, 0))
                );
            }
            
            /* Selection indicator */
            .wheel-selector-indicator {
                position: absolute;
                top: 50%;
                left: 0;
                width: 100%;
                height: 30px;
                transform: translateY(-50%);
                pointer-events: none;
                z-index: 1;
            }
            
            .wheel-selector-indicator::before,
            .wheel-selector-indicator::after {
                content: '';
                position: absolute;
                left: 0;
                width: 100%;
                height: 1px;
                background: var(--border-color, rgba(0, 0, 0, 0.1));
            }
            
            .wheel-selector-indicator::before {
                top: 0;
            }
            
            .wheel-selector-indicator::after {
                bottom: 0;
            }
            
            /* Pull-down refresh indicator */
            .wheel-selector-pulldown {
                position: absolute;
                top: -40px;
                left: 0;
                width: 100%;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: var(--text-color-secondary, #666);
                font-size: 14px;
                transition: opacity 0.3s;
                opacity: 0;
            }
            
            .wheel-selector-pulldown.active {
                opacity: 1;
            }
            
            /* Dark mode support */
            @media (prefers-color-scheme: dark) {
                .wheel-selector-container {
                    --component-background: #1c1c1e;
                    --component-background-transparent: rgba(28, 28, 30, 0);
                    --text-color: #ffffff;
                    --text-color-secondary: #999999;
                    --border-color: rgba(255, 255, 255, 0.1);
                }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    init() {
        if (this.options.length === 0) {
            return;
        }
        
        // Initialize BetterScroll with wheel and pull-down plugins
        this.bs = new BScroll(this.wrapperEl, {
            scrollY: true,  // Enable vertical scrolling
            scrollX: false, // Disable horizontal scrolling
            wheel: {
                selectedIndex: this.currentIndex,
                rotate: 25, // Rotation angle for 3D effect
                adjustTime: 0, // Zero delay for instant snap
                wheelWrapperClass: 'wheel-scroll',
                wheelItemClass: 'wheel-item',
                wheelDisabledItemClass: 'wheel-disabled-item'
            },
            pullDownRefresh: {
                threshold: 50,
                stop: 40
            },
            useTransition: true,
            probeType: 3, // Real-time scroll position
            click: true,
            momentum: false, // Disable momentum for more direct control
            swipeTime: 0,    // Zero delay for instant swipe recognition
            bounceTime: 0,   // Zero delay for instant bounce
            deceleration: 0.001, // Reduce deceleration for quicker stop
            // Mouse/trackpad support - DISABLED for custom physics
            disableMouse: true,  // Disable BetterScroll's mouse handling
            disableTouch: false,
            bounce: true
            // Remove mouseWheel config - we'll handle it ourselves
        });
        
        // Add pull-down refresh indicator
        const pullDownEl = document.createElement('div');
        pullDownEl.className = 'wheel-selector-pulldown';
        pullDownEl.textContent = 'Release to refresh';
        this.wrapperEl.appendChild(pullDownEl);
        
        // Handle wheel selection change
        this.bs.on('wheelIndexChanged', (index) => {
            // Only handle index changes if we're not physics scrolling
            if (!this.physicsScrolling) {
                this.handleIndexChange(index);
            }
        });
        
        // Handle pull-down refresh
        this.bs.on('pullingDown', () => {
            console.log('[wheel_selector_component_engine] Wheel refreshed!');
            
            // Show refresh indicator
            pullDownEl.classList.add('active');
            pullDownEl.textContent = 'Refreshing...';
            
            // Simulate refresh (just visual feedback)
            setTimeout(() => {
                // Reset to initial selection if configured
                if (this.options.defaultIndex !== undefined) {
                    this.bs.wheelTo(this.options.defaultIndex);
                }
                
                // Hide refresh indicator
                pullDownEl.classList.remove('active');
                pullDownEl.textContent = 'Release to refresh';
                
                // Tell BetterScroll refresh is complete
                this.bs.finishPullDown();
                this.bs.refresh();
            }, 300);
        });
        
        // Handle scroll for visual updates
        this.bs.on('scroll', () => {
            // BetterScroll handles all visual updates internally
        });
        
        // Initialize custom physics-based wheel handling
        this.initPhysicsWheel();
        
        console.log('[wheel_selector_component_engine] BetterScroll wheel initialized');
    }
    
    initPhysicsWheel() {
        // Initialize physics position based on current index
        this.physics.position = this.currentIndex * this.physics.itemHeight;
        
        // Add custom wheel event handler
        this.wrapperEl.addEventListener('wheel', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const currentTime = Date.now();
            const deltaTime = currentTime - this.physics.lastEventTime;
            
            // Scale factor for trackpad sensitivity
            const POSITION_SCALE = 0.5;
            const VELOCITY_SCALE = 2.0;
            
            // Accumulate scroll distance
            this.physics.scrollAccumulator += e.deltaY * POSITION_SCALE;
            
            // Calculate instantaneous velocity
            const instantVelocity = (e.deltaY / Math.max(deltaTime, 1)) * VELOCITY_SCALE;
            
            // Update position immediately for responsiveness
            this.physics.position += e.deltaY * POSITION_SCALE;
            
            // Add to velocity for momentum
            this.physics.velocity += instantVelocity;
            
            // Clamp velocity to reasonable limits
            const MAX_VELOCITY = 50;
            this.physics.velocity = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, this.physics.velocity));
            
            this.physics.isScrolling = true;
            this.physics.lastEventTime = currentTime;
            
            // Start physics animation if not running
            if (!this.physics.animationId) {
                this.animatePhysics();
            }
            
            // Detect when scrolling stops
            clearTimeout(this.physics.scrollEndTimer);
            this.physics.scrollEndTimer = setTimeout(() => {
                this.physics.isScrolling = false;
                this.physics.scrollAccumulator = 0;
            }, 50);
            
            console.log(`[wheel_physics] Velocity: ${this.physics.velocity.toFixed(2)}, Position: ${this.physics.position.toFixed(2)}`);
        }, { passive: false });
    }
    
    animatePhysics() {
        // Apply velocity to position
        if (Math.abs(this.physics.velocity) > 0.1) {
            this.physics.position += this.physics.velocity;
            
            // Apply friction
            this.physics.velocity *= this.physics.friction;
            
            // Mark that we're physics scrolling
            this.physicsScrolling = true;
            
            // Update scroll position using BetterScroll's scroll API for smooth movement
            if (this.bs) {
                // Use negative position because BetterScroll scrolls in opposite direction
                const scrollY = -this.physics.position;
                this.bs.scrollTo(0, scrollY, 0); // x, y, time (0 = instant)
            }
            
            // Continue animation
            this.physics.animationId = requestAnimationFrame(() => this.animatePhysics());
        } else if (!this.physics.isScrolling) {
            // Scrolling has stopped, snap to nearest item
            const finalIndex = Math.round(this.physics.position / this.physics.itemHeight);
            const clampedIndex = Math.max(0, Math.min(this.options.length - 1, finalIndex));
            
            // Snap position to exact item
            this.physics.position = clampedIndex * this.physics.itemHeight;
            this.physics.velocity = 0;
            
            // Clear physics scrolling flag before final positioning
            this.physicsScrolling = false;
            
            // Final positioning - use wheelTo to properly set the selection
            if (this.bs) {
                this.bs.wheelTo(clampedIndex, 100); // Small animation for snap
            }
            
            // Stop animation
            this.physics.animationId = null;
        } else {
            // Continue checking
            this.physics.animationId = requestAnimationFrame(() => this.animatePhysics());
        }
    }
    
    handleIndexChange(newIndex) {
        if (newIndex === this.currentIndex) {
            return;
        }
        
        // Update physics position to match
        this.physics.position = newIndex * this.physics.itemHeight;
        
        // Update selection state
        const items = this.wheelListEl.querySelectorAll('.wheel-item');
        items.forEach((item, index) => {
            item.setAttribute('aria-selected', index === newIndex ? 'true' : 'false');
        });
        
        // Update current value
        this.currentIndex = newIndex;
        const selectedOption = this.options[newIndex];
        if (selectedOption) {
            this.value = selectedOption.value;
            this.onChange(this.value);
        }
    }
    
    setValue(value) {
        const nextIndex = this.options.findIndex(option => option.value == value);
        if (nextIndex >= 0 && nextIndex !== this.currentIndex && this.bs) {
            this.bs.wheelTo(nextIndex);
        }
    }
    
    getValue() {
        return this.value;
    }
    
    setOptions(newOptions) {
        this.options = this.normalizeOptions(newOptions);
        this.currentIndex = Math.max(
            this.options.findIndex(option => option.value == this.value),
            0
        );
        
        // Re-render options
        this.renderOptions();
        
        // Refresh BetterScroll
        if (this.bs) {
            this.bs.refresh();
            this.bs.wheelTo(this.currentIndex);
        }
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
        
        // Initialize BetterScroll after DOM insertion
        setTimeout(() => {
            this.init();
        }, 0);
        
        console.log(`[wheel_selector_component_engine] Rendered in container:`, containerId);
        return this.element;
    }
    
    destroy() {
        // Stop physics animation
        if (this.physics.animationId) {
            cancelAnimationFrame(this.physics.animationId);
            this.physics.animationId = null;
        }
        
        // Clear any pending timers
        if (this.physics.scrollEndTimer) {
            clearTimeout(this.physics.scrollEndTimer);
        }
        
        // Destroy BetterScroll instance
        if (this.bs) {
            this.bs.destroy();
            this.bs = null;
        }
        
        // Remove element from DOM
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        
        console.log('[wheel_selector_component_engine] Destroyed');
    }
}

// Export for use with ComponentFactory
export { wheel_selector_component_engine };
