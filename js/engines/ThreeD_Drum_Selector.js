/**
 * ThreeD_Drum_Selector.js
 * 
 * Standalone drum selector engine combining ThreeD_component_engine and TextGeometryDrumEngine.
 * Creates a horizontal drum with numbers 0-9 that can be rotated to select values.
 * Features glossy black cylinder backdrop and animated fog background.
 * 
 * This is a self-contained version that doesn't extend other engines.
 * 
 * @class ThreeD_Drum_Selector
 */

export class ThreeD_Drum_Selector extends EventTarget {
    constructor(container, config = {}) {
        super(); // Call EventTarget constructor
        
        this.container = typeof container === 'string' ? 
            document.getElementById(container) : container;
            
        if (!this.container) {
            console.error('[ThreeD Drum Selector] Container not found');
            return;
        }
        
        // Merge configuration
        this.config = Object.assign({
            // Size settings
            responsive: true,
            width: 100,
            height: 100,
            
            // Background
            backgroundColor: 0x1a1a1a,
            
            // Text settings
            textDepth: 0, // Flat text
            
            // Blocking cylinder
            addBlockingCylinder: true,
            
            // Interaction settings
            enableInteraction: true,
            restrictRotationAxis: 'x', // X-axis only rotation
            rotationSpeed: 0,
            
            // Camera settings
            cameraPosition: { x: 0, y: 0, z: 1.9 },
            cameraFOV: 50
        }, config);
        
        // Three.js core objects
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        
        // TextGeometry specific properties
        this.numberMeshes = [];
        this.numberGroup = null;
        this.font = null;
        this.isLoading = false;
        
        // For parent compatibility
        this.mesh = null; // Will be assigned to numberGroup
        
        // Animation and interaction
        this.animationId = null;
        this.isInitialized = false;
        this.isDragging = false;
        this.previousMousePosition = { x: 0, y: 0 };
        this.rotationVelocity = { x: 0, y: 0 };
        
        // Bind methods
        this.animate = this.animate.bind(this);
        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);
        
