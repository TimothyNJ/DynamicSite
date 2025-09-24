/**
 * threed_component_engine.js
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
 * @class threed_component_engine
 */

import { LoopSubdivision } from 'three-subdivide';
import { DecalGeometry } from 'three/examples/jsm/geometries/DecalGeometry.js';

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
        
        // Yellow border DOM element for component bounds
        this.yellowBorderElement = null;
        
        // EDIT-PASS1: Add rotation group property
        this.rotationGroup = null;
        
        // Decal system for projected textures
        this.decals = [];
        this.decalMaterials = new Map();
        
        // TextGeometry mode specific properties
        this.numberMeshes = [];
        this.numberGroup = null;
        this.font = null;
        this.isLoading = false;
        
        // Fog plane dynamic update properties
        this.fogPlaneUpdateTimeout = null;
        
        // Bind methods
        this.animate = this.animate.bind(this);
        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);
        this.onGestureStart = this.onGestureStart.bind(this);
        this.onGestureChange = this.onGestureChange.bind(this);
        this.onGestureEnd = this.onGestureEnd.bind(this);
    }
    
    // Debounced fog plane update for performance
    debouncedUpdateFogPlane() {
        // Clear existing timeout
        if (this.fogPlaneUpdateTimeout) {
            clearTimeout(this.fogPlaneUpdateTimeout);
        }
        
        // Set new timeout
        this.fogPlaneUpdateTimeout = setTimeout(() => {
            this.updateFogPlaneSize();
            this.updateYellowBorderSize();  // Also update yellow border
            this.fogPlaneUpdateTimeout = null;
        }, this.config.fogPlaneUpdateDelay || 100);
    }
    
    mergeConfig(config) {
        return Object.assign({
            // Engine mode
            mode: 'standard', // 'standard' for normal geometry, 'textgeometry' for text drum
            
            // Fog plane configuration
            fogPlanePadding: 1.0,      // No padding by default (1.0 = no padding, 1.5 = 50% padding)
            fogPlaneEnabled: true,     // Allow disabling fog plane entirely
            fogPlaneUpdateDelay: 100,  // Debounce delay for performance (ms)
            fogPlaneZ: -1.5,           // Z position of fog plane (configurable per instance)
            
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
            cameraFOV: 50,
            
            // TextGeometry mode specific settings
            textDepth: 0.02,  // Depth of extruded text (0 for flat)
            addBlockingCylinder: false  // Add black cylinder behind text numbers
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
        
        // EDIT-PASS1: Create rotation group here (before fog plane)
        this.rotationGroup = new THREE.Group();
        this.scene.add(this.rotationGroup);
        
        this.createFogPlane();  // Always create fog plane for background
        this.createYellowBorder();  // Create yellow component border
        
        // Mode-specific initialization
        if (this.config.mode === 'textgeometry') {
            this.initTextGeometryMode();
        } else {
            // Standard mode
            this.createTexture();
            this.createGeometry();
            this.createMaterial();
            this.createMesh();
        }
        
        // Update yellow border after geometry is created
        this.updateYellowBorderSize();
        
        if (this.config.enableInteraction) {
            this.setupInteraction();
        }
        
        this.isInitialized = true;
        this.animate(0);
        
        // Force initial resize
        this.updateSize();
        
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
        console.log(`[3D Engine] Dynamic sizing enabled`);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setClearColor(0x000000, 0); // Fully transparent
        this.renderer.setPixelRatio(window.devicePixelRatio);
        
        // Calculate size based on viewport
        const size = Math.max(50, Math.min(500, window.innerWidth * 0.15));  // clamp(50px, 15vw, 500px)
        
        console.log(`[3D Engine] Setting up renderer - calculated size: ${size}`);
        
        this.renderer.setSize(size, size);
        
        // Log what happened to canvas after setSize
        console.log(`[3D Engine] After setSize - Canvas style.width: ${this.renderer.domElement.style.width}`);
        console.log(`[3D Engine] After setSize - Canvas style.height: ${this.renderer.domElement.style.height}`);
        
        this.container.appendChild(this.renderer.domElement);
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
        // Let the container naturally fit the canvas
        
        this.container.style.position = 'relative';
        this.container.style.overflow = 'hidden';
        this.container.style.margin = '0 auto';  // Center horizontally
        this.container.style.border = '1px solid red';  // TEMPORARY RED BORDER TO SEE CLIPPING
        // Removed display: inline-block to properly participate in flex layout
        
        // Log container dimensions and parent info AFTER all setup
        console.log(`[3D Engine] Container setup complete.`);
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
        // Calculate the size the same way as in setupRenderer
        const size = Math.max(50, Math.min(500, window.innerWidth * 0.15));
            
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
            

            // Rim light
            this.lights.rim = new THREE.DirectionalLight(0xffffff, 1.5);
            this.lights.rim.position.set(0, -2, -2);
            this.lights.rim.target.position.set(0, 0, 0);
            this.scene.add(this.lights.rim);
        }
    }
    
    createFogPlane() {
        // Check if fog plane is disabled
        if (!this.config.fogPlaneEnabled) {
            console.log('[3D Engine] Fog plane disabled by configuration');
            return;
        }
        
        // Start with unit plane - will be resized immediately if dynamic mode
        const fogPlaneGeometry = new THREE.PlaneGeometry(1, 1, 32, 32);
        
        // Create canvas for fog texture (start small, will resize)
        this.fogCanvas = document.createElement('canvas');
        this.fogCanvas.width = 512;   // Initial size
        this.fogCanvas.height = 512;  // Initial size
        this.fogContext = this.fogCanvas.getContext('2d');
        
        // Create texture from canvas
        this.fogTexture = new THREE.CanvasTexture(this.fogCanvas);
        this.fogTexture.minFilter = THREE.LinearFilter;
        this.fogTexture.magFilter = THREE.LinearFilter;
        
        // Create fog material
        const fogPlaneMaterial = new THREE.MeshBasicMaterial({
            map: this.fogTexture,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        
        // Create and position fog plane
        this.fogPlane = new THREE.Mesh(fogPlaneGeometry, fogPlaneMaterial);
        this.fogPlane.position.set(0, 0, this.config.fogPlaneZ); // Use config value
        this.scene.add(this.fogPlane);
        
        // Add debug border to fog plane
        const edges = new THREE.EdgesGeometry(fogPlaneGeometry);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 }); // Green debug border
        const lineSegments = new THREE.LineSegments(edges, lineMaterial);
        this.fogPlane.add(lineSegments);
        
        // Set proper initial size
        // Delay to ensure geometry is created
        setTimeout(() => {
            this.updateFogPlaneSize();
        }, 0);
        
        console.log('[3D Engine] Fog plane created');
    }
    
    createYellowBorder() {
        // Create yellow border DOM element
        this.yellowBorderElement = document.createElement('div');
        this.yellowBorderElement.className = 'threed-component-yellow-border';
        
        // Set initial styles
        this.yellowBorderElement.style.cssText = `
            position: absolute;
            border: 1px solid yellow;
            pointer-events: none;
            z-index: 10;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            box-sizing: border-box;
        `;
        
        // Add to container
        this.container.appendChild(this.yellowBorderElement);
        
        console.log('[3D Engine] Yellow component border created');
    }
    
    updateYellowBorderSize() {
        if (!this.yellowBorderElement) return;
        
        let width, height;
        
        // Determine sizing method based on rotation constraints
        if (this.config.restrictRotationAxis) {
            // EXCEPTION: Restricted rotation - use actual object bounds
            const bounds = this.getActualObjectBounds();
            if (bounds) {
                // Apply perspective projection
                const projectedBounds = this.projectBoundsToScreen(bounds);
                width = projectedBounds.width + 2;  // Add 1px padding on each side
                height = projectedBounds.height + 2;
            } else {
                // No bounds available yet
                return;
            }
        } else {
            // DEFAULT: Free rotation - use bounding sphere
            const sphere = this.getComponentBoundingSphere();
            if (sphere) {
                // Apply perspective projection for sphere
                const projectedDiameter = this.projectSphereToScreen(sphere);
                width = projectedDiameter + 2;  // Add 1px padding on each side
                height = projectedDiameter + 2;  // Square for sphere
            } else {
                // No sphere available yet
                return;
            }
        }
        
        // Apply size to yellow border element
        this.yellowBorderElement.style.width = width + 'px';
        this.yellowBorderElement.style.height = height + 'px';
        
        console.log(`[3D Engine] Yellow border sized to ${width}x${height}px (restricted: ${!!this.config.restrictRotationAxis})`);
    }
    
    getActualObjectBounds() {
        // Get the actual bounding box of the object (not rotational envelope)
        // Check all possible geometry sources
        let box = null;
        
        if (this.mesh) {
            box = new THREE.Box3().setFromObject(this.mesh);
        } else if (this.numberGroup) {
            box = new THREE.Box3().setFromObject(this.numberGroup);
        } else if (this.numberMeshes && this.numberMeshes.length > 0) {
            box = new THREE.Box3();
            this.numberMeshes.forEach(mesh => {
                box.expandByObject(mesh);
            });
        }
        
        if (!box || box.isEmpty()) {
            return null;
        }
        
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        
        return {
            width: size.x,
            height: size.y,
            depth: size.z,
            center: center
        };
    }
    
    getComponentBoundingSphere() {
        // Get the bounding sphere using rotational envelope
        // This reuses our existing calculateRotationalEnvelope method
        let largestSphere = null;
        let largestRadius = 0;
        
        // EDIT-PASS1: After rotationGroup is implemented, check rotationGroup.children instead
        // Check main mesh
        if (this.mesh) {  // EDIT-PASS1: Change condition to check rotationGroup
            const meshSphere = this.calculateRotationalEnvelope(this.mesh);  // EDIT-PASS1: Use rotationGroup
            if (meshSphere.radius > largestRadius) {
                largestSphere = meshSphere;
                largestRadius = meshSphere.radius;
            }
        }
        
        // Check number group (contains numbers AND blocking cylinder)
        if (this.numberGroup) {  // EDIT-PASS1: This check becomes unnecessary with rotationGroup
            const groupSphere = this.calculateRotationalEnvelope(this.numberGroup);
            if (groupSphere.radius > largestRadius) {
                largestSphere = groupSphere;
                largestRadius = groupSphere.radius;
            }
        }
        
        // Only check individual number meshes if they're NOT in a group
        if (!this.numberGroup && this.numberMeshes && this.numberMeshes.length > 0) {
            this.numberMeshes.forEach(mesh => {
                const meshSphere = this.calculateRotationalEnvelope(mesh);
                if (meshSphere.radius > largestRadius) {
                    largestSphere = meshSphere;
                    largestRadius = meshSphere.radius;
                }
            });
        }
        
        return largestSphere;
    }
    
    projectBoundsToScreen(bounds) {
        // Project 3D bounds to screen pixels considering perspective
        // Using same approach as fog plane for consistency
        const cameraZ = this.camera.position.z;  // Use actual camera Z from instance
        const center = bounds.center;
        
        // For bounds, use the front face (closest to camera)
        // Assuming bounds.depth gives us the Z extent
        const closestContentZ = center.z + (bounds.depth / 2);  // Front face of bounding box
        
        // Calculate distance from camera to closest point of content
        const distance = Math.abs(cameraZ - closestContentZ);
        
        // Get viewport dimensions
        const rendererSize = new THREE.Vector2();
        this.renderer.getSize(rendererSize);
        
        // Calculate FOV-based projection using actual camera FOV
        const vFOV = (this.camera.fov * Math.PI) / 180;
        const visibleHeight = 2 * Math.tan(vFOV / 2) * distance;
        const visibleWidth = visibleHeight * this.camera.aspect;
        
        // Scale factor from world units to pixels
        const pixelsPerUnitX = rendererSize.x / visibleWidth;
        const pixelsPerUnitY = rendererSize.y / visibleHeight;
        
        const projectedWidth = bounds.width * pixelsPerUnitX;
        const projectedHeight = bounds.height * pixelsPerUnitY;
        
        console.log(`[3D Engine] Yellow border bounds projection: w=${bounds.width.toFixed(3)}, h=${bounds.height.toFixed(3)}, closestZ=${closestContentZ.toFixed(3)}, pixels=${projectedWidth.toFixed(0)}x${projectedHeight.toFixed(0)}`);
        
        return {
            width: projectedWidth,
            height: projectedHeight
        };
    }
    
    projectSphereToScreen(sphere) {
        // Project sphere diameter to screen pixels using same logic as fog plane
        const cameraZ = this.camera.position.z;  // Use actual camera Z from instance
        const center = sphere.center;
        const radius = sphere.radius;
        
        // Use the closest point of the rotational envelope to camera
        // The envelope extends from center - radius to center + radius
        const closestContentZ = center.z + radius;  // Closest point to camera
        
        // Calculate distance from camera to closest point of content
        const distance = Math.abs(cameraZ - closestContentZ);
        
        // Get viewport dimensions
        const rendererSize = new THREE.Vector2();
        this.renderer.getSize(rendererSize);
        
        // Calculate FOV-based projection using actual camera FOV
        const vFOV = (this.camera.fov * Math.PI) / 180;
        const visibleHeight = 2 * Math.tan(vFOV / 2) * distance;
        
        // Scale factor from world units to pixels
        const pixelsPerUnit = rendererSize.y / visibleHeight;
        
        // Return diameter in pixels (radius * 2)
        const projectedDiameter = sphere.radius * 2 * pixelsPerUnit;
        
        console.log(`[3D Engine] Yellow border sphere projection: radius=${radius.toFixed(3)}, closestZ=${closestContentZ.toFixed(3)}, distance=${distance.toFixed(3)}, pixels=${projectedDiameter.toFixed(0)}`);
        
        return projectedDiameter;
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
        const baseResolution = 512; // Base resolution like cylinder
        
        // Calculate cone dimensions
        const radius = params.coneRadius || 0.5;
        const height = params.coneHeight || 1.0;
        const slantHeight = Math.sqrt(height * height + radius * radius);
        
        // SIDE TEXTURE: Based on unwrapped cone sector dimensions
        const baseArcLength = 2 * Math.PI * radius; // Circumference of cone base
        const sectorAspectRatio = baseArcLength / slantHeight; // Similar to cylinder approach
        const sideWidth = Math.round(baseResolution * sectorAspectRatio);
        const sideHeight = baseResolution;
        
        this.sideCanvas = document.createElement('canvas');
        this.sideCanvas.width = sideWidth;
        this.sideCanvas.height = sideHeight;
        this.sideContext = this.sideCanvas.getContext('2d');
        
        this.sideTexture = new THREE.CanvasTexture(this.sideCanvas);
        
        // BASE TEXTURE: Square for circular base (like cylinder caps)
        this.baseCanvas = document.createElement('canvas');
        this.baseCanvas.width = baseResolution;
        this.baseCanvas.height = baseResolution;
        this.baseContext = this.baseCanvas.getContext('2d');
        
        this.baseTexture = new THREE.CanvasTexture(this.baseCanvas);
        
        console.log('[3D Component Engine] Cone textures created (sophisticated approach):');
        console.log(`  Side texture: ${sideWidth}x${sideHeight}px (aspect ${sectorAspectRatio.toFixed(2)}:1)`);
        console.log(`  Base texture: ${baseResolution}x${baseResolution}px (square)`);
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
        
        // EDIT-PASS1: Change from scene.add to rotationGroup.add
        this.rotationGroup.add(this.mesh);  // Changed from this.scene.add(this.mesh)
        
        // Resize container to fit content
        this.resizeContainerToFitContent();
        
        // Update fog plane to match new geometry
        if (this.fogPlane) {
            this.updateFogPlaneSize();
        }
        
        // Update yellow border to match new geometry
        this.updateYellowBorderSize();
    }
    
    resizeContainerToFitContent() {
        // Just set initial size and return
        const size = Math.max(50, Math.min(500, window.innerWidth * 0.15));
        this.initialWidth = size;
        this.initialHeight = size;
        console.log(`[3D Engine] Component - using ${size}px`);
        return;
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
        
        // Add viewport resize listener
        this.resizeHandler = () => this.updateSize();
        window.addEventListener('resize', this.resizeHandler);
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
        // For TextGeometry mode, we want to treat the whole group as one object
        let intersects;
        if (this.config.mode === 'textgeometry' && this.numberGroup) {
            // Create an invisible sphere for consistent grab points in TextGeometry mode
            const tempGeometry = new THREE.SphereGeometry(1.5, 8, 8);
            const tempMesh = new THREE.Mesh(tempGeometry, new THREE.MeshBasicMaterial({visible: false}));
            tempMesh.position.copy(this.rotationGroup.position);
            intersects = this.raycaster.intersectObject(tempMesh);
            tempGeometry.dispose();
        } else {
            intersects = this.raycaster.intersectObjects(this.rotationGroup.children, true);
        }
        
        if (intersects.length > 0) {
            // Store the grabbed point in local space
            this.grabbedPoint = intersects[0].point.clone();
            const localPoint = this.grabbedPoint.clone();
            this.rotationGroup.worldToLocal(localPoint);  // Changed to this.rotationGroup
            this.grabbedLocalPoint = localPoint;
        } else {
            // If not clicking on object, create a virtual grabbed point
            // Project a point on the object closest to the ray
            const center = new THREE.Vector3();
            this.rotationGroup.getWorldPosition(center);  // Changed to this.rotationGroup
            const ray = this.raycaster.ray;
            
            // Find closest point on ray to object center
            const toCenter = center.clone().sub(ray.origin);
            const closestPoint = ray.origin.clone().add(
                ray.direction.clone().multiplyScalar(toCenter.dot(ray.direction))
            );
            
            // Use the direction from center to closest point to find a point on object surface
            const direction = closestPoint.clone().sub(center).normalize();
            // Use a default radius since rotationGroup doesn't have geometry.boundingSphere
            const radius = 1.0; // Default radius for virtual grab point
            this.grabbedPoint = center.clone().add(direction.clone().multiplyScalar(radius));
            
            const localPoint = this.grabbedPoint.clone();
            this.rotationGroup.worldToLocal(localPoint);  // Changed to this.rotationGroup
            this.grabbedLocalPoint = localPoint;
        }
        
        this.rotationVelocity = { x: 0, y: 0 };
        this.autoRotationTime = 0;
        this.renderer.domElement.style.cursor = 'grabbing';
        
        // Initialize rotation tracking
        this.previousQuaternion = this.rotationGroup.quaternion.clone();  // Changed to this.rotationGroup
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
            // For TextGeometry mode with numberGroup, rotate that directly
            if (this.numberGroup) {
                this.numberGroup.rotateX(rotationAngle);  // Rotate numberGroup for drum
            } else if (this.mesh) {
                this.mesh.rotateX(rotationAngle);  // Standard restricted mode
            } else {
                this.rotationGroup.rotateX(rotationAngle);  // Fallback
            }
            
            // Track velocity for momentum (only X component)
            this.rotationVelocity.x = rotationAngle;
            this.rotationVelocity.y = 0;
            
            this.previousMousePosition = currentMousePosition;
            return; // Skip the complex sticky rotation
        }
        
        // Original sticky rotation for free rotation
        // Store the quaternion before rotation
        const beforeRotation = this.rotationGroup.quaternion.clone();  // Changed to this.rotationGroup
        
        // Convert to normalized device coordinates
        const mouse = new THREE.Vector2();
        mouse.x = (currentMousePosition.x / rect.width) * 2 - 1;
        mouse.y = -(currentMousePosition.y / rect.height) * 2 + 1;
        
        // Apply sticky point rotation
        this.applyStickyRotation(mouse);
        
        // Track actual rotation that occurred
        const rotationDelta = new THREE.Quaternion();
        rotationDelta.multiplyQuaternions(this.rotationGroup.quaternion, beforeRotation.conjugate());  // Changed to this.rotationGroup
        
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
        this.rotationGroup.localToWorld(currentWorldPoint);  // Changed to this.rotationGroup
        
        // Create a ray from the camera through the mouse position
        this.raycaster.setFromCamera(mouseNDC, this.camera);
        const ray = this.raycaster.ray;
        
        // Get the center of the object in world space
        const center = new THREE.Vector3();
        this.rotationGroup.getWorldPosition(center);  // Changed to this.rotationGroup
        
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
                    this.rotationGroup.quaternion.multiplyQuaternions(rotationQuaternion, this.rotationGroup.quaternion);  // Changed both to this.rotationGroup
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
                    // Check if we have axle-based rotation restriction
                    if (this.config.restrictRotationAxis === 'x') {
                        // For X-axis only, convert twist gesture to X rotation
                        // Use the rotation delta to spin the drum forward/backward
                        this.mesh.rotateX(rotationDelta);
                    } else {
                        // Apply rotation around camera's forward axis (Z-axis in view space)
                        const cameraDirection = new THREE.Vector3();
                        this.camera.getWorldDirection(cameraDirection);
                        
                        // Create rotation quaternion
                        const quaternionZ = new THREE.Quaternion();
                        quaternionZ.setFromAxisAngle(cameraDirection, rotationDelta);
                        
                        // Apply rotation directly - this is controlled movement
                        this.mesh.quaternion.multiplyQuaternions(quaternionZ, this.mesh.quaternion);
                    }
                    
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
                // Check if we have axle-based rotation restriction
                if (this.config.restrictRotationAxis === 'x') {
                    // For X-axis only, convert gesture rotation to X rotation
                    this.mesh.rotateX(rotationDelta);
                } else {
                    // Apply rotation around camera's forward axis (Z-axis in view space)
                    const cameraDirection = new THREE.Vector3();
                    this.camera.getWorldDirection(cameraDirection);
                    
                    const quaternionZ = new THREE.Quaternion();
                    quaternionZ.setFromAxisAngle(cameraDirection, rotationDelta);
                    
                    // Apply rotation directly - this is controlled movement
                    this.mesh.quaternion.multiplyQuaternions(quaternionZ, this.mesh.quaternion);
                }
                
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
            if (this.config.restrictRotationAxis === 'x') {
                // Only allow X-axis rotation (use both deltaX and deltaY to control the drum)
                // Both horizontal and vertical swipes contribute to forward/backward roll
                const totalDelta = -event.deltaX * sensitivity - event.deltaY * sensitivity;
                // For TextGeometry mode, we need to rotate the numberGroup which has the 90° rotation
                if (this.numberGroup) {
                    this.numberGroup.rotateY(totalDelta);  // Rotate numberGroup directly for drum
                } else {
                    this.rotationGroup.rotateY(totalDelta);  // Standard mode
                }
            } else {
                this.rotationGroup.quaternion.multiplyQuaternions(quaternionY, this.rotationGroup.quaternion);  // Changed both to this.rotationGroup
                this.rotationGroup.quaternion.multiplyQuaternions(quaternionX, this.rotationGroup.quaternion);  // Changed both to this.rotationGroup
            }
            
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
            console.log(`[3D Engine] First frame render`);
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
                this.rotationGroup.quaternion.multiplyQuaternions(quaternionY, this.rotationGroup.quaternion);  // Changed both to this.rotationGroup
                this.rotationGroup.quaternion.multiplyQuaternions(quaternionX, this.rotationGroup.quaternion);  // Changed both to this.rotationGroup
                
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
                
                this.rotationGroup.quaternion.multiplyQuaternions(autoQuaternionY, this.rotationGroup.quaternion);  // Changed both to this.rotationGroup
                this.rotationGroup.quaternion.multiplyQuaternions(autoQuaternionX, this.rotationGroup.quaternion);  // Changed both to this.rotationGroup
            }
        }
        
        this.renderer.render(this.scene, this.camera);
    }
    
    // Public methods for external control
    setRotationSpeed(speed) {
        this.config.rotationSpeed = speed;
        console.log('[3D Component Engine] Rotation speed set to:', speed);
    }
    
    destroy() {
        // Stop animation
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // Remove event listeners
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }
        
        // Remove yellow border element
        if (this.yellowBorderElement && this.yellowBorderElement.parentNode) {
            this.yellowBorderElement.parentNode.removeChild(this.yellowBorderElement);
            this.yellowBorderElement = null;
        }
        
        // Dispose Three.js resources
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        // Clear timeout
        if (this.fogPlaneUpdateTimeout) {
            clearTimeout(this.fogPlaneUpdateTimeout);
        }
        
        console.log('[3D Component Engine] Destroyed');
    }
    
    updateSize() {
        
        const size = Math.max(50, Math.min(500, window.innerWidth * 0.15));  // clamp(50px, 15vw, 500px)
        
        this.renderer.setSize(size, size);
        this.camera.aspect = 1; // Square aspect
        this.camera.updateProjectionMatrix();
        
        // Update fog plane size to match new renderer size
        this.updateFogPlaneSize();
        
        // Also update based on content
        this.debouncedUpdateFogPlane();
        
        // Update yellow border for new size
        this.updateYellowBorderSize();
        
        // Let container naturally fit the canvas - don't set explicit size
    }
    
    updateFogPlaneSize() {
        if (!this.fogPlane) return;
        
        // Find the largest rotational envelope among all objects
        let largestSphere = null;
        let largestRadius = 0;
        
        // Check main mesh
        if (this.mesh) {
            const meshSphere = this.calculateRotationalEnvelope(this.mesh);
            if (meshSphere.radius > largestRadius) {
                largestSphere = meshSphere;
                largestRadius = meshSphere.radius;
            }
        }
        
        // Check number group (contains numbers AND blocking cylinder)
        if (this.numberGroup) {
            const groupSphere = this.calculateRotationalEnvelope(this.numberGroup);
            if (groupSphere.radius > largestRadius) {
                largestSphere = groupSphere;
                largestRadius = groupSphere.radius;
            }
        }
        
        // Only check individual number meshes if they're NOT in a group (to avoid double-counting)
        if (!this.numberGroup && this.numberMeshes && this.numberMeshes.length > 0) {
            this.numberMeshes.forEach(mesh => {
                const meshSphere = this.calculateRotationalEnvelope(mesh);
                if (meshSphere.radius > largestRadius) {
                    largestSphere = meshSphere;
                    largestRadius = meshSphere.radius;
                }
            });
        }
        
        // Check decals
        if (this.decals && this.decals.length > 0) {
            this.decals.forEach(decal => {
                const decalSphere = this.calculateRotationalEnvelope(decal);
                if (decalSphere.radius > largestRadius) {
                    largestSphere = decalSphere;
                    largestRadius = decalSphere.radius;
                }
            });
        }
        
        // Handle empty scene case
        if (!largestSphere || largestRadius === 0 || !isFinite(largestRadius)) {
            console.warn('[3D Engine] No content to size fog plane against');
            return;
        }
        
        // Use the largest sphere for sizing
        const sphere = largestSphere;
        const sphereDiameter = largestRadius * 2;
        const center = sphere.center;
        
        // Calculate perspective projection of content bounds to fog plane position
        const fogPlaneZ = this.fogPlane.position.z;  // Use actual fog plane Z position from instance
        const cameraZ = this.camera.position.z;  // Use actual camera Z from this instance
        
        // Use the closest point of the rotational envelope to camera
        // The envelope extends from center - radius to center + radius
        const closestContentZ = center.z + largestRadius;  // Closest point to camera
        
        // Calculate distances for perspective scaling
        const cameraToContent = Math.abs(cameraZ - closestContentZ);
        const cameraToFogPlane = Math.abs(cameraZ - fogPlaneZ);
        
        // Account for camera FOV in perspective calculation
        // The FOV affects how much the view expands with distance
        // We don't need to apply FOV factor here because we're projecting
        // from one distance to another, maintaining the same angular size
        
        // Calculate perspective scale factor
        // Objects further from camera need larger fog plane coverage
        let perspectiveScale = 1;
        if (cameraToContent > 0.01) {  // Avoid division by zero
            perspectiveScale = cameraToFogPlane / cameraToContent;
        }
        
        // Use sphere diameter for both width and height (rotation-invariant)
        const projectedDiameter = sphereDiameter * perspectiveScale;
        const projectedWidth = projectedDiameter;
        const projectedHeight = projectedDiameter;
        
        // Apply padding on top of projected size
        const paddingFactor = this.config.fogPlanePadding || 1.0; // No padding by default
        const fogPlaneWidth = projectedWidth * paddingFactor;
        const fogPlaneHeight = projectedHeight * paddingFactor;
        
        // Dispose old geometry properly
        if (this.fogPlane.geometry) {
            this.fogPlane.geometry.dispose();
        }
        
        // Create new geometry
        this.fogPlane.geometry = new THREE.PlaneGeometry(fogPlaneWidth, fogPlaneHeight, 32, 32);
        
        // Update fog texture canvas to match new size if needed
        const pixelRatio = window.devicePixelRatio || 1;
        const newWidth = Math.round(fogPlaneWidth * 100 * pixelRatio);
        const newHeight = Math.round(fogPlaneHeight * 100 * pixelRatio);
        
        // Only recreate if size changed significantly
        if (Math.abs(this.fogCanvas.width - newWidth) > 10 || 
            Math.abs(this.fogCanvas.height - newHeight) > 10) {
            
            this.fogCanvas.width = newWidth;
            this.fogCanvas.height = newHeight;
            
            // Recreate the fog pattern at new size (if method exists)
            if (this.createFogTexture) {
                this.createFogTexture();
            }
        }
        
        // Update the edge geometry for the debug border
        if (this.fogPlane.children.length > 0) {
            const edges = new THREE.EdgesGeometry(this.fogPlane.geometry);
            const lineSegments = this.fogPlane.children[0];
            lineSegments.geometry.dispose();
            lineSegments.geometry = edges;
        }
        
        console.log(`[3D Engine] Fog plane sized to ${fogPlaneWidth.toFixed(2)} x ${fogPlaneHeight.toFixed(2)} (rotational envelope: ${sphereDiameter.toFixed(2)}, perspective: ${perspectiveScale.toFixed(2)}x)`);
    }
    
    // Calculate the rotational envelope - maximum radius from center for free rotation
    calculateRotationalEnvelope(object) {
        // Get the bounding box to find the center
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        
        // Find maximum distance from center to any vertex in the object
        let maxDistance = 0;
        
        // Traverse the object and all its children
        object.traverse((child) => {
            if (child.geometry) {
                // Get world matrix for this child
                child.updateMatrixWorld(true);
                
                // Check if it's a BufferGeometry
                if (child.geometry.attributes && child.geometry.attributes.position) {
                    const positions = child.geometry.attributes.position;
                    const vertex = new THREE.Vector3();
                    
                    // Check each vertex
                    for (let i = 0; i < positions.count; i++) {
                        // Get vertex position
                        vertex.fromBufferAttribute(positions, i);
                        
                        // Transform to world space
                        vertex.applyMatrix4(child.matrixWorld);
                        
                        // Calculate distance from center
                        const distance = vertex.distanceTo(center);
                        maxDistance = Math.max(maxDistance, distance);
                    }
                }
            }
        });
        
        // Create sphere with the rotational envelope radius
        return new THREE.Sphere(center, maxDistance);
    }
    
    setLightPosition(lightName, axis, value) {
        if (this.lights[lightName]) {
            this.lights[lightName].position[axis] = value;
            console.log(`[3D Component Engine] ${lightName} light ${axis} set to:`, value);
        }
    }
    
    /**
     * Create text texture for decals
     * @param {string|number} text - Text to render
     * @param {Object} style - Style configuration
     * @returns {THREE.CanvasTexture} The text texture
     */
    createTextTexture(text, style = {}) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Default style options with bold support
        const defaults = {
            fontSize: 64,
            fontFamily: 'Arial, sans-serif',
            color: '#ffffff',
            backgroundColor: 'transparent',
            padding: 10,
            bold: false
        };
        
        const config = Object.assign({}, defaults, style);
        
        // Set font with optional bold
        const fontWeight = config.bold ? 'bold ' : '';
        ctx.font = `${fontWeight}${config.fontSize}px ${config.fontFamily}`;
        
        // Measure text
        const metrics = ctx.measureText(String(text));
        const width = metrics.width + config.padding * 2;
        const height = config.fontSize + config.padding * 2;
        
        // Set canvas dimensions to power of 2 for better GPU performance
        canvas.width = Math.pow(2, Math.ceil(Math.log2(width)));
        canvas.height = Math.pow(2, Math.ceil(Math.log2(height)));
        
        // Clear canvas with background color
        if (config.backgroundColor !== 'transparent') {
            ctx.fillStyle = config.backgroundColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        // Set text properties (must reset after canvas resize)
        ctx.font = `${fontWeight}${config.fontSize}px ${config.fontFamily}`;
        ctx.fillStyle = config.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Draw text centered
        ctx.fillText(String(text), canvas.width / 2, canvas.height / 2);
        
        // Create and return texture
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        console.log(`[3D Component Engine] Created text texture: "${text}" (${canvas.width}x${canvas.height}px)`);
        
        return texture;
    }
    
    /**
     * Create circular arrangement of decals
     * @param {Array} texts - Array of texts to display
     * @param {Object} options - Configuration options
     */
    createCircularDecals(texts, options = {}) {
        if (!this.mesh) {
            console.error('[3D Component Engine] Cannot create decals - no mesh available');
            return;
        }
        
        const defaults = {
            radius: 0.52,  // Distance from center
            textStyle: {
                fontSize: 72,
                fontFamily: 'Arial, sans-serif',
                color: '#ffffff',
                backgroundColor: '#000000',
                padding: 15
            },
            decalSize: new THREE.Vector3(0.2, 0.2, 0.1)
        };
        
        const config = Object.assign({}, defaults, options);
        
        // Ensure decalSize is a THREE.Vector3
        if (!(config.decalSize instanceof THREE.Vector3)) {
            // Convert plain object to Vector3 if needed
            if (config.decalSize && typeof config.decalSize === 'object') {
                config.decalSize = new THREE.Vector3(
                    config.decalSize.x || 0.2,
                    config.decalSize.y || 0.2,
                    config.decalSize.z || 0.1
                );
            } else {
                config.decalSize = new THREE.Vector3(0.2, 0.2, 0.1);
            }
        }
        
        // Clear existing decals
        this.clearDecals();
        
        const angleStep = (Math.PI * 2) / texts.length;
        
        texts.forEach((text, index) => {
            const angle = index * angleStep;
            
            // Calculate position around cylinder
            const position = new THREE.Vector3(
                Math.cos(angle) * config.radius,
                0,  // Center vertically
                Math.sin(angle) * config.radius
            );
            
            // Orient decal to face outward
            const orientation = new THREE.Euler(
                0,
                -angle + Math.PI / 2,  // Face outward
                Math.PI / 2  // Rotate 90 degrees for horizontal drum orientation
            );
            
            // Create the decal
            const decal = this.createDecal({
                text: text,
                position: position,
                orientation: orientation,
                size: config.decalSize,
                textStyle: config.textStyle
            });
            
            if (decal) {
                console.log(`[3D Component Engine] Created decal "${text}" at angle ${(angle * 180 / Math.PI).toFixed(1)}°`);
            }
        });
        
        console.log(`[3D Component Engine] Created ${texts.length} circular decals`);
    }
    
    /**
     * Create a decal projection on the mesh surface
     * @param {Object} options - Decal configuration
     * @param {string|number} options.text - Text or number to display
     * @param {THREE.Vector3} options.position - Position on mesh surface
     * @param {THREE.Euler} options.orientation - Rotation of decal
     * @param {THREE.Vector3} options.size - Size of decal projection box
     * @param {Object} options.textStyle - Text rendering style
     * @returns {THREE.Mesh} The decal mesh
     */
    createDecal(options = {}) {
        if (!this.mesh) {
            console.error('[3D Component Engine] Cannot create decal - no mesh available');
            return null;
        }
        
        const defaults = {
            text: '0',
            position: new THREE.Vector3(0, 0, 0.5),
            orientation: new THREE.Euler(0, 0, 0),
            size: new THREE.Vector3(0.3, 0.3, 0.1),
            textStyle: {
                fontSize: 64,
                fontFamily: 'Arial, sans-serif',
                color: '#ffffff',
                backgroundColor: 'transparent',
                padding: 10
            }
        };
        
        const config = Object.assign({}, defaults, options);
        
        // Ensure size is a THREE.Vector3
        if (!(config.size instanceof THREE.Vector3)) {
            // Convert plain object to Vector3 if needed
            if (config.size && typeof config.size === 'object') {
                config.size = new THREE.Vector3(
                    config.size.x || 0.3,
                    config.size.y || 0.3,
                    config.size.z || 0.1
                );
            } else {
                config.size = new THREE.Vector3(0.3, 0.3, 0.1);
            }
        }
        
        // Create texture from text
        const texture = this.createTextTexture(config.text, config.textStyle);
        
        // Create decal material
        const material = new THREE.MeshStandardMaterial({
            map: texture,
            transparent: true,
            depthTest: true,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -4,
            side: THREE.FrontSide
        });
        
        // Store material for disposal
        this.decalMaterials.set(texture, material);
        
        // Create decal geometry
        const decalGeometry = new DecalGeometry(
            this.mesh,
            config.position,
            config.orientation,
            config.size
        );
        
        // Create decal mesh
        const decalMesh = new THREE.Mesh(decalGeometry, material);
        decalMesh.renderOrder = 1; // Render after main mesh
        
        // Add to mesh (not scene) so it rotates with the cylinder
        this.mesh.add(decalMesh);
        this.decals.push(decalMesh);
        
        console.log(`[3D Component Engine] Created decal: "${config.text}" attached to mesh`);
        
        return decalMesh;
    }


    

    
    /**
     * Clear all decals
     */
    clearDecals() {
        this.decals.forEach(decal => {
            if (decal.geometry) decal.geometry.dispose();
            if (decal.material) {
                if (decal.material.map) decal.material.map.dispose();
                decal.material.dispose();
            }
            // Remove from mesh (not scene) since we're adding to mesh now
            if (this.mesh) {
                this.mesh.remove(decal);
            } else {
                this.scene.remove(decal); // Fallback
            }
        });
        
        this.decals = [];
        this.decalMaterials.clear();
        
        console.log('[3D Component Engine] Cleared all decals');
    }
    
    /**
     * Update decal at index
     * @param {number} index - Index of decal to update
     * @param {string|number} newValue - New value to display
     */
    updateDecal(index, newValue) {
        if (index < 0 || index >= this.decals.length) {
            console.error(`[3D Component Engine] Invalid decal index: ${index}`);
            return;
        }
        
        const decal = this.decals[index];
        const oldTexture = decal.material.map;
        
        // Create new texture
        const newTexture = this.createTextTexture(newValue, {
            fontSize: 96,
            color: '#ffffff'
        });
        
        // Update material
        decal.material.map = newTexture;
        decal.material.needsUpdate = true;
        
        // Dispose old texture
        if (oldTexture) oldTexture.dispose();
        
        console.log(`[3D Component Engine] Updated decal ${index} to "${newValue}"`);
    }
    
    // Cleanup method
    dispose() {
        console.log('[3D Component Engine] Disposing...');
        
        // Clean up decals first
        this.clearDecals();
        
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
            if (this.resizeHandler) {
                window.removeEventListener('resize', this.resizeHandler);
            }
            
            this.renderer.dispose();
            this.container.removeChild(this.renderer.domElement);
        }
        
        // Clear fog plane update timeout
        if (this.fogPlaneUpdateTimeout) {
            clearTimeout(this.fogPlaneUpdateTimeout);
            this.fogPlaneUpdateTimeout = null;
        }
        
        // Clear other timeouts
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
    
    // ==========================================
    // TextGeometry Mode Methods
    // ==========================================
    
    initTextGeometryMode() {
        console.log('[3D Component Engine] Initializing TextGeometry mode');
        
        // Remove any standard mesh if it exists
        if (this.mesh) {
            this.scene.remove(this.mesh);
            if (this.mesh.geometry) this.mesh.geometry.dispose();
            if (this.mesh.material) {
                if (Array.isArray(this.mesh.material)) {
                    this.mesh.material.forEach(m => m.dispose());
                } else {
                    this.mesh.material.dispose();
                }
            }
            this.mesh = null;
        }
        
        // Create a group to hold all numbers - this becomes our "mesh" for rotation
        this.numberGroup = new THREE.Group();
        // EDIT-PASS1: Change from scene.add to rotationGroup.add
        this.rotationGroup.add(this.numberGroup);  // Changed from this.scene.add(this.numberGroup)
        this.numberGroup.rotation.z = -Math.PI / 2;  // Rotate 90° clockwise to make drum horizontal
        // EDIT-PASS1: Remove this aliasing - no longer needed with rotationGroup
        
        // Load font and create TextGeometry
        this.loadFontAndCreateNumbers();
    }
    
    loadFontAndCreateNumbers() {
        if (!window.THREE) {
            console.error('[3D Component Engine TextGeometry] Three.js not loaded');
            return;
        }
        
        // Check if FontLoader is available
        if (!window.THREE.FontLoader) {
            console.warn('[3D Component Engine TextGeometry] FontLoader not available, using fallback boxes');
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
                console.log('[3D Component Engine TextGeometry] Font loaded successfully');
                this.font = font;
                this.createTextGeometryNumbers();
                this.isLoading = false;
            },
            (progress) => {
                console.log('[3D Component Engine TextGeometry] Loading font...', progress);
            },
            (error) => {
                console.error('[3D Component Engine TextGeometry] Error loading font:', error);
                this.createFallbackNumbers();
                this.isLoading = false;
            }
        );
    }
    
    createTextGeometryNumbers() {
        if (!this.font) {
            console.error('[3D Component Engine TextGeometry] No font loaded');
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
            
            console.log('[3D Component Engine TextGeometry] Computed:', fontSizeInPixels + 'px', '→', fontSize + ' units');
            
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
            
            console.log(`[3D Component Engine TextGeometry] Created curved TextGeometry for ${i}`);
        }
        
        console.log('[3D Component Engine TextGeometry] All curved TextGeometry numbers created');
        
        // Add blocking cylinder BEFORE updating fog plane so it's included in bounds calculation
        if (this.config.addBlockingCylinder) {
            this.createBlockingCylinder();
        }
        
        // Update fog plane after all geometry (including cylinder) is created
        if (this.fogPlane) {
            this.updateFogPlaneSize();
        }
        
        // Update yellow border after all geometry is created
        this.updateYellowBorderSize();
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
        
        console.log('[3D Component Engine TextGeometry] Auto-sized drum width:', drumWidth, 'based on max text height:', maxHeight);
        
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
        
        console.log('[3D Component Engine TextGeometry] Added blocking cylinder');
    }
    
    createFallbackNumbers() {
        // Fallback to box placeholders if FontLoader/TextGeometry not available
        console.log('[3D Component Engine TextGeometry] Creating fallback box placeholders');
        
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
        
        console.log('[3D Component Engine TextGeometry] Fallback boxes created');
        
        // Update fog plane after fallback boxes created
        if (this.fogPlane) {
            this.updateFogPlaneSize();
        }
        
        // Update yellow border after fallback geometry
        this.updateYellowBorderSize();
    }
    
    clearNumbers() {
        if (!this.numberMeshes) return;
        
        this.numberMeshes.forEach(mesh => {
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) {
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(m => m.dispose());
                } else {
                    mesh.material.dispose();
                }
            }
            if (this.numberGroup) {
                this.numberGroup.remove(mesh);
            }
        });
        this.numberMeshes = [];
    }
    
    getCurrentValue() {
        if (!this.numberGroup) return 0;
        
        const normalizedRotation = ((this.numberGroup.rotation.x % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
        const anglePerNumber = (Math.PI * 2) / 10;
        return Math.round(normalizedRotation / anglePerNumber) % 10;
    }
}
