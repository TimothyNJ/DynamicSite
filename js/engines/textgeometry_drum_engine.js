/**
 * textgeometry_drum_engine.js
 * 
 * ThreeD Component Engine TextGeometry implementation
 * Phase 1: Static 0-9 using actual TextGeometry objects
 * Each number is a separate 3D mesh for dynamic updates
 * 
 * @class TextGeometryDrumEngine
 */

import { ThreeD_component_engine } from './3_D_component_engine.js';

export class TextGeometryDrumEngine extends ThreeD_component_engine {
    constructor(container, config = {}) {
        // Configure to use ThreeD engine base but NO visible cylinder
        const drumConfig = Object.assign({
            // No geometry - we'll create our own text objects
            texture: 'none',
            enableInteraction: true,
            rotationSpeed: 0,
            backgroundColor: 0x1a1a1a
        }, config);
        
        // Initialize parent ThreeD engine
        super(container, drumConfig);
        
        // TextGeometry specific properties
        this.numberMeshes = [];
        this.numberGroup = null;
        this.font = null;
        this.isLoading = false;
        
        console.log('[TextGeometry Drum Engine] Initialized for dynamic TextGeometry');
    }
    
    init() {
        // Initialize Three.js scene, camera, renderer from parent
        super.init();
        
        if (!this.isInitialized) {
            return;
        }
        
        // If addBlockingCylinder is true, remove the fog plane
        if (this.config.addBlockingCylinder && this.fogPlane) {
            console.log('[TextGeometry Drum Engine] Removing fog plane for black blocker configuration');
            this.scene.remove(this.fogPlane);
            if (this.fogPlane.geometry) this.fogPlane.geometry.dispose();
            if (this.fogPlane.material) this.fogPlane.material.dispose();
            this.fogPlane = null;
            this.fogTexture = null;
            this.fogCanvas = null;
            this.fogContext = null;
        }
        
        // Remove any mesh that parent created
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
        this.scene.add(this.numberGroup);
        this.numberGroup.rotation.z = -Math.PI / 2;  // Rotate 90° clockwise to make drum horizontal
        this.mesh = this.numberGroup; // Assign to mesh so parent's rotation logic works
        
        // Load font and create TextGeometry
        this.loadFontAndCreateNumbers();
    }
    
