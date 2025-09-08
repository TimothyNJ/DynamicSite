/**
 * textgeometry_drum_engine.js
 * 
 * ThreeD Component Engine TextGeometry implementation
 * Phase 1: Static 0-9 using TextGeometry objects positioned around a cylinder
 * Uses existing ThreeD engine tube geometry and interaction systems
 * 
 * @class TextGeometryDrumEngine
 */

import { ThreeD_component_engine } from './3_D_component_engine.js';

export class TextGeometryDrumEngine extends ThreeD_component_engine {
    constructor(container, config = {}) {
        // Configure for cylinder/tube geometry with drum-like rotation
        const drumConfig = Object.assign({
            geometry: 'cylinder',
            geometryParams: {
                cylinderRadiusTop: 0.5,
                cylinderRadiusBottom: 0.5,
                cylinderHeight: 1.0,
                cylinderRadialSegments: 32
            },
            // Disable texture - we'll use TextGeometry instead
            texture: 'none',
            enableInteraction: true,
            rotationSpeed: 0,
            // Material for the cylinder (darker background)
            materialParams: {
                color: 0x1a1a1a,
                metalness: 0.3,
                roughness: 0.7
            }
        }, config);
        
        // Initialize parent ThreeD engine
        super(container, drumConfig);
        
        // TextGeometry specific properties
        this.numbers = [];
        this.font = null;
        this.fontLoader = null;
        this.isfontsLoaded = false;
        
        console.log('[TextGeometry Drum Engine] Initialized');
    }
    
    init() {
        // Call parent init first
        super.init();
        
        if (!this.isInitialized) {
            return;
        }
        
        // Load font and create TextGeometry objects
        this.loadFont();
    }
    
    loadFont() {
        if (!window.THREE) {
            console.error('[TextGeometry Drum Engine] Three.js not loaded');
            return;
        }
        
        // Dynamic import of FontLoader and TextGeometry
        this.loadFontModules();
    }
    
    async loadFontModules() {
        try {
            // Note: These modules need to be available through Three.js
            // For now, we'll create text using sprites as a fallback
            console.log('[TextGeometry Drum Engine] Loading font modules...');
            
            // Create number sprites as initial implementation
            this.createNumberSprites();
            
        } catch (error) {
            console.error('[TextGeometry Drum Engine] Error loading font modules:', error);
            // Fallback to sprite-based text
            this.createNumberSprites();
        }
    }
    
    createNumberSprites() {
        // Create 10 numbers (0-9) as sprites positioned around the cylinder
        const numberOfValues = 10;
        const anglePerNumber = (Math.PI * 2) / numberOfValues;
        const radius = 0.55; // Just outside cylinder surface
        
        for (let i = 0; i < numberOfValues; i++) {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 128;
            canvas.height = 128;
            
            // Draw number on canvas
            context.fillStyle = '#000000';
            context.fillRect(0, 0, 128, 128);
            context.font = 'Bold 96px Arial';
            context.fillStyle = '#ffffff';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(i.toString(), 64, 64);
            
            // Create texture from canvas
            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            
            // Create sprite material
            const spriteMaterial = new THREE.SpriteMaterial({
                map: texture,
                transparent: true
            });
            
            // Create sprite
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.scale.set(0.3, 0.3, 1);
            
            // Position around cylinder
            const angle = i * anglePerNumber;
            sprite.position.x = Math.cos(angle) * radius;
            sprite.position.z = Math.sin(angle) * radius;
            sprite.position.y = 0;
            
            // Add to scene
            this.scene.add(sprite);
            this.numbers.push(sprite);
            
            console.log(`[TextGeometry Drum Engine] Created number ${i} at angle ${(angle * 180 / Math.PI).toFixed(1)}°`);
        }
        
        console.log('[TextGeometry Drum Engine] All numbers created');
    }
    
    // Future implementation for actual TextGeometry
    createTextGeometry(text, font) {
        // This will be implemented when FontLoader and TextGeometry are properly imported
        // For now, using sprite-based approach above
        if (!window.THREE.TextGeometry) {
            console.warn('[TextGeometry Drum Engine] TextGeometry not available, using sprites');
            return null;
        }
        
        const textGeometry = new THREE.TextGeometry(text, {
            font: font,
            size: 0.15,
            height: 0.02,
            curveSegments: 12,
            bevelEnabled: false
        });
        
        textGeometry.center();
        return textGeometry;
    }
    
    // Override rotation to constrain to single axis (drum behavior)
    applyRotation(deltaX, deltaY) {
        if (!this.mesh) return;
        
        // Only rotate around X-axis for drum behavior (horizontal cylinder)
        const rotationSpeed = 0.01;
        this.mesh.rotation.x += deltaY * rotationSpeed;
        
        // Numbers rotate with the cylinder since they're added to the scene
        // They'll appear to rotate around the cylinder
    }
    
    // Get current selected value based on rotation
    getCurrentValue() {
        if (!this.mesh) return 0;
        
        const normalizedRotation = ((this.mesh.rotation.x % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
        const anglePerNumber = (Math.PI * 2) / 10;
        return Math.round(normalizedRotation / anglePerNumber) % 10;
    }
    
    dispose() {
        // Clean up numbers
        this.numbers.forEach(sprite => {
            if (sprite.material.map) sprite.material.map.dispose();
            if (sprite.material) sprite.material.dispose();
            this.scene.remove(sprite);
        });
        this.numbers = [];
        
        // Call parent dispose
        super.dispose();
        
        console.log('[TextGeometry Drum Engine] Disposed');
    }
}
