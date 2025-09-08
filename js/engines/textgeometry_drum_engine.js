/**
 * textgeometry_drum_engine.js
 * 
 * ThreeD Component Engine TextGeometry implementation
 * Uses cylinder with UV-mapped texture containing numbers 0-9
 * Numbers curve naturally with the cylinder surface
 * 
 * @class TextGeometryDrumEngine
 */

import { ThreeD_component_engine } from './3_D_component_engine.js';

export class TextGeometryDrumEngine extends ThreeD_component_engine {
    constructor(container, config = {}) {
        // Configure for cylinder geometry with custom number texture
        const drumConfig = Object.assign({
            geometry: 'cylinder',
            geometryParams: {
                cylinderRadiusTop: 0.5,
                cylinderRadiusBottom: 0.5,
                cylinderHeight: 1.0,
                cylinderRadialSegments: 32
            },
            // We'll create our own texture
            texture: 'custom',
            enableInteraction: true,
            rotationSpeed: 0,
            backgroundColor: 0x1a1a1a
        }, config);
        
        // Initialize parent ThreeD engine
        super(container, drumConfig);
        
        console.log('[TextGeometry Drum Engine] Initialized with cylinder UV approach');
    }
    
    init() {
        // Initialize Three.js scene, camera, renderer from parent
        super.init();
        
        if (!this.isInitialized) {
            return;
        }
        
        // Replace the texture with our number texture
        this.createNumberTexture();
    }
    
    createNumberTexture() {
        // Create canvas for texture
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        // Canvas dimensions - width needs to wrap around cylinder
        canvas.width = 1024;  // High res for sharp text
        canvas.height = 256;  // Height of the cylinder band
        
        // Clear canvas with dark background
        context.fillStyle = '#1a1a1a';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Configure text rendering
        context.font = 'bold 120px Arial';
        context.fillStyle = '#ffffff';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        
        // Draw numbers 0-9 evenly spaced across the width
        const numbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
        const segmentWidth = canvas.width / numbers.length;
        
        numbers.forEach((num, index) => {
            const x = (index * segmentWidth) + (segmentWidth / 2);
            const y = canvas.height / 2;
            context.fillText(num, x, y);
        });
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        // Apply texture to the cylinder mesh
        if (this.mesh && this.mesh.material) {
            this.mesh.material.map = texture;
            this.mesh.material.needsUpdate = true;
            
            // Make sure the material shows the texture
            this.mesh.material.emissive = new THREE.Color(0x222222);
            this.mesh.material.emissiveIntensity = 0.3;
        }
        
        console.log('[TextGeometry Drum Engine] Number texture created and applied');
    }
    
    // Override texture update to prevent animated texture
    updateAnimatedTexture() {
        // Do nothing - we want our static number texture
    }
    
    // Get current selected value based on rotation
    getCurrentValue() {
        if (!this.mesh) return 0;
        
        // Rotation around Y axis for horizontal cylinder
        const rotation = this.mesh.rotation.y;
        const normalizedRotation = ((rotation % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
        
        // Each number occupies 36 degrees (2π/10)
        const anglePerNumber = (Math.PI * 2) / 10;
        
        // Calculate which number is at the front
        const selectedIndex = Math.round(normalizedRotation / anglePerNumber) % 10;
        
        return selectedIndex;
    }
    
    dispose() {
        // Dispose of texture if it exists
        if (this.mesh && this.mesh.material && this.mesh.material.map) {
            this.mesh.material.map.dispose();
        }
        
        // Call parent dispose
        super.dispose();
        
        console.log('[TextGeometry Drum Engine] Disposed');
    }
}
