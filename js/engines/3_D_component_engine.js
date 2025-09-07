/**
 * 3_D_component_engine.js
 * 
 * A reusable component engine for creating interactive 3D objects using Three.js.
 * Supports various geometries, textures, animations, and interactions.
 * 
 * Coordinate System:
 * - X-axis: Points to the right (red in debug mode)
 * - Y-axis: Points up (green in debug mode)
 * - Z-axis: Points towards the viewer (blue in debug mode)
 * 
 * Rotation Controls:
 * - Horizontal swipe/drag: Rotates around Y-axis (vertical world axis)
 * - Vertical swipe/drag: Rotates around screen's horizontal axis (screen-space rotation)
 * - Two-finger spin: Rotates around camera's forward axis (Z-axis in view space)
 *   - Touch screens: Supported on all browsers
 *   - Trackpad: Safari only (uses WebKit gesture events)
 * - Pinch gesture: Scales the component
 * 
 * @class 3_D_component_engine
 */

import { LoopSubdivision } from 'three-subdivide';

export class ThreeD_component_engine {
    constructor(container, config = {}) {
        this.container = typeof container === 'string' ? 
            document.getElementById(container) : container;
            
        if (!this.container) {
            console.error('[3D Component Engine] Container not found');
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
        this.isGesturing = false;  // Track if any gesture (touch/trackpad) is active
        this.previousMousePosition = { x: 0, y: 0 };
        this.rotationVelocity = { x: 0, y: 0 };
        this.autoRotationTime = 0;
        
        // Gesture state machine
        this.gestureState = {
            type: 'none', // 'none', 'swipe', 'twist', 'pinch', 'drag'
            startTime: 0,
            lastUpdateTime: 0,
            transitionCooldown: 100, // ms to wait before allowing new gesture type
            // Swipe-specific state
            swipeVelocity: { x: 0, y: 0 },
            // Twist-specific state  
            twistAngle: null,
            twistVelocity: 0,
            // Pinch-specific state
            pinchDistance: null,
            pinchVelocity: 0
        };
        
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
        this.onGestureStart = this.onGestureStart.bind(this);
        this.onGestureChange = this.onGestureChange.bind(this);
        this.onGestureEnd = this.onGestureEnd.bind(this);
    }
    
    mergeConfig(config) {
        return Object.assign({
            // Initial container dimensions (temporary, will resize to content)
            width: 100,
            height: 100,
            
            // Responsive mode flag
            responsive: false,  // If true, uses CSS variable for sizing
            
            // Geometry settings
            geometry: 'roundedBox', // 'roundedBox', 'sphere', 'torus', 'cylinder'
            geometryParams: {
                // For roundedBox
                width: 1,
                height: 1,
                depth: 1,
                radius: 0.15,
                smoothness: 32,
                
                // For sphere
                sphereRadius: 0.5,
                widthSegments: 32,
                heightSegments: 32,
                
                // For torus
                torusRadius: 0.5,
                tubeRadius: 0.2,
                radialSegments: 16,
                tubularSegments: 100,
                
                // For cylinder
                cylinderRadiusTop: 0.5,
                cylinderRadiusBottom: 0.5,
                cylinderHeight: 1,
                cylinderRadialSegments: 32
            },
            
            // Subdivision settings
            enableSubdivision: true,
            subdivisionIterations: 1,
            subdivisionParams: {
                split: true,
                uvSmooth: true,
                preserveEdges: false,
                flatOnly: false,
                maxTriangles: 10000
            },
            
            // Material settings
            material: 'physical', // 'physical', 'standard', 'basic'
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
            rotationSpeed: 0,
            
            // Interaction settings
            enableInteraction: true,
            restrictRotationAxis: null, // null for free rotation, 'x' for X-axis only (wheel/drum with axle),
            
            // Lighting settings
            lighting: 'default', // 'default', 'custom', 'none'
            backgroundColor: 0x000000,
            
            // Camera settings
            cameraPosition: { x: 0, y: 0, z: 1.9 },
            cameraFOV: 50
        }, config);
    }
    
    init() {
        if (this.isInitialized) {
            console.warn('[3D Component Engine] Already initialized');
            return;
        }
        
        console.log('[3D Component Engine] Initializing with config:', this.config);
        
        this.setupRenderer();
        this.setupCamera();
        this.setupScene();
        this.setupLighting();
        this.createFogPlane();
        this.createTexture();
        this.createGeometry();
        this.createMaterial();
        this.createMesh();
        
        if (this.config.enableInteraction) {
            this.setupInteraction();
        }
        
        this.isInitialized = true;
        this.animate(0);
        
        // Force initial resize for responsive components
        if (this.config.responsive) {
            this.updateResponsiveSize();
        }
        
        // Log FINAL dimensions after everything is set up
        setTimeout(() => {
            console.log(`[3D Engine] FINAL DIMENSIONS after init:`);
            console.log(`[3D Engine] Container: ${this.container.offsetWidth}x${this.container.offsetHeight}`);
            console.log(`[3D Engine] Canvas: ${this.renderer.domElement.offsetWidth}x${this.renderer.domElement.offsetHeight}`);
            console.log(`[3D Engine] Gap width: ${this.container.offsetWidth - this.renderer.domElement.offsetWidth}px`);
            console.log(`[3D Engine] Gap height: ${this.container.offsetHeight - this.renderer.domElement.offsetHeight}px`);
        }, 100);
        
        console.log('[3D Component Engine] Initialization complete');
    }
    
    setupRenderer() {
        // Log which THREE we're using
        console.log(`[3D Engine] Using THREE version: ${typeof THREE !== 'undefined' ? THREE.REVISION : 'undefined'}`);
        console.log(`[3D Engine] THREE source: ${typeof THREE !== 'undefined' ? 'global window.THREE' : 'unknown'}`);
        console.log(`[3D Engine] Responsive: ${this.config.responsive}`);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setClearColor(0x000000, 0); // Fully transparent
        this.renderer.setPixelRatio(window.devicePixelRatio);
        
        // For responsive mode, calculate size based on viewport
        const size = this.config.responsive ? 
            Math.max(50, Math.min(500, window.innerWidth * 0.15)) :  // clamp(50px, 15vw, 500px)
            this.config.width;
        
        console.log(`[3D Engine] Setting up renderer - responsive: ${this.config.responsive}, calculated size: ${size}`);
        
        this.renderer.setSize(size, size);
        
        // Log what happened to canvas after setSize
        console.log(`[3D Engine] After setSize - Canvas style.width: ${this.renderer.domElement.style.width}`);
        console.log(`[3D Engine] After setSize - Canvas style.height: ${this.renderer.domElement.style.height}`);
        
        this.container.appendChild(this.renderer.domElement);
        
        // Ensure canvas respects container size
        if (!this.config.responsive) {
            // Only set 100% for fixed components
            this.renderer.domElement.style.width = '100%';
            this.renderer.domElement.style.height = '100%';
        }
        this.renderer.domElement.style.display = 'block';
        
        console.log(`[3D Engine] Canvas actual size: ${this.renderer.domElement.width}x${this.renderer.domElement.height}`);
        console.log(`[3D Engine] Canvas style.width raw: '${this.renderer.domElement.style.width}'`);
        console.log(`[3D Engine] Canvas style.height raw: '${this.renderer.domElement.style.height}'`);
        console.log(`[3D Engine] Canvas style size FINAL: ${this.renderer.domElement.style.width}x${this.renderer.domElement.style.height}`);
        console.log(`[3D Engine] Device pixel ratio: ${window.devicePixelRatio}`);
        
        // Log container dimensions before and after setup
        console.log(`[3D Engine] Container offsetWidth BEFORE flex: ${this.container.offsetWidth}`);
        console.log(`[3D Engine] Container offsetHeight BEFORE flex: ${this.container.offsetHeight}`);
        console.log(`[3D Engine] Container clientWidth BEFORE flex: ${this.container.clientWidth}`);
        console.log(`[3D Engine] Container clientHeight BEFORE flex: ${this.container.clientHeight}`);
        
        // Set container styles for flex layout participation
        this.container.style.display = 'flex';  // Make it a flex container
        this.container.style.justifyContent = 'center';  // Center horizontally
        this.container.style.alignItems = 'center';  // Center vertically
        this.container.style.flex = '0 1 auto';  // No grow, CAN shrink, auto basis
        this.container.style.maxWidth = '100%';
        
        // Add conditional container styling based on responsive flag
        if (!this.config.responsive) {
            // Only set container dimensions for non-responsive mode
            this.container.style.width = `${this.config.width}px`;
            this.container.style.height = `${this.config.height}px`;
        }
        // For responsive mode, let the container naturally fit the canvas
        
        this.container.style.position = 'relative';
        this.container.style.overflow = 'hidden';
        this.container.style.margin = '0 auto';  // Center horizontally
        this.container.style.border = '1px solid red';  // TEMPORARY RED BORDER TO SEE CLIPPING
        // Removed display: inline-block to properly participate in flex layout
        
        // Log container dimensions and parent info AFTER all setup
        console.log(`[3D Engine] Container setup complete. Responsive: ${this.config.responsive}`);
        console.log(`[3D Engine] Container offsetWidth: ${this.container.offsetWidth}`);
        console.log(`[3D Engine] Container offsetHeight: ${this.container.offsetHeight}`);
        console.log(`[3D Engine] Canvas offsetWidth: ${this.renderer.domElement.offsetWidth}`);
        console.log(`[3D Engine] Canvas offsetHeight: ${this.renderer.domElement.offsetHeight}`);
        console.log(`[3D Engine] Parent offsetWidth: ${this.container.parentElement ? this.container.parentElement.offsetWidth : 'N/A'}`);
        if (typeof window !== 'undefined' && window.getComputedStyle) {
            const styles = window.getComputedStyle(this.container);
            console.log(`[3D Engine] Container computed styles:`);
            console.log(`[3D Engine]   - padding: ${styles.padding}`);
            console.log(`[3D Engine]   - margin: ${styles.margin}`);
            console.log(`[3D Engine]   - box-sizing: ${styles.boxSizing}`);
            console.log(`[3D Engine]   - min-width: ${styles.minWidth}`);
            console.log(`[3D Engine]   - min-height: ${styles.minHeight}`);
            console.log(`[3D Engine]   - width: ${styles.width}`);
            console.log(`[3D Engine]   - height: ${styles.height}`);
        }
    }
    
    setupCamera() {
        // For responsive mode, calculate the size the same way as in setupRenderer
        const size = this.config.responsive ? 
            Math.max(50, Math.min(500, window.innerWidth * 0.15)) :
            this.config.width;
            
        this.camera = new THREE.PerspectiveCamera(
            this.config.cameraFOV,
            1,  // Square aspect ratio for both modes
            0.1,
            100
        );
        this.camera.position.set(
            this.config.cameraPosition.x,
            this.config.cameraPosition.y,
            this.config.cameraPosition.z
        );
        this.camera.lookAt(0, 0, 0);
    }
    
    setupScene() {
        this.scene = new THREE.Scene();
        // Don't set background - keep it transparent
        
        // Setup environment for reflections
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        this.scene.environment = pmremGenerator.fromScene(this.createEnvironment()).texture;
    }
    
    setupLighting() {
        if (this.config.lighting === 'none') return;
        
        if (this.config.lighting === 'default') {
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
            
            // Back light for rim effect
            this.lights.back = new THREE.PointLight(0xffffff, 9.0);
            this.lights.back.position.set(0, 0, -2);
            this.scene.add(this.lights.back);
            
            // Rim light
            this.lights.rim = new THREE.DirectionalLight(0xffffff, 1.5);
            this.lights.rim.position.set(0, -2, -2);
            this.lights.rim.target.position.set(0, 0, 0);
            this.scene.add(this.lights.rim);
        }
    }
    
    createFogPlane() {
        // Get actual renderer dimensions in pixels
        const rendererSize = new THREE.Vector2();
        this.renderer.getSize(rendererSize);
        
        // Calculate fog plane size based on actual renderer pixels
        const fogPlaneZ = -1.5;
        const cameraToFogPlane = this.camera.position.z - fogPlaneZ;
        const vFOV = (this.config.cameraFOV * Math.PI) / 180; // Convert to radians
        
        // Calculate visible height at fog plane distance
        const visibleHeight = 2 * Math.tan(vFOV / 2) * cameraToFogPlane;
        
        // Calculate aspect ratio from actual renderer size
        const aspectRatio = rendererSize.x / rendererSize.y;
        const visibleWidth = visibleHeight * aspectRatio;
        
        // Create fog plane with 5% padding to ensure full coverage
        const fogPlaneWidth = visibleWidth * 1.05;
        const fogPlaneHeight = visibleHeight * 1.05;
        
        // Log fog plane creation details
        console.log(`[3D Engine] Creating fog plane based on renderer pixels`);
        console.log(`[3D Engine] Renderer size: ${rendererSize.x}x${rendererSize.y}px`);
        console.log(`[3D Engine] Aspect ratio: ${aspectRatio.toFixed(2)}`);
        console.log(`[3D Engine] Camera FOV: ${this.config.cameraFOV}°`);
        console.log(`[3D Engine] Camera position: z=${this.camera.position.z}`);
        console.log(`[3D Engine] Distance from camera to fog plane: ${cameraToFogPlane}`);
        console.log(`[3D Engine] Visible area at fog plane: ${visibleWidth.toFixed(2)} x ${visibleHeight.toFixed(2)} units`);
        console.log(`[3D Engine] Fog plane size (with 5% padding): ${fogPlaneWidth.toFixed(2)} x ${fogPlaneHeight.toFixed(2)} units`);
        console.log(`[3D Engine] Responsive mode: ${this.config.responsive}`);
        
        // Create fog plane geometry with calculated size
        const fogPlaneGeometry = new THREE.PlaneGeometry(fogPlaneWidth, fogPlaneHeight, 32, 32);
        
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
        this.fogPlane.position.set(0, 0, -1.5); // Between object and backlight
        this.scene.add(this.fogPlane);
        
        // Add debug border to fog plane
        const edges = new THREE.EdgesGeometry(fogPlaneGeometry);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 }); // Green debug border
        const lineSegments = new THREE.LineSegments(edges, lineMaterial);
        this.fogPlane.add(lineSegments);
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
    
