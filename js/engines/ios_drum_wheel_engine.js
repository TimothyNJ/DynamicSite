// ios_drum_wheel_engine.js
// True iOS-style cylindrical drum wheel selector with authentic 3D effect

class ios_drum_wheel_engine {
    constructor(options = {}, onChange = null) {
        // Configuration
        this.options = this.normalizeOptions(options.options || []);
        this.value = options.value || options.defaultValue || null;
        this.onChange = onChange || options.onChange || (() => {});
        this.emptyText = options.emptyText || 'No Options Available';
        
        // State
        this.currentIndex = this.findInitialIndex();
        
        // Drum parameters for true iOS effect
        this.drum = {
            panelCount: 16,           // Fixed panels on the drum
            cylinderRadius: 100,      // Radius of the 3D cylinder
            itemHeight: 24,           // Height of each item (reduced for tighter spacing)
            perspective: 800,         // Perspective distance
            rotation: 0,              // Current drum rotation
            panelAngle: null,         // Will be calculated
            panels: []                // Panel elements
        };
        
        // Calculate panel angle
        this.drum.panelAngle = 360 / this.drum.panelCount;
        
        // Physics for smooth interaction
        this.physics = {
            velocity: 0,
            friction: 0.95,
            isDragging: false,
            lastY: 0,
            lastTime: Date.now(),
            touchVelocityScale: 0.5,
            maxVelocity: 1500
        };
        
        // Create DOM structure
        this.element = this.createElement();
        this.drumEl = this.element.querySelector('.ios-drum-cylinder');
        
        // Start animation loop
        this.animationId = null;
        this.isMoving = false;
        
        // Set initial rotation to show current value
        this.setRotationForIndex(this.currentIndex);
        this.initializePanelContent();
        
        // Start animation
        this.animate();
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
        container.className = 'ios-drum-wheel';
        
        // Create viewport with perspective
        const viewport = document.createElement('div');
        viewport.className = 'ios-drum-viewport';
        
        // Create the 3D drum cylinder
        const cylinder = document.createElement('div');
        cylinder.className = 'ios-drum-cylinder';
        
        // Create fixed panels positioned around the cylinder
        for (let i = 0; i < this.drum.panelCount; i++) {
            const panel = document.createElement('div');
            panel.className = 'ios-drum-panel';
            panel.setAttribute('data-panel', i);
            
            // Position panel on cylinder
            const angle = i * this.drum.panelAngle;
            panel.style.transform = `rotateX(${angle}deg) translateZ(${this.drum.cylinderRadius}px)`;
            
            cylinder.appendChild(panel);
            this.drum.panels.push(panel);
        }
        
        // Add gradient overlays for depth effect (like iOS)
        const topGradient = document.createElement('div');
        topGradient.className = 'ios-drum-gradient ios-drum-gradient-top';
        
        const bottomGradient = document.createElement('div');
        bottomGradient.className = 'ios-drum-gradient ios-drum-gradient-bottom';
        
        // Selection indicator
        const indicator = document.createElement('div');
        indicator.className = 'ios-drum-indicator';
        
        // Assemble
        viewport.appendChild(cylinder);
        container.appendChild(viewport);
        container.appendChild(topGradient);
        container.appendChild(bottomGradient);
        container.appendChild(indicator);
        
        // Add styles
        this.addStyles();
        
        // Add event listeners
        container.addEventListener('wheel', this.handleWheel, { passive: false });
        container.addEventListener('touchstart', this.handleTouchStart, { passive: false });
        container.addEventListener('touchmove', this.handleTouchMove, { passive: false });
        container.addEventListener('touchend', this.handleTouchEnd, { passive: false });
        container.addEventListener('mousedown', this.handleMouseDown, { passive: false });
        
        return container;
    }    
    addStyles() {
        if (document.getElementById('ios-drum-wheel-styles')) {
            return;
        }
        
        const style = document.createElement('style');
        style.id = 'ios-drum-wheel-styles';
        style.textContent = `
            .ios-drum-wheel {
                position: relative;
                width: 100%;
                max-width: 300px;
                height: 216px;  /* 9 items × 24px */
                margin: 0 auto;
                overflow: hidden;
                user-select: none;
                -webkit-user-select: none;
                touch-action: none;
                background: var(--component-background, #f2f2f2);
                border-radius: 8px;
            }
            
            .ios-drum-viewport {
                position: absolute;
                width: 100%;
                height: 100%;
                perspective: ${this.drum.perspective}px;
                perspective-origin: center center;
                overflow: hidden;
            }
            
            .ios-drum-cylinder {
                position: absolute;
                width: 100%;
                height: 100%;
                transform-style: preserve-3d;
                transform: translateZ(-${this.drum.cylinderRadius}px) rotateX(0deg);
                transition: none; /* We handle animation in JS for smoothness */
            }
            
            .ios-drum-panel {
                position: absolute;
                width: 100%;
                height: ${this.drum.itemHeight}px;
                left: 0;
                top: 50%;
                margin-top: -${this.drum.itemHeight / 2}px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                font-weight: 400;
                color: var(--text-color, #000);
                backface-visibility: hidden;
                transform-origin: center center;
                pointer-events: none;
            }
            
            /* Gradient overlays for iOS-like depth effect */
            .ios-drum-gradient {
                position: absolute;
                width: 100%;
                pointer-events: none;
                z-index: 10;
            }
            
            .ios-drum-gradient-top {
                top: 0;
                height: 40%;
                background: linear-gradient(
                    to bottom,
                    var(--component-background, #f2f2f2) 0%,
                    var(--component-background, #f2f2f2) 20%,
                    transparent 100%
                );
            }            
            .ios-drum-gradient-bottom {
                bottom: 0;
                height: 40%;
                background: linear-gradient(
                    to top,
                    var(--component-background, #f2f2f2) 0%,
                    var(--component-background, #f2f2f2) 20%,
                    transparent 100%
                );
            }
            
            /* Selection indicator */
            .ios-drum-indicator {
                position: absolute;
                top: 50%;
                left: 0;
                right: 0;
                height: ${this.drum.itemHeight}px;
                margin-top: -${this.drum.itemHeight / 2}px;
                pointer-events: none;
                z-index: 5;
                border-top: 0.5px solid var(--indicator-color, rgba(0, 0, 0, 0.3));
                border-bottom: 0.5px solid var(--indicator-color, rgba(0, 0, 0, 0.3));
            }
            
            /* Panel states based on visibility */
            .ios-drum-panel {
                transition: font-weight 0.2s ease;
            }
            
            .ios-drum-panel.visible {
                /* Visible panels have normal appearance */
            }
            
            .ios-drum-panel.selected {
                font-weight: 700;  /* Bold for selected item */
                color: var(--text-color-primary, #000);
            }
            
            /* Dark mode support */
            @media (prefers-color-scheme: dark) {
                .ios-drum-wheel {
                    --component-background: #1c1c1e;
                    --text-color: #ffffff;
                    --text-color-primary: #ffffff;
                    --indicator-color: rgba(255, 255, 255, 0.3);
                }
            }
        `;
        
        document.head.appendChild(style);
    }    
    // Update panel content based on current rotation
    updatePanelContent() {
        // Calculate which item should be selected based on rotation
        const degreesPerItem = 360 / this.options.length;
        const normalizedRotation = ((this.drum.rotation % 360) + 360) % 360;
        const selectedIndex = Math.round(normalizedRotation / degreesPerItem) % this.options.length;
        
        let updatedPanels = 0;
        
        // Update each panel
        this.drum.panels.forEach((panel, panelIndex) => {
            // Calculate panel's current angle in the drum
            const panelBaseAngle = panelIndex * this.drum.panelAngle;
            const currentAngle = (panelBaseAngle - this.drum.rotation) % 360;
            const normalizedAngle = ((currentAngle % 360) + 360) % 360;
            
            // Determine if panel is visible (front half of cylinder)
            const isVisible = normalizedAngle > 270 || normalizedAngle < 90;
            
            // Only update content if panel is on the back of the drum
            if (normalizedAngle > 90 && normalizedAngle < 270) {
                // Panel is on back - safe to update content
                const panelOffset = panelIndex - 8; // Center panel is index 8
                let itemIndex = selectedIndex - panelOffset;
                
                // Handle wraparound for circular list
                itemIndex = ((itemIndex % this.options.length) + this.options.length) % this.options.length;
                
                // Update panel content
                if (itemIndex >= 0 && itemIndex < this.options.length) {
                    const option = this.options[itemIndex];
                    const oldContent = panel.textContent;
                    panel.textContent = option.name;
                    panel.setAttribute('data-value', option.value);
                    panel.setAttribute('data-index', itemIndex);
                    
                    if (oldContent !== option.name) {
                        console.log(`[ios_drum] Updated panel ${panelIndex} from "${oldContent}" to "${option.name}" (angle: ${normalizedAngle.toFixed(1)}°)`);
                        updatedPanels++;
                    }
                }
            }
            
            // Update visibility classes
            panel.classList.toggle('visible', isVisible);
            
            // Selected state when panel is at center
            const isSelected = normalizedAngle > 350 || normalizedAngle < 10;
            panel.classList.toggle('selected', isSelected);
        });
        
        if (updatedPanels > 0) {
            console.log(`[ios_drum] Updated ${updatedPanels} panels on back of drum`);
        }
        
        // Update current value based on selected index
        if (selectedIndex !== this.currentIndex && selectedIndex < this.options.length) {
            this.currentIndex = selectedIndex;
            const selectedOption = this.options[selectedIndex];
            if (selectedOption) {
                this.value = selectedOption.value;
                this.onChange(this.value);
                console.log(`[ios_drum] Selected: ${selectedOption.name} (${selectedOption.value})`);
            }
        }
    }
    
