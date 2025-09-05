/**
 * drum_wheel_3d_component_engine.js
 * 
 * A specialized 3D component engine for drum/wheel selectors that rotate only around X-axis.
 * Based on 3_D_component_engine but simplified for single-axis rotation like a slot machine.
 * 
 * Key differences from 3_D_component_engine:
 * - Only rotates around X-axis (horizontal axis through the drum)
 * - No sticky rotation or complex quaternion math
 * - Simplified gesture handling for drum spinning
 * - Optimized for wheel/drum interaction patterns
 * 
 * @class drum_wheel_3d_component_engine
 */

import { LoopSubdivision } from 'three-subdivide';

export class drum_wheel_3d_component_engine {
    constructor(container, config = {}) {
        this.container = typeof container === 'string' ? 
            document.getElementById(container) : container;
            
        if (!this.container) {
            console.error('[Drum Wheel 3D Engine] Container not found');
            return;
        }
        
        this.config = this.mergeConfig(config);
        
        // Three.js core objects
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.mesh = null;
        
        // Lights
        this.lights = {};
        
        // Animation and interaction
        this.animationId = null;
        this.isInitialized = false;
        this.isDragging = false;
        this.previousMouseY = 0;  // Only track Y movement for drum rotation
        
        // Single-axis rotation state
        this.currentRotation = 0;  // Current X-axis rotation in radians
        this.rotationVelocity = 0; // Rotation speed (radians per frame)
        this.autoRotationSpeed = 0; // Base auto-rotation speed
        
        // Store initial dimensions for constraint calculations
        this.initialWidth = null;
        this.initialHeight = null;
        
        // Texture canvas for animated textures
        this.textureCanvas = null;
        this.textureContext = null;
        this.texture = null;
        
        // Fog plane for background effect
        this.fogPlane = null;
        this.fogTexture = null;
        this.fogCanvas = null;
        this.fogContext = null;
        
        // Bind methods
        this.animate = this.animate.bind(this);
        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);
        this.onWheel = this.onWheel.bind(this);
        this.onTouchStart = this.onTouchStart.bind(this);
        this.onTouchMove = this.onTouchMove.bind(this);
        this.onTouchEnd = this.onTouchEnd.bind(this);
    }
    
    mergeConfig(config) {
        return Object.assign({
            // Initial container dimensions (temporary, will resize to content)
            width: 100,
            height: 100,
            
            // Responsive mode flag
            responsive: false,  // If true, uses CSS variable for sizing
            
            // Geometry settings - default to cylinder for drum
            geometry: 'cylinder',
            geometryParams: {
                // For cylinder (drum shape)
                cylinderRadiusTop: 0.5,
                cylinderRadiusBottom: 0.5,
                cylinderHeight: 1,
                cylinderRadialSegments: 32,
                
                // Also support roundedBox for variety
                width: 1,
                height: 1,
                depth: 1,
                radius: 0.15,
                smoothness: 32
            },
            
            // Material settings
            material: 'physical',
            materialParams: {
                color: 0x404040,
                metalness: 0.0,
                roughness: 0.0,
                clearcoat: 1.0,
                clearcoatRoughness: 0.0,
                reflectivity: 1.0,
                envMapIntensity: 1.2
            },
            
            // Texture settings
            texture: 'animated', // 'animated', 'solid', 'none'
            textureParams: {
                // For animated texture
                animationSpeed: 0.001,
                tunnelRadius: 15,
                tunnelCount: 6,
                
                // For solid texture
                solidColor: 0xffffff
            },
            
            // Animation settings
            enableAnimation: true,
            rotationSpeed: 0,  // Base auto-rotation speed
            
            // Interaction settings
            enableInteraction: true,
            sensitivity: 0.01,  // Mouse/touch sensitivity
            friction: 0.98,     // Momentum friction (lower = more friction)
            
            // Lighting settings
            lighting: 'default',
            backgroundColor: 0x000000,
            
            // Camera settings
            cameraPosition: { x: 0, y: 0, z: 1.9 },
            cameraFOV: 50
        }, config);
    }
    
    init() {
        if (this.isInitialized) {
            console.warn('[Drum Wheel 3D Engine] Already initialized');
            return;
        }
        
        console.log('[Drum Wheel 3D Engine] Initializing with config:', this.config);
        
        this.setupRenderer();
        this.setupCamera();
        this.setupScene();
        this.setupLighting();
        this.createFogPlane();
        this.createTexture();
        this.createGeometry();
        
        if (this.config.enableInteraction) {
            this.setupInteraction();
        }
        
        // Handle responsive sizing
        if (this.config.responsive) {
            this.setupResponsiveSize();
            window.addEventListener('resize', () => this.updateSize());
        } else {
            this.updateSize();
        }
        
        // Start animation loop
        this.animate();
        
        this.isInitialized = true;
        console.log('[Drum Wheel 3D Engine] Initialization complete');
    }
    
    setupRenderer() {
        // Check if Three.js is available
        if (typeof THREE === 'undefined') {
            console.error('[Drum Wheel 3D Engine] Three.js not found. Make sure it is loaded from CDN.');
            return;
        }
        
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true
        });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(this.config.backgroundColor, 0);
        this.container.appendChild(this.renderer.domElement);
        
        console.log('[Drum Wheel 3D Engine] Renderer created');
    }
    
    setupCamera() {
        const aspect = this.config.width / this.config.height;
        this.camera = new THREE.PerspectiveCamera(
            this.config.cameraFOV,
            aspect,
            0.1,
            1000
        );
        
        this.camera.position.set(
            this.config.cameraPosition.x,
            this.config.cameraPosition.y,
            this.config.cameraPosition.z
        );
        
        this.camera.lookAt(0, 0, 0);
        
        console.log('[Drum Wheel 3D Engine] Camera positioned');
    }
    
    setupScene() {
        this.scene = new THREE.Scene();
        console.log('[Drum Wheel 3D Engine] Scene created');
    }
    
    setupLighting() {
        if (this.config.lighting === 'none') return;
        
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);
        this.lights.ambient = ambientLight;
        
        // Main directional light
        const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
        mainLight.position.set(0.5, 0.5, 1);
        this.scene.add(mainLight);
        this.lights.main = mainLight;
        
        // Fill light
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(-0.5, -0.5, 0.5);
        this.scene.add(fillLight);
        this.lights.fill = fillLight;
        
        console.log('[Drum Wheel 3D Engine] Lighting setup complete');
    }
    
    createFogPlane() {
        // Create fog effect background plane (from original engine)
        const planeGeometry = new THREE.PlaneGeometry(10, 10);
        
        // Create canvas for fog texture
        this.fogCanvas = document.createElement('canvas');
        this.fogCanvas.width = 512;
        this.fogCanvas.height = 512;
        this.fogContext = this.fogCanvas.getContext('2d');
        
        // Initial fog pattern
        this.updateFogTexture(0);
        
        this.fogTexture = new THREE.CanvasTexture(this.fogCanvas);
        this.fogTexture.needsUpdate = true;
        
        const planeMaterial = new THREE.MeshBasicMaterial({
            map: this.fogTexture,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        
        this.fogPlane = new THREE.Mesh(planeGeometry, planeMaterial);
        this.fogPlane.position.z = -3;
        this.scene.add(this.fogPlane);
        
        console.log('[Drum Wheel 3D Engine] Fog plane created');
    }
    
    updateFogTexture(time) {
        const width = this.fogCanvas.width;
        const height = this.fogCanvas.height;
        
        // Create gradient
        const gradient = this.fogContext.createRadialGradient(
            width / 2, height / 2, 0,
            width / 2, height / 2, width / 2
        );
        
        // Animate colors
        const hue = (time * 10) % 360;
        gradient.addColorStop(0, `hsla(${hue}, 70%, 50%, 0.0)`);
        gradient.addColorStop(0.5, `hsla(${(hue + 60) % 360}, 70%, 40%, 0.2)`);
        gradient.addColorStop(1, `hsla(${(hue + 120) % 360}, 70%, 30%, 0.0)`);
        
        this.fogContext.fillStyle = gradient;
        this.fogContext.fillRect(0, 0, width, height);
        
        if (this.fogTexture) {
            this.fogTexture.needsUpdate = true;
        }
    }
    
    createTexture() {
        if (this.config.texture === 'none') return;
        
        if (this.config.texture === 'animated') {
            // Create canvas for animated texture
            this.textureCanvas = document.createElement('canvas');
            this.textureCanvas.width = 512;
            this.textureCanvas.height = 512;
            this.textureContext = this.textureCanvas.getContext('2d');
            
            // Initial pattern
            this.updateAnimatedTexture(0);
            
            this.texture = new THREE.CanvasTexture(this.textureCanvas);
            this.texture.needsUpdate = true;
            
            console.log('[Drum Wheel 3D Engine] Animated texture created');
        } else if (this.config.texture === 'solid') {
            // Solid color texture
            this.texture = new THREE.Color(this.config.textureParams.solidColor);
            console.log('[Drum Wheel 3D Engine] Solid texture created');
        }
    }
    
    updateAnimatedTexture(time) {
        const width = this.textureCanvas.width;
        const height = this.textureCanvas.height;
        const ctx = this.textureContext;
        
        // Clear canvas
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);
        
        // Draw animated tunnel pattern (from original engine)
        const tunnelRadius = this.config.textureParams.tunnelRadius;
        const tunnelCount = this.config.textureParams.tunnelCount;
        
        for (let i = 0; i < tunnelCount; i++) {
            const progress = (i / tunnelCount + time * this.config.textureParams.animationSpeed) % 1;
            const radius = progress * width * 0.7;
            const alpha = 1 - progress;
            const hue = (progress * 360 + time * 10) % 360;
            
            ctx.strokeStyle = `hsla(${hue}, 100%, 50%, ${alpha})`;
            ctx.lineWidth = tunnelRadius * (1 + progress);
            ctx.beginPath();
            ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Add some sparkles
        for (let i = 0; i < 20; i++) {
            const x = (Math.sin(time * 0.7 + i * 0.5) + 1) * width / 2;
            const y = (Math.cos(time * 0.5 + i * 0.7) + 1) * height / 2;
            const size = (Math.sin(time * 2 + i) + 1) * 2 + 1;
            
            ctx.fillStyle = `hsla(${(time * 20 + i * 18) % 360}, 100%, 70%, 0.8)`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        if (this.texture) {
            this.texture.needsUpdate = true;
        }
    }
    
    createGeometry() {
        let geometry;
        
        if (this.config.geometry === 'cylinder') {
            // Create cylinder (drum shape)
            geometry = new THREE.CylinderGeometry(
                this.config.geometryParams.cylinderRadiusTop,
                this.config.geometryParams.cylinderRadiusBottom,
                this.config.geometryParams.cylinderHeight,
                this.config.geometryParams.cylinderRadialSegments
            );
            
            // Rotate to have axis along X (horizontal)
            geometry.rotateZ(Math.PI / 2);
            
        } else if (this.config.geometry === 'roundedBox') {
            // Create box first
            geometry = new THREE.BoxGeometry(
                this.config.geometryParams.width,
                this.config.geometryParams.height,
                this.config.geometryParams.depth
            );
            
            // Apply subdivision for rounded corners
            const params = {
                split: true,
                uvSmooth: true,
                preserveEdges: false,
                flatOnly: false,
                maxTriangles: 10000
            };
            
            geometry = LoopSubdivision.modify(
                geometry,
                this.config.geometryParams.smoothness,
                params
            );
            
            // Rotate to have consistent orientation
            geometry.rotateZ(Math.PI / 2);
        }
        
        // Create material
        let material;
        if (this.config.material === 'physical') {
            material = new THREE.MeshPhysicalMaterial({
                map: this.texture,
                ...this.config.materialParams
            });
        } else if (this.config.material === 'standard') {
            material = new THREE.MeshStandardMaterial({
                map: this.texture,
                color: this.config.materialParams.color,
                metalness: this.config.materialParams.metalness,
                roughness: this.config.materialParams.roughness
            });
        } else {
            material = new THREE.MeshBasicMaterial({
                map: this.texture,
                color: this.config.materialParams.color
            });
        }
        
        // Create mesh
        this.mesh = new THREE.Mesh(geometry, material);
        this.scene.add(this.mesh);
        
        console.log('[Drum Wheel 3D Engine] Geometry created:', this.config.geometry);
    }
    
    setupInteraction() {
        const element = this.renderer.domElement;
        
        // Mouse events
        element.addEventListener('pointerdown', this.onPointerDown);
        element.addEventListener('pointermove', this.onPointerMove);
        element.addEventListener('pointerup', this.onPointerUp);
        element.addEventListener('pointercancel', this.onPointerUp);
        element.addEventListener('pointerleave', this.onPointerUp);
        
        // Wheel event for scrolling
        element.addEventListener('wheel', this.onWheel);
        
        // Touch events for mobile
        element.addEventListener('touchstart', this.onTouchStart, { passive: false });
        element.addEventListener('touchmove', this.onTouchMove, { passive: false });
        element.addEventListener('touchend', this.onTouchEnd);
        
        // Prevent context menu
        element.addEventListener('contextmenu', (e) => e.preventDefault());
        
        console.log('[Drum Wheel 3D Engine] Interaction handlers attached');
    }
    
    onPointerDown(event) {
        this.isDragging = true;
        this.previousMouseY = event.clientY;
        this.rotationVelocity = 0;  // Stop any existing momentum
        this.renderer.domElement.style.cursor = 'grabbing';
    }
    
    onPointerMove(event) {
        if (!this.isDragging) return;
        
        const deltaY = event.clientY - this.previousMouseY;
        const rotationAmount = deltaY * this.config.sensitivity;
        
        // Apply rotation directly to X-axis
        this.currentRotation += rotationAmount;
        
        // Track velocity for momentum
        this.rotationVelocity = rotationAmount;
        
        this.previousMouseY = event.clientY;
    }
    
    onPointerUp(event) {
        this.isDragging = false;
        this.renderer.domElement.style.cursor = 'grab';
        // Velocity will continue in animation loop
    }
    
    onWheel(event) {
        event.preventDefault();
        
        // Use wheel delta for rotation
        const rotationAmount = event.deltaY * this.config.sensitivity * 0.1;
        
        // Add to velocity for smooth scrolling
        this.rotationVelocity += rotationAmount;
        
        // Clamp velocity to prevent too fast spinning
        const maxVelocity = 0.5;
        this.rotationVelocity = Math.max(-maxVelocity, Math.min(maxVelocity, this.rotationVelocity));
    }
    
    onTouchStart(event) {
        if (event.touches.length === 1) {
            this.isDragging = true;
            this.previousMouseY = event.touches[0].clientY;
            this.rotationVelocity = 0;
        }
    }
    
    onTouchMove(event) {
        if (!this.isDragging || event.touches.length !== 1) return;
        
        event.preventDefault();
        
        const deltaY = event.touches[0].clientY - this.previousMouseY;
        const rotationAmount = deltaY * this.config.sensitivity;
        
        // Apply rotation
        this.currentRotation += rotationAmount;
        
        // Track velocity
        this.rotationVelocity = rotationAmount;
        
        this.previousMouseY = event.touches[0].clientY;
    }
    
    onTouchEnd(event) {
        this.isDragging = false;
    }
    
    setupResponsiveSize() {
        // Get CSS variable for responsive sizing
        const computedStyle = getComputedStyle(this.container);
        const size = computedStyle.getPropertyValue('--3d-component-size');
        
        if (size) {
            const pixels = parseInt(size);
            this.config.width = pixels;
            this.config.height = pixels;
            console.log('[Drum Wheel 3D Engine] Using CSS variable size:', pixels);
        }
    }
    
    updateSize() {
        if (this.config.responsive) {
            this.setupResponsiveSize();
        }
        
        const width = this.config.width;
        const height = this.config.height;
        
        // Update renderer size
        this.renderer.setSize(width, height);
        
        // Update camera aspect ratio
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        console.log(`[Drum Wheel 3D Engine] Size updated to ${width}x${height}`);
    }
    
    animate() {
        if (!this.isInitialized) {
            this.animationId = requestAnimationFrame(this.animate);
            return;
        }
        
        // Update animated texture
        if (this.config.texture === 'animated') {
            const time = Date.now() * 0.001;
            this.updateAnimatedTexture(time);
            this.updateFogTexture(time);
        }
        
        // Apply rotation physics
        if (!this.isDragging) {
            // Apply momentum with friction
            if (Math.abs(this.rotationVelocity) > 0.0001) {
                this.currentRotation += this.rotationVelocity;
                this.rotationVelocity *= this.config.friction;
            } else {
                // Apply auto-rotation when stopped
                this.currentRotation += this.config.rotationSpeed * 0.01;
            }
        }
        
        // Set mesh rotation - only X-axis
        if (this.mesh) {
            this.mesh.rotation.x = this.currentRotation;
            // Keep other axes at 0
            this.mesh.rotation.y = 0;
            this.mesh.rotation.z = 0;
        }
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
        
        this.animationId = requestAnimationFrame(this.animate);
    }
    
    // Public methods
    setRotationSpeed(speed) {
        this.config.rotationSpeed = speed;
        this.autoRotationSpeed = speed;
        console.log('[Drum Wheel 3D Engine] Rotation speed set to:', speed);
    }
    
    dispose() {
        // Cancel animation
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        // Remove event listeners
        const element = this.renderer.domElement;
        element.removeEventListener('pointerdown', this.onPointerDown);
        element.removeEventListener('pointermove', this.onPointerMove);
        element.removeEventListener('pointerup', this.onPointerUp);
        element.removeEventListener('wheel', this.onWheel);
        element.removeEventListener('touchstart', this.onTouchStart);
        element.removeEventListener('touchmove', this.onTouchMove);
        element.removeEventListener('touchend', this.onTouchEnd);
        window.removeEventListener('resize', () => this.updateSize());
        
        // Dispose Three.js objects
        if (this.mesh) {
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
        
        if (this.texture) {
            this.texture.dispose();
        }
        
        if (this.fogTexture) {
            this.fogTexture.dispose();
        }
        
        if (this.renderer) {
            this.renderer.dispose();
            this.container.removeChild(this.renderer.domElement);
        }
        
        console.log('[Drum Wheel 3D Engine] Disposed');
    }
}

// Export is handled by the class declaration above