    createTexture() {
        if (this.config.texture === 'none') return;
        
        if (this.config.texture === 'animated') {
            console.log('[3D Component Engine] Creating animated texture for geometry:', this.config.geometry);
            if (this.config.geometry === 'cylinder') {
                // For cylinders, create separate textures for sides and caps
                this.createCylinderTextures();
            } else if (this.config.geometry === 'tube') {
                // For tubes, create only side texture (no caps)
                console.log('[3D Component Engine] Calling createTubeTextures for tube geometry');
                this.createTubeTextures();
            } else if (this.config.geometry === 'cone') {
                // For cones, create sector texture for side and circular texture for base
                this.createConeTextures();
            } else {
                // For other geometries, use a single square texture
                const baseResolution = 512;
                
                this.textureCanvas = document.createElement('canvas');
                this.textureCanvas.width = baseResolution;
                this.textureCanvas.height = baseResolution;
                this.textureContext = this.textureCanvas.getContext('2d');
                
                this.texture = new THREE.CanvasTexture(this.textureCanvas);
                console.log('[3D Component Engine] Using square texture for geometry:', this.config.geometry);
            }
        } else if (this.config.texture === 'solid') {
            // Create solid color texture
            const canvas = document.createElement('canvas');
            canvas.width = 1;
            canvas.height = 1;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = `#${this.config.textureParams.solidColor.toString(16).padStart(6, '0')}`;
            ctx.fillRect(0, 0, 1, 1);
            
            this.texture = new THREE.CanvasTexture(canvas);
        }
    }
    
    createCylinderTextures() {
        const params = this.config.geometryParams;
        const baseResolution = 512;
        
        // Calculate cylinder dimensions
        const radius = (params.cylinderRadiusTop + params.cylinderRadiusBottom) / 2;
        const circumference = 2 * Math.PI * radius;
        const height = params.cylinderHeight;
        
        // SIDE TEXTURE: Rectangular to match unwrapped cylinder
        const sideAspectRatio = circumference / height;
        const sideWidth = Math.round(baseResolution * sideAspectRatio);
        const sideHeight = baseResolution;
        
        this.sideCanvas = document.createElement('canvas');
        this.sideCanvas.width = sideWidth;
        this.sideCanvas.height = sideHeight;
        this.sideContext = this.sideCanvas.getContext('2d');
        
        this.sideTexture = new THREE.CanvasTexture(this.sideCanvas);
        
        // CAP TEXTURE: Square for circular caps
        this.capCanvas = document.createElement('canvas');
        this.capCanvas.width = baseResolution;
        this.capCanvas.height = baseResolution;
        this.capContext = this.capCanvas.getContext('2d');
        
        this.capTexture = new THREE.CanvasTexture(this.capCanvas);
        
        console.log('[3D Component Engine] Cylinder textures created:');
        console.log(`  Side texture: ${sideWidth}x${sideHeight}px (aspect ${sideAspectRatio.toFixed(2)}:1)`);
        console.log(`  Cap texture: ${baseResolution}x${baseResolution}px (square)`);
        
        // Store references for update method
        this.textureCanvas = this.sideCanvas; // Default to side for compatibility
        this.textureContext = this.sideContext;
    }

    createTubeTextures() {
        const params = this.config.geometryParams;
        const baseResolution = 512;
        
        // Calculate tube dimensions (same logic as cylinder side texture)
        const radius = params.tubeRadius || 0.25;
        const circumference = 2 * Math.PI * radius;
        const length = params.tubeLength || 2.0;
        
        // SIDE TEXTURE: Rectangular to match unwrapped tube (only texture needed)
        const sideAspectRatio = circumference / length;
        const sideWidth = Math.round(baseResolution * sideAspectRatio);
        const sideHeight = baseResolution;
        
        this.textureCanvas = document.createElement('canvas');
        this.textureCanvas.width = sideWidth;
        this.textureCanvas.height = sideHeight;
        this.textureContext = this.textureCanvas.getContext('2d');
        
        this.texture = new THREE.CanvasTexture(this.textureCanvas);
        
        console.log('[3D Component Engine] Tube texture created:');
        console.log(`  Side texture: ${sideWidth}x${sideHeight}px (aspect ${sideAspectRatio.toFixed(2)}:1)`);
        console.log('  No caps - tube is open-ended');
    }

