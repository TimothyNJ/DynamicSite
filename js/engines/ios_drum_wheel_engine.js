// ios_drum_wheel_engine.js
// True iOS-style cylindrical drum wheel selector with authentic 3D effect
// Implements physical drum model with position-based updates

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
            itemHeight: 24,           // Height of each item
            perspective: 800,         // Perspective distance
            rotation: 0,              // Current drum rotation in degrees
            panelAngle: 22.5,         // 360 / 16 = 22.5° per panel
            panels: [],               // Panel elements array
            panelContents: []         // Track what's painted on each panel
        };
        
        // Position constants (1-indexed to match description)
        // These are FIXED LOCATIONS in space, not panel IDs
        this.POSITIONS = {
            BACK_CENTER: 1,       // Position facing away at back
            UPDATE_UP: 2,         // Position that updates when rolling up
            FRONT_CENTER: 9,      // Position at front center (selected)
            UPDATE_DOWN: 16       // Position that updates when rolling down
        };
        
        // Physics for smooth interaction
        this.physics = {
            velocity: 0,
            friction: 0.95,
            isDragging: false,
            lastY: 0,
            lastTime: Date.now(),
            touchVelocityScale: 0.5,
            maxVelocity: 1500,
            lastDirection: 0  // Track last movement direction
        };
        
        // Create DOM structure
        this.element = this.createElement();
        this.drumEl = this.element.querySelector('.ios-drum-cylinder');
        
        // Initialize panel contents as if painted on drum
        this.initializePanelContent();
        
        // Start animation loop
        this.animationId = null;
        this.isMoving = false;
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
        
        // Create 16 fixed panels positioned around the cylinder
        // Panels are numbered 1-16, but array is 0-indexed
        for (let i = 0; i < this.drum.panelCount; i++) {
            const panel = document.createElement('div');
            panel.className = 'ios-drum-panel';
            const panelNumber = i + 1; // 1-indexed panel number
            panel.setAttribute('data-panel-number', panelNumber);
            
            // Calculate rest position for each panel
            // Panel 1 is at back (180°), Panel 9 is at front (0°)
            const restAngle = this.calculatePanelRestAngle(panelNumber);
            panel.style.transform = `rotateX(${restAngle}deg) translateZ(${this.drum.cylinderRadius}px)`;
            
            cylinder.appendChild(panel);
            this.drum.panels.push(panel);
            this.drum.panelContents.push(''); // Initialize content tracker
        }
        
        // Add gradient overlays for depth effect
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
    
    // Calculate the rest angle for each panel
    // Panel 1 is at 180° (back), Panel 9 is at 0° (front)
    calculatePanelRestAngle(panelNumber) {
        // Panel 9 should be at 0°, Panel 1 at 180°
        // Each panel is 22.5° apart
        const offset = (panelNumber - this.POSITIONS.FRONT_CENTER) * this.drum.panelAngle;
        return offset;
    }
    
    // Get current angle of a panel considering drum rotation
    getCurrentPanelAngle(panelNumber) {
        const restAngle = this.calculatePanelRestAngle(panelNumber);
        const currentAngle = (restAngle - this.drum.rotation) % 360;
        // Normalize to 0-360 range
        return ((currentAngle % 360) + 360) % 360;
    }
    
    // Determine which panel is currently at a specific position
    getPanelAtPosition(position) {
        // As drum rotates, panels move through positions
        // Calculate how many positions the drum has rotated
        const positionsRotated = Math.round(this.drum.rotation / this.drum.panelAngle);
        
        // Calculate which panel is at the requested position
        let panelNumber = position - positionsRotated;
        
        // Handle wraparound
        while (panelNumber < 1) panelNumber += this.drum.panelCount;
        while (panelNumber > this.drum.panelCount) panelNumber -= this.drum.panelCount;
        
        return panelNumber;
    }
    
    // Get the position of a specific panel
    getPositionOfPanel(panelNumber) {
        // Calculate how many positions the drum has rotated
        const positionsRotated = Math.round(this.drum.rotation / this.drum.panelAngle);
        
        // Calculate current position of the panel
        let position = panelNumber + positionsRotated;
        
        // Handle wraparound
        while (position < 1) position += this.drum.panelCount;
        while (position > this.drum.panelCount) position -= this.drum.panelCount;
        
        return position;
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
                transition: none; /* We handle animation in JS */
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
            
            /* Panel visibility states */
            .ios-drum-panel {
                transition: font-weight 0.2s ease;
            }
            
            .ios-drum-panel.hidden {
                display: none;
            }
            
            .ios-drum-panel.selected {
                font-weight: 700;
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
    
    // Initialize panel content - paint initial numbers on drum
    initializePanelContent() {
        console.log(`[ios_drum] Initializing ${this.drum.panelCount} panels with ${this.options.length} options`);
        
        // Panel 9 starts at front center and should show the current value
        const centerPanelNumber = 9;
        
        for (let panelNum = 1; panelNum <= this.drum.panelCount; panelNum++) {
            const panelIndex = panelNum - 1;
            const panel = this.drum.panels[panelIndex];
            
            // Calculate offset from Panel 9 (center)
            const offsetFromCenter = panelNum - centerPanelNumber;
            
            // For a wheel showing items in visual order:
            // - Items ABOVE center (smaller panel numbers) are EARLIER in visual sequence
            // - Items BELOW center (larger panel numbers) are LATER in visual sequence
            // This means we ADD the offset to move through the array
            let itemIndex = this.currentIndex + offsetFromCenter;
            
            // Handle wraparound for circular list
            if (this.options.length > 0) {
                itemIndex = ((itemIndex % this.options.length) + this.options.length) % this.options.length;
            }
            
            // Paint the number on the panel
            if (itemIndex >= 0 && itemIndex < this.options.length) {
                const option = this.options[itemIndex];
                panel.textContent = option.name;
                this.drum.panelContents[panelIndex] = option.name;
                panel.setAttribute('data-value', option.value);
                panel.setAttribute('data-item-index', itemIndex);
                
                console.log(`[ios_drum] Panel ${panelNum}: "${option.name}" (item index: ${itemIndex})`);
            }
        }
        
        this.updatePanelVisibility();
        this.updateSelection();
    }
    
    // Update panel content based on rotation direction
    updatePanelContent() {
        const direction = Math.sign(this.physics.velocity);
        
        if (direction === 0) return; // No movement
        
        // Store last direction for update logic
        this.physics.lastDirection = direction;
        
        // Drum rolling down (front moves down, back moves up)
        // Check all panels to see if any are at the update positions
        this.drum.panels.forEach((panel, i) => {
            const panelNumber = i + 1;
            const currentPosition = this.getPositionOfPanel(panelNumber);
            
            // Only update panels that are at the specific update positions
            if (direction > 0 && currentPosition === this.POSITIONS.UPDATE_DOWN) {
                // This panel is at Position 16 - update it for downward scrolling
                this.updatePanelAtPosition(this.POSITIONS.UPDATE_DOWN, 'down');
            } else if (direction < 0 && currentPosition === this.POSITIONS.UPDATE_UP) {
                // This panel is at Position 2 - update it for upward scrolling  
                this.updatePanelAtPosition(this.POSITIONS.UPDATE_UP, 'up');
            }
        });
        
        // Update visibility and selection states
        this.updatePanelVisibility();
        this.updateSelection();
    }
    
    // Update a panel at a specific position
    updatePanelAtPosition(position, direction) {
        const panelNumber = this.getPanelAtPosition(position);
        const panelIndex = panelNumber - 1;
        const panel = this.drum.panels[panelIndex];
        
        // Verify panel is truly on back (between 135° and 225°)
        const angle = this.getCurrentPanelAngle(panelNumber);
        if (angle > 135 && angle < 225) {
            let newIndex = -1;
            
            // Get reference values from adjacent panels
            if (direction === 'down' && position === this.POSITIONS.UPDATE_DOWN) {
                // Rolling down: Position 16 needs the next item in sequence
                const panelAt15 = this.getPanelAtPosition(15);
                const panel15Index = panelAt15 - 1;
                const panel15ItemIndex = parseInt(this.drum.panels[panel15Index].getAttribute('data-item-index'));
                
                // Check if we're at the boundary
                if (!isNaN(panel15ItemIndex)) {
                    newIndex = panel15ItemIndex + 1;
                    // Wrap around if needed
                    if (newIndex >= this.options.length) {
                        newIndex = 0; // Wrap to beginning
                    }
                }
            } else if (direction === 'up' && position === this.POSITIONS.UPDATE_UP) {
                // Rolling up: Position 2 needs the previous item in sequence
                const panelAt3 = this.getPanelAtPosition(3);
                const panel3Index = panelAt3 - 1;
                const panel3ItemIndex = parseInt(this.drum.panels[panel3Index].getAttribute('data-item-index'));
                
                // Check if we're at the boundary
                if (!isNaN(panel3ItemIndex)) {
                    newIndex = panel3ItemIndex - 1;
                    // Wrap around if needed
                    if (newIndex < 0) {
                        newIndex = this.options.length - 1; // Wrap to end
                    }
                }
            }
            
            if (newIndex >= 0 && newIndex < this.options.length) {
                const option = this.options[newIndex];
                if (panel.textContent !== option.name) {
                    console.log(`[ios_drum] Updating Panel ${panelNumber} at Position ${position}: "${panel.textContent}" → "${option.name}" (angle: ${angle.toFixed(1)}°)`);
                    panel.textContent = option.name;
                    this.drum.panelContents[panelIndex] = option.name;
                    panel.setAttribute('data-value', option.value);
                    panel.setAttribute('data-item-index', newIndex);
                }
            }
        }
    }
    
    // Update panel visibility based on current angles
    updatePanelVisibility() {
        this.drum.panels.forEach((panel, i) => {
            const panelNumber = i + 1;
            const angle = this.getCurrentPanelAngle(panelNumber);
            
            // Normalize angle to 0-360 range for easier logic
            const normalizedAngle = ((angle % 360) + 360) % 360;
            
            // Panels should be visible in the front hemisphere (roughly -90° to +90° from center)
            // This translates to angles between 270° and 90° (going through 0°)
            const isVisible = normalizedAngle >= 270 || normalizedAngle <= 90;
            
            // Set visibility
            if (isVisible) {
                panel.classList.remove('hidden');
                // All visible panels have full opacity
                panel.style.opacity = 1;
            } else {
                panel.classList.add('hidden');
                panel.style.opacity = 0;
            }
        });
    }
    
    // Update selection based on which panel is at Position 9 (front center)
    updateSelection() {
        // Find which panel is at Position 9
        const panelAtFrontCenter = this.getPanelAtPosition(this.POSITIONS.FRONT_CENTER);
        const centerPanelIndex = panelAtFrontCenter - 1;
        const centerPanelElement = this.drum.panels[centerPanelIndex];
        
        // Update selected class on all panels
        this.drum.panels.forEach((panel, i) => {
            const panelNum = i + 1;
            panel.classList.toggle('selected', panelNum === panelAtFrontCenter);
        });
        
        // Get the value from the panel at Position 9
        const itemIndex = parseInt(centerPanelElement.getAttribute('data-item-index'));
        if (!isNaN(itemIndex) && itemIndex >= 0 && itemIndex < this.options.length) {
            const option = this.options[itemIndex];
            if (this.currentIndex !== itemIndex) {
                this.currentIndex = itemIndex;
                this.value = option.value;
                this.onChange(this.value);
                console.log(`[Progress View] Year selected: ${option.name}`);
                console.log(`[ios_drum] Panel ${panelAtFrontCenter} at Position 9 selected: ${option.name} (${option.value})`);
            }
        }
    }
    
    // Event handlers
    handleWheel = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Calculate velocity from wheel delta
        const delta = e.deltaY;
        const scaleFactor = 0.1;
        
        this.physics.velocity += delta * scaleFactor;
        
        // Clamp velocity
        if (Math.abs(this.physics.velocity) > this.physics.maxVelocity) {
            this.physics.velocity = Math.sign(this.physics.velocity) * this.physics.maxVelocity;
        }
        
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
        const rotationDelta = (deltaY / this.drum.itemHeight) * this.drum.panelAngle;
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
        const rotationDelta = (deltaY / this.drum.itemHeight) * this.drum.panelAngle;
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
                // Snap to nearest position to ensure a panel is centered
                const positionsRotated = this.drum.rotation / this.drum.panelAngle;
                const nearestPosition = Math.round(positionsRotated);
                const targetRotation = nearestPosition * this.drum.panelAngle;
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
    
    // Public methods
    setValue(value) {
        const index = this.options.findIndex(option => option.value == value);
        if (index >= 0 && index !== this.currentIndex) {
            this.currentIndex = index;
            this.value = value;
            
            // Reinitialize panel content to show new value at center
            this.initializePanelContent();
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