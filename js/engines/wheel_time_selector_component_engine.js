/**
 * wheel_time_selector_component_engine.js
 * 
 * Engine for creating wheel-style time selectors that match the DynamicSite
 * design language. Features smooth scrolling wheels for hours and minutes
 * with 24-hour format by default.
 * 
 * Date: 22-May-2025
 * Deployment Timestamp: [TO BE UPDATED ON DEPLOYMENT]
 */

class wheel_time_selector_component_engine {
  constructor(options = {}, changeHandler = null) {
    // Default options
    this.options = {
      id: options.id || `wheel-time-${Date.now()}`,
      value: options.value || '12:00', // Default time
      format: options.format || '24hr', // 24hr or 12hr
      minuteInterval: options.minuteInterval || 1, // 1, 5, 10, 15, 30
      storageKey: options.storageKey || null,
      disabled: options.disabled || false,
      ...options
    };
    
    this.changeHandler = changeHandler;
    this.element = null;
    this.container = null;
    this.hourWheel = null;
    this.minuteWheel = null;
    this.periodWheel = null; // For 12hr format
    
    // Wheel state
    this.hourIndex = 0;
    this.minuteIndex = 0;
    this.periodIndex = 0;
    this.isScrolling = false;
    
    // Parse initial value
    this.parseTime(this.options.value);
    
    console.log(`[wheel_time_selector_component_engine] Initialized with options:`, this.options);
  }
  
  /**
   * Parse time string into components
   */
  parseTime(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(num => parseInt(num, 10));
    this.hourIndex = hours || 0;
    
    // Calculate minute index based on interval
    const minuteValue = minutes || 0;
    this.minuteIndex = Math.round(minuteValue / this.options.minuteInterval);
  }
  