    createConeTextures() {
        const params = this.config.geometryParams;
        const baseResolution = 512; // Standard canvas resolution like other geometries
        
        // Calculate cone dimensions
        const radius = params.coneRadius || 0.5;
        const height = params.coneHeight || 1.0;
        const slantHeight = Math.sqrt(height * height + radius * radius);
        
        // SIDE TEXTURE: Square canvas like other geometries
        this.sideCanvas = document.createElement('canvas');
        this.sideCanvas.width = baseResolution;
        this.sideCanvas.height = baseResolution;
        this.sideContext = this.sideCanvas.getContext('2d');
        
        this.sideTexture = new THREE.CanvasTexture(this.sideCanvas);
        
        // BASE TEXTURE: Square canvas like other geometries
        this.baseCanvas = document.createElement('canvas');
        this.baseCanvas.width = baseResolution;
        this.baseCanvas.height = baseResolution;
        this.baseContext = this.baseCanvas.getContext('2d');
        
        this.baseTexture = new THREE.CanvasTexture(this.baseCanvas);
        
        console.log('[3D Component Engine] Cone textures created (consistent with other geometries):');
        console.log(`  Side texture: ${baseResolution}x${baseResolution}px (square canvas)`);
        console.log(`  Base texture: ${baseResolution}x${baseResolution}px (square canvas)`);
        console.log(`  Cone dimensions: radius=${radius}, height=${height}, slantHeight=${slantHeight.toFixed(2)}`);
        
        // Store references for update method
        this.textureCanvas = this.sideCanvas; // Default to side for compatibility
        this.textureContext = this.sideContext;
    }

    createTorusTextures() {
        // TODO: Implement torus texture generation
        // Torus has complex UV mapping with major/minor radii considerations
        // Surface topology: donut shape with inner and outer curves
        console.log('[3D Component Engine] Torus texture generation - not yet implemented');
    }

    createSphereTextures() {
        // TODO: Implement sphere texture generation  
        // Spherical UV mapping: longitude/latitude grid system
        // Handle polar distortion and texture seams
        console.log('[3D Component Engine] Sphere texture generation - not yet implemented');
    }

    createCustomMeshTextures() {
        // TODO: Implement custom mesh texture generation
        // Analyze mesh topology and generate appropriate textures
        // Handle arbitrary geometry with adaptive texturing
        console.log('[3D Component Engine] Custom mesh texture generation - not yet implemented');
    }

    createParametricSurfaceTextures() {
        // TODO: Implement parametric surface texture generation
        // Handle mathematically defined complex surfaces
        // Generate textures based on surface parameters
        console.log('[3D Component Engine] Parametric surface texture generation - not yet implemented');
    }
    
    createGeometry() {
        let geometry;
        const params = this.config.geometryParams;
        
        switch (this.config.geometry) {
            case 'roundedBox':
                geometry = this.createRoundedBoxGeometry(
                    params.width,
                    params.height,
                    params.depth,
                    params.radius,
                    params.smoothness
                );
                break;
                
            case 'sphere':
                geometry = new THREE.SphereGeometry(
                    params.sphereRadius,
                    params.widthSegments,
                    params.heightSegments
                );
                break;
                
            case 'torus':
                geometry = new THREE.TorusGeometry(
                    params.torusRadius,
                    params.tubeRadius,
                    params.radialSegments,
                    params.tubularSegments
                );
                break;
                
            case 'cylinder':
                geometry = new THREE.CylinderGeometry(
                    params.cylinderRadiusTop,
                    params.cylinderRadiusBottom,
                    params.cylinderHeight,
                    params.cylinderRadialSegments
                );
                break;
                
            case 'cone':
                geometry = new THREE.ConeGeometry(
                    params.coneRadius || 0.5,
                    params.coneHeight || 1.0,
                    params.coneRadialSegments || 32
                );
                break;
                
            case 'tube':
                // Create a true tube (open-ended cylinder) with no caps
                geometry = new THREE.CylinderGeometry(
                    params.tubeRadius || 0.25,
                    params.tubeRadius || 0.25,
                    params.tubeLength || 2.0,
                    params.tubeRadialSegments || 32,
                    1,    // heightSegments
                    true  // openEnded - this makes it a tube instead of cylinder
                );
                break;
                
            default:
                console.warn(`[3D Component Engine] Unknown geometry type: ${this.config.geometry}`);
                geometry = new THREE.BoxGeometry(1, 1, 1);
        }
        
        // Apply subdivision if enabled
        if (this.config.enableSubdivision && this.config.geometry === 'roundedBox') {
            console.log('[3D Component Engine] Applying subdivision...');
            geometry = LoopSubdivision.modify(
                geometry,
                this.config.subdivisionIterations,
                this.config.subdivisionParams
            );
            console.log('[3D Component Engine] Subdivision complete, vertices:', geometry.attributes.position.count);
        }
        
        this.geometry = geometry;
    }
    
    createRoundedBoxGeometry(width, height, depth, radius, smoothness) {
        // Copy the RoundedBoxGeometry implementation from main.js
        class RoundedBoxGeometry extends THREE.BoxGeometry {
            constructor(width = 1, height = 1, depth = 1, radius = 0.1, widthSegments = 1, heightSegments = 1, depthSegments = 1) {
                const minSegments = Math.ceil(radius * 4 / Math.min(width, height, depth)) + 1;
                widthSegments = Math.max(minSegments, widthSegments);
                heightSegments = Math.max(minSegments, heightSegments);
                depthSegments = Math.max(minSegments, depthSegments);
                
                super(width, height, depth, widthSegments, heightSegments, depthSegments);
                
                radius = Math.min(radius, Math.min(width, height, depth) / 2);
                
                const positions = this.attributes.position;
                const normals = this.attributes.normal;
                
                const smoothVertex = (x, y, z) => {
                    const absX = Math.abs(x);
                    const absY = Math.abs(y);
                    const absZ = Math.abs(z);
                    
                    const halfWidth = width / 2;
                    const halfHeight = height / 2;
                    const halfDepth = depth / 2;
                    
                    const nearCornerX = absX > halfWidth - radius;
                    const nearCornerY = absY > halfHeight - radius;
                    const nearCornerZ = absZ > halfDepth - radius;
                    
                    if (nearCornerX && nearCornerY && nearCornerZ) {
                        const cornerX = (halfWidth - radius) * Math.sign(x);
                        const cornerY = (halfHeight - radius) * Math.sign(y);
                        const cornerZ = (halfDepth - radius) * Math.sign(z);
                        
                        const dx = x - cornerX;
                        const dy = y - cornerY;
                        const dz = z - cornerZ;
                        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                        
                        if (distance > 0) {
                            const scale = radius / distance;
                            return {
                                x: cornerX + dx * scale,
                                y: cornerY + dy * scale,
                                z: cornerZ + dz * scale,
                                nx: dx / distance,
                                ny: dy / distance,
                                nz: dz / distance
                            };
                        }
                    } else if (nearCornerX && nearCornerY) {
                        const cornerX = (halfWidth - radius) * Math.sign(x);
                        const cornerY = (halfHeight - radius) * Math.sign(y);
                        
                        const dx = x - cornerX;
                        const dy = y - cornerY;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        if (distance > 0) {
                            const scale = radius / distance;
                            return {
                                x: cornerX + dx * scale,
                                y: cornerY + dy * scale,
                                z: z,
                                nx: dx / distance,
                                ny: dy / distance,
                                nz: 0
                            };
                        }
                    } else if (nearCornerX && nearCornerZ) {
                        const cornerX = (halfWidth - radius) * Math.sign(x);
                        const cornerZ = (halfDepth - radius) * Math.sign(z);
                        
                        const dx = x - cornerX;
                        const dz = z - cornerZ;
                        const distance = Math.sqrt(dx * dx + dz * dz);
                        
                        if (distance > 0) {
                            const scale = radius / distance;
                            return {
                                x: cornerX + dx * scale,
                                y: y,
                                z: cornerZ + dz * scale,
                                nx: dx / distance,
                                ny: 0,
                                nz: dz / distance
                            };
                        }
                    } else if (nearCornerY && nearCornerZ) {
                        const cornerY = (halfHeight - radius) * Math.sign(y);
                        const cornerZ = (halfDepth - radius) * Math.sign(z);
                        
                        const dy = y - cornerY;
                        const dz = z - cornerZ;
                        const distance = Math.sqrt(dy * dy + dz * dz);
                        
                        if (distance > 0) {
                            const scale = radius / distance;
                            return {
                                x: x,
                                y: cornerY + dy * scale,
                                z: cornerZ + dz * scale,
                                nx: 0,
                                ny: dy / distance,
                                nz: dz / distance
                            };
                        }
                    }
                    
                    return { x, y, z, nx: 0, ny: 0, nz: 0 };
                };
                
                for (let i = 0; i < positions.count; i++) {
                    const x = positions.getX(i);
                    const y = positions.getY(i);
                    const z = positions.getZ(i);
                    
                    const smoothed = smoothVertex(x, y, z);
                    
                    positions.setXYZ(i, smoothed.x, smoothed.y, smoothed.z);
                    
                    if (smoothed.nx !== 0 || smoothed.ny !== 0 || smoothed.nz !== 0) {
                        normals.setXYZ(i, smoothed.nx, smoothed.ny, smoothed.nz);
                    }
                }
                
                positions.needsUpdate = true;
                normals.needsUpdate = true;
            }
        }
        
        return new RoundedBoxGeometry(width, height, depth, radius, smoothness, smoothness, smoothness);
    }
    