    loadFontAndCreateNumbers() {
        if (!window.THREE) {
            console.error('[TextGeometry Drum Engine] Three.js not loaded');
            return;
        }
        
        // Check if FontLoader is available
        if (!window.THREE.FontLoader) {
            console.warn('[TextGeometry Drum Engine] FontLoader not available, using fallback boxes');
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
                console.log('[TextGeometry Drum Engine] Font loaded successfully');
                this.font = font;
                this.createTextGeometryNumbers();
                this.isLoading = false;
            },
            (progress) => {
                console.log('[TextGeometry Drum Engine] Loading font...', progress);
            },
            (error) => {
                console.error('[TextGeometry Drum Engine] Error loading font:', error);
                this.createFallbackNumbers();
                this.isLoading = false;
            }
        );
    }
    
    createTextGeometryNumbers() {
        if (!this.font) {
            console.error('[TextGeometry Drum Engine] No font loaded');
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
            // The camera typically shows about 2-3 units vertically
            const containerHeight = this.container.clientHeight || 300;
            const pixelsToUnits = 2.5 / containerHeight; // Camera shows ~2.5 units vertically
            const fontSize = fontSizeInPixels * pixelsToUnits * 0.4; // Reduced scale factor
            
            console.log('[TextGeometry] Computed:', fontSizeInPixels + 'px', '→', fontSize + ' units');
            
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
            
            // Check if we need to flip faces due to cylindrical transformation
            // The transformation might have inverted the winding order
            textGeometry.computeBoundingBox();
            
            // Log to help debug face orientation
            console.log(`[TextGeometry ${i}] Bounding box:`, textGeometry.boundingBox);
            
            // TextGeometry by default uses one material for all faces
            // We need to check if it has groups for front/back/sides
            if (textGeometry.groups && textGeometry.groups.length > 0) {
                console.log(`[TextGeometry] Groups found: ${textGeometry.groups.length}`);
                textGeometry.groups.forEach((group, idx) => {
                    console.log(`  Group ${idx}: start=${group.start}, count=${group.count}, materialIndex=${group.materialIndex}`);
                });
            } else {
                console.log('[TextGeometry] No groups found - all faces use material index 0');
            }
            
            // Clear existing groups
            textGeometry.clearGroups();
            
            // Manually create groups for front and back faces
            // In TextGeometry with no bevel, faces are organized as:
            // - First set of triangles: front cap
            // - Last set of triangles: back cap  
            // - Middle triangles: sides
            const faceCount = textGeometry.index ? textGeometry.index.count / 3 : textGeometry.attributes.position.count / 3;
            const facesPerCap = Math.floor(faceCount * 0.4);  // Approximate
            
            // Group 0: Front faces (use material 0)
            textGeometry.addGroup(0, facesPerCap * 3, 0);
            
            // Group 1: Back faces (use material 1) 
            textGeometry.addGroup(faceCount * 3 - facesPerCap * 3, facesPerCap * 3, 1);
            
            // Group 2: Side faces (use material 0)
            textGeometry.addGroup(facesPerCap * 3, (faceCount - 2 * facesPerCap) * 3, 0);
            
            console.log(`[TextGeometry ${i}] Created groups: front=${facesPerCap}, back=${facesPerCap}, sides=${faceCount - 2 * facesPerCap}`);
            
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
            
            // No rotation needed - geometry is already rotated and curved
            
            // Add to group
            this.numberGroup.add(mesh);
            this.numberMeshes.push(mesh);
            
            console.log(`[TextGeometry Drum Engine] Created curved TextGeometry for ${i}`);
        }
        
        console.log('[TextGeometry Drum Engine] All curved TextGeometry numbers created');
        
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
        
        console.log('[TextGeometry] Auto-sized drum width:', drumWidth, 'based on max text height:', maxHeight);
        
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
        
        // Keep cylinder vertical to match the numbers orientation
        // No rotation needed - cylinder is vertical by default
        
        // Add to the number group so it rotates with the numbers
        this.numberGroup.add(blockingCylinder);
        
        console.log('[TextGeometry Drum Engine] Added blocking cylinder');
    }
    
    createFallbackNumbers() {
        // Fallback to box placeholders if FontLoader/TextGeometry not available
        console.log('[TextGeometry Drum Engine] Creating fallback box placeholders');
        
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
        
        console.log('[TextGeometry Drum Engine] Fallback boxes created');
    }
    
    // Method to dynamically update a number
    updateNumber(index, newValue) {
        if (index < 0 || index >= this.numberMeshes.length) {
            console.error('[TextGeometry Drum Engine] Invalid index for updateNumber');
            return;
        }
        
        if (!this.font) {
            console.warn('[TextGeometry Drum Engine] Cannot update - no font loaded');
            return;
        }
        
        // Remove old mesh
        const oldMesh = this.numberMeshes[index];
        this.numberGroup.remove(oldMesh);
        if (oldMesh.geometry) oldMesh.geometry.dispose();
        if (oldMesh.material) oldMesh.material.dispose();
        
        // Get computed font size in pixels
        const computedStyle = getComputedStyle(document.documentElement);
        const rootFontSize = parseFloat(computedStyle.fontSize);
        const componentMultiplier = parseFloat(computedStyle.getPropertyValue('--component-font-size')) || 0.9;
        const fontSizeInPixels = rootFontSize * componentMultiplier;
        
        // Convert to Three.js units
        const containerHeight = this.container.clientHeight || 300;
        const pixelsToUnits = 2.5 / containerHeight;
        const fontSize = fontSizeInPixels * pixelsToUnits * 0.4;
        
        // Create new TextGeometry with new value
        const textGeometry = new THREE.TextGeometry(newValue.toString(), {
            font: this.font,
            size: fontSize,
            height: 0.02,
            curveSegments: 12,
            bevelEnabled: false
        });
        
        textGeometry.center();
        
        // First rotate the geometry 90 degrees before transforming vertices
        textGeometry.rotateZ(Math.PI / 2);
        
        // Transform vertices to curve around cylinder
        const numberOfValues = 10;
        const anglePerNumber = (Math.PI * 2) / numberOfValues;
        const radius = 0.3;
        const positions = textGeometry.attributes.position;
        const vertex = new THREE.Vector3();
        
        for (let v = 0; v < positions.count; v++) {
            vertex.x = positions.getX(v);
            vertex.y = positions.getY(v);
            vertex.z = positions.getZ(v);
            
            // Calculate angle for this vertex
            const baseAngle = index * anglePerNumber;  // position in ring
            // Scale to use most of allocated angle per number
            const vertexAngle = -(vertex.x * 5.0) * (anglePerNumber * 0.8);
            const finalAngle = baseAngle + vertexAngle;
            
            // Apply cylindrical transformation
            const newRadius = radius + vertex.z;  // Add depth to face outward
            positions.setX(v, Math.cos(finalAngle) * newRadius);
            positions.setZ(v, Math.sin(finalAngle) * newRadius);
            // Y stays the same
        }
        
        textGeometry.attributes.position.needsUpdate = true;
        textGeometry.computeVertexNormals();
        
        // Create material that only renders front faces
        const material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x444444,
            emissiveIntensity: 0.2,
            side: THREE.FrontSide  // Only render front-facing polygons
        });
        
        const mesh = new THREE.Mesh(textGeometry, material);
        // No rotation needed - geometry is already rotated and curved
        
        // Update in arrays
        this.numberGroup.add(mesh);
        this.numberMeshes[index] = mesh;
        
        console.log(`[TextGeometry Drum Engine] Updated position ${index} to value ${newValue}`);
    }
    
    // Method to get all current values
    getValues() {
        // For now returns 0-9, but can be dynamic in the future
        return ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    }
    
    // Method to set all values at once
    setValues(values) {
        if (!Array.isArray(values) || values.length !== 10) {
            console.error('[TextGeometry Drum Engine] setValues requires array of 10 values');
            return;
        }
        
        values.forEach((value, index) => {
            this.updateNumber(index, value);
        });
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
    
    getCurrentValue() {
        if (!this.numberGroup) return 0;
        
        const normalizedRotation = ((this.numberGroup.rotation.y % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
        const anglePerNumber = (Math.PI * 2) / 10;
        return Math.round(normalizedRotation / anglePerNumber) % 10;
    }
    
    dispose() {
        // Clean up all numbers
        this.clearNumbers();
        
        if (this.numberGroup) {
            this.scene.remove(this.numberGroup);
            this.numberGroup = null;
        }
        
        this.font = null;
        
        // Call parent dispose
        super.dispose();
        
        console.log('[TextGeometry Drum Engine] Disposed');
    }
}
