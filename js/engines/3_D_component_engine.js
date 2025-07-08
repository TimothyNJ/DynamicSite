/**
 * 3_D_component_engine.js
 * 
 * A reusable component engine for creating interactive 3D objects using Three.js.
 * Supports various geometries, textures, animations, and interactions.
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
        this.previousMousePosition = { x: 0, y: 0 };
        this.rotationVelocity = { x: 0, y: 0 };
        this.autoRotationTime = 0;
        
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
    }
    
    mergeConfig(config) {
        return Object.assign({
            // Initial container dimensions (temporary, will resize to content)
            width: 100,
            height: 100,
            
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
            
            // Lighting settings
            lighting: 'default', // 'default', 'custom', 'none'
            backgroundColor: 0x000000,
            
            // Camera settings
            cameraPosition: { x: 0, y: 0, z: 3 },
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
        
        console.log('[3D Component Engine] Initialization complete');
    }
    
    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setClearColor(0x000000, 0); // Fully transparent
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(this.config.width, this.config.height);
        this.container.appendChild(this.renderer.domElement);
        
        // Set container styles for flex layout participation
        this.container.style.flex = '0 1 auto';  // No grow, CAN shrink, auto basis
        this.container.style.maxWidth = '100%';
        this.container.style.width = `${this.config.width}px`;
        this.container.style.height = `${this.config.height}px`;
        this.container.style.position = 'relative';
        this.container.style.overflow = 'hidden';
        this.container.style.margin = '0 auto';  // Center horizontally
        this.container.style.border = '1px solid red';  // TEMPORARY RED BORDER TO SEE CLIPPING
        // Removed display: inline-block to properly participate in flex layout
    }
    
    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            this.config.cameraFOV,
            this.config.width / this.config.height,
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
        // Create animated fog plane behind the object
        const fogPlaneGeometry = new THREE.PlaneGeometry(2.5, 2.5, 32, 32);
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
            // Create canvas for animated texture
            this.textureCanvas = document.createElement('canvas');
            this.textureCanvas.width = 512;
            this.textureCanvas.height = 512;
            this.textureContext = this.textureCanvas.getContext('2d');
            
            this.texture = new THREE.CanvasTexture(this.textureCanvas);
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
        const materialConfig = Object.assign({}, this.config.materialParams);
        
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
        this.container.style.width = `${width}px`;
        this.container.style.height = `${height}px`;
        
        // Store initial dimensions for constraint calculations
        this.initialWidth = width;
        this.initialHeight = height;
        
        // Update the real renderer
        this.renderer.setSize(width, height);
        
        // Update camera aspect ratio for the real renderer
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
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
        
        // Wheel event for trackpad pinch
        this.renderer.domElement.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
        
        // Initialize touch tracking
        this.touches = [];
        this.lastPinchDistance = null;
        this.baseScale = 1;
        
        // Initialize raycaster for sticky point rotation
        this.raycaster = new THREE.Raycaster();
        this.grabbedPoint = null;
        this.grabbedLocalPoint = null;
        
        // Track actual rotation for proper momentum
        this.previousQuaternion = null;
        this.rotationHistory = [];
        this.maxHistoryLength = 5;
    }
    
    onPointerDown(event) {
        this.isDragging = true;
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.previousMousePosition = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
        
        // Convert to normalized device coordinates (-1 to +1)
        const mouse = new THREE.Vector2();
        mouse.x = (this.previousMousePosition.x / rect.width) * 2 - 1;
        mouse.y = -(this.previousMousePosition.y / rect.height) * 2 + 1;
        
        // Raycast to find the initial grabbed point on the object
        this.raycaster.setFromCamera(mouse, this.camera);
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
        
        if (this.touches.length === 2) {
            // Initialize pinch distance
            const dx = this.touches[0].clientX - this.touches[1].clientX;
            const dy = this.touches[0].clientY - this.touches[1].clientY;
            this.lastPinchDistance = Math.sqrt(dx * dx + dy * dy);
        }
    }
    
    onTouchMove(event) {
        event.preventDefault();
        
        this.touches = Array.from(event.touches);
        
        if (this.touches.length === 2) {
            // Calculate current pinch distance
            const dx = this.touches[0].clientX - this.touches[1].clientX;
            const dy = this.touches[0].clientY - this.touches[1].clientY;
            const currentPinchDistance = Math.sqrt(dx * dx + dy * dy);
            
            if (this.lastPinchDistance) {
                // Calculate scale change
                const scaleDelta = currentPinchDistance / this.lastPinchDistance;
                
                // Calculate new dimensions
                const currentWidth = this.container.offsetWidth;
                const currentHeight = this.container.offsetHeight;
                const newWidth = currentWidth * scaleDelta;
                const newHeight = currentHeight * scaleDelta;
                
                // Apply constraints
                const minSize = this.config.width * 0.25;  // Quarter original size
                const maxSize = this.config.width * 3;     // Triple original size
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
            
            this.lastPinchDistance = currentPinchDistance;
        }
    }
    
    onTouchEnd(event) {
        this.touches = Array.from(event.touches);
        
        if (this.touches.length < 2) {
            this.lastPinchDistance = null;
        }
    }
    
    onWheel(event) {
        // Check if it's a pinch gesture (ctrl key or gesture)
        if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            
            // Calculate scale based on deltaY magnitude for smooth scaling
            // Smaller movements = smaller changes
            const sensitivity = 0.0035;  // Middle ground between 0.002 and fixed 5%
            const scaleFactor = 1 - (event.deltaY * sensitivity);
            
            // Calculate new dimensions
            const currentWidth = this.container.offsetWidth;
            const currentHeight = this.container.offsetHeight;
            const newWidth = currentWidth * scaleFactor;
            const newHeight = currentHeight * scaleFactor;
            
            // Apply constraints
            const minSize = this.initialWidth * 0.25;  // Quarter original size
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
        }
    }
    
    updateAnimatedTexture(time) {
        if (!this.textureContext) return;
        
        const ctx = this.textureContext;
        const params = this.config.textureParams;
        
        // Clear canvas
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, 512, 512);
        
        // Create tunnel effect
        const phase = time * params.animationSpeed;
        
        for (let i = 0; i < params.tunnelCount; i++) {
            for (let j = 0; j < params.tunnelCount; j++) {
                const x = (i + 0.5) * (512 / params.tunnelCount);
                const y = (j + 0.5) * (512 / params.tunnelCount);
                
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
        
        this.texture.needsUpdate = true;
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
        
        this.animationId = requestAnimationFrame(this.animate);
        
        // Update animated texture
        if (this.config.texture === 'animated') {
            this.updateAnimatedTexture(time);
        }
        
        // Update fog texture
        if (this.fogTexture) {
            this.updateFogTexture(time);
        }
        
        // Apply rotation
        if (!this.isDragging && this.config.enableAnimation) {
            // Momentum rotation using quaternions
            if (Math.abs(this.rotationVelocity.x) > 0.0001 || Math.abs(this.rotationVelocity.y) > 0.0001) {
                // Apply momentum as quaternion rotations
                const quaternionY = new THREE.Quaternion();
                quaternionY.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.rotationVelocity.y);
                
                // Get the current right vector for X rotation
                const rightVector = new THREE.Vector3(1, 0, 0);
                rightVector.applyQuaternion(this.mesh.quaternion);
                
                const quaternionX = new THREE.Quaternion();
                quaternionX.setFromAxisAngle(rightVector, this.rotationVelocity.x);
                
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
            
            // Remove wheel event listener
            this.renderer.domElement.removeEventListener('wheel', this.onWheel);
            
            this.renderer.dispose();
            this.container.removeChild(this.renderer.domElement);
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