    createMaterial() {
        if (this.config.geometry === 'cylinder' && this.config.texture === 'animated') {
            // For cylinders with animated textures, create multiple materials
            const materialConfig = Object.assign({}, this.config.materialParams);
            
            // Create materials array for cylinder (side, top cap, bottom cap)
            const sideMaterialConfig = Object.assign({}, materialConfig, { 
                map: this.sideTexture,
                side: THREE.DoubleSide // Double-sided rendering
            });
            const capMaterialConfig = Object.assign({}, materialConfig, { 
                map: this.capTexture,
                side: THREE.DoubleSide // Double-sided rendering
            });
            
            let sideMaterial, capMaterial;
            
            switch (this.config.material) {
                case 'physical':
                    sideMaterial = new THREE.MeshPhysicalMaterial(sideMaterialConfig);
                    capMaterial = new THREE.MeshPhysicalMaterial(capMaterialConfig);
                    break;
                    
                case 'standard':
                    sideMaterial = new THREE.MeshStandardMaterial(sideMaterialConfig);
                    capMaterial = new THREE.MeshStandardMaterial(capMaterialConfig);
                    break;
                    
                case 'basic':
                    sideMaterial = new THREE.MeshBasicMaterial(sideMaterialConfig);
                    capMaterial = new THREE.MeshBasicMaterial(capMaterialConfig);
                    break;
                    
                default:
                    sideMaterial = new THREE.MeshPhysicalMaterial(sideMaterialConfig);
                    capMaterial = new THREE.MeshPhysicalMaterial(capMaterialConfig);
            }
            
            // Array of materials: [side, top cap, bottom cap]
            this.material = [sideMaterial, capMaterial, capMaterial];
            
            console.log('[3D Component Engine] Created multi-material array for cylinder');
        } else if (this.config.geometry === 'cone' && this.config.texture === 'animated') {
            // For cones with animated textures, create multiple materials (side, base)
            const materialConfig = Object.assign({}, this.config.materialParams);
            
            // Create materials array for cone (side, base)
            const sideMaterialConfig = Object.assign({}, materialConfig, { 
                map: this.sideTexture,
                side: THREE.DoubleSide // Double-sided rendering
            });
            const baseMaterialConfig = Object.assign({}, materialConfig, { 
                map: this.baseTexture,
                side: THREE.DoubleSide // Double-sided rendering
            });
            
            let sideMaterial, baseMaterial;
            
            switch (this.config.material) {
                case 'physical':
                    sideMaterial = new THREE.MeshPhysicalMaterial(sideMaterialConfig);
                    baseMaterial = new THREE.MeshPhysicalMaterial(baseMaterialConfig);
                    break;
                    
                case 'standard':
                    sideMaterial = new THREE.MeshStandardMaterial(sideMaterialConfig);
                    baseMaterial = new THREE.MeshStandardMaterial(baseMaterialConfig);
                    break;
                    
                case 'basic':
                    sideMaterial = new THREE.MeshBasicMaterial(sideMaterialConfig);
                    baseMaterial = new THREE.MeshBasicMaterial(baseMaterialConfig);
                    break;
                    
                default:
                    sideMaterial = new THREE.MeshPhysicalMaterial(sideMaterialConfig);
                    baseMaterial = new THREE.MeshPhysicalMaterial(baseMaterialConfig);
            }
            
            // Array of materials: [side, base]
            this.material = [sideMaterial, baseMaterial];
            
            console.log('[3D Component Engine] Created multi-material array for cone');
        } else if (this.config.geometry === 'tube' && this.config.texture === 'animated') {
            // For tubes with animated textures, create single material with side texture only
            const materialConfig = Object.assign({}, this.config.materialParams);
            materialConfig.map = this.texture; // Tube uses single texture (side texture)
            materialConfig.side = THREE.DoubleSide; // Render texture on both inside and outside
            
            switch (this.config.material) {
                case 'physical':
                    this.material = new THREE.MeshPhysicalMaterial(materialConfig);
                    break;
                    
                case 'standard':
                    this.material = new THREE.MeshStandardMaterial(materialConfig);
                    break;
                    
                case 'basic':
                    this.material = new THREE.MeshBasicMaterial(materialConfig);
                    break;
                    
                default:
                    this.material = new THREE.MeshPhysicalMaterial(materialConfig);
            }
            
            console.log('[3D Component Engine] Created single double-sided material for tube (no caps)');
        } else {
            // Single material for other geometries
            const materialConfig = Object.assign({}, this.config.materialParams);
            materialConfig.side = THREE.DoubleSide; // Double-sided rendering for all geometries
            
            if (this.texture) {
                materialConfig.map = this.texture;
            }
            
            switch (this.config.material) {
                case 'physical':
                    this.material = new THREE.MeshPhysicalMaterial(materialConfig);
                    break;
                    
                case 'standard':
                    this.material = new THREE.MeshStandardMaterial(materialConfig);
                    break;
                    
                case 'basic':
                    this.material = new THREE.MeshBasicMaterial(materialConfig);
                    break;
                    
                default:
                    this.material = new THREE.MeshPhysicalMaterial(materialConfig);
            }
        }
    }
    
    createMesh() {
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        
        // Set initial rotation for isometric-style view
        this.mesh.rotation.x = 0.349; // Tilt down ~20 degrees
        this.mesh.rotation.y = -0.55; // Turn right ~31 degrees
        
        this.scene.add(this.mesh);
        
        // Resize container to fit content
        this.resizeContainerToFitContent();
    }
    
    resizeContainerToFitContent() {
        // Skip resizing for responsive components - they manage their own size
        if (this.config.responsive) {
            // For responsive mode, just store the initial calculated size
            const size = Math.max(50, Math.min(500, window.innerWidth * 0.15));
            this.initialWidth = size;
            this.initialHeight = size;
            console.log(`[3D Engine] Responsive component - skipping resizeContainerToFitContent, using ${size}px`);
            return;
        }
        
        // Original logic only for fixed components
        // Create temporary offscreen renderer for measurement
        const tempRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        tempRenderer.setSize(1000, 1000); // Large size to avoid any clipping
        
        // Create temporary camera with same settings but square aspect
        const tempCamera = new THREE.PerspectiveCamera(
            this.config.cameraFOV,
            1, // Square aspect ratio for consistent measurement
            0.1,
            100
        );
        tempCamera.position.copy(this.camera.position);
        tempCamera.lookAt(0, 0, 0);
        
        // Render once to ensure geometry is properly calculated
        tempRenderer.render(this.scene, tempCamera);
        
        // Calculate bounding box of the entire scene (includes fog plane)
        const box = new THREE.Box3().setFromObject(this.scene);
        const size = box.getSize(new THREE.Vector3());
        
        // Project 3D size to screen pixels using the temporary setup
        const distance = tempCamera.position.z;
        const vFov = (tempCamera.fov * Math.PI) / 180;
        const visibleHeight = 2 * Math.tan(vFov / 2) * distance;
        
        // Calculate pixel dimensions - no extra padding as fog plane provides it
        const scale = 1000 / visibleHeight; // Based on temp renderer size
        const width = Math.ceil(size.x * scale);
        const height = Math.ceil(size.y * scale);
        
        // Dispose of temporary renderer
        tempRenderer.dispose();
        
        // Now update the real container and renderer with calculated size
        this.config.width = width;
        this.config.height = height;
        // Removed - let container naturally fit the canvas
        // this.container.style.width = `${width}px`;
        // this.container.style.height = `${height}px`;
        
        // Store initial dimensions for constraint calculations
        this.initialWidth = width;
        this.initialHeight = height;
        
        // Update the real renderer
        this.renderer.setSize(width, height);
        
        // Update camera aspect ratio for the real renderer
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        // Update fog plane size to match new renderer size
        this.updateFogPlaneSize();
    }
    
    setupInteraction() {
        this.renderer.domElement.style.cursor = 'grab';
        
        // Mouse/pointer events
        this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
        this.renderer.domElement.addEventListener('pointermove', this.onPointerMove);
        this.renderer.domElement.addEventListener('pointerup', this.onPointerUp);
        this.renderer.domElement.addEventListener('pointerleave', this.onPointerUp);
        
        // Touch events for pinch-to-zoom
        this.renderer.domElement.addEventListener('touchstart', this.onTouchStart.bind(this));
        this.renderer.domElement.addEventListener('touchmove', this.onTouchMove.bind(this));
        this.renderer.domElement.addEventListener('touchend', this.onTouchEnd.bind(this));
        
        // WebKit gesture events for Safari trackpad support
        // Only add WebKit gesture events if they're supported
        if ('GestureEvent' in window) {
            console.log('[3D Component Engine] GestureEvent is supported - adding listeners');
            this.renderer.domElement.addEventListener('gesturestart', this.onGestureStart.bind(this));
            this.renderer.domElement.addEventListener('gesturechange', this.onGestureChange.bind(this));
            this.renderer.domElement.addEventListener('gestureend', this.onGestureEnd.bind(this));
        } else {
            console.log('[3D Component Engine] GestureEvent is NOT supported in this browser');
        }
        
        // Wheel event for trackpad pinch
        this.renderer.domElement.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
        
        // Initialize touch tracking
        this.touches = [];
        this.lastPinchDistance = null;
        this.lastTouchAngle = null;  // For rotation tracking
        this.baseScale = 1;
        
        // WebKit gesture tracking
        this.gestureRotation = 0;
        this.gestureScale = 1;
        
        // Initialize raycaster for sticky point rotation
        this.raycaster = new THREE.Raycaster();
        this.grabbedPoint = null;
        this.grabbedLocalPoint = null;
        
        // Track actual rotation for proper momentum
        this.previousQuaternion = null;
        this.rotationHistory = [];
        this.maxHistoryLength = 5;
        
        // Wheel gesture timeout
        this.wheelGestureTimeout = null;
        
        // Add viewport resize listener for responsive mode
        if (this.config.responsive) {
            this.resizeHandler = () => this.updateResponsiveSize();
            window.addEventListener('resize', this.resizeHandler);
        }
    }
    
