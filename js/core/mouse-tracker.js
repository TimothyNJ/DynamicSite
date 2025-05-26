/**
 * mouse-tracker.js - Global Mouse Position Tracking Service
 * 
 * Singleton service that provides centralized mouse position tracking
 * to eliminate redundant mousemove listeners across components.
 * 
 * Date: 26-May-2025
 */

class MouseTracker {
  constructor() {
    if (MouseTracker.instance) {
      return MouseTracker.instance;
    }
    
    this.x = 0;
    this.y = 0;
    this.initialized = false;
    this.lastUpdateTime = 0;
    
    // Singleton instance
    MouseTracker.instance = this;
    
    this.init();
  }
  
  init() {
    if (this.initialized) {
      console.warn('[MouseTracker] Already initialized');
      return;
    }
    
    // Single global listener
    document.addEventListener('mousemove', (e) => {
      this.x = e.clientX;
      this.y = e.clientY;
      this.lastUpdateTime = Date.now();
    });
    
    this.initialized = true;
    console.log('[MouseTracker] Global mouse tracking initialized');
  }
  
  /**
   * Get current mouse position
   * @returns {{x: number, y: number}} Current mouse coordinates
   */
  getPosition() {
    return { x: this.x, y: this.y };
  }
  
  /**
   * Get time since last mouse movement
   * @returns {number} Milliseconds since last update
   */
  getTimeSinceLastMove() {
    return Date.now() - this.lastUpdateTime;
  }
  
  /**
   * Check if mouse is inside given bounds
   * @param {DOMRect} rect - Bounding rectangle
   * @returns {boolean} True if mouse is inside bounds
   */
  isInsideBounds(rect) {
    return this.x >= rect.left && 
           this.x <= rect.right && 
           this.y >= rect.top && 
           this.y <= rect.bottom;
  }
  
  /**
   * Get entry direction relative to element center
   * @param {DOMRect} rect - Element bounding rectangle
   * @returns {string} 'left' or 'right'
   */
  getRelativeDirection(rect) {
    const centerX = rect.left + rect.width / 2;
    return this.x > centerX ? 'right' : 'left';
  }
}

// Create and export singleton instance
const globalMouseTracker = new MouseTracker();

export { globalMouseTracker };