  /**
   * Render the wheel time selector
   */
  render(container) {
    const containerEl = typeof container === 'string' 
      ? document.getElementById(container)
      : container;
      
    if (!containerEl) {
      console.error(`[wheel_time_selector_component_engine] Container not found:`, container);
      return null;
    }
    
    // Create main container
    this.container = document.createElement('div');
    this.container.className = 'wheel-time-container';
    this.container.style.cssText = `
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 5px 0;
      gap: 10px;
    `;
    
    // Create time selector element
    this.element = document.createElement('div');
    this.element.className = 'wheel-time-selector';
    this.element.id = this.options.id;
    
    // Apply styles
    this.applyStyles();
    
    // Create wheels container
    const wheelsContainer = document.createElement('div');
    wheelsContainer.className = 'wheels-container';
    wheelsContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 10px 20px;
      position: relative;
      z-index: 2;
    `;
    
    // Create hour wheel
    this.hourWheel = this.createWheel('hour', this.generateHours());
    wheelsContainer.appendChild(this.hourWheel);
    
    // Add separator
    const separator = document.createElement('div');
    separator.className = 'time-separator';
    separator.textContent = ':';
    separator.style.cssText = `
      color: #ffffff;
      font-weight: bold;
      font-size: clamp(0.6rem, 1.4vw, 2.6rem);
      padding: 0 5px;
    `;
    wheelsContainer.appendChild(separator);
    
    // Create minute wheel
    this.minuteWheel = this.createWheel('minute', this.generateMinutes());
    wheelsContainer.appendChild(this.minuteWheel);
    
    // Add period wheel for 12hr format
    if (this.options.format === '12hr') {
      const periodSeparator = document.createElement('div');
      periodSeparator.style.cssText = 'width: 10px;';
      wheelsContainer.appendChild(periodSeparator);
      
      this.periodWheel = this.createWheel('period', ['AM', 'PM']);
      wheelsContainer.appendChild(this.periodWheel);
    }
    
    // Add to element
    this.element.innerHTML = `
      <div class="border-container">
        <div class="border-segment border-top"></div>
        <div class="border-segment border-bottom"></div>
      </div>
      <div class="wheel-background"></div>
    `;
    this.element.appendChild(wheelsContainer);
    
    // Add to container
    this.container.appendChild(this.element);
    containerEl.appendChild(this.container);
    
    // Load from storage if available
    if (this.options.storageKey) {
      const stored = localStorage.getItem(this.options.storageKey);
      if (stored) {
        this.setValue(stored);
      }
    }
    
    // Set initial scroll positions
    this.updateWheelPositions();
    
    console.log(`[wheel_time_selector_component_engine] Rendered time selector:`, this.options.id);
    
    return this.element;
  }
  
  /**
   * Create a scrollable wheel
   */
  createWheel(type, values) {
    const wheel = document.createElement('div');
    wheel.className = `time-wheel wheel-${type}`;
    wheel.style.cssText = `
      height: 150px;
      width: ${type === 'period' ? '80px' : '60px'};
      overflow: hidden;
      position: relative;
      cursor: pointer;
    `;
    
    // Create scrollable content
    const scrollContent = document.createElement('div');
    scrollContent.className = 'wheel-scroll-content';
    scrollContent.style.cssText = `
      padding: 60px 0;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `;
    
    // Add values
    values.forEach((value, index) => {
      const item = document.createElement('div');
      item.className = 'wheel-item';
      item.dataset.value = value;
      item.dataset.index = index;
      item.textContent = value;
      item.style.cssText = `
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        font-size: clamp(0.5rem, 1.2vw, 2.3rem);
        font-weight: bold;
        opacity: 0.3;
        transition: opacity 0.3s ease, transform 0.3s ease;
        cursor: pointer;
      `;
      
      scrollContent.appendChild(item);
    });
    
    wheel.appendChild(scrollContent);
    
    // Add highlight overlay
    const highlight = document.createElement('div');
    highlight.className = 'wheel-highlight';
    highlight.style.cssText = `
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 30px;
      transform: translateY(-50%);
      background: linear-gradient(
        145deg,
        var(--active-button-start),
        var(--active-button-end)
      );
      opacity: 0.3;
      border-radius: 15px;
      pointer-events: none;
      z-index: 1;
    `;
    wheel.appendChild(highlight);
    
    // Add gradient overlays for fade effect
    const topGradient = document.createElement('div');
    topGradient.className = 'wheel-gradient-top';
    topGradient.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 60px;
      background: linear-gradient(
        to bottom,
        rgba(0, 0, 0, 0.8),
        transparent
      );
      pointer-events: none;
      z-index: 2;
    `;
    wheel.appendChild(topGradient);
    
    const bottomGradient = document.createElement('div');
    bottomGradient.className = 'wheel-gradient-bottom';
    bottomGradient.style.cssText = `
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 60px;
      background: linear-gradient(
        to top,
        rgba(0, 0, 0, 0.8),
        transparent
      );
      pointer-events: none;
      z-index: 2;
    `;
    wheel.appendChild(bottomGradient);
    
    // Add event listeners
    this.attachWheelListeners(wheel, type, values);
    
    return wheel;
  }
  
  /**
   * Attach wheel event listeners
   */
  attachWheelListeners(wheel, type, values) {
    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    let velocity = 0;
    let lastY = 0;
    let lastTime = Date.now();
    let momentumAnimation = null;
    
    const scrollContent = wheel.querySelector('.wheel-scroll-content');
    
    // Get current index
    const getCurrentIndex = () => {
      if (type === 'hour') return this.hourIndex;
      if (type === 'minute') return this.minuteIndex;
      if (type === 'period') return this.periodIndex;
      return 0;
    };
    
    // Set current index
    const setCurrentIndex = (index) => {
      const maxIndex = values.length - 1;
      index = Math.max(0, Math.min(maxIndex, index));
      
      if (type === 'hour') this.hourIndex = index;
      else if (type === 'minute') this.minuteIndex = index;
      else if (type === 'period') this.periodIndex = index;
      
      this.updateValue();
    };
    
    // Start drag
    const handleStart = (e) => {
      e.preventDefault();
      isDragging = true;
      startY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
      currentY = startY;
      lastY = startY;
      lastTime = Date.now();
      velocity = 0;
      
      if (momentumAnimation) {
        cancelAnimationFrame(momentumAnimation);
        momentumAnimation = null;
      }
      
      scrollContent.style.transition = 'none';
    };
    
    // Handle drag
    const handleMove = (e) => {
      if (!isDragging) return;
      
      const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
      const deltaY = clientY - startY;
      currentY = clientY;
      
      // Calculate velocity
      const currentTime = Date.now();
      const deltaTime = currentTime - lastTime;
      if (deltaTime > 0) {
        velocity = (clientY - lastY) / deltaTime;
      }
      lastY = clientY;
      lastTime = currentTime;
      
      // Update position
      const currentIndex = getCurrentIndex();
      const baseOffset = -currentIndex * 30;
      const offset = baseOffset + deltaY;
      scrollContent.style.transform = `translateY(${offset}px)`;
      
      // Update item opacities
      this.updateWheelItemOpacities(wheel, currentIndex - deltaY / 30);
    };
    
    // End drag
    const handleEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      
      const deltaY = currentY - startY;
      const currentIndex = getCurrentIndex();
      
      // Apply momentum
      if (Math.abs(velocity) > 0.5) {
        const momentum = velocity * 150;
        const finalDelta = deltaY + momentum;
        const deltaIndex = Math.round(-finalDelta / 30);
        const targetIndex = currentIndex + deltaIndex;
        
        setCurrentIndex(targetIndex);
        this.animateToIndex(wheel, type, targetIndex);
      } else {
        // Snap to nearest
        const deltaIndex = Math.round(-deltaY / 30);
        const targetIndex = currentIndex + deltaIndex;
        
        setCurrentIndex(targetIndex);
        this.animateToIndex(wheel, type, targetIndex);
      }
    };
    