    // Gesture state management
    detectGestureType(dx, dy, currentDistance, currentAngle) {
        const now = Date.now();
        const timeSinceLastUpdate = now - this.gestureState.lastUpdateTime;
        
        // If we're in cooldown period, maintain current gesture type
        if (now - this.gestureState.startTime < this.gestureState.transitionCooldown) {
            return this.gestureState.type;
        }
        
        // Calculate gesture metrics
        let distanceChange = 0;
        let angleChange = 0;
        let hasSignificantPinch = false;
        let hasSignificantTwist = false;
        
        // Check for pinch
        if (this.gestureState.pinchDistance !== null) {
            distanceChange = Math.abs(currentDistance - this.gestureState.pinchDistance);
            hasSignificantPinch = distanceChange > currentDistance * 0.02; // 2% threshold
        }
        
        // Check for twist
        if (this.gestureState.twistAngle !== null) {
            angleChange = Math.abs(currentAngle - this.gestureState.twistAngle);
            // Handle angle wrap-around
            if (angleChange > Math.PI) {
                angleChange = 2 * Math.PI - angleChange;
            }
            hasSignificantTwist = angleChange > 0.02; // radians threshold
        }
        
        // Determine gesture type based on which is dominant
        if (hasSignificantPinch && !hasSignificantTwist) {
            return 'pinch';
        } else if (hasSignificantTwist && !hasSignificantPinch) {
            return 'twist';
        } else if (hasSignificantPinch && hasSignificantTwist) {
            // Both are significant - choose based on relative magnitude
            const pinchRatio = distanceChange / currentDistance;
            const twistRatio = angleChange / Math.PI;
            return pinchRatio > twistRatio ? 'pinch' : 'twist';
        } else {
            // No significant pinch or twist - it's a swipe
            return 'swipe';
        }
    }
    
    transitionGesture(newType) {
        if (this.gestureState.type !== newType) {
            console.log(`[3D Component] Gesture transition: ${this.gestureState.type} -> ${newType}`);
            this.gestureState.type = newType;
            this.gestureState.startTime = Date.now();
            
            // Clear state for previous gesture type
            if (newType !== 'swipe') {
                this.gestureState.swipeVelocity = { x: 0, y: 0 };
            }
            if (newType !== 'twist') {
                this.gestureState.twistVelocity = 0;
            }
            if (newType !== 'pinch') {
                this.gestureState.pinchVelocity = 0;
            }
        }
    }
    
    onPointerDown(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.previousMousePosition = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
        
        // Convert to normalized device coordinates (-1 to +1)
        const mouse = new THREE.Vector2();
        mouse.x = (this.previousMousePosition.x / rect.width) * 2 - 1;
        mouse.y = -(this.previousMousePosition.y / rect.height) * 2 + 1;
        
        // First check if we're clicking within the fog plane bounds
        this.raycaster.setFromCamera(mouse, this.camera);
        const fogIntersects = this.raycaster.intersectObject(this.fogPlane);
        
        // Only allow drag if clicking within fog plane (green border)
        if (fogIntersects.length === 0) {
            // Click is outside fog plane, ignore drag
            return;
        }
        
        // If we're here, click is within fog plane, proceed with drag
        this.isDragging = true;
        
        // Raycast to find the initial grabbed point on the object
        const intersects = this.raycaster.intersectObject(this.mesh);
        
        if (intersects.length > 0) {
            // Store the grabbed point in local space
            this.grabbedPoint = intersects[0].point.clone();
            const localPoint = this.grabbedPoint.clone();
            this.mesh.worldToLocal(localPoint);
            this.grabbedLocalPoint = localPoint;
        } else {
            // If not clicking on object, create a virtual grabbed point
            // Project a point on the object closest to the ray
            const center = new THREE.Vector3();
            this.mesh.getWorldPosition(center);
            const ray = this.raycaster.ray;
            
            // Find closest point on ray to object center
            const toCenter = center.clone().sub(ray.origin);
            const closestPoint = ray.origin.clone().add(
                ray.direction.clone().multiplyScalar(toCenter.dot(ray.direction))
            );
            
            // Use the direction from center to closest point to find a point on object surface
            const direction = closestPoint.clone().sub(center).normalize();
            const radius = this.mesh.geometry.boundingSphere.radius * this.mesh.scale.x;
            this.grabbedPoint = center.clone().add(direction.clone().multiplyScalar(radius));
            
            const localPoint = this.grabbedPoint.clone();
            this.mesh.worldToLocal(localPoint);
            this.grabbedLocalPoint = localPoint;
        }
        
        this.rotationVelocity = { x: 0, y: 0 };
        this.autoRotationTime = 0;
        this.renderer.domElement.style.cursor = 'grabbing';
        
        // Initialize rotation tracking
        this.previousQuaternion = this.mesh.quaternion.clone();
        this.rotationHistory = [];
    }
    
    onPointerMove(event) {
        if (!this.isDragging || !this.grabbedLocalPoint) return;
        
        const rect = this.renderer.domElement.getBoundingClientRect();
        const currentMousePosition = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
        
        // Check if we have axle-based rotation restriction
        if (this.config.restrictRotationAxis === 'x') {
            // Axle-based rotation - drum can only spin around X-axis
            const deltaY = currentMousePosition.y - this.previousMousePosition.y;
            const rotationAngle = deltaY * 0.01; // Sensitivity factor
            
            // Rotate ONLY around the local X-axis (the "axle")
            this.mesh.rotateX(rotationAngle);
            
            // Track velocity for momentum (only X component)
            this.rotationVelocity.x = rotationAngle;
            this.rotationVelocity.y = 0;
            
            this.previousMousePosition = currentMousePosition;
            return; // Skip the complex sticky rotation
        }
        
        // Original sticky rotation for free rotation
        // Store the quaternion before rotation
        const beforeRotation = this.mesh.quaternion.clone();
        
        // Convert to normalized device coordinates
        const mouse = new THREE.Vector2();
        mouse.x = (currentMousePosition.x / rect.width) * 2 - 1;
        mouse.y = -(currentMousePosition.y / rect.height) * 2 + 1;
        
        // Apply sticky point rotation
        this.applyStickyRotation(mouse);
        
        // Track actual rotation that occurred
        const rotationDelta = new THREE.Quaternion();
        rotationDelta.multiplyQuaternions(this.mesh.quaternion, beforeRotation.conjugate());
        
        this.rotationHistory.push({
            quaternion: rotationDelta,
            time: Date.now()
        });
        
        if (this.rotationHistory.length > this.maxHistoryLength) {
            this.rotationHistory.shift();
        }
        
        // Calculate velocity from actual rotation
        this.calculateVelocityFromRotation();
        
        this.previousMousePosition = currentMousePosition;
    }
    
    applyStickyRotation(mouseNDC) {
        // Get the current world position of the grabbed point
        const currentWorldPoint = this.grabbedLocalPoint.clone();
        this.mesh.localToWorld(currentWorldPoint);
        
        // Create a ray from the camera through the mouse position
        this.raycaster.setFromCamera(mouseNDC, this.camera);
        const ray = this.raycaster.ray;
        
        // Get the center of the object in world space
        const center = new THREE.Vector3();
        this.mesh.getWorldPosition(center);
        
        // Calculate vectors from center to current grabbed point and from center to camera
        const centerToGrabbed = currentWorldPoint.clone().sub(center);
        const centerToCamera = this.camera.position.clone().sub(center);
        
        // Find the plane that contains the center and is perpendicular to the camera direction
        // This ensures rotation happens in a way that's visible to the camera
        const cameraDirection = center.clone().sub(this.camera.position).normalize();
        
        // Project the grabbed point onto a sphere centered at the object's center
        // This ensures we're always rotating around the center
        const radius = centerToGrabbed.length();
        
        // Find where the mouse ray intersects with the sphere of rotation
        // This is a ray-sphere intersection problem
        const rayOriginToCenter = center.clone().sub(ray.origin);
        const tca = rayOriginToCenter.dot(ray.direction);
        const d2 = rayOriginToCenter.lengthSq() - tca * tca;
        const radius2 = radius * radius;
        
        if (d2 > radius2) {
            // Ray misses the sphere, find the closest point on the sphere to the ray
            const closestPointOnRay = ray.origin.clone().add(ray.direction.clone().multiplyScalar(tca));
            const directionToSphere = closestPointOnRay.clone().sub(center).normalize();
            const targetPoint = center.clone().add(directionToSphere.multiplyScalar(radius));
            
            // Calculate rotation from current to target
            const currentDirection = centerToGrabbed.normalize();
            const targetDirection = targetPoint.clone().sub(center).normalize();
            
            // The rotation axis must pass through the center
            const rotationAxis = currentDirection.clone().cross(targetDirection);
            const rotationAngle = currentDirection.angleTo(targetDirection);
            
            if (rotationAxis.length() > 0.001 && rotationAngle > 0.001) {
                rotationAxis.normalize();
                const rotationQuaternion = new THREE.Quaternion();
                rotationQuaternion.setFromAxisAngle(rotationAxis, rotationAngle);
                this.mesh.quaternion.multiplyQuaternions(rotationQuaternion, this.mesh.quaternion);
            }
        } else {
            // Ray intersects the sphere
            const thc = Math.sqrt(radius2 - d2);
            const t0 = tca - thc;
            const t1 = tca + thc;
            
            // Use the closest intersection point
            const t = t0 > 0 ? t0 : t1;
            if (t > 0) {
                const targetPoint = ray.origin.clone().add(ray.direction.clone().multiplyScalar(t));
                
                // Calculate rotation from current to target
                const currentDirection = centerToGrabbed.normalize();
                const targetDirection = targetPoint.clone().sub(center).normalize();
                
                // The rotation axis must pass through the center
                const rotationAxis = currentDirection.clone().cross(targetDirection);
                const rotationAngle = currentDirection.angleTo(targetDirection);
                
                if (rotationAxis.length() > 0.001 && rotationAngle > 0.001) {
                    rotationAxis.normalize();
                    const rotationQuaternion = new THREE.Quaternion();
                    rotationQuaternion.setFromAxisAngle(rotationAxis, rotationAngle);
                    this.mesh.quaternion.multiplyQuaternions(rotationQuaternion, this.mesh.quaternion);
                }
            }
        }
    }
    
