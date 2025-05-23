// dropdown_menu_component_engine.js

export class DropdownMenuComponentEngine {
    constructor(container, componentId, config = {}) {
        this.container = container;
        this.componentId = componentId;
        this.config = {
            label: config.label || '',
            options: config.options || [],
            defaultValue: config.defaultValue || null,
            placeholder: config.placeholder || 'Select an option',
            icon: config.icon || null,
            onChange: config.onChange || (() => {}),
            disabled: config.disabled || false,
            required: config.required || false,
            storageKey: config.storageKey || null,
            ...config
        };
        
        this.isOpen = false;
        this.selectedIndex = -1;
        this.selectedValue = null;
        this.wheelInstance = null;
        
        this.init();
    }
    
    init() {
        this.container.innerHTML = '';
        this.loadStoredValue();
        this.render();
        this.attachEventListeners();
        
        // Set default selection
        if (this.config.defaultValue && !this.selectedValue) {
            const defaultIndex = this.config.options.findIndex(opt => 
                opt.value === this.config.defaultValue || opt === this.config.defaultValue
            );
            if (defaultIndex !== -1) {
                this.selectOption(defaultIndex);
            }
        }
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
                console.error('[DropdownMenu] Error loading stored value:', e);
            }
        }
    }
    
    render() {
        const selectedOption = this.selectedIndex >= 0 ? this.config.options[this.selectedIndex] : null;
        const displayText = selectedOption ? 
            (typeof selectedOption === 'object' ? selectedOption.text : selectedOption) : 
            this.config.placeholder;
        
        const dropdownHtml = `
            <div class="dropdown-menu-component ${this.config.disabled ? 'disabled' : ''}" 
                 id="${this.componentId}"
                 data-open="false">
                ${this.config.label ? `<label class="dropdown-label">${this.config.label}</label>` : ''}
                <div class="dropdown-trigger">
                    ${this.config.icon ? `<span class="dropdown-icon">${this.config.icon}</span>` : ''}
                    <span class="dropdown-text">${displayText}</span>
                    <svg class="dropdown-arrow" width="12" height="8" viewBox="0 0 12 8" fill="none">
                        <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </div>
                <div class="dropdown-wheel-container" style="display: none;">
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
                </div>
            </div>
        `;
        
        this.container.innerHTML = dropdownHtml;
        this.addStyles();
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
        const component = this.container.querySelector('.dropdown-menu-component');
        const trigger = component.querySelector('.dropdown-trigger');
        const wheelContainer = component.querySelector('.dropdown-wheel-container');
        
        // Toggle dropdown
        trigger.addEventListener('click', (e) => {
            if (!this.config.disabled) {
                e.stopPropagation();
                this.toggleDropdown();
            }
        });
        
        // Close on outside click
        document.addEventListener('click', (e) => {
            if (this.isOpen && !component.contains(e.target)) {
                this.closeDropdown();
            }
        });
        
        // Initialize wheel scrolling
        if (wheelContainer) {
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
                        this.openDropdown();
                    } else {
                        this.confirmSelection();
                    }
                    break;
                case 'Escape':
                    if (this.isOpen) {
                        this.closeDropdown();
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
                        this.openDropdown();
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
    
    toggleDropdown() {
        if (this.isOpen) {
            this.closeDropdown();
        } else {
            this.openDropdown();
        }
    }
    
    openDropdown() {
        if (this.isOpen) return;
        
        const component = this.container.querySelector('.dropdown-menu-component');
        const wheelContainer = component.querySelector('.dropdown-wheel-container');
        
        this.isOpen = true;
        component.dataset.open = 'true';
        wheelContainer.style.display = 'block';
        
        // Ensure selected item is centered
        if (this.selectedIndex >= 0) {
            const itemHeight = 40;
            const wheelItems = wheelContainer.querySelector('.wheel-items');
            const offset = -(this.selectedIndex * itemHeight) + (itemHeight * 2);
            wheelItems.style.transform = `translateY(${offset}px)`;
            this.updateActiveItem(offset, itemHeight);
        }
        
        // Focus for keyboard navigation
        component.focus();
    }
    
    closeDropdown() {
        if (!this.isOpen) return;
        
        const component = this.container.querySelector('.dropdown-menu-component');
        const wheelContainer = component.querySelector('.dropdown-wheel-container');
        
        this.isOpen = false;
        component.dataset.open = 'false';
        wheelContainer.style.display = 'none';
    }
    
    confirmSelection() {
        // Get the currently active item
        const activeItem = this.container.querySelector('.wheel-item.active');
        if (activeItem) {
            const index = parseInt(activeItem.dataset.index);
            this.selectOption(index);
        }
        this.closeDropdown();
    }
    
    selectOption(index) {
        if (index < 0 || index >= this.config.options.length) return;
        
        const option = this.config.options[index];
        const value = typeof option === 'object' ? option.value : option;
        const text = typeof option === 'object' ? option.text : option;
        
        this.selectedIndex = index;
        this.selectedValue = value;
        
        // Update display
        const dropdownText = this.container.querySelector('.dropdown-text');
        if (dropdownText) {
            dropdownText.textContent = text;
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
        this.render();
        this.attachEventListeners();
    }
    
    disable() {
        this.config.disabled = true;
        const component = this.container.querySelector('.dropdown-menu-component');
        if (component) {
            component.classList.add('disabled');
        }
    }
    
    enable() {
        this.config.disabled = false;
        const component = this.container.querySelector('.dropdown-menu-component');
        if (component) {
            component.classList.remove('disabled');
        }
    }
    
    addStyles() {
        if (document.getElementById('dropdown-menu-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'dropdown-menu-styles';
        styles.textContent = `
            .dropdown-menu-component {
                position: relative;
                width: 100%;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                user-select: none;
                outline: none;
            }
            
            .dropdown-menu-component.disabled {
                opacity: 0.6;
                pointer-events: none;
            }
            
            .dropdown-label {
                display: block;
                font-size: 14px;
                font-weight: 500;
                color: #666;
                margin-bottom: 8px;
            }
            
            .dropdown-trigger {
                display: flex;
                align-items: center;
                gap: 8px;
                background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 24px;
                padding: 12px 20px;
                cursor: pointer;
                transition: all 0.3s ease;
                color: #ffffff;
                min-height: 48px;
            }
            
            .dropdown-trigger:hover {
                border-color: rgba(255, 255, 255, 0.2);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }
            
            .dropdown-menu-component[data-open="true"] .dropdown-trigger {
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }
            
            .dropdown-icon {
                font-size: 18px;
                display: flex;
                align-items: center;
            }
            
            .dropdown-text {
                flex: 1;
                font-size: 16px;
                font-weight: 400;
            }
            
            .dropdown-arrow {
                transition: transform 0.3s ease;
                opacity: 0.6;
            }
            
            .dropdown-menu-component[data-open="true"] .dropdown-arrow {
                transform: rotate(180deg);
            }
            
            .dropdown-wheel-container {
                position: absolute;
                top: calc(100% + 8px);
                left: 0;
                right: 0;
                background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 24px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
                z-index: 1000;
                overflow: hidden;
                height: 200px;
            }
            
            .wheel-content {
                position: relative;
                height: 100%;
                overflow: hidden;
                padding: 0 20px;
            }
            
            .options-wheel {
                height: 100%;
                cursor: grab;
                position: relative;
            }
            
            .options-wheel:active {
                cursor: grabbing;
            }
            
            .wheel-items {
                position: absolute;
                width: 100%;
                transition: none;
                padding: 80px 0;
            }
            
            .wheel-item {
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                font-size: 16px;
                color: rgba(255, 255, 255, 0.4);
                transition: all 0.3s ease;
                cursor: pointer;
                padding: 0 16px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .wheel-item:hover {
                color: rgba(255, 255, 255, 0.7);
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
            }
            
            .wheel-item.active {
                color: #ffffff;
                transform: scale(1.05);
            }
            
            .wheel-item.selected {
                color: #3b82f6;
                font-weight: 500;
            }
            
            .option-icon {
                font-size: 18px;
                display: flex;
                align-items: center;
            }
            
            .wheel-overlay {
                position: absolute;
                left: 0;
                right: 0;
                height: 80px;
                pointer-events: none;
                z-index: 2;
            }
            
            .wheel-overlay.top {
                top: 0;
                background: linear-gradient(
                    to bottom,
                    rgba(26, 26, 26, 1) 0%,
                    rgba(26, 26, 26, 0.8) 40%,
                    transparent 100%
                );
            }
            
            .wheel-overlay.bottom {
                bottom: 0;
                background: linear-gradient(
                    to top,
                    rgba(26, 26, 26, 1) 0%,
                    rgba(26, 26, 26, 0.8) 40%,
                    transparent 100%
                );
            }
            
            .wheel-selection-indicator {
                position: absolute;
                top: 50%;
                left: 20px;
                right: 20px;
                height: 40px;
                transform: translateY(-50%);
                border-top: 1px solid rgba(59, 130, 246, 0.3);
                border-bottom: 1px solid rgba(59, 130, 246, 0.3);
                pointer-events: none;
                z-index: 1;
            }
            
            /* Dark theme adjustments */
            [data-theme="dark"] .dropdown-label {
                color: #999;
            }
            
            /* Light theme adjustments */
            [data-theme="light"] .dropdown-trigger {
                background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%);
                color: #333;
                border-color: rgba(0, 0, 0, 0.1);
            }
            
            [data-theme="light"] .dropdown-trigger:hover {
                border-color: rgba(0, 0, 0, 0.2);
            }
            
            [data-theme="light"] .dropdown-wheel-container {
                background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%);
                border-color: rgba(0, 0, 0, 0.1);
            }
            
            [data-theme="light"] .wheel-item {
                color: rgba(0, 0, 0, 0.4);
            }
            
            [data-theme="light"] .wheel-item.active {
                color: #333;
            }
            
            [data-theme="light"] .wheel-overlay.top {
                background: linear-gradient(
                    to bottom,
                    rgba(245, 245, 245, 1) 0%,
                    rgba(245, 245, 245, 0.8) 40%,
                    transparent 100%
                );
            }
            
            [data-theme="light"] .wheel-overlay.bottom {
                background: linear-gradient(
                    to top,
                    rgba(245, 245, 245, 1) 0%,
                    rgba(245, 245, 245, 0.8) 40%,
                    transparent 100%
                );
            }
            
            /* Mobile responsive */
            @media (max-width: 480px) {
                .dropdown-wheel-container {
                    position: fixed;
                    top: auto;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    border-radius: 24px 24px 0 0;
                    height: 250px;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }
}
