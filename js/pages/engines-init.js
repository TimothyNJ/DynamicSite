/**
 * engines-init.js
 * Initializes components on the Engines page
 */

import { TextGeometryDrumEngine } from '../engines/textgeometry_drum_engine.js';

export function initializeEnginesPage() {
    console.log('[Engines Init] Initializing engines page components');
    
    // Check if we're on the engines page
    const textGeometry09Container = document.getElementById('demo-3d-textgeometry-09-container');
    const textGeometry09BlockerContainer = document.getElementById('demo-3d-textgeometry-09-blocker-container');
    
    if (textGeometry09Container) {
        console.log('[Engines Init] Creating TextGeometry 0-9 instance');
        const textGeometry09 = new TextGeometryDrumEngine(textGeometry09Container, {
            rotationSpeed: 0,
            enableInteraction: true,
            textDepth: 0.02
        });
        textGeometry09.init();
    }
    
    if (textGeometry09BlockerContainer) {
        console.log('[Engines Init] Creating TextGeometry 0-9 with Black Blocker instance');
        const textGeometry09Blocker = new TextGeometryDrumEngine(textGeometry09BlockerContainer, {
            rotationSpeed: 0,
            enableInteraction: true,
            textDepth: 0.02,
            addBlockingCylinder: true  // Enable the black blocking cylinder
        });
        textGeometry09Blocker.init();
    }
    
    console.log('[Engines Init] Engines page initialization complete');
}

// Auto-initialize if this script is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeEnginesPage);
} else {
    // DOM already loaded
    initializeEnginesPage();
}