    // Initialize panel content - paint numbers on panels
    initializePanelContent() {
        console.log(`[ios_drum] Initializing panel content for ${this.options.length} options`);
        
        // Set initial content for all panels based on current position
        this.drum.panels.forEach((panel, panelIndex) => {
            // Calculate which item this panel should show
            const panelOffset = panelIndex - 8; // Center panel is index 8
            let itemIndex = this.currentIndex - panelOffset;
            
            // Handle wraparound for circular list
            itemIndex = ((itemIndex % this.options.length) + this.options.length) % this.options.length;
            
            // Set panel content
            if (itemIndex >= 0 && itemIndex < this.options.length) {
                const option = this.options[itemIndex];
                panel.textContent = option.name;
                panel.setAttribute('data-value', option.value);
                panel.setAttribute('data-index', itemIndex);
                console.log(`[ios_drum] Panel ${panelIndex}: ${option.name} (index: ${itemIndex})`);
            } else {
                panel.textContent = '';
            }
        });
    }
    
    // Event handlers
    handleWheel = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Calculate velocity from wheel delta
        const delta = e.deltaY;
        const scaleFactor = 0.1; // Adjust for smooth scrolling
        
        this.physics.velocity += delta * scaleFactor;
        
        // Clamp velocity
        if (Math.abs(this.physics.velocity) > this.physics.maxVelocity) {
            this.physics.velocity = Math.sign(this.physics.velocity) * this.physics.maxVelocity;
        }
        
