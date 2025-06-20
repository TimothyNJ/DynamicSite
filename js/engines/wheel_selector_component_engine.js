// wheel_selector_component_engine.js
// BetterScroll implementation for iOS-style 3D wheel picker
// Uses @better-scroll/core, @better-scroll/wheel, and @better-scroll/pull-down plugins

// Import BetterScroll and plugins
import BScroll from '@better-scroll/core';
import Wheel from '@better-scroll/wheel';
import PullDown from '@better-scroll/pull-down';

// Register plugins
BScroll.use(Wheel);
BScroll.use(PullDown);

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
        container.className = 'wheel-selector-container vue-scroll-picker vue-scroll-picker-3d';
        
        // Wrapper for BetterScroll
        this.wrapperEl = document.createElement('div');
        this.wrapperEl.className = 'wheel-selector-wrapper';
        this.wrapperEl.style.height = '210px'; // 7 items × 30px per item
        this.wrapperEl.style.overflow = 'hidden';
        this.wrapperEl.style.position = 'relative';
        
        // Wheel content container
        const wheelContent = document.createElement('div');
        wheelContent.className = 'wheel-selector-content';
        
        // Create list of options
        this.wheelListEl = document.createElement('ul');
        this.wheelListEl.className = 'wheel-selector-list';
        this.wheelListEl.setAttribute('role', 'listbox');
        
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
        
        // Assemble
        wheelContent.appendChild(this.wheelListEl);
        this.wrapperEl.appendChild(wheelContent);
        
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
            const li = document.createElement('li');
            li.className = 'wheel-selector-item wheel-disabled-item';
            li.setAttribute('role', 'option');
            li.setAttribute('aria-disabled', 'true');
            li.textContent = this.emptyText;
            this.wheelListEl.appendChild(li);
            return;
        }
        
        // Render all options
        this.options.forEach((option, index) => {
            const li = document.createElement('li');
            li.className = 'wheel-selector-item';
            if (option.disabled) {
                li.className += ' wheel-disabled-item';
            }
            li.setAttribute('role', 'option');
            li.setAttribute('aria-disabled', option.disabled ? 'true' : 'false');
            li.setAttribute('aria-selected', index === this.currentIndex ? 'true' : 'false');
            li.setAttribute('data-value', option.value ?? '');
            li.setAttribute('data-index', index);
            li.textContent = option.name;
            
            this.wheelListEl.appendChild(li);
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
                transform: translateZ(0); /* Force GPU acceleration */
            }
            
            .wheel-selector-content {
                position: relative;
            }
            
            .wheel-selector-list {
                list-style: none;
                padding: 0;
                margin: 0;
            }
            
            .wheel-selector-item {
                height: 30px;
                line-height: 30px;
                text-align: center;
                font-size: 20px;
                color: var(--text-color-secondary, #666);
                cursor: pointer;
                user-select: none;
                transition: all 0.3s;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                padding: 0 10px;
            }
            
            .wheel-selector-item[aria-selected="true"] {
                color: var(--text-color, #000);
                font-weight: 500;
                font-size: 22px;
            }
            
            .wheel-disabled-item {
                opacity: 0.3;
                cursor: not-allowed;
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
            
            /* BetterScroll wheel 3D effect */
            .wheel-selector-wrapper .wheel-scroll {
                transform-style: preserve-3d;
                transform: translateZ(-90px);
            }
            
            .wheel-selector-wrapper .wheel-item {
                backface-visibility: hidden;
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
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
            wheel: {
                selectedIndex: this.currentIndex,
                rotate: 25, // Rotation angle for 3D effect
                adjustTime: 400, // Snap animation time
                wheelWrapperClass: 'wheel-selector-content',
                wheelItemClass: 'wheel-selector-item',
                wheelDisabledItemClass: 'wheel-disabled-item'
            },
            pullDownRefresh: {
                threshold: 50,
                stop: 40
            },
            useTransition: true,
            probeType: 3, // Real-time scroll position
            click: true
        });
        
        // Add pull-down refresh indicator
        const pullDownEl = document.createElement('div');
        pullDownEl.className = 'wheel-selector-pulldown';
        pullDownEl.textContent = 'Release to refresh';
        this.wrapperEl.appendChild(pullDownEl);
        
        // Handle wheel selection change
        this.bs.on('wheelIndexChanged', (index) => {
            this.handleIndexChange(index);
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
            this.updateItemStyles();
        });
        
        // Initial style update
        this.updateItemStyles();
        
        // Emit initial value
        if (this.value !== null && this.onChange) {
            this.onChange(this.value);
        }
        
        console.log('[wheel_selector_component_engine] BetterScroll wheel initialized');
    }
    
    handleIndexChange(newIndex) {
        if (newIndex === this.currentIndex) {
            return;
        }
        
        // Update selection state
        const items = this.wheelListEl.querySelectorAll('.wheel-selector-item');
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
    
    updateItemStyles() {
        // Update visual styles based on scroll position
        const items = this.wheelListEl.querySelectorAll('.wheel-selector-item');
        const containerRect = this.wrapperEl.getBoundingClientRect();
        const containerCenter = containerRect.top + containerRect.height / 2;
        
        items.forEach((item) => {
            const itemRect = item.getBoundingClientRect();
            const itemCenter = itemRect.top + itemRect.height / 2;
            const distance = Math.abs(itemCenter - containerCenter);
            
            // Calculate opacity based on distance from center
            const maxDistance = containerRect.height / 2;
            const opacity = Math.max(0.3, 1 - (distance / maxDistance) * 0.7);
            
            // Apply dynamic styling
            item.style.opacity = opacity;
            
            // Scale items near center
            const scale = Math.max(0.8, 1 - (distance / maxDistance) * 0.2);
            item.style.transform = `scale(${scale})`;
        });
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
        
        // Refresh BetterScroll after DOM insertion
        if (this.bs) {
            setTimeout(() => {
                this.bs.refresh();
            }, 0);
        }
        
        console.log(`[wheel_selector_component_engine] Rendered in container:`, containerId);
        return this.element;
    }
    
    destroy() {
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
