/**
 * wheel_date_picker_component_engine.js
 * 
 * Engine for creating wheel-style date pickers that match the DynamicSite
 * design language. Features smooth scrolling wheels for day, month, and year
 * with three date format options.
 * 
 * Date: 22-May-2025
 * Deployment Timestamp: [TO BE UPDATED ON DEPLOYMENT]
 */

class wheel_date_picker_component_engine {
  constructor(options = {}, changeHandler = null) {
    // Default options
    this.options = {
      id: options.id || `wheel-date-${Date.now()}`,
      value: options.value || new Date().toISOString().split('T')[0], // YYYY-MM-DD format
      format: options.format || 'dd-MMM-yyyy', // dd-MMM-yyyy, dd-mm-yyyy, yyyy-mm-dd
      minDate: options.minDate || null,
      maxDate: options.maxDate || null,
      yearRange: options.yearRange || 100, // Years to show before and after current
      storageKey: options.storageKey || null,
      disabled: options.disabled || false,
      ...options
    };
    
    this.changeHandler = changeHandler;
    this.element = null;
    this.container = null;
    this.dayWheel = null;
    this.monthWheel = null;
    this.yearWheel = null;
    
    // Wheel state
    this.dayIndex = 0;
    this.monthIndex = 0;
    this.yearIndex = 0;
    
    // Month names
    this.monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    this.monthNamesShort = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    
    // Parse initial value
    this.parseDate(this.options.value);
    
    console.log(`[wheel_date_picker_component_engine] Initialized with options:`, this.options);
  }
  
  /**
   * Parse date string into components
   */
  parseDate(dateStr) {
    let date;
    
    // Try to parse as ISO format first
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      date = new Date(dateStr + 'T00:00:00');
    } else {
      date = new Date(dateStr);
    }
    
    if (isNaN(date.getTime())) {
      date = new Date(); // Fallback to today
    }
    
