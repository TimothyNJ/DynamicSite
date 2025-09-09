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
        const radius = 0.5;
        
        for (let i = 0; i < numberOfValues; i++) {
            // Read font size from CSS variables
            const cssFontSize = getComputedStyle(document.documentElement)
                .getPropertyValue('--component-font-size');
            console.log('[TextGeometry] CSS font size:', cssFontSize);
            
            // Use a reasonable font size for Three.js
            // The CSS value is for HTML elements, not 3D space
            const fontSize = 0.15;  // Fixed size that works well in 3D
            console.log('[TextGeometry] Using font size:', fontSize);
            
            // Create TextGeometry for this number
            const textGeometry = new THREE.TextGeometry(i.toString(), {
                font: this.font,
                size: fontSize,
                height: 0.02,
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
                const vertexAngle = -(vertex.x / fontSize) * (anglePerNumber * 0.8);
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
            
            // Create material
            const material = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                emissive: 0x444444,
                emissiveIntensity: 0.2
            });
            
            // Create mesh
            const mesh = new THREE.Mesh(textGeometry, material);
            
            // No rotation needed - geometry is already rotated and curved
            
            // Add to group
            this.numberGroup.add(mesh);
            this.numberMeshes.push(mesh);
            
            console.log(`[TextGeometry Drum Engine] Created curved TextGeometry for ${i}`);
        }
        
        console.log('[TextGeometry Drum Engine] All curved TextGeometry numbers created');
    }
    
    createFallbackNumbers() {
        // Fallback to box placeholders if FontLoader/TextGeometry not available
        console.log('[TextGeometry Drum Engine] Creating fallback box placeholders');
        
        // Clear any existing numbers
        this.clearNumbers();
        
        const numberOfValues = 10;
        const anglePerNumber = (Math.PI * 2) / numberOfValues;
        const radius = 0.5;
        
        for (let i = 0; i < numberOfValues; i++) {
            // Create a box as placeholder
            const geometry = new THREE.BoxGeometry(0.1, 0.15, 0.02);
            const material = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                emissive: 0x444444,
                emissiveIntensity: 0.2
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
        
        // Use a reasonable font size for Three.js
        const fontSize = 0.15;  // Fixed size that works well in 3D
        
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
        const radius = 0.5;
        const positions = textGeometry.attributes.position;
        const vertex = new THREE.Vector3();
        
        for (let v = 0; v < positions.count; v++) {
            vertex.x = positions.getX(v);
            vertex.y = positions.getY(v);
            vertex.z = positions.getZ(v);
            
            // Calculate angle for this vertex
            const baseAngle = index * anglePerNumber;  // position in ring
            // Scale to use most of allocated angle per number
            const vertexAngle = -(vertex.x / fontSize) * (anglePerNumber * 0.8);
            const finalAngle = baseAngle + vertexAngle;
            
            // Apply cylindrical transformation
            const newRadius = radius + vertex.z;  // Add depth to face outward
            positions.setX(v, Math.cos(finalAngle) * newRadius);
            positions.setZ(v, Math.sin(finalAngle) * newRadius);
            // Y stays the same
        }
        
        textGeometry.attributes.position.needsUpdate = true;
        textGeometry.computeVertexNormals();
        
        const material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x444444,
            emissiveIntensity: 0.2
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
            if (mesh.material) mesh.material.dispose();
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