    calculateVelocityFromRotation() {
        if (this.rotationHistory.length < 2) {
            this.rotationVelocity = { x: 0, y: 0 };
            return;
        }
        
        // Get recent rotation history
        const recent = this.rotationHistory.slice(-3);
        if (recent.length < 2) return;
        
        // Calculate time delta
        const deltaTime = (recent[recent.length - 1].time - recent[0].time) / 1000;
        if (deltaTime <= 0) {
            this.rotationVelocity = { x: 0, y: 0 };
            return;
        }
        
        // Accumulate rotations over the time period
        let totalRotation = new THREE.Quaternion();
        for (let i = 0; i < recent.length; i++) {
            totalRotation.multiply(recent[i].quaternion);
        }
        
        // Convert quaternion to axis-angle
        const axis = new THREE.Vector3();
        let angle = 0;
        
        // Handle identity quaternion (no rotation)
        if (totalRotation.w > 0.9999) {
            this.rotationVelocity = { x: 0, y: 0 };
            return;
        }
        
        // Extract axis and angle
        angle = 2 * Math.acos(totalRotation.w);
        const s = Math.sqrt(1 - totalRotation.w * totalRotation.w);
        if (s < 0.001) {
            axis.set(totalRotation.x, totalRotation.y, totalRotation.z);
        } else {
            axis.set(totalRotation.x / s, totalRotation.y / s, totalRotation.z / s);
        }
        
        // Ensure angle is in correct range
        if (angle > Math.PI) {
            angle = 2 * Math.PI - angle;
            axis.multiplyScalar(-1);
        }
        
        // Only apply momentum if there was significant rotation
        const minRotation = 0.01; // radians
        if (Math.abs(angle) > minRotation) {
            // Project rotation onto world axes for momentum
            // This ensures momentum continues in the same visual direction
            const rotationPerSecond = angle / deltaTime;
            
            // Decompose into Y (horizontal) and X (vertical) components
            // with realistic scaling for air resistance
            const scale = 0.5; // Increased for more realistic momentum transfer
            this.rotationVelocity.y = axis.y * rotationPerSecond * scale;
            this.rotationVelocity.x = axis.x * rotationPerSecond * scale;
            
            // Cap velocities
            const maxVel = 0.02;
            this.rotationVelocity.x = Math.max(-maxVel, Math.min(maxVel, this.rotationVelocity.x));
            this.rotationVelocity.y = Math.max(-maxVel, Math.min(maxVel, this.rotationVelocity.y));
        } else {
            this.rotationVelocity = { x: 0, y: 0 };
        }
    }
    
    onPointerUp() {
        this.isDragging = false;
        this.renderer.domElement.style.cursor = 'grab';
        this.grabbedPoint = null;
        this.grabbedLocalPoint = null;
    }
    
    onTouchStart(event) {
        // Prevent default to avoid scrolling
        event.preventDefault();
        
        this.touches = Array.from(event.touches);
        
        if (this.touches.length === 1) {
            // Single touch - could be drag for momentum
            // Let pointer events handle this
            this.gestureState.type = 'drag';
        } else if (this.touches.length === 2) {
            // Two-finger touch - controlled gesture, no momentum
            // Set gesture flag to prevent momentum during touch
            this.isGesturing = true;
            
            // Initialize pinch distance
            const dx = this.touches[0].clientX - this.touches[1].clientX;
            const dy = this.touches[0].clientY - this.touches[1].clientY;
            this.lastPinchDistance = Math.sqrt(dx * dx + dy * dy);
            
            // Initialize rotation angle
            this.lastTouchAngle = Math.atan2(dy, dx);
            
            // Initialize gesture state
            this.gestureState.pinchDistance = this.lastPinchDistance;
            this.gestureState.twistAngle = this.lastTouchAngle;
            this.gestureState.lastUpdateTime = Date.now();
            this.gestureState.type = 'none'; // Will be determined on first move
        }
    }
    
    onTouchMove(event) {
        event.preventDefault();
        
        this.touches = Array.from(event.touches);
        
        if (this.touches.length === 2) {
            // Calculate current vector between touches
            const dx = this.touches[0].clientX - this.touches[1].clientX;
            const dy = this.touches[0].clientY - this.touches[1].clientY;
            const currentPinchDistance = Math.sqrt(dx * dx + dy * dy);
            const currentAngle = Math.atan2(dy, dx);
            
            // Detect gesture type
            const detectedGesture = this.detectGestureType(dx, dy, currentPinchDistance, currentAngle);
            this.transitionGesture(detectedGesture);
            
            // PINCH ZOOM DISABLED - Container now fits content
            /*
            // Handle pinch-to-zoom
            if (this.gestureState.type === 'pinch' && this.lastPinchDistance) {
                // Calculate scale change
                const scaleDelta = currentPinchDistance / this.lastPinchDistance;
                
                // Only apply scale if it's significant (not a rotation gesture)
                const scaleThreshold = 0.02; // 2% change threshold
                if (Math.abs(scaleDelta - 1) > scaleThreshold) {
                    // Calculate new dimensions
                    const currentWidth = this.container.offsetWidth;
                    const currentHeight = this.container.offsetHeight;
                    const newWidth = currentWidth * scaleDelta;
                    const newHeight = currentHeight * scaleDelta;
                    
                    // Apply constraints
                    const minSize = this.initialWidth * 0.5;  // Half original size
                    const maxSize = this.initialWidth * 3;     // Triple original size
                    const clampedWidth = Math.max(minSize, Math.min(maxSize, newWidth));
                    const clampedHeight = Math.max(minSize, Math.min(maxSize, newHeight));
                    
                    // Update container size
                    this.container.style.width = `${clampedWidth}px`;
                    this.container.style.height = `${clampedHeight}px`;
                    
                    // Update Three.js renderer to match
                    this.renderer.setSize(clampedWidth, clampedHeight);
                    this.camera.aspect = clampedWidth / clampedHeight;
                    this.camera.updateProjectionMatrix();
                }
            }
            */
            
            // Handle rotation - NO MOMENTUM for controlled gestures
            if (this.gestureState.type === 'twist' && this.lastTouchAngle !== null) {
                // Calculate rotation change
                let rotationDelta = currentAngle - this.lastTouchAngle;
                
                // Handle angle wrap-around
                if (rotationDelta > Math.PI) {
                    rotationDelta -= 2 * Math.PI;
                } else if (rotationDelta < -Math.PI) {
                    rotationDelta += 2 * Math.PI;
                }
                
                // Apply rotation threshold to filter out noise
                const rotationThreshold = 0.02; // radians
                if (Math.abs(rotationDelta) > rotationThreshold) {
                    // Apply rotation around camera's forward axis (Z-axis in view space)
                    const cameraDirection = new THREE.Vector3();
                    this.camera.getWorldDirection(cameraDirection);
                    
                    // Create rotation quaternion
                    const quaternionZ = new THREE.Quaternion();
                    quaternionZ.setFromAxisAngle(cameraDirection, rotationDelta);
                    
                    // Apply rotation directly - this is controlled movement
                    this.mesh.quaternion.multiplyQuaternions(quaternionZ, this.mesh.quaternion);
                    
                    // Reset auto-rotation time
                    this.autoRotationTime = 0;
                    
                    // IMPORTANT: No velocity calculation for touch rotation
                    // Two-finger rotate is for precise control
                }
            }
            
            // Update state based on gesture type
            if (this.gestureState.type !== 'none') {
                this.lastPinchDistance = currentPinchDistance;
                this.lastTouchAngle = currentAngle;
                this.gestureState.pinchDistance = currentPinchDistance;
                this.gestureState.twistAngle = currentAngle;
                this.gestureState.lastUpdateTime = Date.now();
            }
        }
    }
    
    onTouchEnd(event) {
        this.touches = Array.from(event.touches);
        
        if (this.touches.length < 2) {
            this.lastPinchDistance = null;
            this.lastTouchAngle = null;
            // Clear gesture flag when touch ends
            this.isGesturing = false;
            
            // Reset gesture state
            this.gestureState.type = 'none';
            this.gestureState.startTime = 0;
            this.gestureState.pinchDistance = null;
            this.gestureState.twistAngle = null;
        }
    }
    
    // WebKit gesture events for Safari trackpad support
    onGestureStart(event) {
        event.preventDefault();
        
        // Set gesture flag to prevent momentum during gesture
        this.isGesturing = true;
        
        // Store initial rotation and scale
        this.gestureRotation = event.rotation || 0;
        this.gestureScale = event.scale || 1;
        console.log('[3D Component Engine] Gesture start - rotation:', this.gestureRotation, 'scale:', this.gestureScale);
    }
    
