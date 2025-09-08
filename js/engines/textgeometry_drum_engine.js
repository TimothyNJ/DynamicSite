/**
 * textgeometry_drum_engine.js
 * 
 * ThreeD Component Engine TextGeometry implementation
 * Phase 1: Static 0-9 using TextGeometry objects positioned around a cylinder shape
 * Uses existing ThreeD engine for interaction systems ONLY - no visible cylinder
 * 
 * @class TextGeometryDrumEngine
 */

import { ThreeD_component_engine } from './3_D_component_engine.js';

export class TextGeometryDrumEngine extends ThreeD_component_engine {
    constructor(container, config = {}) {
        // Configure to use ThreeD engine base but NO visible geometry
        const drumConfig = Object.assign({
            // No geometry - we'll create our own text objects
            texture: 'none',
            enableInteraction: true,
            rotationSpeed: 0,
            // Dark background
            backgroundColor: 0x1a1a1a
        }, config);
        
        // Initialize parent ThreeD engine
        super(container, drumConfig);
        
        // TextGeometry specific properties
        this.numberMeshes = [];
        this.numberGroup = null;
        
        console.log('[TextGeometry Drum Engine] Initialized');
    }
    
    init() {
        // Initialize Three.js scene, camera, renderer from parent
        super.init();
        
        if (!this.isInitialized) {
            return;
        }
        
        // Remove the mesh that parent created - we don't want any cylinder visible
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
        
        // Create the TextGeometry numbers
        this.createTextGeometryNumbers();
    }
    
    createTextGeometryNumbers() {
        if (!window.THREE) {
            console.error('[TextGeometry Drum Engine] Three.js not loaded');
            return;
        }
        
        // Create 10 numbers (0-9) using TextGeometry
        const numberOfValues = 10;
        const anglePerNumber = (Math.PI * 2) / numberOfValues;
        const radius = 0.5; // Position at cylinder radius
        
        // For now, create placeholder meshes since TextGeometry requires font loading
        // These will be replaced with actual TextGeometry once fonts are loaded
        for (let i = 0; i < numberOfValues; i++) {
            // Create a simple box as placeholder for each number
            const geometry = new THREE.BoxGeometry(0.15, 0.2, 0.02);
            const material = new THREE.MeshStandardMaterial({ 
                color: 0xffffff,
                emissive: 0x444444,
                emissiveIntensity: 0.2
            });
            
            const mesh = new THREE.Mesh(geometry, material);
            
            // Position around where cylinder would be
            const angle = i * anglePerNumber;
            mesh.position.x = Math.cos(angle) * radius;
            mesh.position.z = Math.sin(angle) * radius;
            mesh.position.y = 0;
            
            // Face outward from center
            mesh.rotation.y = angle + Math.PI;
            
            // Add to our number group
            this.numberGroup.add(mesh);
            this.numberMeshes.push(mesh);
            
            console.log(`[TextGeometry Drum Engine] Created placeholder for number ${i} at angle ${(angle * 180 / Math.PI).toFixed(1)}°`);
        }
        
        console.log('[TextGeometry Drum Engine] All number placeholders created - TextGeometry will replace these when fonts load');
    }
    
    // Future: Replace placeholders with actual TextGeometry
    async loadFontAndCreateText() {
        // This will be implemented when we can properly load fonts
        // Will use THREE.FontLoader and THREE.TextGeometry
        // For each number 0-9:
        // 1. Create TextGeometry with the number
        // 2. Replace the placeholder box with the text mesh
        // 3. Position and orient correctly
    }
    
    // Override to ensure no texture updates
    updateAnimatedTexture() {
        // Do nothing - we have no textures, only geometry
    }
    
    // Get current selected value based on rotation
    getCurrentValue() {
        if (!this.numberGroup) return 0;
        
        const normalizedRotation = ((this.numberGroup.rotation.x % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
        const anglePerNumber = (Math.PI * 2) / 10;
        return Math.round(normalizedRotation / anglePerNumber) % 10;
    }
    
    dispose() {
        // Clean up number meshes
        this.numberMeshes.forEach(mesh => {
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) mesh.material.dispose();
            this.numberGroup.remove(mesh);
        });
        this.numberMeshes = [];
        
        if (this.numberGroup) {
            this.scene.remove(this.numberGroup);
            this.numberGroup = null;
        }
        
        // Call parent dispose
        super.dispose();
        
        console.log('[TextGeometry Drum Engine] Disposed');
    }
}