        console.log('[ThreeD Drum Selector] Initialized for dynamic TextGeometry');
    }
    
    init() {
        if (this.isInitialized) {
            console.warn('[ThreeD Drum Selector] Already initialized');
            return;
        }
        
        console.log('[ThreeD Drum Selector] Initializing with config:', this.config);
        
        this.setupRenderer();
        this.setupCamera();
        this.setupScene();
        this.setupLights();
        
        // Create a group to hold all numbers - this becomes our "mesh" for rotation
        this.numberGroup = new THREE.Group();
        this.scene.add(this.numberGroup);
        this.numberGroup.rotation.z = -Math.PI / 2;  // Rotate 90° clockwise to make drum horizontal
        this.mesh = this.numberGroup; // Assign to mesh so rotation logic works
        
        // Load font and create TextGeometry
        this.loadFontAndCreateNumbers();
        
        // Setup event handlers
        if (this.config.enableInteraction) {
            this.setupEventHandlers();
        }
        
        // Start animation loop
        this.animate();
        
        this.isInitialized = true;
        console.log('[ThreeD Drum Selector] Initialization complete');
    }
    
    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true 
        });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        
        // Set initial size
        this.updateSize();
        
        // Configure renderer
        this.renderer.setClearColor(this.config.backgroundColor, 1);
        this.renderer.shadowMap.enabled = false;
        
        // Add to container
        this.container.appendChild(this.renderer.domElement);
        this.renderer.domElement.style.display = 'block';
        
        console.log('[ThreeD Drum Selector] Renderer setup complete');
    }
    
    setupCamera() {
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(
            this.config.cameraFOV,
            aspect,
            0.1,
            1000
        );
        
        // Position camera
        this.camera.position.set(
            this.config.cameraPosition.x,
            this.config.cameraPosition.y,
            this.config.cameraPosition.z
        );
        this.camera.lookAt(0, 0, 0);
        
        console.log('[ThreeD Drum Selector] Camera setup complete');
    }
    
    setupScene() {
        this.scene = new THREE.Scene();
        console.log('[ThreeD Drum Selector] Scene setup complete');
    }
    
    setupLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);
        
        // Main directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        this.scene.add(directionalLight);
        
        // Fill light
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(-5, 0, -5);
        this.scene.add(fillLight);
        
        console.log('[ThreeD Drum Selector] Lights setup complete');
    }
    
    setupEventHandlers() {
        const element = this.renderer.domElement;
        
        // Pointer events
        element.addEventListener('pointerdown', this.onPointerDown);
        element.addEventListener('pointermove', this.onPointerMove);
        element.addEventListener('pointerup', this.onPointerUp);
        element.addEventListener('pointercancel', this.onPointerUp);
        element.addEventListener('pointerleave', this.onPointerUp);
        
        console.log('[ThreeD Drum Selector] Event handlers setup complete');
    }
    
    updateSize() {
        if (this.config.responsive) {
            // Use CSS variable for responsive sizing
            const computedStyle = getComputedStyle(document.documentElement);
            const baseSize = parseFloat(computedStyle.getPropertyValue('--3d-component-size')) || 100;
            const viewportScale = Math.min(window.innerWidth, window.innerHeight) / 1000;
            const scaledSize = Math.floor(baseSize * viewportScale);
            
            this.config.width = scaledSize;
            this.config.height = scaledSize;
        }
        
        this.renderer.setSize(this.config.width, this.config.height);
        
        if (this.camera) {
            this.camera.aspect = this.config.width / this.config.height;
            this.camera.updateProjectionMatrix();
        }
        
        console.log('[ThreeD Drum Selector] Size updated:', this.config.width, 'x', this.config.height);
    }
    
    loadFontAndCreateNumbers() {
        if (!window.THREE) {
            console.error('[ThreeD Drum Selector] Three.js not loaded');
            return;
        }
        
        // Check if FontLoader is available
        if (!window.THREE.FontLoader) {
            console.warn('[ThreeD Drum Selector] FontLoader not available, using fallback boxes');
            this.createFallbackNumbers();
            return;
        }
        
        // Load font
        const loader = new THREE.FontLoader();
        this.isLoading = true;
        
        // Try to load helvetiker font
        loader.load(
            'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/fonts/helvetiker_regular.typeface.json',
            (font) => {
                console.log('[ThreeD Drum Selector] Font loaded successfully');
                this.font = font;
                this.createTextGeometryNumbers();
                this.isLoading = false;
            },
            (progress) => {
                console.log('[ThreeD Drum Selector] Loading font...', progress);
            },
            (error) => {
                console.error('[ThreeD Drum Selector] Error loading font:', error);
                this.createFallbackNumbers();
                this.isLoading = false;
            }
        );
    }
    
    createTextGeometryNumbers() {
        if (!this.font) {
            console.error('[ThreeD Drum Selector] No font loaded');
            return;
        }
        
        // Clear any existing numbers
        this.clearNumbers();
        
        // Create 10 TextGeometry objects for numbers 0-9
        const numberOfValues = 10;
        const anglePerNumber = (Math.PI * 2) / numberOfValues;
        const radius = 0.3;
        
        for (let i = 0; i < numberOfValues; i++) {
            // Get computed font size in pixels
            const computedStyle = getComputedStyle(document.documentElement);
            const rootFontSize = parseFloat(computedStyle.fontSize); // Base font size in px
            const componentMultiplier = parseFloat(computedStyle.getPropertyValue('--component-font-size')) || 0.9;
            const fontSizeInPixels = rootFontSize * componentMultiplier;
            
            // Convert pixels to Three.js units based on container/camera relationship
            const containerHeight = this.container.clientHeight || 300;
            const pixelsToUnits = 2.5 / containerHeight; // Camera shows ~2.5 units vertically
            const fontSize = fontSizeInPixels * pixelsToUnits * 0.4; // Reduced scale factor
            
            console.log('[ThreeD Drum Selector] Computed:', fontSizeInPixels + 'px', '→', fontSize + ' units');
            
            // Create TextGeometry for this number
            const textGeometry = new THREE.TextGeometry(i.toString(), {
                font: this.font,
                size: fontSize,
                height: this.config.textDepth !== undefined ? this.config.textDepth : 0.02,
                curveSegments: 12,
                bevelEnabled: false
            });
            
            // Center the geometry
            textGeometry.center();
            
            // First rotate the geometry 90 degrees before transforming vertices
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
                // Scale to use most of allocated angle per number
                const vertexAngle = -(vertex.x * 5.0) * (anglePerNumber * 0.8);
                const finalAngle = baseAngle + vertexAngle;
                
                // Apply cylindrical transformation
                const newRadius = radius + vertex.z;  // Add depth to face outward
                positions.setX(v, Math.cos(finalAngle) * newRadius);
                positions.setZ(v, Math.sin(finalAngle) * newRadius);
                // Y stays the same
            }
            
            // Mark geometry as needing update
            textGeometry.attributes.position.needsUpdate = true;
            textGeometry.computeVertexNormals();  // Recalculate normals for proper lighting
            
            // Clear existing groups
            textGeometry.clearGroups();
            
            // Manually create groups for front and back faces
            const faceCount = textGeometry.index ? textGeometry.index.count / 3 : textGeometry.attributes.position.count / 3;
            const facesPerCap = Math.floor(faceCount * 0.4);  // Approximate
            
            // Group 0: Front faces (use material 0)
            textGeometry.addGroup(0, facesPerCap * 3, 0);
            
            // Group 1: Back faces (use material 1) 
            textGeometry.addGroup(faceCount * 3 - facesPerCap * 3, facesPerCap * 3, 1);
            
            // Group 2: Side faces (use material 0)
            textGeometry.addGroup(facesPerCap * 3, (faceCount - 2 * facesPerCap) * 3, 0);
            
            // Create materials array - front visible, back invisible
            const material = [
                new THREE.MeshStandardMaterial({
                    color: 0xffffff,
                    emissive: 0x444444,
                    emissiveIntensity: 0.2,
                    side: THREE.FrontSide  // Front faces only
                }),
                new THREE.MeshStandardMaterial({
                    transparent: true,
                    opacity: 0  // Back faces - completely invisible
                })
            ];
            
            // Create mesh with material array
            const mesh = new THREE.Mesh(textGeometry, material);
            
            // Add to group
            this.numberGroup.add(mesh);
            this.numberMeshes.push(mesh);
            
            console.log(`[ThreeD Drum Selector] Created curved TextGeometry for ${i}`);
        }
        
        console.log('[ThreeD Drum Selector] All curved TextGeometry numbers created');
        
        // Add blocking cylinder AFTER numbers are created so we can measure them
        if (this.config.addBlockingCylinder) {
            this.createBlockingCylinder();
        }
    }
    
    createBlockingCylinder() {
        // Measure the maximum width of all text meshes
        let maxHeight = 0;  // Using height because drum is rotated 90°
        
        for (let mesh of this.numberMeshes) {
            if (mesh) {
                // Create bounding box for this text mesh
                const box = new THREE.Box3().setFromObject(mesh);
                const height = box.max.y - box.min.y;  // Y-axis because of rotation
                maxHeight = Math.max(maxHeight, height);
            }
        }
        
        // Add minimal padding (5% to avoid clipping)
        const drumWidth = maxHeight * 1.05;
        
        console.log('[ThreeD Drum Selector] Auto-sized drum width:', drumWidth, 'based on max text height:', maxHeight);
        
        // Create a shiny black cylinder to block view of rear numbers
        const blockingGeometry = new THREE.CylinderGeometry(
            0.28,  // 0.02 gap from text radius - bit more breathing room
            0.28,  // Same top and bottom radius
            drumWidth,   // Dynamic height based on text content
            32,    // Segments for smooth appearance
            1,     // Height segments
            true   // openEnded - no caps, just like the tube!
        );
        
        const blockingMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x000000,        // Pure black for glossy black appearance
            metalness: 0.0,         // No metallic properties
            roughness: 0.0,         // Completely smooth/glossy
            clearcoat: 1.0,         // Maximum clearcoat effect
            clearcoatRoughness: 0.0, // Smooth clearcoat
            reflectivity: 1.0,      // Maximum reflections
            envMapIntensity: 1.2,   // Enhanced environment reflections
            side: THREE.DoubleSide  // Visible from both sides
        });
        
        const blockingCylinder = new THREE.Mesh(blockingGeometry, blockingMaterial);
        
        // Add to the number group so it rotates with the numbers
        this.numberGroup.add(blockingCylinder);
        
        console.log('[ThreeD Drum Selector] Added blocking cylinder');
    }
    
    createFallbackNumbers() {
        // Fallback to box placeholders if FontLoader/TextGeometry not available
        console.log('[ThreeD Drum Selector] Creating fallback box placeholders');
        
        // Clear any existing numbers
        this.clearNumbers();
        
        const numberOfValues = 10;
        const anglePerNumber = (Math.PI * 2) / numberOfValues;
        const radius = 0.3;
        
        for (let i = 0; i < numberOfValues; i++) {
            // Create a box as placeholder
            const geometry = new THREE.BoxGeometry(0.1, 0.15, 0.02);
            const material = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                emissive: 0x444444,
                emissiveIntensity: 0.2,
                side: THREE.FrontSide  // Single-sided - only visible from outside
            });
            
            const mesh = new THREE.Mesh(geometry, material);
            
            // Position in cylinder formation
            const angle = i * anglePerNumber;
            mesh.position.x = Math.cos(angle) * radius;
            mesh.position.z = Math.sin(angle) * radius;
            mesh.position.y = 0;
            
            // Rotate to face outward and then 90 degrees for horizontal drum
            mesh.rotation.y = angle + Math.PI / 2;  // Face outward + 90 degree rotation
            mesh.rotation.z = Math.PI / 2;  // Rotate 90 degrees for horizontal drum
            
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
    
    onPointerDown(event) {
        this.isDragging = true;
        this.previousMousePosition = {
            x: event.clientX,
            y: event.clientY
        };
    }
    
    onPointerMove(event) {
        if (!this.isDragging || !this.mesh) return;
        
        const deltaX = event.clientX - this.previousMousePosition.x;
        const deltaY = event.clientY - this.previousMousePosition.y;
        
        // Apply rotation based on config
        if (this.config.restrictRotationAxis === 'x' || this.config.restrictRotation === 'x') {
            // Only allow X-axis rotation (vertical swipes)
            this.mesh.rotation.x -= deltaY * 0.01;
        } else {
            // Free rotation
            this.mesh.rotation.x -= deltaY * 0.01;
            this.mesh.rotation.y += deltaX * 0.01;
        }
        
        // Store velocity for momentum
        this.rotationVelocity.x = -deltaY * 0.01;
        this.rotationVelocity.y = deltaX * 0.01;
        
        this.previousMousePosition = {
            x: event.clientX,
            y: event.clientY
        };
    }
    
    onPointerUp() {
        this.isDragging = false;
    }
    
    animate() {
        this.animationId = requestAnimationFrame(this.animate);
        
        // Apply momentum when not dragging
        if (!this.isDragging && this.mesh) {
            if (this.config.restrictRotationAxis === 'x' || this.config.restrictRotation === 'x') {
                // Only apply X-axis momentum
                this.mesh.rotation.x += this.rotationVelocity.x;
                this.rotationVelocity.x *= 0.95; // Damping
            } else {
                // Free rotation momentum
                this.mesh.rotation.x += this.rotationVelocity.x;
                this.mesh.rotation.y += this.rotationVelocity.y;
                this.rotationVelocity.x *= 0.95;
                this.rotationVelocity.y *= 0.95;
            }
        }
        
        // Apply auto-rotation
        if (this.config.rotationSpeed && this.mesh && !this.isDragging) {
            this.mesh.rotation.x += this.config.rotationSpeed * 0.01;
        }
        
        // Render
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    setRotationSpeed(speed) {
        this.config.rotationSpeed = speed;
        console.log('[ThreeD Drum Selector] Rotation speed set to:', speed);
    }
    
    getCurrentValue() {
        if (!this.numberGroup) return 0;
        
        const normalizedRotation = ((this.numberGroup.rotation.x % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
        const anglePerNumber = (Math.PI * 2) / 10;
        return Math.round(normalizedRotation / anglePerNumber) % 10;
    }
    
    dispose() {
        // Stop animation
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // Clean up all numbers
        this.clearNumbers();
        
        if (this.numberGroup) {
            this.scene.remove(this.numberGroup);
            this.numberGroup = null;
        }
        
        // Clean up Three.js objects
        if (this.renderer) {
            this.renderer.dispose();
            this.container.removeChild(this.renderer.domElement);
        }
        
        // Clean up event listeners
        if (this.renderer && this.renderer.domElement) {
            const element = this.renderer.domElement;
            element.removeEventListener('pointerdown', this.onPointerDown);
            element.removeEventListener('pointermove', this.onPointerMove);
            element.removeEventListener('pointerup', this.onPointerUp);
        }
        
        this.font = null;
        this.isInitialized = false;
        
        console.log('[ThreeD Drum Selector] Disposed');
    }
}

export default ThreeD_Drum_Selector;