    onGestureChange(event) {
        event.preventDefault();
        
        // Handle rotation - NO MOMENTUM for controlled gestures
        if (event.rotation !== undefined) {
            const rotationDelta = (event.rotation - this.gestureRotation) * Math.PI / 180; // Convert degrees to radians
            console.log('[3D Component Engine] Gesture change - rotation:', event.rotation, 'delta (radians):', rotationDelta);
            
            // Apply rotation threshold
            const rotationThreshold = 0.01; // radians
            if (Math.abs(rotationDelta) > rotationThreshold) {
                // Apply rotation around camera's forward axis (Z-axis in view space)
                const cameraDirection = new THREE.Vector3();
                this.camera.getWorldDirection(cameraDirection);
                
                const quaternionZ = new THREE.Quaternion();
                quaternionZ.setFromAxisAngle(cameraDirection, rotationDelta);
                
                // Apply rotation directly - this is controlled movement
                this.mesh.quaternion.multiplyQuaternions(quaternionZ, this.mesh.quaternion);
                
                // Reset auto-rotation time
                this.autoRotationTime = 0;
                console.log('[3D Component Engine] Rotation applied!');
                
                // IMPORTANT: No velocity calculation for WebKit gestures
                // Trackpad gestures are for precise control
            }
            
            this.gestureRotation = event.rotation;
        }
        
        // PINCH ZOOM DISABLED - Container now fits content
        /*
        // Handle scale (pinch)
        if (event.scale !== undefined) {
            const scaleDelta = event.scale / this.gestureScale;
            
            // Apply scale threshold
            const scaleThreshold = 0.02;
            if (Math.abs(scaleDelta - 1) > scaleThreshold) {
                // Calculate new dimensions
                const currentWidth = this.container.offsetWidth;
                const currentHeight = this.container.offsetHeight;
                const newWidth = currentWidth * scaleDelta;
                const newHeight = currentHeight * scaleDelta;
                
                // Apply constraints
                const minSize = this.initialWidth * 0.25;
                const maxSize = this.initialWidth * 3;
                const clampedWidth = Math.max(minSize, Math.min(maxSize, newWidth));
                const clampedHeight = Math.max(minSize, Math.min(maxSize, newHeight));
                
                // Update container size
                this.container.style.width = `${clampedWidth}px`;
                this.container.style.height = `${clampedHeight}px`;
                
                // Update Three.js renderer
                this.renderer.setSize(clampedWidth, clampedHeight);
                this.camera.aspect = clampedWidth / clampedHeight;
                this.camera.updateProjectionMatrix();
            }
            
            this.gestureScale = event.scale;
        }
        */
    }
    
    onGestureEnd(event) {
        event.preventDefault();
        
        // Reset gesture tracking
        this.gestureRotation = 0;
        this.gestureScale = 1;
        
        // Clear gesture flag when gesture ends
        this.isGesturing = false;
    }
    
    // Helper method to check if cursor is within fog plane bounds
    isCursorInFogPlane(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const mousePosition = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
        
        // Convert to normalized device coordinates (-1 to +1)
        const mouse = new THREE.Vector2();
        mouse.x = (mousePosition.x / rect.width) * 2 - 1;
        mouse.y = -(mousePosition.y / rect.height) * 2 + 1;
        
        // Check if cursor intersects with fog plane
        this.raycaster.setFromCamera(mouse, this.camera);
        const fogIntersects = this.raycaster.intersectObject(this.fogPlane);
        
        return fogIntersects.length > 0;
    }
    
    onWheel(event) {
        // Check if cursor is within fog plane bounds
        if (!this.isCursorInFogPlane(event)) {
            // Cursor is outside fog plane, let the page scroll normally
            return;
        }
        
        // Only prevent default scrolling if we're going to handle the gesture
        event.preventDefault();
        
        // Mark as gesturing
        this.isGesturing = true;
        const now = Date.now();
        
        // PINCH ZOOM DISABLED - Container now fits content
        /*
        // Check if it's a pinch gesture (ctrl key or gesture)
        if (event.ctrlKey || event.metaKey) {
            // Transition to pinch gesture
            this.transitionGesture('pinch');
            
            // Pinch to zoom behavior - NO MOMENTUM
            // Calculate scale based on deltaY magnitude for smooth scaling
            const sensitivity = 0.0035;  // Middle ground between 0.002 and fixed 5%
            const scaleFactor = 1 - (event.deltaY * sensitivity);
            
            // Calculate new dimensions
            const currentWidth = this.container.offsetWidth;
            const currentHeight = this.container.offsetHeight;
            const newWidth = currentWidth * scaleFactor;
            const newHeight = currentHeight * scaleFactor;
            
            // Apply constraints
            const minSize = this.initialWidth * 0.5;  // Half original size
            const maxSize = this.initialWidth * 3;     // Triple original size
            
            // Also constrain by parent container width
            const parentWidth = this.container.parentElement ? this.container.parentElement.offsetWidth : window.innerWidth;
            const maxAllowedWidth = Math.min(maxSize, parentWidth);
            
            const clampedWidth = Math.max(minSize, Math.min(maxAllowedWidth, newWidth));
            const clampedHeight = Math.max(minSize, Math.min(maxSize, newHeight));
            
            // Update container size
            this.container.style.width = `${clampedWidth}px`;
            this.container.style.height = `${clampedHeight}px`;
            
            // Update Three.js renderer to match
            this.renderer.setSize(clampedWidth, clampedHeight);
            this.camera.aspect = clampedWidth / clampedHeight;
            this.camera.updateProjectionMatrix();
            
            // Update gesture state
            this.gestureState.lastUpdateTime = now;
        } else {
        */
        // Now all wheel events are treated as rotation
        if (true) {
            // Transition to swipe gesture
            this.transitionGesture('swipe');
            
            // Two-finger swipe for controlled rotation - NO MOMENTUM
            const sensitivity = 0.01; // Adjust for comfortable rotation speed
            
            // Horizontal swipe rotates around Y-axis (vertical axis through object)
            const quaternionY = new THREE.Quaternion();
            quaternionY.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -event.deltaX * sensitivity);
            
            // Vertical swipe rotates around screen's horizontal axis (X-axis in screen space)
            const cameraDirection = new THREE.Vector3();
            this.camera.getWorldDirection(cameraDirection);
            const screenXAxis = new THREE.Vector3();
            screenXAxis.crossVectors(this.camera.up, cameraDirection).normalize();
            
            const quaternionX = new THREE.Quaternion();
            quaternionX.setFromAxisAngle(screenXAxis, event.deltaY * sensitivity);
            
            // Apply rotations directly - this is controlled movement
            this.mesh.quaternion.multiplyQuaternions(quaternionY, this.mesh.quaternion);
            this.mesh.quaternion.multiplyQuaternions(quaternionX, this.mesh.quaternion);
            
            // Reset auto-rotation time since user is interacting
            this.autoRotationTime = 0;
            
            // IMPORTANT: No velocity calculation for wheel events
            // Wheel scrolling is for precise control, not throwing
            
            // Update gesture state
            this.gestureState.lastUpdateTime = now;
        }
        
