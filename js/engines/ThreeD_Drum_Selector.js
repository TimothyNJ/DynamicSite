/**
 * threed_drum_selector.js
 * 
 * Standalone drum selector engine with 3D TextGeometry numbers.
 * Creates a horizontal drum with numbers 0-9 that can be rotated to select values.
 * Features glossy black cylinder backdrop and animated fog background.
 * 
 * @class ThreeD_Drum_Selector
 */

export class ThreeD_Drum_Selector {
    constructor(container, config = {}) {
        this.container = typeof container === 'string' ? 
            document.getElementById(container) : container;
            
        if (!this.container) {
            console.error('[ThreeD Drum Selector] Container not found');
            return;
        }
        
        // Merge configuration with defaults
        this.config = this.mergeConfig(config);
        
        // Three.js core objects
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.raycaster = new THREE.Raycaster();
        
        // Component groups and meshes
        this.numberGroup = null;
        this.numberMeshes = [];
        this.blockingCylinder = null;
        this.fogPlane = null;
        
        // Font and text
        this.font = null;
        this.isLoading = false;
        
        // Fog animation
        this.fogCanvas = null;
        this.fogContext = null;
        this.fogTexture = null;
        
        // Lights
        this.lights = {};
        
        // Interaction state
        this.isDragging = false;
        this.previousMousePosition = { x: 0, y: 0 };
        this.rotationVelocity = 0;
        this.animationId = null;
        this.isInitialized = false;
        
        // Value tracking
        this.currentValue = 0;
        
        // Bind methods
        this.animate = this.animate.bind(this);
        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);
        this.onWheel = this.onWheel.bind(this);
        