    // Mouse events
    wheel.addEventListener('mousedown', handleStart);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    
    // Touch events
    wheel.addEventListener('touchstart', handleStart);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleEnd);
    
    // Wheel scroll
    wheel.addEventListener('wheel', (e) => {
      e.preventDefault();
      const currentIndex = getCurrentIndex();
      const deltaIndex = e.deltaY > 0 ? 1 : -1;
      const targetIndex = currentIndex + deltaIndex;
      
      setCurrentIndex(targetIndex);
      this.animateToIndex(wheel, type, targetIndex);
    });
    
    // Click on items
    wheel.addEventListener('click', (e) => {
      const item = e.target.closest('.wheel-item');
      if (item) {
        const targetIndex = parseInt(item.dataset.index, 10);
        setCurrentIndex(targetIndex);
        this.animateToIndex(wheel, type, targetIndex);
      }
    });
  }
  
  /**
   * Animate wheel to specific index
   */
  animateToIndex(wheel, type, index) {
    const scrollContent = wheel.querySelector('.wheel-scroll-content');
    scrollContent.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    scrollContent.style.transform = `translateY(${-index * 30}px)`;
    
    this.updateWheelItemOpacities(wheel, index);
  }
  
  /**
   * Update wheel item opacities based on position
   */
  updateWheelItemOpacities(wheel, centerIndex) {
    const items = wheel.querySelectorAll('.wheel-item');
    items.forEach((item, index) => {
      const distance = Math.abs(index - centerIndex);
      const opacity = Math.max(0.3, 1 - distance * 0.3);
      const scale = Math.max(0.8, 1 - distance * 0.1);
      
      item.style.opacity = opacity;
      item.style.transform = `scale(${scale})`;
    });
  }
  
  /**
   * Update all wheel positions
   */
  updateWheelPositions() {
    this.animateToIndex(this.hourWheel, 'hour', this.hourIndex);
    this.animateToIndex(this.minuteWheel, 'minute', this.minuteIndex);
    if (this.periodWheel) {
      this.animateToIndex(this.periodWheel, 'period', this.periodIndex);
    }
  }
  
  /**
   * Generate hours array
   */
  generateHours() {
    const hours = [];
    const max = this.options.format === '24hr' ? 24 : 12;
    const start = this.options.format === '24hr' ? 0 : 1;
    
    for (let i = start; i < max + start; i++) {
      const hour = i % (max + (this.options.format === '24hr' ? 0 : 1));
      hours.push(hour.toString().padStart(2, '0'));
    }
    
    return hours;
  }
  
  /**
   * Generate minutes array
   */
  generateMinutes() {
    const minutes = [];
    for (let i = 0; i < 60; i += this.options.minuteInterval) {
      minutes.push(i.toString().padStart(2, '0'));
    }
    return minutes;
  }
  
  /**
   * Update value based on current wheel positions
   */
  updateValue() {
    const hours = this.generateHours()[this.hourIndex];
    const minutes = this.generateMinutes()[this.minuteIndex];
    
    let value = `${hours}:${minutes}`;
    
    if (this.options.format === '12hr' && this.periodWheel) {
      const period = ['AM', 'PM'][this.periodIndex];
      value += ` ${period}`;
    }
    
    this.options.value = value;
    
    // Save to storage
    if (this.options.storageKey) {
      localStorage.setItem(this.options.storageKey, value);
    }
    
    // Call change handler
    if (this.changeHandler) {
      this.changeHandler(value, this.options.id);
    }
    
    console.log(`[wheel_time_selector_component_engine] Time updated:`, value);
  }
  
  /**
   * Apply styles
   */
  applyStyles() {
    // Base styles matching slider aesthetic
    const baseStyles = `
      display: inline-flex;
      position: relative;
      border-radius: 9999px;
      background: linear-gradient(
        -25deg,
        var(--light-slider-start) 0%,
        var(--light-slider-end) 100%
      );
      overflow: hidden;
      cursor: pointer;
      transition: all 0.3s ease;
    `;
    
    this.element.style.cssText = baseStyles;
    
    // Add dynamic styles
    if (!document.getElementById('wheel-time-engine-styles')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'wheel-time-engine-styles';
      styleSheet.textContent = `
        /* Dark theme support */
        body[data-theme="dark"] .wheel-time-selector {
          background: linear-gradient(
            -25deg,
            var(--dark-slider-start) 0%,
            var(--dark-slider-end) 100%
          );
        }
        
        /* Border container */
        .wheel-time-selector .border-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 3;
          clip-path: inset(0 0 0 0 round 9999px);
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        
        /* Show borders on hover */
        .wheel-time-selector:hover .border-container {
          opacity: 1;
        }
        
        /* Border segments */
        .wheel-time-selector .border-segment {
          position: absolute;
          background: linear-gradient(
            to right,
            var(--active-button-start),
            var(--active-button-end)
          );
          height: 1px;
          width: 100%;
        }
        
        .wheel-time-selector .border-top {
          top: 0;
        }
        
        .wheel-time-selector .border-bottom {
          bottom: 0;
        }
        
        /* Background */
        .wheel-time-selector .wheel-background {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          border-radius: 9999px;
          background: linear-gradient(
            145deg,
            var(--active-button-start),
            var(--active-button-end)
          );
          opacity: 0;
          transition: opacity 0.3s ease;
          z-index: 0;
        }
        
        /* Active state */
        .wheel-time-selector.active .wheel-background {
          opacity: 0.1;
        }
        
        /* Disabled state */
        .wheel-time-selector.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .wheel-time-selector.disabled .time-wheel {
          pointer-events: none;
        }
        
        /* Dark theme gradients */
        body[data-theme="dark"] .wheel-gradient-top {
          background: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0.9),
            transparent
          ) !important;
        }
        
        body[data-theme="dark"] .wheel-gradient-bottom {
          background: linear-gradient(
            to top,
            rgba(0, 0, 0, 0.9),
            transparent
          ) !important;
        }
      `;
      document.head.appendChild(styleSheet);
    }
  }
  
  /**
   * Set time value
   */
  setValue(value) {
    this.parseTime(value);
    this.updateWheelPositions();
    this.updateValue();
  }
  
  /**
   * Get current value
   */
  getValue() {
    return this.options.value;
  }
  
  /**
   * Enable the selector
   */
  enable() {
    this.options.disabled = false;
    this.element.classList.remove('disabled');
  }
  
  /**
   * Disable the selector
   */
  disable() {
    this.options.disabled = true;
    this.element.classList.add('disabled');
  }
  
  /**
   * Destroy the component
   */
  destroy() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.element = null;
    this.container = null;
    this.hourWheel = null;
    this.minuteWheel = null;
    this.periodWheel = null;
    console.log(`[wheel_time_selector_component_engine] Destroyed:`, this.options.id);
  }
}

// Export for ES6 modules
export { wheel_time_selector_component_engine };

console.log('[wheel_time_selector_component_engine] Engine class loaded as ES6 module');