        // Set a short timeout to clear gesture state
        if (this.wheelGestureTimeout) {
            clearTimeout(this.wheelGestureTimeout);
        }
        this.wheelGestureTimeout = setTimeout(() => {
            this.isGesturing = false;
            this.gestureState.type = 'none';
            this.gestureState.startTime = 0;
        }, 150);
    }
    
    updateAnimatedTexture(time) {
        if (this.config.geometry === 'cylinder' && this.sideContext && this.capContext) {
            // Update both side and cap textures for cylinders
            this.updateCylinderTextures(time);
        } else if (this.config.geometry === 'cone' && this.sideContext && this.baseContext) {
            // Update both side and base textures for cones
            this.updateConeTextures(time);
        } else if (this.textureContext) {
            // Update single texture for other geometries
            this.updateSingleTexture(time, this.textureContext, this.textureCanvas, this.texture);
        }
    }
    
    updateCylinderTextures(time) {
        const params = this.config.textureParams;
        
        // Update side texture with proper aspect ratio
        this.updateSingleTexture(time, this.sideContext, this.sideCanvas, this.sideTexture);
        
        // Update cap texture (square)
        this.updateSingleTexture(time, this.capContext, this.capCanvas, this.capTexture);
    }
    
    updateConeTextures(time) {
        // Update both side and base textures for cones
        this.updateSingleTexture(time, this.sideContext, this.sideCanvas, this.sideTexture);
        this.updateSingleTexture(time, this.baseContext, this.baseCanvas, this.baseTexture);
    }
    
    updateSingleTexture(time, ctx, canvas, texture) {
        const params = this.config.textureParams;
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        
        // Clear canvas
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // Calculate dot counts based on our standard density (~36 dots per square unit)
        // and the actual canvas dimensions
        const aspectRatio = canvasWidth / canvasHeight;
        const baseCount = params.tunnelCount || 6;
        
        let horizontalCount, verticalCount;
        if (aspectRatio > 1) {
            // Wider texture - scale horizontal count
            horizontalCount = Math.round(baseCount * aspectRatio);
            verticalCount = baseCount;
        } else if (aspectRatio < 1) {
            // Taller texture - scale vertical count
            horizontalCount = baseCount;
            verticalCount = Math.round(baseCount / aspectRatio);
        } else {
            // Square texture
            horizontalCount = baseCount;
            verticalCount = baseCount;
        }
        
        // Create tunnel effect with evenly spaced dots
        const phase = time * params.animationSpeed;
        
        for (let i = 0; i < horizontalCount; i++) {
            for (let j = 0; j < verticalCount; j++) {
                const x = (i + 0.5) * (canvasWidth / horizontalCount);
                const y = (j + 0.5) * (canvasHeight / verticalCount);
                
                const baseRadius = params.tunnelRadius;
                const pulseAmount = 10;
                const radius = baseRadius + Math.sin(phase + i * 0.5 + j * 0.5) * pulseAmount;
                
                const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
                
                const hue = (phase * 50 + i * 30 + j * 30) % 360;
                
                gradient.addColorStop(0, `hsl(${hue}, 100%, 95%)`);
                gradient.addColorStop(0.2, `hsl(${hue}, 90%, 85%)`);
                gradient.addColorStop(0.4, `hsl(${hue}, 80%, 65%)`);
                gradient.addColorStop(0.7, `hsl(${hue}, 70%, 45%)`);
                gradient.addColorStop(0.9, `hsl(${hue}, 60%, 25%)`);
                gradient.addColorStop(1, '#0a0a0a');
                
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fillStyle = gradient;
                ctx.fill();
                
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                const rimGradient = ctx.createRadialGradient(x, y, radius * 0.8, x, y, radius);
                rimGradient.addColorStop(0, 'transparent');
                rimGradient.addColorStop(0.8, 'transparent');
                rimGradient.addColorStop(1, `hsla(${hue}, 80%, 60%, 0.6)`);
                ctx.strokeStyle = rimGradient;
                ctx.lineWidth = 3;
                ctx.stroke();
            }
        }
        
        if (texture) {
            texture.needsUpdate = true;
        }
    }
    
    updateFogTexture(time) {
        if (!this.fogContext || !this.fogTexture) return;
        
        const ctx = this.fogContext;
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;
        
        // Clear canvas completely transparent
        ctx.clearRect(0, 0, width, height);
        
        // Create animated fog particles
        const particleCount = 5;
        const centerX = width / 2;
        const centerY = height / 2;
        const maxDistance = Math.min(width, height) * 0.35; // Max distance from center
        
        for (let i = 0; i < particleCount; i++) {
            const t = time * 0.001 + i * 1.5;
            
            // Radial movement around center
            const angle = t * 0.3 + i * (Math.PI * 2 / particleCount);
            const radiusVariation = Math.sin(t * 0.5 + i * 2) * 0.3 + 0.7; // 0.4 to 1.0
            const distance = radiusVariation * maxDistance;
            
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            const radius = (Math.sin(t * 0.5 + i * 2) * 0.5 + 0.5) * 60 + 60;
            
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, 'rgba(100, 150, 255, 0.3)');
            gradient.addColorStop(0.5, 'rgba(50, 100, 200, 0.1)');
            gradient.addColorStop(1, 'rgba(0, 50, 150, 0)');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        }
        
        this.fogTexture.needsUpdate = true;
    }
    
    animate(time) {
        if (!this.isInitialized) return;
        
        // Log viewport info on first frame only
        if (!this.viewportLogged) {
            const gl = this.renderer.getContext();
            console.log(`[3D Engine] First frame render - Responsive: ${this.config.responsive}`);
            console.log(`[3D Engine] WebGL viewport: ${gl.drawingBufferWidth} x ${gl.drawingBufferHeight}`);
            console.log(`[3D Engine] Renderer size: ${this.renderer.getSize(new THREE.Vector2()).x} x ${this.renderer.getSize(new THREE.Vector2()).y}`);
            console.log(`[3D Engine] Pixel ratio: ${this.renderer.getPixelRatio()}`);
            this.viewportLogged = true;
        }
        
        this.animationId = requestAnimationFrame(this.animate);
        
        // Update animated texture
        if (this.config.texture === 'animated') {
            this.updateAnimatedTexture(time);
        }
        
        // Update fog texture
        if (this.fogTexture) {
            this.updateFogTexture(time);
        }
        
        // Apply rotation only when not actively interacting
        if (!this.isDragging && !this.isGesturing && this.config.enableAnimation) {
            // Momentum rotation using quaternions
            if (Math.abs(this.rotationVelocity.x) > 0.0001 || Math.abs(this.rotationVelocity.y) > 0.0001) {
                // Apply momentum as quaternion rotations
                const quaternionY = new THREE.Quaternion();
                quaternionY.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.rotationVelocity.y);
                
                // Get the screen's horizontal axis (X-axis in screen space) for vertical rotation
                const cameraDirection = new THREE.Vector3();
                this.camera.getWorldDirection(cameraDirection);
                const screenXAxis = new THREE.Vector3();
                screenXAxis.crossVectors(this.camera.up, cameraDirection).normalize();
                
                const quaternionX = new THREE.Quaternion();
                quaternionX.setFromAxisAngle(screenXAxis, this.rotationVelocity.x);
                
                // Apply momentum rotations
                this.mesh.quaternion.multiplyQuaternions(quaternionY, this.mesh.quaternion);
                this.mesh.quaternion.multiplyQuaternions(quaternionX, this.mesh.quaternion);
                
                // Dampen velocity - very slow decay like a real object in air
                this.rotationVelocity.x *= 0.995;  // Only lose 0.5% per frame
                this.rotationVelocity.y *= 0.995;
            } else {
                // Auto rotation when momentum stops
                this.autoRotationTime += 0.01 * this.config.rotationSpeed;
                
                // Apply auto rotation using quaternions for consistency
                const autoQuaternionY = new THREE.Quaternion();
                autoQuaternionY.setFromAxisAngle(
                    new THREE.Vector3(0, 1, 0), 
                    this.autoRotationTime * 0.01 * this.config.rotationSpeed
                );
                
                const autoQuaternionX = new THREE.Quaternion();
                autoQuaternionX.setFromAxisAngle(
                    new THREE.Vector3(1, 0, 0),
                    Math.sin(this.autoRotationTime * 0.1) * 0.002 * this.config.rotationSpeed
                );
                
                this.mesh.quaternion.multiplyQuaternions(autoQuaternionY, this.mesh.quaternion);
                this.mesh.quaternion.multiplyQuaternions(autoQuaternionX, this.mesh.quaternion);
            }
        }
        
        this.renderer.render(this.scene, this.camera);
    }
    
    // Public methods for external control
    setRotationSpeed(speed) {
        this.config.rotationSpeed = speed;
        console.log('[3D Component Engine] Rotation speed set to:', speed);
    }
    
    updateResponsiveSize() {
        if (!this.config.responsive) return;
        
        const size = Math.max(50, Math.min(500, window.innerWidth * 0.15));  // clamp(50px, 15vw, 500px)
        
        this.renderer.setSize(size, size);
        this.camera.aspect = 1; // Square aspect
        this.camera.updateProjectionMatrix();
        
        // Update fog plane size to match new renderer size
        this.updateFogPlaneSize();
        
        // Let container naturally fit the canvas - don't set explicit size
    }
    
    updateFogPlaneSize() {
        if (!this.fogPlane) return;
        
        // Get actual renderer dimensions in pixels
        const rendererSize = new THREE.Vector2();
        this.renderer.getSize(rendererSize);
        
        // Calculate fog plane size based on actual renderer pixels
        const fogPlaneZ = -1.5;
        const cameraToFogPlane = this.camera.position.z - fogPlaneZ;
        const vFOV = (this.config.cameraFOV * Math.PI) / 180;
        
        // Calculate visible area at fog plane distance
        const visibleHeight = 2 * Math.tan(vFOV / 2) * cameraToFogPlane;
        const aspectRatio = rendererSize.x / rendererSize.y;
        const visibleWidth = visibleHeight * aspectRatio;
        
        // Update fog plane size with 5% padding
        const fogPlaneWidth = visibleWidth * 1.05;
        const fogPlaneHeight = visibleHeight * 1.05;
        
        // Update the geometry
        const newGeometry = new THREE.PlaneGeometry(fogPlaneWidth, fogPlaneHeight, 32, 32);
        this.fogPlane.geometry.dispose();
        this.fogPlane.geometry = newGeometry;
        
        // Update the edge geometry for the debug border
        if (this.fogPlane.children.length > 0) {
            const edges = new THREE.EdgesGeometry(newGeometry);
            const lineSegments = this.fogPlane.children[0];
            lineSegments.geometry.dispose();
            lineSegments.geometry = edges;
        }
        
        console.log(`[3D Engine] Updated fog plane size: ${fogPlaneWidth.toFixed(2)} x ${fogPlaneHeight.toFixed(2)} units`);
    }
    
    setLightPosition(lightName, axis, value) {
        if (this.lights[lightName]) {
            this.lights[lightName].position[axis] = value;
            console.log(`[3D Component Engine] ${lightName} light ${axis} set to:`, value);
        }
    }
    
    // Cleanup method
    dispose() {
        console.log('[3D Component Engine] Disposing...');
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        if (this.renderer) {
            this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
            this.renderer.domElement.removeEventListener('pointermove', this.onPointerMove);
            this.renderer.domElement.removeEventListener('pointerup', this.onPointerUp);
            this.renderer.domElement.removeEventListener('pointerleave', this.onPointerUp);
            
            // Remove touch event listeners
            this.renderer.domElement.removeEventListener('touchstart', this.onTouchStart);
            this.renderer.domElement.removeEventListener('touchmove', this.onTouchMove);
            this.renderer.domElement.removeEventListener('touchend', this.onTouchEnd);
            
            // Remove WebKit gesture event listeners
            if ('GestureEvent' in window) {
                this.renderer.domElement.removeEventListener('gesturestart', this.onGestureStart);
                this.renderer.domElement.removeEventListener('gesturechange', this.onGestureChange);
                this.renderer.domElement.removeEventListener('gestureend', this.onGestureEnd);
            }
            
            // Remove wheel event listener
            this.renderer.domElement.removeEventListener('wheel', this.onWheel);
            
            // Clean up resize listener
            if (this.config.responsive && this.resizeHandler) {
                window.removeEventListener('resize', this.resizeHandler);
            }
            
            this.renderer.dispose();
            this.container.removeChild(this.renderer.domElement);
        }
        
        // Clear timeouts
        if (this.wheelGestureTimeout) {
            clearTimeout(this.wheelGestureTimeout);
        }
        
        if (this.geometry) {
            this.geometry.dispose();
        }
        
        if (this.material) {
            this.material.dispose();
        }
        
        if (this.texture) {
            this.texture.dispose();
        }
        
        this.isInitialized = false;
    }
}