        console.log('[ThreeD Drum Selector] Initialized with config:', this.config);
    }
    
    mergeConfig(config) {
        return Object.assign({
            // Visual settings
            textColor: 0xffffff,
            textEmissive: 0x444444,
            textEmissiveIntensity: 0.2,
            cylinderColor: 0x000000,
            backgroundColor: 0x1a1a1a,
            
            // Geometry settings
            textRadius: 0.3,
            cylinderRadius: 0.28,
            fontSize: 'auto',
            textDepth: 0, // Flat text
            
            // Size settings
            width: 300,
            height: 300,
            responsive: true, // Use viewport-based sizing
            
            // Interaction settings
            enableInteraction: true,
            enableZoom: true,
            enableMomentum: true,
            restrictRotation: 'x', // X-axis only
            momentumDamping: 0.95,
            
            // Animation settings
            rotationSpeed: 0, // Auto-rotation speed (0-1)
            enableFog: true,
            enableSnap: false,
            snapStrength: 0.5,
            
            // Value settings
            values: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
            defaultValue: '0',
            onChange: null // Callback function
        }, config);
    }
    
    init() {
        if (this.isInitialized) {
            console.warn('[ThreeD Drum Selector] Already initialized');
            return;
        }
        
        console.log('[ThreeD Drum Selector] Starting initialization...');
        
        this.setupRenderer();
        this.setupCamera();
        this.setupScene();
        this.setupLighting();
        
        if (this.config.enableFog) {
            this.createFogPlane();
        }
        
        // Create number group that will hold all elements
        this.numberGroup = new THREE.Group();
        this.numberGroup.rotation.z = -Math.PI / 2; // Rotate 90° for horizontal drum
        this.scene.add(this.numberGroup);
        
        // Load font and create components
        this.loadFont();
        
        if (this.config.enableInteraction) {
            this.setupInteraction();
        }
        
        this.isInitialized = true;
        this.animate(0);
        
        // Set initial value
        if (this.config.defaultValue) {
            this.setValue(this.config.defaultValue);
        }
        
        console.log('[ThreeD Drum Selector] Initialization complete');
    }
    
    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true 
        });
        this.renderer.setClearColor(0x000000, 0); // Transparent background
        this.renderer.setPixelRatio(window.devicePixelRatio);
        
        // Calculate size based on responsive flag
        const size = this.config.responsive ? 
            Math.max(50, Math.min(500, window.innerWidth * 0.15)) : 
            this.config.width;
        
        this.renderer.setSize(size, size);
        this.container.appendChild(this.renderer.domElement);
        
        // Set container styles
        this.container.style.display = 'flex';
        this.container.style.justifyContent = 'center';
        this.container.style.alignItems = 'center';
        this.container.style.position = 'relative';
        this.container.style.overflow = 'hidden';
        
        if (!this.config.responsive) {
            this.container.style.width = `${this.config.width}px`;
            this.container.style.height = `${this.config.height}px`;
        }
        
        console.log('[ThreeD Drum Selector] Renderer setup complete');
    }
    
    setupCamera() {
        const size = this.config.responsive ? 
            Math.max(50, Math.min(500, window.innerWidth * 0.15)) : 
            this.config.width;
            
        this.camera = new THREE.PerspectiveCamera(
            50, // FOV
            1,  // Aspect ratio (square)
            0.1,
            100
        );
        this.camera.position.set(0, 0, 1.9);
        this.camera.lookAt(0, 0, 0);
    }
    
    setupScene() {
        this.scene = new THREE.Scene();
        // Don't set background - keep transparent
        
        // Setup environment for reflections
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        this.scene.environment = pmremGenerator.fromScene(this.createEnvironment()).texture;
    }
    
    createEnvironment() {
        const envScene = new THREE.Scene();
        
        const envLight1 = new THREE.DirectionalLight(0xffffff, 2);
        envLight1.position.set(1, 1, 1);
        envScene.add(envLight1);
        
        const envLight2 = new THREE.DirectionalLight(0xffffff, 1);
        envLight2.position.set(-1, 1, -1);
        envScene.add(envLight2);
        
        const envAmbient = new THREE.AmbientLight(0xffffff, 1);
        envScene.add(envAmbient);
        
        return envScene;
    }
    
    setupLighting() {
        // Primary point light - Apple-style 30° elevation, 30° to left
        this.lights.main = new THREE.PointLight(0xffffff, 2.5);
        this.lights.main.position.set(-1.5, 1.7, 2);
        this.scene.add(this.lights.main);
        
        // Front fill light
        this.lights.front = new THREE.DirectionalLight(0xffffff, 0.3);
        this.lights.front.position.set(0.5, 0.5, 3);
        this.lights.front.target.position.set(0, 0, 0);
        this.scene.add(this.lights.front);
        
        // Side fills
        this.lights.leftFill = new THREE.DirectionalLight(0xffffff, 0.2);
        this.lights.leftFill.position.set(-3, 0, 1);
        this.lights.leftFill.target.position.set(0, 0, 0);
        this.scene.add(this.lights.leftFill);
        
        this.lights.rightFill = new THREE.DirectionalLight(0xffffff, 0.15);
        this.lights.rightFill.position.set(3, -0.5, 1);
        this.lights.rightFill.target.position.set(0, 0, 0);
        this.scene.add(this.lights.rightFill);
        
        // Ambient light
        this.lights.ambient = new THREE.AmbientLight(0xffffff, 0.15);
        this.scene.add(this.lights.ambient);
        
        // Rim light
        this.lights.rim = new THREE.DirectionalLight(0xffffff, 1.5);
        this.lights.rim.position.set(0, -2, -2);
        this.lights.rim.target.position.set(0, 0, 0);
        this.scene.add(this.lights.rim);
        
        console.log('[ThreeD Drum Selector] Lighting setup complete');
    }
    
    createFogPlane() {
        // Calculate fog plane size
        const fogPlaneZ = -1.5;
        const cameraToFogPlane = this.camera.position.z - fogPlaneZ;
        const vFOV = (50 * Math.PI) / 180;
        const visibleHeight = 2 * Math.tan(vFOV / 2) * cameraToFogPlane;
        const visibleWidth = visibleHeight; // Square aspect
        
        // Create fog plane with padding
        const fogPlaneWidth = visibleWidth * 1.05;
        const fogPlaneHeight = visibleHeight * 1.05;
        
        const fogPlaneGeometry = new THREE.PlaneGeometry(fogPlaneWidth, fogPlaneHeight, 32, 32);
        
        // Create fog texture canvas
        this.fogCanvas = document.createElement('canvas');
        this.fogCanvas.width = 512;
        this.fogCanvas.height = 512;
        this.fogContext = this.fogCanvas.getContext('2d');
        
        this.fogTexture = new THREE.CanvasTexture(this.fogCanvas);
        
        const fogPlaneMaterial = new THREE.MeshBasicMaterial({
            map: this.fogTexture,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        
        this.fogPlane = new THREE.Mesh(fogPlaneGeometry, fogPlaneMaterial);
        this.fogPlane.position.set(0, 0, fogPlaneZ);
        this.scene.add(this.fogPlane);
        
        // Add debug border in development
        const edges = new THREE.EdgesGeometry(fogPlaneGeometry);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
        const lineSegments = new THREE.LineSegments(edges, lineMaterial);
        this.fogPlane.add(lineSegments);
        
        console.log('[ThreeD Drum Selector] Fog plane created');
    }
    
    loadFont() {
        if (!window.THREE || !window.THREE.FontLoader) {
            console.warn('[ThreeD Drum Selector] FontLoader not available, using fallback');
            this.createFallbackNumbers();
            return;
        }
        
        const loader = new THREE.FontLoader();
        this.isLoading = true;
        
        loader.load(
            'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/fonts/helvetiker_regular.typeface.json',
            (font) => {
                console.log('[ThreeD Drum Selector] Font loaded successfully');
                this.font = font;
                this.createTextNumbers();
                this.createBlockingCylinder();
                this.isLoading = false;
            },
            (progress) => {
                console.log('[ThreeD Drum Selector] Loading font...', progress);
            },
            (error) => {
                console.error('[ThreeD Drum Selector] Error loading font:', error);
                this.createFallbackNumbers();
                this.createBlockingCylinder();
                this.isLoading = false;
            }
        );
    }
    
    createTextNumbers() {
        if (!this.font) {
            console.error('[ThreeD Drum Selector] No font loaded');
            return;
        }
        
        // Clear any existing numbers
        this.clearNumbers();
        
        const numberOfValues = this.config.values.length;
        const anglePerNumber = (Math.PI * 2) / numberOfValues;
        const radius = this.config.textRadius;
        
        for (let i = 0; i < numberOfValues; i++) {
            // Calculate font size
            let fontSize;
            if (this.config.fontSize === 'auto') {
                const computedStyle = getComputedStyle(document.documentElement);
                const rootFontSize = parseFloat(computedStyle.fontSize);
                const componentMultiplier = parseFloat(computedStyle.getPropertyValue('--component-font-size')) || 0.9;
                const fontSizeInPixels = rootFontSize * componentMultiplier;
                const containerHeight = this.container.clientHeight || 300;
                const pixelsToUnits = 2.5 / containerHeight;
                fontSize = fontSizeInPixels * pixelsToUnits * 0.4;
            } else {
                fontSize = this.config.fontSize;
            }
            
            // Create TextGeometry
            const textGeometry = new THREE.TextGeometry(this.config.values[i], {
                font: this.font,
                size: fontSize,
                height: this.config.textDepth,
                curveSegments: 12,
                bevelEnabled: false
            });
            
            // Center the geometry
            textGeometry.center();
            
            // Rotate geometry 90 degrees for horizontal orientation
            textGeometry.rotateZ(Math.PI / 2);
            
            // Transform vertices to curve around cylinder
            const positions = textGeometry.attributes.position;
            const vertex = new THREE.Vector3();
            
            for (let v = 0; v < positions.count; v++) {
                vertex.x = positions.getX(v);
                vertex.y = positions.getY(v);
                vertex.z = positions.getZ(v);
                
                // Calculate angle for this vertex
                const baseAngle = i * anglePerNumber;
                const vertexAngle = -(vertex.x * 5.0) * (anglePerNumber * 0.8);
                const finalAngle = baseAngle + vertexAngle;
                
                // Apply cylindrical transformation
                const newRadius = radius + vertex.z;
                positions.setX(v, Math.cos(finalAngle) * newRadius);
                positions.setZ(v, Math.sin(finalAngle) * newRadius);
                // Y stays the same
            }
            
            // Update geometry
            positions.needsUpdate = true;
            textGeometry.computeVertexNormals();
            
            // Create material
            const material = new THREE.MeshStandardMaterial({
                color: this.config.textColor,
                emissive: this.config.textEmissive,
                emissiveIntensity: this.config.textEmissiveIntensity,
                side: THREE.FrontSide
            });
            
            // Create mesh
            const mesh = new THREE.Mesh(textGeometry, material);
            
            // Add to group
            this.numberGroup.add(mesh);
            this.numberMeshes.push(mesh);
        }
        
        console.log('[ThreeD Drum Selector] Created', numberOfValues, 'text numbers');
    }
    
    createBlockingCylinder() {
        // Measure text bounds to determine cylinder width
        let maxHeight = 0;
        
        for (let mesh of this.numberMeshes) {
            if (mesh) {
                const box = new THREE.Box3().setFromObject(mesh);
                const height = box.max.y - box.min.y;
                maxHeight = Math.max(maxHeight, height);
            }
        }
        
        // Add padding
        const drumWidth = maxHeight * 1.05;
        
        console.log('[ThreeD Drum Selector] Creating blocking cylinder with width:', drumWidth);
        
        // Create glossy black cylinder
        const blockingGeometry = new THREE.CylinderGeometry(
            this.config.cylinderRadius,
            this.config.cylinderRadius,
            drumWidth,
            32,
            1,
            true // Open-ended
        );
        
        const blockingMaterial = new THREE.MeshPhysicalMaterial({
            color: this.config.cylinderColor,
            metalness: 0.0,
            roughness: 0.0,
            clearcoat: 1.0,
            clearcoatRoughness: 0.0,
            reflectivity: 1.0,
            envMapIntensity: 1.2,
            side: THREE.DoubleSide
        });
        
        this.blockingCylinder = new THREE.Mesh(blockingGeometry, blockingMaterial);
        
        // Add to number group so it rotates with numbers
        this.numberGroup.add(this.blockingCylinder);
        
        console.log('[ThreeD Drum Selector] Blocking cylinder created');
    }
    
    createFallbackNumbers() {
        console.log('[ThreeD Drum Selector] Creating fallback box placeholders');
        
        this.clearNumbers();
        
        const numberOfValues = this.config.values.length;
        const anglePerNumber = (Math.PI * 2) / numberOfValues;
        const radius = this.config.textRadius;
        
        for (let i = 0; i < numberOfValues; i++) {
            // Create box as placeholder
            const geometry = new THREE.BoxGeometry(0.1, 0.15, 0.02);
            const material = new THREE.MeshStandardMaterial({
                color: this.config.textColor,
                emissive: this.config.textEmissive,
                emissiveIntensity: this.config.textEmissiveIntensity,
                side: THREE.FrontSide
            });
            
            const mesh = new THREE.Mesh(geometry, material);
            
            // Position in cylinder formation
            const angle = i * anglePerNumber;
            mesh.position.x = Math.cos(angle) * radius;
            mesh.position.z = Math.sin(angle) * radius;
            mesh.position.y = 0;
            
            // Rotate to face outward
            mesh.rotation.y = angle + Math.PI / 2;
            mesh.rotation.z = Math.PI / 2;
            
            // Add to group
            this.numberGroup.add(mesh);
            this.numberMeshes.push(mesh);
        }
        
        console.log('[ThreeD Drum Selector] Fallback boxes created');
    }
    
    clearNumbers() {
        this.numberMeshes.forEach(mesh => {
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) {
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(m => m.dispose());
                } else {
                    mesh.material.dispose();
                }
            }
            this.numberGroup.remove(mesh);
        });
        this.numberMeshes = [];
    }
    
    setupInteraction() {
        const canvas = this.renderer.domElement;
        
        canvas.style.cursor = 'grab';
        
        // Mouse events
        canvas.addEventListener('pointerdown', this.onPointerDown);
        canvas.addEventListener('pointermove', this.onPointerMove);
        canvas.addEventListener('pointerup', this.onPointerUp);
        canvas.addEventListener('pointercancel', this.onPointerUp);
        canvas.addEventListener('pointerleave', this.onPointerUp);
        
        // Wheel event for zoom
        if (this.config.enableZoom) {
            canvas.addEventListener('wheel', this.onWheel, { passive: false });
        }
        
        console.log('[ThreeD Drum Selector] Interaction setup complete');
    }
    
    onPointerDown(event) {
        if (!this.config.enableInteraction) return;
        
        this.isDragging = true;
        this.renderer.domElement.style.cursor = 'grabbing';
        
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.previousMousePosition = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
        
        // Reset velocity when starting new drag
        this.rotationVelocity = 0;
        
        event.preventDefault();
    }
    
    onPointerMove(event) {
        if (!this.isDragging || !this.config.enableInteraction) return;
        
        const rect = this.renderer.domElement.getBoundingClientRect();
        const currentPosition = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
        
        // Calculate rotation based on horizontal movement
        const deltaX = currentPosition.x - this.previousMousePosition.x;
        const rotationSpeed = deltaX * 0.01;
        
        // Apply rotation only to X-axis (drum rotation)
        if (this.config.restrictRotation === 'x') {
            this.numberGroup.rotation.x -= rotationSpeed;
        }
        
        // Track velocity for momentum
        if (this.config.enableMomentum) {
            this.rotationVelocity = -rotationSpeed;
        }
        
        this.previousMousePosition = currentPosition;
        
        // Trigger onChange callback if value changed
        const newValue = this.getCurrentValue();
        if (newValue !== this.currentValue) {
            this.currentValue = newValue;
            if (this.config.onChange) {
                this.config.onChange(this.config.values[newValue]);
            }
        }
    }
    
    onPointerUp(event) {
        this.isDragging = false;
        this.renderer.domElement.style.cursor = 'grab';
    }
    
    onWheel(event) {
        if (!this.config.enableZoom) return;
        
        // Check if cursor is within component bounds
        const rect = this.renderer.domElement.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
            return; // Outside component, let page scroll
        }
        
        event.preventDefault();
        
        // Zoom camera
        const zoomSpeed = 0.1;
        const delta = event.deltaY > 0 ? 1 + zoomSpeed : 1 - zoomSpeed;
        
        this.camera.position.z = Math.max(1, Math.min(3, this.camera.position.z * delta));
    }
    
    updateFogTexture(time) {
        if (!this.fogContext || !this.fogTexture) return;
        
        const ctx = this.fogContext;
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;
        
        // Clear canvas
        ctx.fillStyle = 'rgba(0, 0, 0, 0)';
        ctx.fillRect(0, 0, width, height);
        
        // Create animated tunnel effect
        const centerX = width / 2;
        const centerY = height / 2;
        const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);
        
        // Draw concentric circles
        const tunnelCount = 6;
        for (let i = 0; i < tunnelCount; i++) {
            const phase = (time * 0.001 + i * 0.5) % 1;
            const radius = phase * maxRadius;
            
            const gradient = ctx.createRadialGradient(
                centerX, centerY, Math.max(0, radius - 15),
                centerX, centerY, radius + 15
            );
            
            const opacity = (1 - phase) * 0.3;
            gradient.addColorStop(0, `rgba(100, 100, 255, 0)`);
            gradient.addColorStop(0.5, `rgba(100, 100, 255, ${opacity})`);
            gradient.addColorStop(1, `rgba(100, 100, 255, 0)`);
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
        }
        
        this.fogTexture.needsUpdate = true;
    }
    
    animate(time) {
        this.animationId = requestAnimationFrame(this.animate);
        
        // Update fog texture
        if (this.config.enableFog && this.fogTexture) {
            this.updateFogTexture(time);
        }
        
        // Apply momentum when not dragging
        if (!this.isDragging && this.config.enableMomentum && Math.abs(this.rotationVelocity) > 0.0001) {
            this.numberGroup.rotation.x += this.rotationVelocity;
            this.rotationVelocity *= this.config.momentumDamping;
            
            // Check for value change during momentum
            const newValue = this.getCurrentValue();
            if (newValue !== this.currentValue) {
                this.currentValue = newValue;
                if (this.config.onChange) {
                    this.config.onChange(this.config.values[newValue]);
                }
            }
        }
        
        // Apply auto-rotation if configured
        if (this.config.rotationSpeed > 0 && !this.isDragging) {
            this.numberGroup.rotation.x += this.config.rotationSpeed * 0.01;
        }
        
        // Optional snap-to-value behavior
        if (this.config.enableSnap && !this.isDragging && Math.abs(this.rotationVelocity) < 0.001) {
            this.snapToNearestValue();
        }
        
        this.renderer.render(this.scene, this.camera);
    }
    
    getCurrentValue() {
        if (!this.numberGroup) return 0;
        
        // Normalize rotation to 0-2π range
        const rotation = this.numberGroup.rotation.x;
        const normalized = ((rotation % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
        
        // Calculate which number is at the front
        const anglePerNumber = (Math.PI * 2) / this.config.values.length;
        const index = Math.round(normalized / anglePerNumber) % this.config.values.length;
        
        return index;
    }
    
    setValue(value) {
        const index = this.config.values.indexOf(value.toString());
        if (index === -1) {
            console.warn('[ThreeD Drum Selector] Value not found:', value);
            return;
        }
        
        const anglePerNumber = (Math.PI * 2) / this.config.values.length;
        this.numberGroup.rotation.x = index * anglePerNumber;
        
        this.currentValue = index;
        if (this.config.onChange) {
            this.config.onChange(value);
        }
    }
    
    snapToNearestValue() {
        const currentRotation = this.numberGroup.rotation.x;
        const anglePerNumber = (Math.PI * 2) / this.config.values.length;
        const targetRotation = Math.round(currentRotation / anglePerNumber) * anglePerNumber;
        
        // Smooth animation to snap position
        const diff = targetRotation - currentRotation;
        if (Math.abs(diff) > 0.001) {
            this.numberGroup.rotation.x += diff * this.config.snapStrength * 0.1;
        }
    }
    
    setRotationSpeed(speed) {
        this.config.rotationSpeed = Math.max(0, Math.min(1, speed));
    }
    
    dispose() {
        // Stop animation
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        // Remove event listeners
        const canvas = this.renderer.domElement;
        canvas.removeEventListener('pointerdown', this.onPointerDown);
        canvas.removeEventListener('pointermove', this.onPointerMove);
        canvas.removeEventListener('pointerup', this.onPointerUp);
        canvas.removeEventListener('pointercancel', this.onPointerUp);
        canvas.removeEventListener('pointerleave', this.onPointerUp);
        canvas.removeEventListener('wheel', this.onWheel);
        
        // Clear numbers
        this.clearNumbers();
        
        // Dispose blocking cylinder
        if (this.blockingCylinder) {
            if (this.blockingCylinder.geometry) this.blockingCylinder.geometry.dispose();
            if (this.blockingCylinder.material) this.blockingCylinder.material.dispose();
            this.numberGroup.remove(this.blockingCylinder);
        }
        
        // Dispose fog plane
        if (this.fogPlane) {
            if (this.fogPlane.geometry) this.fogPlane.geometry.dispose();
            if (this.fogPlane.material) this.fogPlane.material.dispose();
            this.scene.remove(this.fogPlane);
        }
        
        // Dispose textures
        if (this.fogTexture) this.fogTexture.dispose();
        
        // Remove number group
        if (this.numberGroup) {
            this.scene.remove(this.numberGroup);
        }
        
        // Dispose renderer
        if (this.renderer) {
            this.renderer.dispose();
            this.container.removeChild(this.renderer.domElement);
        }
        
        // Clear references
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.numberGroup = null;
        this.blockingCylinder = null;
        this.fogPlane = null;
        this.font = null;
        
        console.log('[ThreeD Drum Selector] Disposed');
    }
}