        console.log(`[ios_drum] Wheel event - delta: ${delta}, velocity: ${this.physics.velocity.toFixed(2)}, rotation: ${this.drum.rotation.toFixed(1)}°`);
        
        this.isMoving = true;
    }
    
    handleTouchStart = (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        this.physics.lastY = touch.clientY;
        this.physics.isDragging = true;
        this.physics.velocity = 0;
        this.physics.lastTime = Date.now();
    }
    
    handleTouchMove = (e) => {
        if (!this.physics.isDragging) return;
        e.preventDefault();
        
        const touch = e.touches[0];
        const deltaY = this.physics.lastY - touch.clientY;
        const now = Date.now();
        const deltaTime = now - this.physics.lastTime;
        
        // Direct rotation update while dragging
        const rotationDelta = (deltaY / this.drum.itemHeight) * (360 / this.options.length);
        this.drum.rotation += rotationDelta;
        
        // Calculate velocity for momentum
        if (deltaTime > 0) {
            this.physics.velocity = (rotationDelta / deltaTime) * 1000 * this.physics.touchVelocityScale;
        }
        
        this.physics.lastY = touch.clientY;
        this.physics.lastTime = now;
        
        // Update drum rotation
        this.drumEl.style.transform = `translateZ(-${this.drum.cylinderRadius}px) rotateX(${this.drum.rotation}deg)`;
        this.updatePanelContent();
    }
    
    handleTouchEnd = (e) => {
        if (!this.physics.isDragging) return;
        e.preventDefault();
        
        this.physics.isDragging = false;
        this.isMoving = true;
    }    
    handleMouseDown = (e) => {
        e.preventDefault();
        this.physics.lastY = e.clientY;
        this.physics.isDragging = true;
        this.physics.velocity = 0;
        this.physics.lastTime = Date.now();
        
        // Add mouse move and up listeners
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseup', this.handleMouseUp);
    }
    
    handleMouseMove = (e) => {
        if (!this.physics.isDragging) return;
        e.preventDefault();
        
        const deltaY = this.physics.lastY - e.clientY;
        const now = Date.now();
        const deltaTime = now - this.physics.lastTime;
        
        // Direct rotation update while dragging
        const rotationDelta = (deltaY / this.drum.itemHeight) * (360 / this.options.length);
        this.drum.rotation += rotationDelta;
        
        // Calculate velocity for momentum
        if (deltaTime > 0) {
            this.physics.velocity = (rotationDelta / deltaTime) * 1000 * this.physics.touchVelocityScale;
        }
        
        this.physics.lastY = e.clientY;
        this.physics.lastTime = now;
        
        // Update drum rotation
        this.drumEl.style.transform = `translateZ(-${this.drum.cylinderRadius}px) rotateX(${this.drum.rotation}deg)`;
        this.updatePanelContent();
    }
    
    handleMouseUp = (e) => {
        if (!this.physics.isDragging) return;
        e.preventDefault();
        
        this.physics.isDragging = false;
        this.isMoving = true;
        
        // Remove mouse listeners
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
    }    
    // Animation loop
    animate = () => {
        const now = Date.now();
        const deltaTime = (now - this.physics.lastTime) / 1000;
        this.physics.lastTime = now;
        
        if (!this.physics.isDragging && this.isMoving) {
            // Apply velocity
            if (Math.abs(this.physics.velocity) > 0.1) {
                this.drum.rotation += this.physics.velocity * deltaTime;
                this.physics.velocity *= this.physics.friction;
                
                // Update visual rotation
                this.drumEl.style.transform = `translateZ(-${this.drum.cylinderRadius}px) rotateX(${this.drum.rotation}deg)`;
                this.updatePanelContent();
            } else {
                // Snap to nearest item
                const degreesPerItem = 360 / this.options.length;
                const targetRotation = Math.round(this.drum.rotation / degreesPerItem) * degreesPerItem;
                const diff = targetRotation - this.drum.rotation;
                
                if (Math.abs(diff) > 0.1) {
                    this.drum.rotation += diff * 0.2;
                    this.drumEl.style.transform = `translateZ(-${this.drum.cylinderRadius}px) rotateX(${this.drum.rotation}deg)`;
                    this.updatePanelContent();
                } else {
                    this.drum.rotation = targetRotation;
                    this.drumEl.style.transform = `translateZ(-${this.drum.cylinderRadius}px) rotateX(${this.drum.rotation}deg)`;
                    this.updatePanelContent();
                    this.isMoving = false;
                    this.physics.velocity = 0;
                }
            }
        }
        
        requestAnimationFrame(this.animate);
    }
    
    // Set rotation to show specific index
    setRotationForIndex(index) {
        const degreesPerItem = 360 / this.options.length;
        this.drum.rotation = index * degreesPerItem;
        this.drumEl.style.transform = `translateZ(-${this.drum.cylinderRadius}px) rotateX(${this.drum.rotation}deg)`;
    }
    
    // Public methods
    setValue(value) {
        const index = this.options.findIndex(option => option.value == value);
        if (index >= 0 && index !== this.currentIndex) {
            this.currentIndex = index;
            this.value = value;
            this.setRotationForIndex(index);
            this.updatePanelContent();
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
            console.error(`[ios_drum_wheel] Container not found:`, containerId);
            return null;
        }
        
        container.appendChild(this.element);
        console.log(`[ios_drum_wheel] Rendered in container:`, containerId);
        return this.element;
    }
    
    destroy() {
        // Remove event listeners
        this.element.removeEventListener('wheel', this.handleWheel);
        this.element.removeEventListener('touchstart', this.handleTouchStart);
        this.element.removeEventListener('touchmove', this.handleTouchMove);
        this.element.removeEventListener('touchend', this.handleTouchEnd);
        this.element.removeEventListener('mousedown', this.handleMouseDown);
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
        
        // Remove from DOM
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        
        console.log('[ios_drum_wheel] Destroyed');
    }
}

// Export for use with ComponentFactory
export { ios_drum_wheel_engine };