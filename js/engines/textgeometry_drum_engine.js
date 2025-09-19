/**
 * textgeometry_drum_engine.js
 * 
 * ThreeD Component Engine TextGeometry implementation
 * Now just a thin wrapper that uses ThreeD_component_engine in 'textgeometry' mode
 * 
 * @class TextGeometryDrumEngine
 */

import { ThreeD_component_engine } from './3_D_component_engine.js';

export class TextGeometryDrumEngine extends ThreeD_component_engine {
    constructor(container, config = {}) {
        // Force TextGeometry mode
        const drumConfig = Object.assign({
            mode: 'textgeometry',  // Use TextGeometry mode
            texture: 'none',        // No texture needed
            enableInteraction: true,
            rotationSpeed: 0,
            backgroundColor: 0x1a1a1a
        }, config);
        
        // Initialize parent ThreeD engine with TextGeometry mode
        super(container, drumConfig);
        
        console.log('[TextGeometry Drum Engine] Initialized using parent engine TextGeometry mode');
    }
    
    // All functionality now handled by parent engine in TextGeometry mode
    // No need to override anything!
}