    this.dayIndex = date.getDate() - 1;
    this.monthIndex = date.getMonth();
    this.yearIndex = this.getYearIndex(date.getFullYear());
  }
  
  /**
   * Get year index from year value
   */
  getYearIndex(year) {
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - this.options.yearRange;
    return year - startYear;
  }
  
  /**
   * Get year value from index
   */
  getYearFromIndex(index) {
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - this.options.yearRange;
    return startYear + index;
  }
  
  /**
   * Render the wheel date picker
   */
  render(container) {
    const containerEl = typeof container === 'string' 
      ? document.getElementById(container)
      : container;
      
    if (!containerEl) {
      console.error(`[wheel_date_picker_component_engine] Container not found:`, container);
      return null;
    }
    
    // Create main container
    this.container = document.createElement('div');
    this.container.className = 'wheel-date-container';
    this.container.style.cssText = `
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 5px 0;
      gap: 10px;
    `;
    
    // Create date picker element
    this.element = document.createElement('div');
    this.element.className = 'wheel-date-picker';
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
    
    // Create wheels based on format
    this.createWheelsByFormat(wheelsContainer);
    
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
    
    console.log(`[wheel_date_picker_component_engine] Rendered date picker:`, this.options.id);
    
    return this.element;
  }
  
  /**
   * Create wheels based on selected format
   */
  createWheelsByFormat(container) {
    const separator = document.createElement('div');
    separator.className = 'date-separator';
    separator.style.cssText = `
      color: #ffffff;
      font-weight: bold;
      font-size: clamp(0.6rem, 1.4vw, 2.6rem);
      padding: 0 5px;
    `;
    
    const separator2 = separator.cloneNode(true);
    
    switch (this.options.format) {
      case 'dd-MMM-yyyy':
        separator.textContent = '-';
        separator2.textContent = '-';
        
        this.dayWheel = this.createWheel('day', this.generateDays());
        container.appendChild(this.dayWheel);
        container.appendChild(separator);
        
        this.monthWheel = this.createWheel('month-short', this.monthNamesShort);
        container.appendChild(this.monthWheel);
        container.appendChild(separator2);
        
        this.yearWheel = this.createWheel('year', this.generateYears());
        container.appendChild(this.yearWheel);
        break;
        
      case 'dd-mm-yyyy':
        separator.textContent = '-';
        separator2.textContent = '-';
        
        this.dayWheel = this.createWheel('day', this.generateDays());
        container.appendChild(this.dayWheel);
        container.appendChild(separator);
        
        this.monthWheel = this.createWheel('month-numeric', this.generateMonthNumbers());
        container.appendChild(this.monthWheel);
        container.appendChild(separator2);
        
        this.yearWheel = this.createWheel('year', this.generateYears());
        container.appendChild(this.yearWheel);
        break;
        
      case 'yyyy-mm-dd':
        separator.textContent = '-';
        separator2.textContent = '-';
        
        this.yearWheel = this.createWheel('year', this.generateYears());
        container.appendChild(this.yearWheel);
        container.appendChild(separator);
        
        this.monthWheel = this.createWheel('month-numeric', this.generateMonthNumbers());
        container.appendChild(this.monthWheel);
        container.appendChild(separator2);
        
        this.dayWheel = this.createWheel('day', this.generateDays());
        container.appendChild(this.dayWheel);
        break;
    }
  }
  
  /**
   * Create a scrollable wheel
   */
  createWheel(type, values) {
    const wheel = document.createElement('div');
    wheel.className = `date-wheel wheel-${type}`;
    
    // Adjust width based on content
    let width = '60px';
    if (type === 'year') width = '80px';
    else if (type === 'month-short') width = '70px';
    
    wheel.style.cssText = `
      height: 150px;
      width: ${width};
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
    
    // Add gradient overlays
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
   * Attach wheel event listeners (similar to time selector)
   */
  attachWheelListeners(wheel, type, values) {
    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    let velocity = 0;
    let lastY = 0;
    let lastTime = Date.now();
    
    const scrollContent = wheel.querySelector('.wheel-scroll-content');
    
    // Get current index
    const getCurrentIndex = () => {
      if (type === 'day') return this.dayIndex;
      if (type.includes('month')) return this.monthIndex;
      if (type === 'year') return this.yearIndex;
      return 0;
    };
    
    // Set current index
    const setCurrentIndex = (index) => {
      const maxIndex = values.length - 1;
      index = Math.max(0, Math.min(maxIndex, index));
      
      if (type === 'day') {
        this.dayIndex = index;
        // Update days when month/year changes
        this.updateDaysInMonth();
      } else if (type.includes('month')) {
        this.monthIndex = index;
        this.updateDaysInMonth();
      } else if (type === 'year') {
        this.yearIndex = index;
        this.updateDaysInMonth();
      }
      
      this.updateValue();
    };
    
    // Touch and mouse handlers (same as time selector)
    const handleStart = (e) => {
      e.preventDefault();
      isDragging = true;
      startY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
      currentY = startY;
      lastY = startY;
      lastTime = Date.now();
      velocity = 0;
      scrollContent.style.transition = 'none';
    };
    
    const handleMove = (e) => {
      if (!isDragging) return;
      
      const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
      const deltaY = clientY - startY;
      currentY = clientY;
      
      const currentTime = Date.now();
      const deltaTime = currentTime - lastTime;
      if (deltaTime > 0) {
        velocity = (clientY - lastY) / deltaTime;
      }
      lastY = clientY;
      lastTime = currentTime;
      
      const currentIndex = getCurrentIndex();
      const baseOffset = -currentIndex * 30;
      const offset = baseOffset + deltaY;
      scrollContent.style.transform = `translateY(${offset}px)`;
      
      this.updateWheelItemOpacities(wheel, currentIndex - deltaY / 30);
    };
    
    const handleEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      
      const deltaY = currentY - startY;
      const currentIndex = getCurrentIndex();
      
      if (Math.abs(velocity) > 0.5) {
        const momentum = velocity * 150;
        const finalDelta = deltaY + momentum;
        const deltaIndex = Math.round(-finalDelta / 30);
        const targetIndex = currentIndex + deltaIndex;
        
        setCurrentIndex(targetIndex);
        this.animateToIndex(wheel, type, targetIndex);
      } else {
        const deltaIndex = Math.round(-deltaY / 30);
        const targetIndex = currentIndex + deltaIndex;
        
        setCurrentIndex(targetIndex);
        this.animateToIndex(wheel, type, targetIndex);
      }
    };
    
    // Add event listeners
    wheel.addEventListener('mousedown', handleStart);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    
    wheel.addEventListener('touchstart', handleStart);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleEnd);
    
    wheel.addEventListener('wheel', (e) => {
      e.preventDefault();
      const currentIndex = getCurrentIndex();
      const deltaIndex = e.deltaY > 0 ? 1 : -1;
      const targetIndex = currentIndex + deltaIndex;
      
      setCurrentIndex(targetIndex);
      this.animateToIndex(wheel, type, targetIndex);
    });
    
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
   * Update days in month based on current month/year
   */
  updateDaysInMonth() {
    if (!this.dayWheel) return;
    
    const year = this.getYearFromIndex(this.yearIndex);
    const month = this.monthIndex;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Regenerate days if needed
    const currentDays = this.dayWheel.querySelectorAll('.wheel-item').length;
    if (currentDays !== daysInMonth) {
      const scrollContent = this.dayWheel.querySelector('.wheel-scroll-content');
      scrollContent.innerHTML = '';
      
      const days = [];
      for (let i = 1; i <= daysInMonth; i++) {
        days.push(i.toString().padStart(2, '0'));
      }
      
      days.forEach((value, index) => {
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
      
      // Adjust day index if needed
      if (this.dayIndex >= daysInMonth) {
        this.dayIndex = daysInMonth - 1;
      }
      
      this.animateToIndex(this.dayWheel, 'day', this.dayIndex);
    }
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
   * Update wheel item opacities
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
    this.animateToIndex(this.dayWheel, 'day', this.dayIndex);
    this.animateToIndex(this.monthWheel, 'month', this.monthIndex);
    this.animateToIndex(this.yearWheel, 'year', this.yearIndex);
  }
  
  /**
   * Generate days array
   */
  generateDays() {
    const days = [];
    for (let i = 1; i <= 31; i++) {
      days.push(i.toString().padStart(2, '0'));
    }
    return days;
  }
  
  /**
   * Generate month numbers
   */
  generateMonthNumbers() {
    const months = [];
    for (let i = 1; i <= 12; i++) {
      months.push(i.toString().padStart(2, '0'));
    }
    return months;
  }
  
  /**
   * Generate years array
   */
  generateYears() {
    const years = [];
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - this.options.yearRange;
    const endYear = currentYear + this.options.yearRange;
    
    for (let year = startYear; year <= endYear; year++) {
      years.push(year.toString());
    }
    
    return years;
  }
  
  /**
   * Update value based on current wheel positions
   */
  updateValue() {
    const day = (this.dayIndex + 1).toString().padStart(2, '0');
    const year = this.getYearFromIndex(this.yearIndex);
    let value;
    
    switch (this.options.format) {
      case 'dd-MMM-yyyy':
        const monthShort = this.monthNamesShort[this.monthIndex];
        value = `${day}-${monthShort}-${year}`;
        break;
        
      case 'dd-mm-yyyy':
        const monthNum = (this.monthIndex + 1).toString().padStart(2, '0');
        value = `${day}-${monthNum}-${year}`;
        break;
        
      case 'yyyy-mm-dd':
        const monthNum2 = (this.monthIndex + 1).toString().padStart(2, '0');
        value = `${year}-${monthNum2}-${day}`;
        break;
    }
    
    this.options.value = value;
    
    // Save to storage
    if (this.options.storageKey) {
      localStorage.setItem(this.options.storageKey, value);
    }
    
    // Call change handler
    if (this.changeHandler) {
      const date = new Date(year, this.monthIndex, this.dayIndex + 1);
      this.changeHandler(value, date, this.options.id);
    }
    
    console.log(`[wheel_date_picker_component_engine] Date updated:`, value);
  }
  
  /**
   * Apply styles
   */
  applyStyles() {
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
    if (!document.getElementById('wheel-date-engine-styles')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'wheel-date-engine-styles';
      styleSheet.textContent = `
        /* Dark theme support */
        body[data-theme="dark"] .wheel-date-picker {
          background: linear-gradient(
            -25deg,
            var(--dark-slider-start) 0%,
            var(--dark-slider-end) 100%
          );
        }
        
        /* Border container */
        .wheel-date-picker .border-container {
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
        .wheel-date-picker:hover .border-container {
          opacity: 1;
        }
        
        /* Border segments */
        .wheel-date-picker .border-segment {
          position: absolute;
          background: linear-gradient(
            to right,
            var(--active-button-start),
            var(--active-button-end)
          );
          height: 1px;
          width: 100%;
        }
        
        .wheel-date-picker .border-top {
          top: 0;
        }
        
        .wheel-date-picker .border-bottom {
          bottom: 0;
        }
        
        /* Background */
        .wheel-date-picker .wheel-background {
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
        .wheel-date-picker.active .wheel-background {
          opacity: 0.1;
        }
        
        /* Disabled state */
        .wheel-date-picker.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .wheel-date-picker.disabled .date-wheel {
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
   * Set date value
   */
  setValue(value) {
    this.parseDate(value);
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
   * Get current date object
   */
  getDate() {
    const year = this.getYearFromIndex(this.yearIndex);
    return new Date(year, this.monthIndex, this.dayIndex + 1);
  }
  
  /**
   * Enable the picker
   */
  enable() {
    this.options.disabled = false;
    this.element.classList.remove('disabled');
  }
  
  /**
   * Disable the picker
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
    this.dayWheel = null;
    this.monthWheel = null;
    this.yearWheel = null;
    console.log(`[wheel_date_picker_component_engine] Destroyed:`, this.options.id);
  }
}

// Export for ES6 modules
export { wheel_date_picker_component_engine };
